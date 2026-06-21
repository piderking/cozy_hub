import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';
import { generateContentWithRetry } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const settings = await getSettings();
    const { gemini_api_key } = settings;

    if (!gemini_api_key || gemini_api_key.includes('your_gemini_api_key')) {
      return NextResponse.json(
        { error: 'Please configure a valid Gemini API Key in your settings first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { brand_name, target_audience, store_aesthetic, brand_voice, brand_color_ideas, content_focus } = body;

    if (!brand_name) {
      return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
    }

    const systemPrompt = `You are an expert branding consultant, aesthetic visual coordinator, and copywriter.
Your task is to analyze the provided brand inputs and generate a cohesive, structured brand direction theme package in valid JSON format.

Inputs:
- Brand Name: "${brand_name}"
- Target Audience: "${target_audience || 'A general lifestyle audience'}"
- Store Aesthetic/Theme: "${store_aesthetic || 'Warm minimalist'}"
- Brand Voice/Tone: "${brand_voice || 'Warm and friendly'}"
- Color Ideas: "${brand_color_ideas || 'Warm earth tones'}"
- Content Focus: "${content_focus || 'Aesthetic home decor'}"

Please generate the following fields:
1. "store_direction": A detailed, evocative brand manifesto/direction narrative (100-150 words) outlining the store's styling theme and curation approach.
2. "niche_prompt_directive": A consolidated 3-sentence guideline instruction that will be passed as the core brand directive to AI copywriters. It should specify the tone (welcoming, descriptive), visual/styling rules, and focus.
3. "brand_tagline": A catchy, aesthetic, short tagline (under 10 words) that summarizes this store theme.
4. "colors": Suggested hex codes matching this exact aesthetic theme:
   - "primary_color": A vibrant/aesthetic accent color (e.g. cozy warm amber, soft terracotta, sage green, dusty rose).
   - "secondary_color": A sleek card base background (usually a slightly lighter translucent glass background, e.g. dark charcoal/slate like '#1e293b' or '#1a202c').
   - "background_color": A deep background color (e.g. dark slate '#0b0f17' or rich mahogany '#110c0c').
   - "text_color": A warm, legible text white/cream (e.g. '#f8fafc' or '#fafaf9').

You must return your output strictly in JSON format matching this exact schema (do not wrap in markdown or include extra text):
{
  "store_direction": "...",
  "niche_prompt_directive": "...",
  "brand_tagline": "...",
  "colors": {
    "primary_color": "#...",
    "secondary_color": "#...",
    "background_color": "#...",
    "text_color": "#..."
  }
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
      // Fallback regex parsing
      const jsonRegex = /\{[\s\S]*\}/;
      const match = responseText.match(jsonRegex);
      if (match) {
        try {
          parsedData = JSON.parse(match[0]);
        } catch (_) {
          return NextResponse.json({ error: 'Gemini branding output is not valid JSON.' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: 'Gemini failed to return structured JSON branding suggestion.' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      suggestion: parsedData
    });

  } catch (error: any) {
    console.error('Branding suggestion API error:', error);
    return NextResponse.json({ error: error.message || 'Branding theme generation failed' }, { status: 500 });
  }
}
