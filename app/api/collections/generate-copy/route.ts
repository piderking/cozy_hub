import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';
import { generateContentWithRetry } from '@/lib/gemini';

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

    const systemPromptTemplate = settings.prompt_collection_copy || `You are a professional social media manager and copywriter for an aesthetic lifestyle brand named "{brand_name}".
Your task is to write high-converting social media copy for a themed scene bundle (Collection) that features multiple products.
Brand guidelines:
"{niche_prompt_directive}"

The collection details:
Title: "{title}"
Description: "{description}"
Products in this scene:
{productsList}

CRITICAL COMPLIANCE & TRIGGER RULES:
1. First line of EVERY post must start with an FTC-compliant affiliate disclosure (e.g. '#ad').
2. For Instagram: The caption must explicitly instruct users to comment or DM a specific word (we suggest: "{triggerWord}") to receive the link to this collection in their DMs automatically (e.g., "Comment '{triggerWord}' or DM me to get the setup details sent to your DMs! 💻✨"). Do NOT include any direct link, URL, or website address in the Instagram caption text.
3. For Pinterest: The description must be under 480 characters. Do NOT put any URL link or website address in the Pinterest pin description text (it will be linked via the Pin metadata instead).
4. Use plenty of appropriate emojis to style the text beautifully.`;

    const systemPrompt = systemPromptTemplate
      .replace(/{brand_name}/g, brand_name || 'Cozy Hub')
      .replace(/{niche_prompt_directive}/g, niche_prompt_directive || '')
      .replace(/{title}/g, title || '')
      .replace(/{description}/g, description || '')
      .replace(/{productsList}/g, productsList || '')
      .replace(/{triggerWord}/g, triggerWord || 'cozy') + `
Return the outputs strictly in JSON format with these exact keys:
{
  "instagramPost": "Instagram caption...",
  "pinterestPost": "Pinterest pin description..."
}`;

    const response = await generateContentWithRetry({
      apiKey: gemini_api_key,
      prompt: systemPrompt,
      responseMimeType: 'application/json'
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
