import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Helper to hash password using SHA-256
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function GET() {
  try {
    // 1. Check if admin password has been set in database settings
    const dbPasswordSetting = await prisma.setting.findUnique({
      where: { key: 'admin_password' },
    });
    const isPasswordSet = !!dbPasswordSetting?.value;

    // 2. Read the session cookie and check if user is authenticated
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('cozyhub_session')?.value;
    
    let isAuthenticated = false;
    if (sessionCookie && isPasswordSet) {
      const dbSessionSetting = await prisma.setting.findUnique({
        where: { key: 'admin_session_token' },
      });
      if (dbSessionSetting?.value && dbSessionSetting.value === sessionCookie) {
        isAuthenticated = true;
      }
    }

    return NextResponse.json({
      success: true,
      isPasswordSet,
      isAuthenticated,
    });
  } catch (error: any) {
    console.error('Admin auth verification error:', error);
    return NextResponse.json({ error: error.message || 'Authentication check failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, password } = body;

    const cookieStore = await cookies();

    // ACTION: SETUP (First-run password configuration)
    if (action === 'setup') {
      if (!password || password.trim().length < 4) {
        return NextResponse.json({ error: 'Password must be at least 4 characters long' }, { status: 400 });
      }

      // Check if a password already exists
      const existingPassword = await prisma.setting.findUnique({
        where: { key: 'admin_password' },
      });
      if (existingPassword?.value) {
        return NextResponse.json({ error: 'Admin dashboard password has already been configured.' }, { status: 400 });
      }

      // Hash password and save to settings
      const hashedPassword = hashPassword(password);
      await prisma.setting.upsert({
        where: { key: 'admin_password' },
        update: { value: hashedPassword },
        create: { key: 'admin_password', value: hashedPassword },
      });

      // Generate session token and save
      const sessionToken = crypto.randomBytes(32).toString('hex');
      await prisma.setting.upsert({
        where: { key: 'admin_session_token' },
        update: { value: sessionToken },
        create: { key: 'admin_session_token', value: sessionToken },
      });

      // Set HttpOnly cookie
      cookieStore.set('cozyhub_session', sessionToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return NextResponse.json({ success: true, message: 'Admin password configured successfully' });
    }

    // ACTION: LOGIN (Authenticate with existing password)
    if (action === 'login') {
      if (!password) {
        return NextResponse.json({ error: 'Password is required' }, { status: 400 });
      }

      // Get stored password hash
      const dbPasswordSetting = await prisma.setting.findUnique({
        where: { key: 'admin_password' },
      });
      if (!dbPasswordSetting?.value) {
        return NextResponse.json({ error: 'Admin password is not configured. Setup first.' }, { status: 400 });
      }

      // Hash input and compare
      const hashedInput = hashPassword(password);
      if (hashedInput !== dbPasswordSetting.value) {
        return NextResponse.json({ error: 'Incorrect admin password' }, { status: 401 });
      }

      // Generate new session token and save
      const sessionToken = crypto.randomBytes(32).toString('hex');
      await prisma.setting.upsert({
        where: { key: 'admin_session_token' },
        update: { value: sessionToken },
        create: { key: 'admin_session_token', value: sessionToken },
      });

      // Set HttpOnly cookie
      cookieStore.set('cozyhub_session', sessionToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return NextResponse.json({ success: true, message: 'Logged in successfully' });
    }

    // ACTION: LOGOUT (Clear credentials session)
    if (action === 'logout') {
      // Clear session token in database
      await prisma.setting.upsert({
        where: { key: 'admin_session_token' },
        update: { value: '' },
        create: { key: 'admin_session_token', value: '' },
      });

      // Clear cookie
      cookieStore.set('cozyhub_session', '', {
        path: '/',
        maxAge: 0,
      });

      return NextResponse.json({ success: true, message: 'Logged out successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin auth handler error:', error);
    return NextResponse.json({ error: error.message || 'Authentication action failed' }, { status: 500 });
  }
}
