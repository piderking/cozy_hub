import { NextResponse } from 'next/server';
import { getSettings, saveSetting } from '@/lib/settings';

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Save each key-value pair provided in the request body
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        await saveSetting(key, value);
      }
    }
    
    const updatedSettings = await getSettings();
    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save settings' }, { status: 500 });
  }
}
