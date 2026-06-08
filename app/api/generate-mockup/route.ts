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
"An aesthetic, photorealistic product mockup of [literal detailed description of the product], placed inside a styled [describe the environment/background details matching the category '${category}' and guidelines], [describe lighting, composition, and visual qualities]."

CRITICAL INSTRUCTIONS FOR PRODUCT COMPLIANCE:
1. Google's Imagen model is text-only and cannot see the reference image. Therefore, you MUST write an extremely detailed, literal visual description of the product (describing its exact shape, structure, colors, materials, patterns, dimensions, and unique physical design details) based on the provided reference image.
2. Do NOT use generic names or placeholder phrases (e.g. write "a large rectangular over-the-door storage basket made from woven thick off-white cotton rope with three tiers and dark grey metallic door hooks" instead of "a storage basket" or "the product").
3. The prompt MUST start with the exact phrase: "An aesthetic, photorealistic product mockup of " followed by your literal product description, and then describe the scene environment where it is placed.
4. Output ONLY the raw prompt text. Do not write introductory words or wrap in quotes. Keep it to 1 or 2 concise descriptive sentences.`;

      const promptGeneratorUser = `Product Title: ${title}
Product Details: ${rawDescription || ''}
Category: ${category}

Write a professional image generation prompt containing a literal description of the product in the reference image.`;

      const parsedImage = await fetchAndParseImage(mainImage);

      const promptResponse = await generateContentWithRetry({
        apiKey: gemini_api_key,
        prompt: promptGeneratorSystem + '\n\n' + promptGeneratorUser,
        images: parsedImage ? [parsedImage] : undefined
      });

      const detailedImagePrompt = promptResponse.text?.trim() || `An aesthetic, photorealistic product mockup of ${title}, placed inside a cozy styled ${category} setup.`;
      
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
1. Google's Imagen model is text-only and cannot see the reference image. Therefore, the prompt MUST start with the phrase "An aesthetic, photorealistic product mockup of " followed by a highly detailed, literal visual description of the product (describing its shape, colors, materials, and physical design details exactly as shown in the reference image) placed inside the updated scene.
2. Do NOT alter, simplify, or generalize the product details. The description of the product must remain absolutely identical to its real physical appearance in the reference image to prevent false advertising.
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

    // ACTION 3: CALL GEMINI MULTIMODAL OR IMAGEN TO GENERATE THE MOCKUP IMAGE
    if (action === 'mockup') {
      const { prompt, mainImage } = body;
      if (!prompt) {
        return NextResponse.json({ error: 'Prompt is required to generate a mockup' }, { status: 400 });
      }

      const parsedImage = await fetchAndParseImage(mainImage);

      if (parsedImage) {
        console.log('Sending prompt and image to gemini-3.5-flash-image...');
        const imageBuffer = Buffer.from(parsedImage.data, 'base64');
        const imageBlob = new Blob([imageBuffer], { type: parsedImage.mimeType });

        const uploadedFile = await ai.files.upload({
          file: imageBlob,
          config: {
            mimeType: parsedImage.mimeType,
          },
        });

        if (!uploadedFile.name || !uploadedFile.uri || !uploadedFile.mimeType) {
          throw new Error('File upload succeeded but return metadata is incomplete.');
        }

        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-image',
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  {
                    fileData: {
                      fileUri: uploadedFile.uri,
                      mimeType: uploadedFile.mimeType,
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
          });

          const candidate = response.candidates?.[0];
          const parts = candidate?.content?.parts || [];
          const imagePart = parts.find(p => p.inlineData);

          if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
            throw new Error('No image data was generated by the gemini-3.5-flash-image model.');
          }

          const mimeType = imagePart.inlineData.mimeType || 'image/png';
          const base64DataUrl = `data:${mimeType};base64,${imagePart.inlineData.data}`;

          return NextResponse.json({
            success: true,
            imageUrl: base64DataUrl,
          });
        } finally {
          try {
            await ai.files.delete({ name: uploadedFile.name });
            console.log('Successfully deleted temp file from Gemini API storage:', uploadedFile.name);
          } catch (deleteError) {
            console.warn('Failed to delete temp file from Gemini API storage:', deleteError);
          }
        }
      } else {
        console.log('No product image parsed or available. Falling back to Imagen 4 text-to-image...');
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
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Mockup API handler error:', error);
    return NextResponse.json({ error: error.message || 'Action execution failed' }, { status: 500 });
  }
}
