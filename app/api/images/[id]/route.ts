import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product || !product.mainImage) {
      return new NextResponse('Image not found', { status: 404 });
    }

    const base64String = product.mainImage;

    // Check if it's a data URL
    if (base64String.startsWith('data:image')) {
      const commaIndex = base64String.indexOf(',');
      if (commaIndex !== -1) {
        const mimeType = base64String.substring(5, base64String.indexOf(';'));
        const cleanBase64 = base64String.substring(commaIndex + 1);
        const buffer = Buffer.from(cleanBase64, 'base64');
        
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
          },
        });
      }
    }

    // If it's a standard URL, redirect to it
    if (base64String.startsWith('http')) {
      return NextResponse.redirect(base64String);
    }

    // Fallback if raw base64 without prefix
    try {
      const buffer = Buffer.from(base64String, 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
        },
      });
    } catch (_) {
      return new NextResponse('Invalid image data', { status: 500 });
    }
  } catch (error: any) {
    return new NextResponse(error.message || 'Image processing error', { status: 500 });
  }
}
