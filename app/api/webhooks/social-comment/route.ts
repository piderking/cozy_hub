import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Incoming social comment webhook payload:', body);

    // Extract comment details
    const action = body.action || 'comment';
    const commentId = body.commentId || body.id || `sim_${Date.now()}`;
    const commentText = (body.text || '').trim();
    const username = body.user || body.username || 'anonymous';
    const platform = body.platform || 'instagram';
    const postRefId = body.postRefId || body.postId || body.ayrshareId;
    const socialPostId = body.socialPostId; // For simulation direct mapping
    const isSimulation = !!body.isSimulation;

    // Check if this is a comment event
    if (action !== 'comment') {
      return NextResponse.json({ success: true, message: 'Ignored non-comment action' });
    }

    if (!commentText) {
      return NextResponse.json({ success: true, message: 'Ignored empty comment' });
    }

    // Find the social post matching either the direct ID (simulation) or the Ayrshare reference ID (webhook)
    let socialPost = null;
    if (socialPostId) {
      socialPost = await prisma.socialPost.findUnique({
        where: { id: socialPostId },
        include: { product: true, collection: true }
      });
    } else if (postRefId) {
      socialPost = await prisma.socialPost.findFirst({
        where: { ayrshareRefId: postRefId },
        include: { product: true, collection: true }
      });
    }

    if (!socialPost) {
      console.warn(`No social post found matching postRefId: ${postRefId} or socialPostId: ${socialPostId}`);
      return NextResponse.json({ error: 'No matching social post found in database' }, { status: 404 });
    }

    // Get trigger words (defaults to "link,store,recommendations" if null or empty)
    const triggerWordsStr = socialPost.triggerWords || 'link,store,recommendations';
    const triggers = triggerWordsStr.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

    // Check if comment text contains any trigger words (case-insensitive)
    const lowerComment = commentText.toLowerCase();
    const matchedTrigger = triggers.find(trigger => lowerComment.includes(trigger));

    if (!matchedTrigger) {
      // Log interaction as NO_TRIGGER_MATCH
      await prisma.interactionLog.create({
        data: {
          username,
          commentText,
          triggerWord: 'none',
          status: 'NO_TRIGGER_MATCH',
          responseSent: 'N/A - No trigger word matched',
          platform,
          socialPostId: socialPost.id,
        }
      });
      return NextResponse.json({ success: true, message: 'No trigger word matched' });
    }

    // Determine the response link and text
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    let link = origin;
    let targetName = 'Cozy Hub';

    if (socialPost.collection) {
      link = `${origin}/collections/${socialPost.collection.slug}`;
      targetName = socialPost.collection.title;
    } else if (socialPost.product) {
      link = `${origin}/product/${socialPost.product.id}`;
      targetName = socialPost.product.title;
    }

    const responseText = `@${username} Here is the link to ${targetName}! ${link} ✨`;

    // Process simulation
    if (isSimulation) {
      await prisma.interactionLog.create({
        data: {
          username,
          commentText,
          triggerWord: matchedTrigger,
          status: 'SENT (SIMULATED)',
          responseSent: responseText,
          platform,
          socialPostId: socialPost.id,
        }
      });
      return NextResponse.json({
        success: true,
        simulated: true,
        responseText,
        matchedTrigger
      });
    }

    // Process real Ayrshare/Upload-Post API Reply
    const settings = await getSettings();
    const { uploadpost_api_key } = settings;

    if (!uploadpost_api_key || uploadpost_api_key.includes('your_')) {
      // Fallback log if API key is not configured
      await prisma.interactionLog.create({
        data: {
          username,
          commentText,
          triggerWord: matchedTrigger,
          status: 'FAILED (API key not configured)',
          responseSent: responseText,
          platform,
          socialPostId: socialPost.id,
        }
      });
      return NextResponse.json({ error: 'Upload-Post API key not configured' }, { status: 400 });
    }

    console.log(`Sending auto-reply via Upload-Post for comment: ${commentId}`);
    const response = await fetch('https://api.upload-post.com/api/comments/reply', {
      method: 'POST',
      headers: {
        'Authorization': `Apikey ${uploadpost_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commentId,
        text: responseText
      })
    });

    const responseData = await response.json();

    if (!response.ok || responseData.success === false) {
      console.error('Upload-Post comment reply failed:', responseData);
      await prisma.interactionLog.create({
        data: {
          username,
          commentText,
          triggerWord: matchedTrigger,
          status: 'FAILED',
          responseSent: responseText,
          platform,
          socialPostId: socialPost.id,
        }
      });
      return NextResponse.json({ error: responseData.message || 'Failed to reply to comment' }, { status: 500 });
    }

    // Success log
    await prisma.interactionLog.create({
      data: {
        username,
        commentText,
        triggerWord: matchedTrigger,
        status: 'SENT',
        responseSent: responseText,
        platform,
        socialPostId: socialPost.id,
      }
    });

    return NextResponse.json({ success: true, responseText });
  } catch (error: any) {
    console.error('Comment responder webhook error:', error);
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 });
  }
}
