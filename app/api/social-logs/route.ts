import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET interaction logs & social posts with trigger info
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'posts') {
      const posts = await prisma.socialPost.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, title: true } },
          collection: { select: { id: true, title: true, slug: true } }
        }
      });
      return NextResponse.json({ success: true, posts });
    }

    const logs = await prisma.interactionLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        socialPost: {
          include: {
            product: { select: { title: true } },
            collection: { select: { title: true } }
          }
        }
      }
    });

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Failed to fetch social logs:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch social logs' }, { status: 500 });
  }
}

// DELETE clear logs
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clearAll = searchParams.get('clearAll') === 'true';
    const logId = searchParams.get('id');

    if (clearAll) {
      await prisma.interactionLog.deleteMany();
      return NextResponse.json({ success: true, message: 'All interaction logs cleared' });
    }

    if (logId) {
      await prisma.interactionLog.delete({
        where: { id: logId }
      });
      return NextResponse.json({ success: true, message: 'Log entry deleted successfully' });
    }

    return NextResponse.json({ error: 'Specify clearAll=true or log id' }, { status: 400 });
  } catch (error: any) {
    console.error('Failed to clear logs:', error);
    return NextResponse.json({ error: error.message || 'Failed to clear logs' }, { status: 500 });
  }
}

// PUT update trigger words for a social post
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { socialPostId, triggerWords } = body;

    if (!socialPostId) {
      return NextResponse.json({ error: 'socialPostId is required' }, { status: 400 });
    }

    const updatedPost = await prisma.socialPost.update({
      where: { id: socialPostId },
      data: {
        triggerWords: triggerWords || 'link,store,recommendations'
      }
    });

    return NextResponse.json({ success: true, post: updatedPost });
  } catch (error: any) {
    console.error('Failed to update trigger words:', error);
    return NextResponse.json({ error: error.message || 'Failed to update trigger words' }, { status: 500 });
  }
}
