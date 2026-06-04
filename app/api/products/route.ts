import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const publishedOnly = searchParams.get('publishedOnly') === 'true';

    const where: any = {};
    if (category && category !== 'All') {
      where.category = category;
    }
    if (publishedOnly) {
      where.isPublished = true;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      originalUrl,
      affiliateUrl,
      category,
      mainImage,
      galleryImages,
      customDescription,
      pros,
      cons,
      isPublished,
      stars,
      reviewsCount,
    } = body;

    // Basic Validation
    if (!title || !originalUrl || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        title,
        originalUrl,
        affiliateUrl: affiliateUrl || originalUrl,
        category,
        mainImage: mainImage || '',
        galleryImages: Array.isArray(galleryImages) ? JSON.stringify(galleryImages) : (galleryImages || '[]'),
        customDescription: customDescription || '',
        pros: Array.isArray(pros) ? JSON.stringify(pros) : (pros || '[]'),
        cons: Array.isArray(cons) ? JSON.stringify(cons) : (cons || '[]'),
        isPublished: isPublished !== undefined ? isPublished : true,
        stars: stars !== undefined ? (typeof stars === 'number' ? stars : parseFloat(stars) || 0.0) : 0.0,
        reviewsCount: reviewsCount !== undefined ? String(reviewsCount) : '0',
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create product' }, { status: 500 });
  }
}
