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
    const { action } = body;

    const ai = new GoogleGenAI({ apiKey: gemini_api_key });

    // ACTION 1: GENERATE SCENE PROMPT FROM SELECTED PRODUCTS
    if (action === 'generate') {
      const { products } = body; // Array of product objects: { id, title, category }
      if (!products || !Array.isArray(products) || products.length === 0) {
        return NextResponse.json({ error: 'At least one product is required to generate a scene prompt' }, { status: 400 });
      }

      const productsList = products
        .map((p, idx) => `${idx + 1}. ${p.title} (${p.category})`)
        .join('\n');

      const systemPrompt = `You are a professional visual art director for an aesthetic lifestyle brand named "${brand_name}".
Your task is to write a detailed, high-quality, professional image generation prompt for Google's Imagen model.
The prompt must describe a single, cohesive, styled environment (like a cozy bedroom, a minimalist desk setup, or a warm living room nook) that naturally blends all of these products together:
${productsList}

Use the brand guidelines:
"${niche_prompt_directive}"

The prompt must describe:
- The styled environment/furniture (e.g. a warm oak wood desk, a cozy linen-layered bed).
- How the specified products are placed in the scene (e.g., the candle sits on the side table next to the blanket).
- Ambient details and colors (cream, beige, soft warm tones, minimalist clutter-free).
- Lighting (cinematic warm afternoon sunbeams, soft indoor glow, cozy bokeh background).
- Composition (e.g. professional interior design photography, high-end catalog shot, crisp textures).

IMPORTANT: Output ONLY the raw prompt text. Do not write introductory words or wrap in quotes. Keep it to 1 or 2 concise descriptive sentences.`;

      const promptResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] }
        ],
      });

      const detailedScenePrompt = promptResponse.text?.trim() || `Professional catalog interior design photography of a cozy, styled space with these items arranged beautifully, warm soft lighting, photorealistic.`;
      
      return NextResponse.json({ success: true, prompt: detailedScenePrompt });
    }

    // ACTION 2: RUN IMAGEN 4 TO GENERATE THE COLLECTION SCENE
    if (action === 'mockup') {
      const { prompt } = body;
      if (!prompt) {
        return NextResponse.json({ error: 'Prompt is required to generate a scene image' }, { status: 400 });
      }

      console.log('Sending collection scene prompt to Imagen 4:', prompt);

      const imageResponse = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '4:3', // Landscape standard is better for scene layouts
        },
      });

      if (!imageResponse.generatedImages || imageResponse.generatedImages.length === 0) {
        throw new Error('No image was returned from the Imagen service.');
      }

      const generatedImage = imageResponse.generatedImages[0];
      if (!generatedImage || !generatedImage.image || !generatedImage.image.imageBytes) {
        throw new Error('Image data not found in Imagen response.');
      }
      const imageBytes = generatedImage.image.imageBytes; // base64 string
      const base64DataUrl = `data:image/png;base64,${imageBytes}`;

      return NextResponse.json({
        success: true,
        imageUrl: base64DataUrl,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Collection Scene API handler error:', error);
    return NextResponse.json({ error: error.message || 'Collection scene generation failed' }, { status: 500 });
  }
}
