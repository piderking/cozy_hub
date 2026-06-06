import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface PageProps {
  params: Promise<{ id: string }>;
}

// DELETE a collection
export async function DELETE(request: Request, { params }: PageProps) {
  try {
    const { id } = await params;

    const collection = await prisma.collection.findUnique({
      where: { id }
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    await prisma.collection.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Collection deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete collection:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete collection' }, { status: 500 });
  }
}
