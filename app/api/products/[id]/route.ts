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
      include: { socialPosts: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (originalUrl !== undefined) data.originalUrl = originalUrl;
    if (affiliateUrl !== undefined) data.affiliateUrl = affiliateUrl;
    if (category !== undefined) data.category = category;
    if (mainImage !== undefined) data.mainImage = mainImage;
    if (galleryImages !== undefined) {
      data.galleryImages = Array.isArray(galleryImages) ? JSON.stringify(galleryImages) : galleryImages;
    }
    if (customDescription !== undefined) data.customDescription = customDescription;
    if (pros !== undefined) {
      data.pros = Array.isArray(pros) ? JSON.stringify(pros) : pros;
    }
    if (cons !== undefined) {
      data.cons = Array.isArray(cons) ? JSON.stringify(cons) : cons;
    }
    if (isPublished !== undefined) data.isPublished = isPublished;
    if (stars !== undefined) {
      data.stars = typeof stars === 'number' ? stars : parseFloat(stars) || 0.0;
    }
    if (reviewsCount !== undefined) {
      data.reviewsCount = reviewsCount !== null ? String(reviewsCount) : null;
    }

    const product = await prisma.product.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.product.delete({
      where: { id },
    });
    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete product' }, { status: 500 });
  }
}
