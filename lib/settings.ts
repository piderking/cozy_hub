import { prisma } from './prisma';

export interface HubSettings {
  brand_name: string;
  brand_tagline: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  gemini_api_key: string;
  zernio_api_key: string;
  pinterest_board_id: string;
  amazon_tag: string;
  niche_prompt_directive: string;
  store_url: string;
  bot_username: string;

  // New Brand profile fields
  target_audience: string;
  store_aesthetic: string;
  brand_voice: string;
  brand_color_ideas: string;
  content_focus: string;
  store_direction: string;
  instagram_cta_style: string;
  exclude_keywords: string;

  // New Custom Prompt fields
  prompt_curator: string;
  prompt_copywriter: string;
  prompt_collection_copy: string;
  prompt_suggest: string;
  prompt_influencer: string;
  prompt_scene_prompt: string;
  prompt_mockup_prompt: string;
  rapidapi_key: string;
  rapidapi_host: string;
}

export const DEFAULT_SETTINGS: HubSettings = {
  brand_name: 'Cozy Hub',
  brand_tagline: 'Hand-picked items to make your space feel like home',
  primary_color: '#d97706', // Cozy Warm Amber
  secondary_color: '#1e293b', // Slate 800
  background_color: '#0b0f17', // Very Dark Slate
  text_color: '#f8fafc', // Warm Slate White
  gemini_api_key: '',
  zernio_api_key: '',
  pinterest_board_id: '',
  amazon_tag: 'cozyhub-20',
  niche_prompt_directive: 'You write product reviews for our catalog which focuses on warm, cozy, minimalist, and beautifully designed home decor, study spaces, kitchen gadgets, and comfort products. Keep the tone warm, welcoming, descriptive, and conversion-oriented.',
  store_url: 'http://localhost:3000',
  bot_username: '_cozy_hub',

  target_audience: 'Design-conscious homebodies, remote workers, students, and creators who appreciate cozy, warm, and clean room aesthetics.',
  store_aesthetic: 'Cozy warm minimalist',
  brand_voice: 'Warm, welcoming, descriptive, inspiring, and design-focused.',
  brand_color_ideas: 'Warm amber accents, soft charcoal or deep slate card bases, very dark cozy slate backgrounds, and warm white text.',
  content_focus: 'Ambient lamps, desk organizers, aesthetic coffee mugs, warm throw blankets, minimalist study accessories.',
  store_direction: 'Cozy Hub is curated to make any bedroom, study, or living space feel like a warm sanctuary. We showcase beautifully designed, functional minimalist items that elevate day-to-day comfort and study productivity.',
  instagram_cta_style: 'DM me \'{TRIGGER}\' or comment \'{TRIGGER}\' below for the direct link! 🛍️✨',
  exclude_keywords: 'cheap, bargain, cheap price, buy now, deal',

  prompt_curator: `You are a professional web scraper and structured data extractor. 
Your task is to analyze the provided raw web content (HTML or plain text) of an Amazon product page, extract key information, and return it in a clean, valid JSON format.
Do not make up information. If a field is not found in the text, return an empty string or empty array.
Clean the title: remove seller fluff and keep it readable.
Raw Description: Extract a comprehensive text summary of the original product description, details, specifications or bullet points found on the page.
Category: Choose a single category matching the product (e.g., Bedroom, Living Room, Desk Setup, Kitchen, Tech, Apparel, Outdoors).
Pros: List 2 to 3 pros.
Cons: List 1 to 2 cons.
Features: List 3 to 5 main features.
Stars: Extract the customer rating as a float between 1.0 and 5.0 (e.g., 4.6).
Reviews Count: Extract the total number of ratings/reviews as a formatted string (e.g., "12,845" or "943").`,

  prompt_copywriter: `You are an expert affiliate marketer, SEO copywriter, and social media content creator.
Your job is to write compelling copy for a product catalog named "{brand_name}" and draft matching social media posts to drive clicks.

Follow these brand guidelines:
"{niche_prompt_directive}"

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
6. Pinterest Pin Description: SEO-optimized, highly engaging description. The first line must contain the affiliate disclosure (e.g. "#ad 📌 [Title]"), emphasizing benefits, aesthetic appeal, emojis, and hashtags. CRITICAL: The entire Pinterest pin description text MUST be strictly under 480 characters to comply with Pinterest's maximum length limits. Do NOT put any URL link, website address, or link string in the Pinterest pin description text (it will be linked via the Pin metadata instead).`,

  prompt_collection_copy: `You are a professional social media manager and copywriter for an aesthetic lifestyle brand named "{brand_name}".
Your task is to write high-converting social media copy for a themed scene bundle (Collection) that features multiple products.
Brand guidelines:
"{niche_prompt_directive}"

The collection details:
Title: "{title}"
Description: "{description}"
Products in this scene:
{productsList}

CRITICAL COMPLIANCE & TRIGGER RULES:
1. First line of EVERY post must start with an FTC-compliant affiliate disclosure (e.g. '#ad').
2. For Instagram: The caption must explicitly instruct users to comment or DM a specific word (we suggest: "{triggerWord}") to receive the link to this collection in their DMs automatically (e.g., "Comment '{triggerWord}' or DM me to get the setup details sent to your DMs! 💻✨"). Do NOT include any direct link, URL, or website address in the Instagram caption text.
3. For Pinterest: The description must be under 480 characters. Do NOT put any URL link or website address in the Pinterest pin description text (it will be linked via the Pin metadata instead).
4. Use plenty of appropriate emojis to style the text beautifully.`,

  prompt_suggest: `You are a professional interior stylist, visual merchandiser, and marketing coordinator for an aesthetic home decor and lifestyle brand named "{brand_name}".
Your task is to review the catalog products and suggest a themed scene bundle (Collection) that groups 2 to 4 products that logically and beautifully fit together.

Brand guidelines:
"{niche_prompt_directive}"

Review this catalog:
{productsSummary}

Choose a cohesive aesthetic theme (e.g. "Warm Bedtime Sanctuary", "Cozy Dorm Study Essentials", "Minimalist Living Room Corner").
Suggest:
1. Title: An engaging, aesthetic title for the collection.
2. Description: A beautiful, paragraph-based description (100-150 words) describing the scene, the styling, and how the products complement each other.
3. TriggerWord: A single, short, clean trigger word for Instagram comments (e.g. "cozy", "desk", "room", "nook").
4. Product IDs: The array of matching product IDs you selected from the list above. You MUST choose ONLY valid IDs from the list provided. Do not invent any new IDs.`,

  prompt_influencer: `You are a viral social media director and creative copywriter for an aesthetic home decor and lifestyle brand named "{brand_name}".
Your task is to generate a comprehensive short-form video creation package (Reel / TikTok script outline) tailored to promote a curated set of products.
Our brand guidelines:
"{niche_prompt_directive}"

The package must contain hook options, a suggested comment responder trigger word, an engaging caption encouraging comments, scene-by-scene filming instructions, and visual/styling tips.`,

  prompt_scene_prompt: `You are a professional visual art director for an aesthetic lifestyle brand named "{brand_name}".
Your task is to write a high-quality, professional image generation prompt for a multimodal model.
The prompt must describe a single, cohesive, styled environment (like a cozy bedroom, a minimalist desk setup, or a warm living room nook) that naturally blends the products shown in the reference images together:

{productsListStr}

Use the brand guidelines:
"{niche_prompt_directive}"

The prompt MUST follow this exact structural format and phrasing:
"A photorealistic composite scene containing the provided products in the reference images. Place them together inside a styled [describe the environment/furniture and placements], [describe lighting, composition, and visual qualities]."

CRITICAL VISUAL COMPLIANCE:
1. Do NOT describe the products themselves. The model can see the reference images, so describing product details (like shape, color, or text) is unnecessary and causes the AI to hallucinate incorrect details.
2. Focus entirely on describing the environment, placement, and visual styling of the scene where the products are placed.
3. The prompt MUST start with the exact phrase: "A photorealistic composite scene containing the provided products in the reference images. Place them together inside a styled " followed by your environment description.
4. Output ONLY the raw prompt text. Do not write introductory words or wrap in quotes. Keep it to 2 or 3 concise descriptive sentences.`,

  prompt_mockup_prompt: `You are a visual art director for an aesthetic product review brand named "{brand_name}".
Your task is to write a high-quality, professional image generation prompt for a multimodal image-to-image model.
The goal of the prompt is to visualize the product provided in the reference image inside a themed environment matching these guidelines:
"{niche_prompt_directive}"

The prompt MUST follow this exact structural format and phrasing:
"A photorealistic mockup of the provided product in the reference image. Place it inside a styled [describe the environment/background details matching the category '{category}' and guidelines], [describe lighting, composition, and visual qualities]."

CRITICAL INSTRUCTIONS:
1. Do NOT describe the product itself. The model can see the reference image, so describing the product details (like shape, color, or text) is unnecessary and causes the AI to hallucinate incorrect details.
2. Focus entirely on describing the environment, placement, and lighting where the product should be placed.
3. The prompt MUST start with the exact phrase: "A photorealistic mockup of the provided product in the reference image. Place it inside a " followed by your environment description.
4. Output ONLY the raw prompt text. Do not write introductory words or wrap in quotes. Keep it to 1 or 2 concise descriptive sentences.`,
  rapidapi_key: '',
  rapidapi_host: 'real-time-amazon-data.p.rapidapi.com',
};

