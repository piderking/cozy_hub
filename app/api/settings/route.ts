import { NextResponse } from 'next/server';
import { getSettings, saveSetting } from '@/lib/settings';

export async function GET() {
  try {
    const settings = await getSettings();
    // Return settings to the client, but omit sensitive credentials
    const safeSettings = { ...settings };
    delete (safeSettings as any).gemini_api_key;
    delete (safeSettings as any).zernio_api_key;
    return NextResponse.json(safeSettings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Save each key-value pair provided in the request body, omitting sensitive keys
    for (const [key, value] of Object.entries(body)) {
      if (key === 'gemini_api_key' || key === 'zernio_api_key') {
        continue; // Skip saving sensitive keys to the database
      }
      if (typeof value === 'string') {
        await saveSetting(key, value);
      }
    }
    
    const updatedSettings = await getSettings();
    const safeSettings = { ...updatedSettings };
    delete (safeSettings as any).gemini_api_key;
    delete (safeSettings as any).zernio_api_key;
    return NextResponse.json({ success: true, settings: safeSettings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save settings' }, { status: 500 });
  }
}
