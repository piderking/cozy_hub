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
    const { products } = body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'At least one product is required to generate an influencer script' }, { status: 400 });
    }

    const productsList = products
      .map((p, idx) => `- Product ${idx + 1}: "${p.title}" (Category: ${p.category}) - ${p.customDescription || p.rawDescription || ''}`)
      .join('\n');

    const systemPromptTemplate = settings.prompt_influencer || `You are a viral social media director and creative copywriter for an aesthetic home decor and lifestyle brand named "{brand_name}".
Your task is to generate a comprehensive short-form video creation package (Reel / TikTok script outline) tailored to promote a curated set of products.
Our brand guidelines:
"{niche_prompt_directive}"

The package must contain hook options, a suggested comment responder trigger word, an engaging caption encouraging comments, scene-by-scene filming instructions, and visual/styling tips.`;

    const systemPrompt = systemPromptTemplate
      .replace(/{brand_name}/g, brand_name || 'Cozy Hub')
      .replace(/{niche_prompt_directive}/g, niche_prompt_directive || '') + `
You must return your output strictly in JSON format matching this exact schema:
{
  "themeTitle": "A catchy, aesthetic theme title for the Reel (e.g. 'Top 3 Cozy Dorm Finds ☁️')",
  "hookOptions": [
    "A list of 3 separate high-retention video hook options (visual setup + voiceover + on-screen text)"
  ],
  "suggestedTriggers": [
    "A list of 3 suggested short, easy-to-type comment trigger words (e.g., 'cozy', 'dorm', 'finds')"
  ],
  "captionDraft": "An Instagram caption draft promoting the products. The first line must contain '#ad' (e.g. '#ad Comment or DM [TRIGGER] to get the details! ✨'). Include emojis, visual description, call-to-action, and hashtags. CRITICAL: Do NOT put any URL link or website address in the caption text.",
  "scenes": [
    {
      "sceneNumber": 1,
      "visualDirective": "Detailed instruction of what to record/edit (e.g., Close-up macro shot of lighting the candle, warm desk aesthetic)",
      "voiceoverScript": "What the narrator says in the voiceover (e.g., First is this hand-poured amber candle. It literally fills your room with the coziest vanilla scent.)",
      "onScreenText": "Short text overlay on screen (e.g. '1. Amber Cozy Candle 🕯️')"
    }
  ],
  "aestheticTips": "Tips on lighting, music style (e.g., lofi, cozy acoustic), color palettes, and camera work."
}`;

    const prompt = `Generate a video script package for these products:
${productsList}

Ensure the call to action and caption encourage users to comment one of the trigger words to automatically receive the links. Include '#ad' on the first line.`;

    const response = await generateContentWithRetry({
      apiKey: gemini_api_key,
      prompt: systemPrompt + '\n\n' + prompt,
      responseMimeType: 'application/json',
    });

    const responseText = response.text || '{}';
    let parsedData = {};
    try {
      parsedData = JSON.parse(responseText.trim());
    } catch (err) {
      console.error('Failed to parse Gemini influencer output as JSON:', responseText, err);
      // Fallback regex parsing
      const jsonRegex = /\{[\s\S]*\}/;
      const match = responseText.match(jsonRegex);
      if (match) {
        try {
          parsedData = JSON.parse(match[0]);
        } catch (_) {
          return NextResponse.json({ error: 'Gemini failed to return structured JSON. Please try again.' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: 'Gemini failed to return structured JSON. Please try again.' }, { status: 500 });
      }
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Influencer script API error:', error);
    return NextResponse.json({ error: error.message || 'Influencer script generation failed' }, { status: 500 });
  }
}
