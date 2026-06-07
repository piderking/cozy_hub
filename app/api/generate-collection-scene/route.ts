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
Your task is to write a detailed, high-quality, professional image generation prompt for Google's Imagen model.
The prompt must describe a single, cohesive, styled environment (like a cozy bedroom, a minimalist desk setup, or a warm living room nook) that naturally blends the products shown in the attached reference images together:

${productsListStr}

Use the brand guidelines:
"${niche_prompt_directive}"

The prompt MUST follow this exact structural format and phrasing:
"Exactly copy and replicate the products from the reference images, maintaining their precise shapes, colors, materials, textures, and physical design details, and place them together into a styled space that [describe the environment/furniture and placements], [describe lighting, composition, and visual qualities]."

CRITICAL VISUAL COMPLIANCE:
1. Do NOT use generic terms like "professional product photography" or generic descriptions of products. You must describe each product in the reference images with extreme visual precision so that the generated image includes the EXACT products from the references.
2. The prompt MUST start with the exact phrase: "Exactly copy and replicate the products from the reference images, maintaining their precise shapes, colors, materials, textures, and physical design details, and place them together into a space that " followed by the scene details.
3. You must carefully analyze each of the attached product reference images. Describe the physical styling, materials, shape, colors, and visual details of these products as closely as possible to their reference images and descriptions. This ensures that when Google's Imagen model generates the composite scene, each product in the scene remains visually consistent and as close to its actual reference product image as possible.

IMPORTANT: Output ONLY the raw prompt text. Do not write introductory words or wrap in quotes. Keep it to 1 or 2 concise descriptive sentences.`;

      const promptResponse = await generateContentWithRetry({
        apiKey: gemini_api_key,
        prompt: systemPrompt,
        images: imagesList.length > 0 ? imagesList : undefined
      });

      const detailedScenePrompt = promptResponse.text?.trim() || `Exactly copy and replicate the products from the reference images, maintaining their precise shapes, colors, materials, textures, and physical design details, and place them together into a space that is clean and styled.`;
      
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
