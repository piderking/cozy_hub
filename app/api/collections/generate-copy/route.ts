import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSettings } from '@/lib/settings';

export async function POST(request: Request) {
  try {
    const settings = await getSettings();
    const { gemini_api_key, brand_name, niche_prompt_directive } = settings;

    if (!gemini_api_key || gemini_api_key.includes('your_gemini_api_key')) {
      return NextResponse.json(
        { error: 'Please configure a valid Gemini API Key in the settings dashboard tab first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, description, products, slug, triggerWord } = body;

    if (!title || !description || !products || !Array.isArray(products)) {
      return NextResponse.json({ error: 'Title, description, and products list are required' }, { status: 400 });
    }

    const productsList = products.map(p => `- ${p.title} (${p.category})`).join('\n');
    const ai = new GoogleGenAI({ apiKey: gemini_api_key });

    const systemPrompt = `You are a professional social media manager and copywriter for an aesthetic lifestyle brand named "${brand_name}".
Your task is to write high-converting social media copy for a themed scene bundle (Collection) that features multiple products.
Brand guidelines:
"${niche_prompt_directive}"

The collection details:
Title: "${title}"
Description: "${description}"
Products in this scene:
${productsList}

CRITICAL COMPLIANCE & TRIGGER RULES:
1. First line of EVERY post must start with an FTC-compliant affiliate disclosure (e.g. '#ad').
2. For Instagram: The caption must explicitly instruct users to comment a specific word (we suggest: "${triggerWord || 'cozy'}") to receive the link to this collection in their DMs automatically (e.g., "Comment '${triggerWord || 'cozy'}' to get the setup details sent to your DMs! 💻✨"). Do not include direct affiliate links in the caption.
3. For Pinterest: The description must be under 480 characters. It must include a direct link to the collection page on our site: "https://cozyhub.com/collections/${slug || 'vanilla-cream-setup'}".
4. For X (Twitter): Keep it short (under 280 characters). Direct them to get the details here: "https://cozyhub.com/collections/${slug || 'vanilla-cream-setup'}".
5. Use plenty of appropriate emojis (✨, 🏠, 🛋️, 🕯️, etc.) to style the text beautifully.

Return the outputs strictly in JSON format with these exact keys:
{
  "instagramPost": "Instagram caption...",
  "pinterestPost": "Pinterest pin description...",
  "xPost": "Twitter post..."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] }
      ],
      config: {
        responseMimeType: 'application/json',
      }
    });

    const responseText = response.text || '{}';
    let parsedData = {};
    try {
      parsedData = JSON.parse(responseText.trim());
    } catch (_) {
      // Regex fallback
      const jsonRegex = /\{[\s\S]*\}/;
      const match = responseText.match(jsonRegex);
      if (match) {
        try {
          parsedData = JSON.parse(match[0]);
        } catch (_) {
          return NextResponse.json({ error: 'Failed to generate structured copywriting. Please try again.' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: 'Failed to generate structured copywriting. Please try again.' }, { status: 500 });
      }
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Collection copy generation error:', error);
    return NextResponse.json({ error: error.message || 'Copy generation failed' }, { status: 500 });
  }
}
