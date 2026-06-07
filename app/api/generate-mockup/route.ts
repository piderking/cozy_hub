import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSettings } from '@/lib/settings';
import { generateContentWithRetry } from '@/lib/gemini';

async function fetchAndParseImage(imageUrl: string | undefined): Promise<{ mimeType: string; data: string } | undefined> {
  if (!imageUrl) return undefined;
  
  if (imageUrl.startsWith('data:image')) {
    const match = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (match && match.length === 3) {
      return {
        mimeType: match[1],
        data: match[2],
      };
    }
  } else if (imageUrl.startsWith('http')) {
    try {
      const res = await fetch(imageUrl);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || 'image/png';
        const buffer = await res.arrayBuffer();
        const base64Data = Buffer.from(buffer).toString('base64');
        return {
          mimeType: contentType,
          data: base64Data,
        };
      }
    } catch (err) {
      console.warn('Failed to fetch image from URL:', imageUrl, err);
    }
  }
  return undefined;
}

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
The goal of the prompt is to visualize the product provided in the user's reference image inside a themed environment matching these guidelines:
"${niche_prompt_directive}"

The prompt MUST follow this exact structural format and phrasing:
"Exactly copy and replicate the product from the reference image, maintaining its precise shape, colors, materials, textures, and physical design details, and place it into a styled space that [describe the environment/background details matching the category '${category}' and guidelines], [describe lighting, composition, and visual qualities]."

CRITICAL INSTRUCTIONS:
1. Do NOT use generic terms like "professional product photography" or generic descriptions of a product. You must describe the product in the reference image with extreme visual precision so that the generated image includes the EXACT product from the reference.
2. The prompt MUST start with the exact phrase: "Exactly copy and replicate the product from the reference image, maintaining its precise shape, colors, materials, textures, and physical design details, and place it into a space that " followed by the scene description.
3. Output ONLY the raw prompt text. Do not write introductory words or wrap in quotes.`;

      const promptGeneratorUser = `Product Title: ${title}
Product Details: ${rawDescription || ''}
Category: ${category}

Write a professional product photography prompt that places the exact product shown in the reference image in the styled scene.`;

      const parsedImage = await fetchAndParseImage(mainImage);

      const promptResponse = await generateContentWithRetry({
        apiKey: gemini_api_key,
        prompt: promptGeneratorSystem + '\n\n' + promptGeneratorUser,
        images: parsedImage ? [parsedImage] : undefined
      });

      const detailedImagePrompt = promptResponse.text?.trim() || `Exactly copy and replicate the product from the reference image, maintaining its precise shape, colors, materials, textures, and physical design details, and place it into a space that sits in a cozy styled ${category} setup.`;
      
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

Your task is to rewrite the image generation prompt to incorporate the user's revision instructions.
CRITICAL COMPLIANCE RULES:
1. Ensure the prompt starts with the exact phrase: "Exactly copy and replicate the product from the reference image, maintaining its precise shape, colors, materials, textures, and physical design details, and place it into a space that " followed by the updated scene description.
2. Analyze the provided product reference image carefully. Ensure the product's appearance, shape, material, colors, textures, and physical details in the prompt remain absolutely identical to the reference image. Do NOT alter, simplify, or replace the product itself.
3. Only modify the environment, background elements, surface, placement, styling, or lighting conditions of the scene according to the user's revision instructions.
4. Keep the prompt descriptive, focused, and optimized for an image generation model.
5. Output ONLY the raw updated prompt text. Do not wrap in quotes or add introductory text.`;

      const parsedImage = await fetchAndParseImage(mainImage);

      const response = await generateContentWithRetry({
        apiKey: gemini_api_key,
        prompt: refinerSystem,
        images: parsedImage ? [parsedImage] : undefined
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
