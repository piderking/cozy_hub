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
    };
  } catch (error) {
    console.error('Error fetching settings from database:', error);
    // Return defaults if database is not ready or fails
    return {
      ...DEFAULT_SETTINGS,
      gemini_api_key: process.env.GEMINI_API_KEY || '',
      zernio_api_key: process.env.ZERNIO_API_KEY || process.env.UPLOADPOST_API_KEY || process.env.AYRSHARE_API_KEY || '',
      pinterest_board_id: process.env.PINTEREST_BOARD_ID || '',
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
