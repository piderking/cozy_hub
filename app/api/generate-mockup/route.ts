import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
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
    const { action } = body;

    const ai = new GoogleGenAI({ apiKey: gemini_api_key });

    // ACTION 1: GENERATE AN INITIAL PROMPT FROM PRODUCT DETAILS
    if (action === 'generate') {
      const { title, rawDescription, category, mainImage } = body;
      if (!title) {
        return NextResponse.json({ error: 'Product title is required' }, { status: 400 });
      }

      const promptGeneratorSystem = `You are a visual art director for an aesthetic product review brand named "${brand_name}".
Your task is to write a detailed, high-quality, professional image generation prompt for Google's Imagen model.
The goal of the prompt is to visualize a product inside a themed environment matching these guidelines:
"${niche_prompt_directive}"

The prompt must describe:
- The product itself. You must describe its shape, material, colors, and key physical features in detail based on the title, description, and reference image URL (${mainImage || ''}) so the mockup image matches the actual product as closely as possible.
- The environment / background details (styled, clean, matching the category "${category}")
- Lighting (e.g. warm golden hour sunbeams, soft indoor bokeh, cinematic moody shadows)
- Composition (e.g. close-up shot, front angle, sitting on a wooden table, copy space)
- Quality terms (e.g. photorealistic, professional product photography, 8k resolution, crisp textures)

CRITICAL INSTRUCTION:
Make sure to keep the product's visual representation in the prompt as close to the reference image URL (${mainImage || ''}) and physical details as possible, so that Google's Imagen model can render the product accurately.

IMPORTANT: Output ONLY the raw prompt text. Do not write introductory words like "Here is your prompt:" or wrap in quotes. Keep it to 1 or 2 concise descriptive sentences.`;

      const promptGeneratorUser = `Product Title: ${title}
Product Details: ${rawDescription || ''}
Category: ${category}
Reference Image URL: ${mainImage || ''}

Write a professional product photography prompt for this product.`;

      const promptResponse = await generateContentWithRetry({
        apiKey: gemini_api_key,
        prompt: promptGeneratorSystem + '\n\n' + promptGeneratorUser
      });

      const detailedImagePrompt = promptResponse.text?.trim() || `Professional product photography of ${title} sitting in a cozy styled ${category} setup, soft warm lighting, photorealistic, 8k.`;
      
      return NextResponse.json({ success: true, prompt: detailedImagePrompt });
    }

    // ACTION 2: REFINE / REVISE PROMPT BASED ON USER INSTRUCTIONS
    if (action === 'refine') {
      const { originalPrompt, instructions, title, category, rawDescription, mainImage } = body;
      if (!originalPrompt || !instructions) {
        return NextResponse.json({ error: 'Original prompt and revision instructions are required' }, { status: 400 });
      }

      const refinerSystem = `You are a professional visual director.
We have an existing image generation prompt:
"${originalPrompt}"

The user wants to revise the prompt with these instructions:
"${instructions}"

We are generating a mockup image for this product:
Product Title: "${title || ''}"
Category: "${category || ''}"
Product Description: "${rawDescription || ''}"
Reference Image URL: "${mainImage || ''}"

Your task is to rewrite the image generation prompt to incorporate the user's revision instructions.
CRITICAL COMPLIANCE RULES:
1. Ensure the product's appearance, shape, material, colors, and physical details remain consistent with the original product description and reference image URL (${mainImage || ''}). Do NOT alter, simplify, or replace the product itself. Keep the generated mockup image visually as close to the actual reference product image as possible.
2. Only modify the environment, background elements, surface, placement, styling, or lighting conditions of the scene according to the user's revision instructions.
3. Keep the prompt descriptive, focused, and optimized for an image generation model.
4. Output ONLY the raw updated prompt text. Do not wrap in quotes or add introductory text.`;

      const response = await generateContentWithRetry({
        apiKey: gemini_api_key,
        prompt: refinerSystem
      });

      const refinedPrompt = response.text?.trim() || originalPrompt;
      return NextResponse.json({ success: true, prompt: refinedPrompt });
    }

    // ACTION 3: CALL IMAGEN 4 TO GENERATE THE MOCKUP IMAGE
    if (action === 'mockup') {
      const { prompt } = body;
      if (!prompt) {
        return NextResponse.json({ error: 'Prompt is required to generate a mockup' }, { status: 400 });
      }

      console.log('Sending final prompt to Imagen 4:', prompt);

      const imageResponse = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1', // Instagram square standard
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
    console.error('Mockup API handler error:', error);
    return NextResponse.json({ error: error.message || 'Action execution failed' }, { status: 500 });
  }
}
