import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Incoming social comment webhook payload:', body);

    // Check if this is a comment event
    const eventType = body.event || body.action || 'comment';
    const isCommentEvent = eventType === 'comment.received' || eventType === 'comment';

    if (!isCommentEvent) {
      return NextResponse.json({ success: true, message: 'Ignored non-comment action/event' });
    }

    // Extract comment details dynamically (Zernio vs Ayrshare/Upload-Post vs simulator formats)
    let commentText = '';
    let username = '';
    let platform = 'instagram';
    let commentId = '';
    let postRefId = '';
    let accountId = body.accountId || body.account?.id || body.data?.account?.id || '';
    const socialPostId = body.socialPostId; // For simulation direct mapping
    const isSimulation = !!body.isSimulation;

    if (body.event === 'comment.received' || body.comment || (body.data && body.data.comment)) {
      // Zernio payload format
      const zComment = body.comment || (body.data && body.data.comment) || {};
      const zPost = body.post || (body.data && body.data.post) || {};
      commentId = zComment.id || zComment.commentId || body.id || `sim_${Date.now()}`;
      commentText = (zComment.text || zComment.content || '').trim();
      username = zComment.username || 
                 (zComment.user && zComment.user.username) || 
                 (zComment.author && typeof zComment.author === 'object' ? zComment.author.username : zComment.author) || 
                 'anonymous';
      platform = body.platform || (body.data && body.data.platform) || 'instagram';
      postRefId = zComment.platformPostId || zPost.platformPostId || zPost.id || body.postId || body.postRefId;
    } else {
      // Ayrshare/Upload-Post or simulator payload format
      commentId = body.commentId || body.id || `sim_${Date.now()}`;
      commentText = (body.text || '').trim();
      username = body.username || body.user || 'anonymous';
      platform = body.platform || 'instagram';
      postRefId = body.postRefId || body.postId || body.ayrshareId;
    }

    if (!commentText) {
      return NextResponse.json({ success: true, message: 'Ignored empty comment' });
    }

    // Find the social post matching either the direct ID (simulation) or the reference ID (webhook)
    let socialPost = null;
    if (socialPostId) {
      socialPost = await prisma.socialPost.findUnique({
        where: { id: socialPostId },
        include: { product: true, collection: true }
      });
    }

    if (!socialPost) {
      // Collect all possible reference IDs from the payload to query robustly
      const refIds = new Set<string>();
      
      const zComment = body.comment || (body.data && body.data.comment) || {};
      const zPost = body.post || (body.data && body.data.post) || {};
      
      if (zComment.postId) refIds.add(zComment.postId);
      if (zComment.platformPostId) refIds.add(zComment.platformPostId);
      if (zPost.id) refIds.add(zPost.id);
      if (zPost.platformPostId) refIds.add(zPost.platformPostId);
      
      if (postRefId) refIds.add(postRefId);
      if (body.postId) refIds.add(body.postId);
      if (body.postRefId) refIds.add(body.postRefId);
      if (body.ayrshareId) refIds.add(body.ayrshareId);

      const uniqueRefIds = Array.from(refIds).filter(Boolean);

      if (uniqueRefIds.length > 0) {
        socialPost = await prisma.socialPost.findFirst({
          where: { ayrshareRefId: { in: uniqueRefIds } },
          include: { product: true, collection: true }
        });
      }
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

    // Process real Zernio API Reply
    const settings = await getSettings();
    const { zernio_api_key } = settings;

    if (!zernio_api_key || zernio_api_key.includes('your_')) {
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
      return NextResponse.json({ error: 'Zernio API key not configured' }, { status: 400 });
    }

    const replyPostId = socialPost.ayrshareRefId || postRefId || '';
    console.log(`Sending auto-reply via Zernio for comment: ${commentId} on post: ${replyPostId}`);
    const replyUrl = `https://zernio.com/api/v1/inbox/comments/${replyPostId}`;
    const response = await fetch(replyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${zernio_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId,
        commentId,
        message: responseText
      })
    });

    const responseData = await response.json();

    if (!response.ok || responseData.success === false || responseData.status === 'error') {
      console.error('Zernio comment reply failed:', responseData);
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
