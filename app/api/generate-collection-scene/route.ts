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

    // ACTION 1: GENERATE SCENE PROMPT FROM SELECTED PRODUCTS
    if (action === 'generate') {
      const { products } = body; // Array of product objects
      if (!products || !Array.isArray(products) || products.length === 0) {
        return NextResponse.json({ error: 'At least one product is required to generate a scene prompt' }, { status: 400 });
      }

      const imagesList: { mimeType: string; data: string }[] = [];
      const productsList = [];

      for (let idx = 0; idx < products.length; idx++) {
        const p = products[idx];
        let imgUrl = p.mainImage || '';
        if (p.galleryImages && typeof p.galleryImages === 'string') {
          try {
            const parsedGallery = JSON.parse(p.galleryImages);
            if (parsedGallery.originalProductImage) {
              imgUrl = parsedGallery.originalProductImage;
            }
          } catch (_) {}
        }
        const desc = p.customDescription || p.rawDescription || '';
        productsList.push(`${idx + 1}. Product Title: "${p.title}" (Category: ${p.category})\n   Description Summary: ${desc}`);

        if (imgUrl) {
          const parsed = await fetchAndParseImage(imgUrl);
          if (parsed) {
            imagesList.push(parsed);
          }
        }
      }

      const productsListStr = productsList.join('\n\n');

      const systemPrompt = `You are a professional visual art director for an aesthetic lifestyle brand named "${brand_name}".
Your task is to write a high-quality, professional image generation prompt for a multimodal model.
The prompt must describe a single, cohesive, styled environment (like a cozy bedroom, a minimalist desk setup, or a warm living room nook) that naturally blends the products shown in the reference images together:

${productsListStr}

Use the brand guidelines:
"${niche_prompt_directive}"

The prompt MUST follow this exact structural format and phrasing:
"A photorealistic composite scene containing the provided products in the reference images. Place them together inside a styled [describe the environment/furniture and placements], [describe lighting, composition, and visual qualities]."

CRITICAL VISUAL COMPLIANCE:
1. Do NOT describe the products themselves. The model can see the reference images, so describing product details (like shape, color, or text) is unnecessary and causes the AI to hallucinate incorrect details.
2. Focus entirely on describing the environment, placement, and visual styling of the scene where the products are placed.
3. The prompt MUST start with the exact phrase: "A photorealistic composite scene containing the provided products in the reference images. Place them together inside a styled " followed by your environment description.
4. Output ONLY the raw prompt text. Do not write introductory words or wrap in quotes. Keep it to 2 or 3 concise descriptive sentences.`;

      const promptResponse = await generateContentWithRetry({
        apiKey: gemini_api_key,
        prompt: systemPrompt,
        images: imagesList.length > 0 ? imagesList : undefined
      });

      const detailedScenePrompt = promptResponse.text?.trim() || `A photorealistic composite scene containing the provided products in the reference images. Place them together inside a styled clean and decorated setup.`;
      
      return NextResponse.json({ success: true, prompt: detailedScenePrompt });
    }

    // ACTION 2: RUN MULTIMODAL OR IMAGEN TO GENERATE THE COLLECTION SCENE
    if (action === 'mockup') {
      const { prompt, products } = body;
      if (!prompt) {
        return NextResponse.json({ error: 'Prompt is required to generate a scene image' }, { status: 400 });
      }

      // Fetch and parse all product images
      const parsedImages: { mimeType: string; data: string }[] = [];
      if (products && Array.isArray(products)) {
        for (const p of products) {
          let imgUrl = p.mainImage || '';
          if (p.galleryImages && typeof p.galleryImages === 'string') {
            try {
              const parsedGallery = JSON.parse(p.galleryImages);
              if (parsedGallery.originalProductImage) {
                imgUrl = parsedGallery.originalProductImage;
              }
            } catch (_) {}
          }
          if (imgUrl) {
            const parsed = await fetchAndParseImage(imgUrl);
            if (parsed) {
              parsedImages.push(parsed);
            }
          }
        }
      }

      if (parsedImages.length > 0) {
        console.log(`Sending prompt and ${parsedImages.length} images to gemini-3.1-flash-image-preview for scene mockup...`);
        
        // Upload all parsed images to Gemini Files API
        const uploadedFiles: { name: string; uri: string; mimeType: string }[] = [];
        for (let idx = 0; idx < parsedImages.length; idx++) {
          const parsedImage = parsedImages[idx];
          const imageBuffer = Buffer.from(parsedImage.data, 'base64');
          const imageBlob = new Blob([imageBuffer], { type: parsedImage.mimeType });
          const uploadedFile = await ai.files.upload({
            file: imageBlob,
            config: {
              mimeType: parsedImage.mimeType,
            },
          });
          if (uploadedFile.name && uploadedFile.uri && uploadedFile.mimeType) {
            uploadedFiles.push({
              name: uploadedFile.name,
              uri: uploadedFile.uri,
              mimeType: uploadedFile.mimeType,
            });
          }
        }

        try {
          const contentParts = [
            { text: prompt },
            ...uploadedFiles.map(file => ({
              fileData: {
                fileUri: file.uri,
                mimeType: file.mimeType,
              },
            })),
          ];

          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: [
              {
                role: 'user',
                parts: contentParts,
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
          // Clean up all uploaded files
          for (const file of uploadedFiles) {
            try {
              await ai.files.delete({ name: file.name });
              console.log('Successfully deleted temp file from Gemini API storage:', file.name);
            } catch (deleteError) {
              console.warn('Failed to delete temp file from Gemini API storage:', deleteError);
            }
          }
        }
      } else {
        console.log('No product images parsed or available. Falling back to Imagen 4 text-to-image...');
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
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Collection Scene API handler error:', error);
    return NextResponse.json({ error: error.message || 'Collection scene generation failed' }, { status: 500 });
  }
}