export async function getSettings(): Promise<HubSettings> {
  try {
    const dbSettings = await prisma.setting.findMany();
    const settingsMap = new Map(dbSettings.map(s => [s.key, s.value]));

    return {
      brand_name: settingsMap.get('brand_name') ?? DEFAULT_SETTINGS.brand_name,
      brand_tagline: settingsMap.get('brand_tagline') ?? DEFAULT_SETTINGS.brand_tagline,
      primary_color: settingsMap.get('primary_color') ?? DEFAULT_SETTINGS.primary_color,
      secondary_color: settingsMap.get('secondary_color') ?? DEFAULT_SETTINGS.secondary_color,
      background_color: settingsMap.get('background_color') ?? DEFAULT_SETTINGS.background_color,
      text_color: settingsMap.get('text_color') ?? DEFAULT_SETTINGS.text_color,
      gemini_api_key: process.env.GEMINI_API_KEY || '',
      zernio_api_key: process.env.ZERNIO_API_KEY || process.env.UPLOADPOST_API_KEY || process.env.AYRSHARE_API_KEY || '',
      pinterest_board_id: settingsMap.get('pinterest_board_id') ?? '',
      amazon_tag: settingsMap.get('amazon_tag') ?? DEFAULT_SETTINGS.amazon_tag,
      niche_prompt_directive: settingsMap.get('niche_prompt_directive') ?? DEFAULT_SETTINGS.niche_prompt_directive,
      store_url: settingsMap.get('store_url') ?? DEFAULT_SETTINGS.store_url,
      bot_username: settingsMap.get('bot_username') ?? DEFAULT_SETTINGS.bot_username,

      // Brand profile mappings
      target_audience: settingsMap.get('target_audience') ?? DEFAULT_SETTINGS.target_audience,
      store_aesthetic: settingsMap.get('store_aesthetic') ?? DEFAULT_SETTINGS.store_aesthetic,
      brand_voice: settingsMap.get('brand_voice') ?? DEFAULT_SETTINGS.brand_voice,
      brand_color_ideas: settingsMap.get('brand_color_ideas') ?? DEFAULT_SETTINGS.brand_color_ideas,
      content_focus: settingsMap.get('content_focus') ?? DEFAULT_SETTINGS.content_focus,
      store_direction: settingsMap.get('store_direction') ?? DEFAULT_SETTINGS.store_direction,
      instagram_cta_style: settingsMap.get('instagram_cta_style') ?? DEFAULT_SETTINGS.instagram_cta_style,
      exclude_keywords: settingsMap.get('exclude_keywords') ?? DEFAULT_SETTINGS.exclude_keywords,

      // Custom Prompt mappings
      prompt_curator: settingsMap.get('prompt_curator') ?? DEFAULT_SETTINGS.prompt_curator,
      prompt_copywriter: settingsMap.get('prompt_copywriter') ?? DEFAULT_SETTINGS.prompt_copywriter,
      prompt_collection_copy: settingsMap.get('prompt_collection_copy') ?? DEFAULT_SETTINGS.prompt_collection_copy,
      prompt_suggest: settingsMap.get('prompt_suggest') ?? DEFAULT_SETTINGS.prompt_suggest,
      prompt_influencer: settingsMap.get('prompt_influencer') ?? DEFAULT_SETTINGS.prompt_influencer,
      prompt_scene_prompt: settingsMap.get('prompt_scene_prompt') ?? DEFAULT_SETTINGS.prompt_scene_prompt,
      prompt_mockup_prompt: settingsMap.get('prompt_mockup_prompt') ?? DEFAULT_SETTINGS.prompt_mockup_prompt,
      rapidapi_key: process.env.RAPIDAPI_KEY || (settingsMap.get('rapidapi_key') ?? ''),
      rapidapi_host: process.env.RAPIDAPI_HOST || (settingsMap.get('rapidapi_host') ?? DEFAULT_SETTINGS.rapidapi_host),
    };
  } catch (error) {
    console.error('Error fetching settings from database:', error);
    return {
      ...DEFAULT_SETTINGS,
      gemini_api_key: process.env.GEMINI_API_KEY || '',
      zernio_api_key: process.env.ZERNIO_API_KEY || process.env.UPLOADPOST_API_KEY || process.env.AYRSHARE_API_KEY || '',
      pinterest_board_id: process.env.PINTEREST_BOARD_ID || '',
      rapidapi_key: process.env.RAPIDAPI_KEY || '',
      rapidapi_host: process.env.RAPIDAPI_HOST || 'real-time-amazon-data.p.rapidapi.com',
    };
  }
}

export async function saveSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
