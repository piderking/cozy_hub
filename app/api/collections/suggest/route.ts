import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { generateContentWithRetry } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const settings = await getSettings();
    const { gemini_api_key, brand_name, niche_prompt_directive } = settings;

    if (!gemini_api_key || gemini_api_key.includes('your_gemini_api_key')) {
      return NextResponse.json(
        { error: 'Please configure a valid Gemini API Key in your settings first.' },
        { status: 400 }
      );
    }

    // Query published products
    const products = await prisma.product.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        title: true,
        category: true,
        customDescription: true
      }
    });

    if (products.length === 0) {
      return NextResponse.json(
        { error: 'No published products found in the catalog to suggest a bundle from.' },
        { status: 400 }
      );
    }

    // Prepare products summary for Gemini
    const productsSummary = products.map(p => 
      `ID: "${p.id}" | Title: "${p.title}" | Category: "${p.category}" | Description: "${p.customDescription || ''}"`
    ).join('\n');

    const systemPrompt = `You are a professional interior stylist, visual merchandiser, and marketing coordinator for an aesthetic home decor and lifestyle brand named "${brand_name}".
Your task is to review the catalog products and suggest a themed scene bundle (Collection) that groups 2 to 4 products that logically and beautifully fit together.

Brand guidelines:
"${niche_prompt_directive}"

Review this catalog:
${productsSummary}

Choose a cohesive aesthetic theme (e.g. "Warm Bedtime Sanctuary", "Cozy Dorm Study Essentials", "Minimalist Living Room Corner").
Suggest:
1. Title: An engaging, aesthetic title for the collection.
2. Description: A beautiful, paragraph-based description (100-150 words) describing the scene, the styling, and how the products complement each other.
3. TriggerWord: A single, short, clean trigger word for Instagram comments (e.g. "cozy", "desk", "room", "nook").
4. Product IDs: The array of matching product IDs you selected from the list above. You MUST choose ONLY valid IDs from the list provided. Do not invent any new IDs.

You must return your output strictly in JSON format matching this exact schema:
{
  "title": "Clean aesthetic title...",
  "description": "Detailed scene description...",
  "triggerWord": "keyword...",
  "productIds": ["id1", "id2", ...]
}`;

    const response = await generateContentWithRetry({
      apiKey: gemini_api_key,
      prompt: systemPrompt,
      responseMimeType: 'application/json'
    });

    const responseText = response.text || '{}';
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(responseText.trim());
    } catch (_) {
      // Fallback regex parsing
      const jsonRegex = /\{[\s\S]*\}/;
      const match = responseText.match(jsonRegex);
      if (match) {
        try {
          parsedData = JSON.parse(match[0]);
        } catch (_) {
          return NextResponse.json({ error: 'Gemini suggested collection is not valid JSON.' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: 'Gemini failed to return structured JSON suggestions.' }, { status: 500 });
      }
    }

    // Validate the suggested product IDs against available catalog IDs
    const validIds = new Set(products.map(p => p.id));
    if (parsedData.productIds && Array.isArray(parsedData.productIds)) {
      parsedData.productIds = parsedData.productIds.filter((id: string) => validIds.has(id));
    } else {
      parsedData.productIds = [];
    }

    // Default fallback if no valid products selected
    if (parsedData.productIds.length === 0 && products.length > 0) {
      // Pick first 2 products as safety fallback
      parsedData.productIds = products.slice(0, 2).map(p => p.id);
    }

    return NextResponse.json({
      success: true,
      suggestion: {
        title: parsedData.title || 'Aesthetic Cozy Collection',
        description: parsedData.description || 'A hand-selected bundle of warm, minimalist home items.',
        triggerWord: parsedData.triggerWord || 'cozy',
        productIds: parsedData.productIds
      }
    });

  } catch (error: any) {
    console.error('Suggest collection API error:', error);
    return NextResponse.json({ error: error.message || 'Collection suggestion failed' }, { status: 500 });
  }
}
