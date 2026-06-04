import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSettings } from '@/lib/settings';

export async function POST(request: Request) {
  try {
    const settings = await getSettings();
    const { gemini_api_key, niche_prompt_directive, brand_name } = settings;

    if (!gemini_api_key || gemini_api_key.includes('your_gemini_api_key')) {
      return NextResponse.json(
        { error: 'Please configure a valid Gemini API Key in the settings dashboard tab first.' },
        { status: 400 }
      );
    }

    const product = await request.json();
    const { title, rawDescription, category, features, pros, cons, affiliateUrl } = product;

    if (!title) {
      return NextResponse.json({ error: 'Product title is required' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: gemini_api_key });

    const systemPrompt = `You are an expert affiliate marketer, SEO copywriter, and social media content creator.
Your job is to write compelling copy for a product catalog named "${brand_name}" and draft matching social media posts to drive clicks.

Follow these brand guidelines:
"${niche_prompt_directive}"

Make all copy visually beautiful, stylish, and highly engaging by incorporating plenty of appropriate emojis (like ✨, 🏠, 🛋️, 🌸, 🌿) across the title, description, and social posts.

CRITICAL COMPLIANCE REQUIREMENT: You MUST include a clear affiliate relationship disclosure (such as '#ad' or '#CommissionsEarned') in the very first line of each social media post draft (Instagram, Pinterest, X/Twitter) to comply with FTC "Above the Fold" guidelines. This disclosure must appear before any link or main body content.

Use the product title, raw description, and category details to capture its aesthetic style, colors, materials, and design details in your copywriting. Make sure the custom description fits the style of the product.

Do NOT mention any pricing or cost in the catalog description or social media posts, as static prices violate Amazon Associates policies.

Write the following:
1. Custom Title: A clean, aesthetic, and themed title for the product listing with an emoji (e.g. "Minimalist Walnut Desk Lamp 💡" instead of the original long junk-filled Amazon title).
2. Custom Description: A rich, paragraph-based website review/description (150-250 words) with emojis that describes the product, why it's great, and how it fits into the brand's style/niche.
3. Instagram Caption: Engaging, pretty caption. The first line must contain the affiliate disclosure (e.g. "#ad ✨ [Title]"), followed by a visual hook, body paragraphs, emojis, the Amazon affiliate link provided (e.g. "Get it here: [Affiliate Link]"), and a block of 5 to 10 relevant, targeted hashtags (e.g., #homedecor #cozyhome etc.) to drive reach.
4. Pinterest Pin Description: SEO-optimized, highly engaging description. The first line must contain the affiliate disclosure (e.g. "#ad 📌 [Title]"), emphasizing benefits, aesthetic appeal, emojis, the Amazon affiliate link, and hashtags. CRITICAL: The entire Pinterest pin description text MUST be strictly under 480 characters to comply with Pinterest's maximum length limits.
5. X (Twitter) Post: Punchy, under 280 characters. The first line must contain the affiliate disclosure (e.g. "#ad ✨ [Title]"), followed by an engaging hook, emojis, the Amazon affiliate link, and 2-3 hashtags (do not use generic placeholders like [LINK] if an affiliate link is provided).
`;

    const prompt = `Generate copywriting for the following product:
Original Title: ${title}
Original Description Summary: ${rawDescription || ''}
Category: ${category}
Key Features: ${Array.isArray(features) ? features.join(', ') : features}
Pros: ${Array.isArray(pros) ? pros.join(', ') : pros}
Cons: ${Array.isArray(cons) ? cons.join(', ') : cons}
Amazon Affiliate Link: ${affiliateUrl || ''}

CRITICAL: You must use the exact "Amazon Affiliate Link" provided above directly inside the Instagram caption, Pinterest description, and X (Twitter) post text. Do not invent any fake URL, and do not use 'https://amzn.to/example' or '[Affiliate Link]' as placeholders.

Return the outputs strictly in JSON format with these exact keys:
{
  "customTitle": "Clean aesthetic product title...",
  "customDescription": "Web review paragraph...",
  "instagramPost": "Instagram caption text...",
  "pinterestPost": "Pinterest pin description...",
  "xPost": "Twitter post text..."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + prompt }] }
      ],
      config: {
        responseMimeType: 'application/json',
      }
    });

    const responseText = response.text || '{}';
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(responseText.trim());
    } catch (parseError) {
      console.error('Failed to parse Gemini copywriter output as JSON:', responseText, parseError);
      const jsonRegex = /\{[\s\S]*\}/;
      const match = responseText.match(jsonRegex);
      if (match) {
        try {
          parsedData = JSON.parse(match[0]);
        } catch (_) {
          return NextResponse.json({ error: 'Gemini copywriter failed to return structured JSON. Please try again.' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: 'Gemini copywriter failed to return structured JSON. Please try again.' }, { status: 500 });
      }
    }

    // Fail-safe post-processing replacement for affiliate link placeholders
    if (affiliateUrl && typeof parsedData === 'object' && parsedData !== null) {
      const keys = ['instagramPost', 'pinterestPost', 'xPost'] as const;
      keys.forEach(key => {
        if (parsedData[key] && typeof parsedData[key] === 'string') {
          parsedData[key] = parsedData[key]
            .replace(/https:\/\/amzn\.to\/example/gi, affiliateUrl)
            .replace(/\[Affiliate Link\]/gi, affiliateUrl)
            .replace(/\[LINK\]/gi, affiliateUrl)
            .replace(/YOUR_AFFILIATE_LINK/gi, affiliateUrl);
        }
      });
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Gemini copywriter error:', error);
    return NextResponse.json({ error: error.message || 'Gemini copywriting generation failed' }, { status: 500 });
  }
}
