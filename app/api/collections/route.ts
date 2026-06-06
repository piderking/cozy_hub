import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to generate a clean, unique slug from a title
function generateSlug(title: string): string {
  let base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-word characters
    .replace(/[\s_-]+/g, '-') // replace spaces/underscores with single hyphens
    .replace(/^-+|-+$/g, '');  // trim leading/trailing hyphens

  if (!base) base = 'collection';
  return base;
}

// GET all collections
export async function GET() {
  try {
    const collections = await prisma.collection.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        products: {
          select: { id: true, title: true, mainImage: true }
        }
      }
    });
    return NextResponse.json({ success: true, collections });
  } catch (error: any) {
    console.error('Failed to fetch collections:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch collections' }, { status: 500 });
  }
}

// POST create a new collection
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, products, sceneImage } = body;

    if (!title || !description || !products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'Title, description, and at least one product are required' }, { status: 400 });
    }

    if (!sceneImage) {
      return NextResponse.json({ error: 'AI Generated Scene Image is mandatory for saving a collection' }, { status: 400 });
    }

    // Generate unique slug
    let slug = generateSlug(title);
    let isSlugTaken = await prisma.collection.findUnique({ where: { slug } });
    let counter = 1;
    while (isSlugTaken) {
      const newSlug = `${slug}-${counter}`;
      isSlugTaken = await prisma.collection.findUnique({ where: { slug: newSlug } });
      if (!isSlugTaken) {
        slug = newSlug;
      }
      counter++;
    }

    // Create the collection and link to products
    const collection = await prisma.collection.create({
      data: {
        title,
        description,
        slug,
        sceneImage,
        products: {
          connect: products.map((id: string) => ({ id }))
        }
      },
      include: {
        products: true
      }
    });

    return NextResponse.json({ success: true, collection });
  } catch (error: any) {
    console.error('Failed to create collection:', error);
    return NextResponse.json({ error: error.message || 'Failed to create collection' }, { status: 500 });
  }
}
