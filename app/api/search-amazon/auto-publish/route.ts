import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSettings } from '@/lib/settings';
import { generateContentWithRetry } from '@/lib/gemini';
import { prisma } from '@/lib/prisma';

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

    if (!gemini_api_key || gemini_api_key.includes('your_gemini_api_key') || gemini_api_key.trim() === '') {
      return NextResponse.json(
        { error: 'Please configure a valid Gemini API Key in the settings tab first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, image, price, stars, reviewsCount, url } = body.product;

    if (!title) {
      return NextResponse.json({ error: 'Product title is required' }, { status: 400 });
    }

    // STEP 1: Combined Gemini Curation & Copywriting Generation
    const systemPrompt = `You are an automated aesthetic product curator and social media marketer for a brand named "${brand_name || 'Cozy Hub'}".
Brand Guidelines:
"${niche_prompt_directive || ''}"

Your task is to analyze the product title: "${title}" and generate:
1. Category: Choose a single category from: Bedroom, Living Room, Desk Setup, Kitchen, Tech, Apparel, Outdoors.
2. Custom Title: A clean, emoji-styled, readable catalog title.
3. Custom Description: A rich paragraph website review (150-250 words) with emojis.
4. Pros: 2 to 3 pros.
5. Cons: 1 to 2 cons.
6. Features: 3 to 5 key features/specs.
7. Mockup Prompt: A photorealistic mockup prompt for a multimodal image generator. The prompt MUST start with: "A photorealistic mockup of the provided product in the reference image. Place it inside a styled " followed by the environment description. Do not describe the product itself.
8. Instagram Caption: Captivating post caption starting with a compliant affiliate disclosure (e.g. "#ad"). Do NOT include direct URLs.
9. Instagram First Comment: Call-to-action comment instructing users to reply or comment with a trigger word to get the link.
10. Pinterest Title: A Pinterest Pin title under 100 characters.
11. Pinterest Post: An SEO-optimized Pin description under 480 characters starting with a compliant affiliate disclosure (e.g., "#ad").

You MUST return ONLY a valid JSON object matching this structure (no markdown wrapper, no conversational fillers):
{
  "category": "Bedroom",
  "customTitle": "Minimalist Walnut Desk Lamp 💡",
  "customDescription": "Web review paragraph...",
  "features": ["feature 1", "feature 2"],
  "pros": ["pro 1", "pro 2"],
  "cons": ["con 1"],
  "mockupPrompt": "A photorealistic mockup of the provided product in the reference image. Place it inside a styled...",
  "instagramPost": "Instagram caption text...",
  "instagramFirstComment": "Comment 'LAMP' or DM me to get the direct setup link! 🛍️✨",
  "pinterestTitle": "Aesthetic walnut desk lamp for study setups",
  "pinterestPost": "Pinterest pin description..."
}`;

    console.log(`[Auto-Publish] Requesting Gemini to curate details for: "${title}"`);
    const curationResponse = await generateContentWithRetry({
      apiKey: gemini_api_key,
      prompt: systemPrompt + `\n\nAnalyze and generate for: "${title}"`,
      responseMimeType: 'application/json'
    });

    const curationText = curationResponse.text || '{}';
    let parsedData: any;
    try {
      parsedData = JSON.parse(curationText.trim());
    } catch (parseError) {
      console.error('Failed to parse auto-curate output as JSON:', curationText, parseError);
      const jsonRegex = /\{[\s\S]*\}/;
      const match = curationText.match(jsonRegex);
      if (match) {
        parsedData = JSON.parse(match[0]);
      } else {
        throw new Error('Gemini did not return structured curation JSON.');
      }
    }

    const {
      category,
      customTitle,
      customDescription,
      features,
      pros,
      cons,
      mockupPrompt,
      instagramPost,
      instagramFirstComment,
      pinterestTitle,
      pinterestPost
    } = parsedData;

    // STEP 2: Imagen Room Mockup Image Generation
    console.log(`[Auto-Publish] Triggering room mockup generation for: "${customTitle}"`);
    const ai = new GoogleGenAI({ apiKey: gemini_api_key });
    const parsedImage = await fetchAndParseImage(image);
    let generatedImageUrl = '';

    if (parsedImage) {
      const imageBuffer = Buffer.from(parsedImage.data, 'base64');
      const imageBlob = new Blob([imageBuffer], { type: parsedImage.mimeType });

      const uploadedFile = await ai.files.upload({
        file: imageBlob,
        config: { mimeType: parsedImage.mimeType }
      });

      if (uploadedFile.name && uploadedFile.uri && uploadedFile.mimeType) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: [
              { role: 'user', parts: [
                { text: mockupPrompt || `A photorealistic mockup of the provided product in the reference image. Place it inside a cozy styled ${category} setup.` },
                { fileData: { fileUri: uploadedFile.uri, mimeType: uploadedFile.mimeType } }
              ]}
            ],
            config: { responseModalities: ['TEXT', 'IMAGE'] }
          });

          const candidate = response.candidates?.[0];
          const parts = candidate?.content?.parts || [];
          const imagePart = parts.find(p => p.inlineData);

          if (imagePart?.inlineData?.data) {
            const mime = imagePart.inlineData.mimeType || 'image/png';
            generatedImageUrl = `data:${mime};base64,${imagePart.inlineData.data}`;
          }
        } catch (err) {
          console.error('Flash Image Preview failed, falling back to Imagen 4 text-to-image:', err);
        } finally {
          try {
            await ai.files.delete({ name: uploadedFile.name });
          } catch (_) {}
        }
      }
    }

    if (!generatedImageUrl) {
      console.log('[Auto-Publish] Using Imagen 4 fallback for mockup...');
      const imageResponse = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: mockupPrompt || `A photorealistic composite scene showcasing a cozy, warm minimalist ${category} setup.`,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1'
        }
      });
      if (imageResponse.generatedImages?.[0]?.image?.imageBytes) {
        generatedImageUrl = `data:image/png;base64,${imageResponse.generatedImages[0].image.imageBytes}`;
      }
    }

    // STEP 3: Format Affiliate URL
    let affiliateUrl = url;
    if (settings.amazon_tag && url) {
      try {
        const urlObj = new URL(url);
        urlObj.searchParams.set('tag', settings.amazon_tag);
        affiliateUrl = urlObj.toString();
      } catch (_) {}
    }

    // STEP 4: Save Product in SQLite DB
    console.log(`[Auto-Publish] Saving product "${customTitle}" to the database...`);
    const savedProduct = await prisma.product.create({
      data: {
        title: customTitle || title,
        originalUrl: url || '',
        affiliateUrl: affiliateUrl || url || '',
        category: category || 'Bedroom',
        mainImage: generatedImageUrl || image || '',
        galleryImages: JSON.stringify([image].filter(Boolean)),
        customDescription: customDescription || '',
        pros: JSON.stringify(pros || []),
        cons: JSON.stringify(cons || []),
        isPublished: true,
        stars: parseFloat(stars) || 4.5,
        reviewsCount: String(reviewsCount) || '0'
      }
    });

    // STEP 5: Create Instagram Social Post Draft
    console.log('[Auto-Publish] Creating social post draft...');
    const socialPostContent = `${instagramPost || ''}\n\n${instagramFirstComment || ''}`;
    await prisma.socialPost.create({
      data: {
        productId: savedProduct.id,
        platform: 'instagram',
        generatedContent: socialPostContent,
        status: 'DRAFT',
        triggerWords: 'link,setup,shop'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Product curated, mockup generated, and catalog item published successfully!',
      product: savedProduct
    });

  } catch (error: any) {
    console.error('Auto-publish route failed:', error);
    return NextResponse.json({ error: error.message || 'Auto-publishing failed' }, { status: 500 });
  }
}
