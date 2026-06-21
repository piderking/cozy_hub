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

      const promptGeneratorSystemTemplate = settings.prompt_mockup_prompt || `You are a visual art director for an aesthetic product review brand named "{brand_name}".
Your task is to write a high-quality, professional image generation prompt for a multimodal image-to-image model.
The goal of the prompt is to visualize the product provided in the reference image inside a themed environment matching these guidelines:
"{niche_prompt_directive}"

The prompt MUST follow this exact structural format and phrasing:
"A photorealistic mockup of the provided product in the reference image. Place it inside a styled [describe the environment/background details matching the category '{category}' and guidelines], [describe lighting, composition, and visual qualities]."

CRITICAL INSTRUCTIONS:
1. Do NOT describe the product itself. The model can see the reference image, so describing the product details (like shape, color, or text) is unnecessary and causes the AI to hallucinate incorrect details.
2. Focus entirely on describing the environment, placement, and lighting where the product should be placed.
3. The prompt MUST start with the exact phrase: "A photorealistic mockup of the provided product in the reference image. Place it inside a " followed by your environment description.
4. Output ONLY the raw prompt text. Do not write introductory words or wrap in quotes. Keep it to 1 or 2 concise descriptive sentences.`;

      const promptGeneratorSystem = promptGeneratorSystemTemplate
        .replace(/{brand_name}/g, brand_name || 'Cozy Hub')
        .replace(/{niche_prompt_directive}/g, niche_prompt_directive || '')
        .replace(/{category}/g, category || '');

      const promptGeneratorUser = `Product Title: ${title}
Product Details: ${rawDescription || ''}
Category: ${category}

Write a professional image generation prompt describing a styled environment for the reference product.`;

      const parsedImage = await fetchAndParseImage(mainImage);

      const promptResponse = await generateContentWithRetry({
        apiKey: gemini_api_key,
        prompt: promptGeneratorSystem + '\n\n' + promptGeneratorUser,
        images: parsedImage ? [parsedImage] : undefined
      });

      const detailedImagePrompt = promptResponse.text?.trim() || `A photorealistic mockup of the provided product in the reference image. Place it inside a cozy styled ${category} setup.`;
      
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

Your task is to rewrite the image generation prompt to incorporate the user's revision instructions.
CRITICAL COMPLIANCE RULES:
1. The prompt MUST start with the phrase "A photorealistic mockup of the provided product in the reference image. Place it inside a ".
2. Do NOT describe the product itself. Focus entirely on updating the environment, placement, background elements, surface, styling, or lighting conditions of the scene according to the user's revision instructions.
3. Output ONLY the raw updated prompt text. Do not wrap in quotes or add introductory text.`;

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
        console.log('Sending prompt and image to gemini-3.1-flash-image-preview...');
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
            model: 'gemini-3.1-flash-image-preview',
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
            throw new Error('No image data was generated by the gemini-3.1-flash-image-preview model.');
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
