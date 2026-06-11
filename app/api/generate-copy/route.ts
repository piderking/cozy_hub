import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';
import { generateContentWithRetry } from '@/lib/gemini';

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
    const { title, rawDescription, category, features, pros, cons, affiliateUrl, originalUrl } = product;

    if (!title) {
      return NextResponse.json({ error: 'Product title is required' }, { status: 400 });
    }

    const systemPrompt = `You are an expert affiliate marketer, SEO copywriter, and social media content creator.
Your job is to write compelling copy for a product catalog named "${brand_name}" and draft matching social media posts to drive clicks.

Follow these brand guidelines:
"${niche_prompt_directive}"

Make all copy visually beautiful, stylish, and highly engaging by incorporating plenty of appropriate emojis (like ✨, 🏠, 🛋️, 🌸, 🌿) across the title, description, and social posts.

CRITICAL COMPLIANCE REQUIREMENT: You MUST include a clear affiliate relationship disclosure (such as '#ad' or '#CommissionsEarned') in the very first line of each social media post draft (Instagram, Pinterest) to comply with FTC "Above the Fold" guidelines. This disclosure must appear before any link or main body content.

Use the product title, raw description, and category details to capture its aesthetic style, colors, materials, and design details in your copywriting. Make sure the custom description fits the style of the product.

Do NOT mention any pricing or cost in the catalog description or social media posts, as static prices violate Amazon Associates policies.

Write the following:
1. Custom Title: A clean, aesthetic, and themed title for the product listing with an emoji (e.g. "Minimalist Walnut Desk Lamp 💡" instead of the original long junk-filled Amazon title).
2. Custom Description: A rich, paragraph-based website review/description (150-250 words) with emojis that describes the product, why it's great, and how it fits into the brand's style/niche.
3. Instagram Caption: Engaging, pretty caption. The first line must contain the affiliate disclosure (e.g. "#ad ✨ [Title]"), followed by a visual hook, body paragraphs, emojis, and a block of 5 to 10 relevant, targeted hashtags (e.g., #homedecor #cozyhome etc.). CRITICAL: Do NOT put any URL link, web address, link string, or the comment/DM call-to-action in the Instagram caption text.
4. Instagram First Comment: A clean first comment containing the call-to-action instructing users to comment or DM a specific trigger word (e.g., "DM 'COZY' or comment 'DESK' for the link to shop! 🛍️✨").
5. Pinterest Pin Title: A short, catching title for the Pinterest Pin under 100 characters (incorporate aesthetic words or emojis if fitting).
6. Pinterest Pin Description: SEO-optimized, highly engaging description. The first line must contain the affiliate disclosure (e.g. "#ad 📌 [Title]"), emphasizing benefits, aesthetic appeal, emojis, and hashtags. CRITICAL: The entire Pinterest pin description text MUST be strictly under 480 characters to comply with Pinterest's maximum length limits. Do NOT put any URL link, website address, or link string in the Pinterest pin description text (it will be linked via the Pin metadata instead).
`;

    const prompt = `Generate copywriting for the following product:
Original Title: ${title}
Original Description Summary: ${rawDescription || ''}
Category: ${category}
Key Features: ${Array.isArray(features) ? features.join(', ') : features}
Pros: ${Array.isArray(pros) ? pros.join(', ') : pros}
Cons: ${Array.isArray(cons) ? cons.join(', ') : cons}
Amazon Affiliate Link: ${affiliateUrl || ''}

CRITICAL LINK RULES:
1. Do NOT include the "Amazon Affiliate Link" or any other link/URL inside the post text or caption text for Instagram or Pinterest.
2. For Instagram:
   - Place the caption text in "instagramPost" (without any comment/DM call-to-action).
   - Place the call-to-action (e.g., "DM 'COZY' or comment 'DESK' for the link to shop! 🛍️✨") in "instagramFirstComment".
3. For Pinterest, write a description focusing purely on benefits and aesthetic appeal (without any URL string).

Return the outputs strictly in JSON format with these exact keys:
{
  "customTitle": "Clean aesthetic product title...",
  "customDescription": "Web review paragraph...",
  "instagramPost": "Instagram caption text...",
  "instagramFirstComment": "Instagram first comment with trigger CTA...",
  "pinterestPost": "Pinterest pin description...",
  "pinterestTitle": "Pinterest Pin Title under 100 characters..."
}`;

    const response = await generateContentWithRetry({
      apiKey: gemini_api_key,
      prompt: systemPrompt + '\n\n' + prompt,
      responseMimeType: 'application/json',
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
    if (parsedData && typeof parsedData === 'object') {
      parsedData.pinterestLink = affiliateUrl || originalUrl || '';
      if (!parsedData.pinterestTitle) {
        parsedData.pinterestTitle = parsedData.customTitle || title || '';
      }

      // Copy Instagram CTA first comment to description if both exist
      if (parsedData.instagramPost && parsedData.instagramFirstComment) {
        const cta = parsedData.instagramFirstComment.trim();
        const postText = parsedData.instagramPost.trim();
        if (cta && !postText.toLowerCase().includes(cta.toLowerCase())) {
          parsedData.instagramPost = postText + '\n\n' + cta;
        }
      }

      const keys = ['instagramPost', 'pinterestPost'] as const;
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
    return NextResponse.json({ error: error.message || 'Copywriting generation failed' }, { status: 500 });
  }
}
