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
    let recipientId = '';
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
      recipientId = zComment.author?.id || zComment.user?.id || '';
    } else {
      // Ayrshare/Upload-Post or simulator payload format
      commentId = body.commentId || body.id || `sim_${Date.now()}`;
      commentText = (body.text || '').trim();
      username = body.username || body.user || 'anonymous';
      platform = body.platform || 'instagram';
      postRefId = body.postRefId || body.postId || body.ayrshareId;
      recipientId = body.recipientId || body.user_id || '';
    }

    // Fetch settings to check bot username
    const settings = await getSettings();

    // Prevent loop: do not respond to comments made by the bot itself
    const botUsername = (settings.bot_username || '_cozy_hub').trim().toLowerCase().replace(/^@/, '');
    const senderUsername = username.trim().toLowerCase().replace(/^@/, '');

    if (senderUsername === botUsername) {
      console.log(`Ignoring comment from own bot username: ${senderUsername}`);
      return NextResponse.json({ success: true, message: 'Ignored comment from own bot username' });
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

    // Resolve target link domain using previously fetched settings
    const origin = settings.store_url || 'http://localhost:3000';
    let link = origin;
    let targetName = 'Cozy Hub';

    if (socialPost.collection) {
      link = `${origin}/collections/${socialPost.collection.slug}`;
      targetName = socialPost.collection.title;
    } else if (socialPost.product) {
      link = `${origin}/product/${socialPost.product.id}`;
      targetName = socialPost.product.title;
    }

    const isInstagram = platform === 'instagram';
    const dmText = `Hello! Here is the link to ${targetName}: ${link} ✨`;
    const commentReplyText = isInstagram 
      ? `@${username} Sent! Check your DMs 📥✨` 
      : `@${username} Here is the link to ${targetName}! ${link} ✨`;

    // Process simulation
    if (isSimulation) {
      const simulatedResponseSent = isInstagram 
        ? `DM: "${dmText}" | Comment Reply: "${commentReplyText}"`
        : commentReplyText;

      await prisma.interactionLog.create({
        data: {
          username,
          commentText,
          triggerWord: matchedTrigger,
          status: 'SENT (SIMULATED)',
          responseSent: simulatedResponseSent,
          platform,
          socialPostId: socialPost.id,
        }
      });
      return NextResponse.json({
        success: true,
        simulated: true,
        responseText: commentReplyText,
        dmText: isInstagram ? dmText : undefined,
        matchedTrigger
      });
    }

    // Process real Zernio API Reply
    const { zernio_api_key } = settings;

    if (!zernio_api_key || zernio_api_key.includes('your_')) {
      // Fallback log if API key is not configured
      await prisma.interactionLog.create({
        data: {
          username,
          commentText,
          triggerWord: matchedTrigger,
          status: 'FAILED (API key not configured)',
          responseSent: isInstagram ? `DM: "${dmText}" | Comment Reply: "${commentReplyText}"` : commentReplyText,
          platform,
          socialPostId: socialPost.id,
        }
      });
      return NextResponse.json({ error: 'Zernio API key not configured' }, { status: 400 });
    }

    const replyPostId = socialPost.ayrshareRefId || postRefId || '';
    const replyUrl = `https://zernio.com/api/v1/inbox/comments/${replyPostId}`;

    let dmSuccess = false;
    let commentReplySuccess = false;
    let errorMessage = '';

    // 1. Send Instagram DM (if Instagram)
    if (isInstagram && commentId) {
      const privateReplyUrl = `https://zernio.com/api/v1/inbox/comments/${replyPostId}/${commentId}/private-reply`;
      console.log(`Sending Instagram private reply DM via Zernio: ${privateReplyUrl}`);
      try {
        const dmRes = await fetch(privateReplyUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${zernio_api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId,
            message: dmText
          })
        });
        const dmData = await dmRes.json();
        if (dmRes.ok && dmData.success !== false) {
          dmSuccess = true;
        } else {
          console.error('Zernio DM reply failed:', dmData);
          errorMessage += `DM failed: ${dmData.message || 'Unknown error'}. `;
        }
      } catch (err: any) {
        console.error('Error sending Zernio DM:', err);
        errorMessage += `DM error: ${err.message}. `;
      }
    }

    // 2. Reply to the comment publicly
    console.log(`Sending auto-reply comment via Zernio for comment: ${commentId} on post: ${replyPostId}`);
    try {
      const commentRes = await fetch(replyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${zernio_api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          commentId,
          message: commentReplyText
        })
      });
      const commentData = await commentRes.json();
      if (commentRes.ok && commentData.success !== false && commentData.status !== 'error') {
        commentReplySuccess = true;
      } else {
        console.error('Zernio comment reply failed:', commentData);
        errorMessage += `Comment reply failed: ${commentData.message || 'Unknown error'}. `;
      }
    } catch (err: any) {
      console.error('Error sending Zernio comment reply:', err);
      errorMessage += `Comment reply error: ${err.message}. `;
    }

    // Determine overall status
    const overallSuccess = isInstagram 
      ? (dmSuccess && commentReplySuccess)
      : commentReplySuccess;

    const logStatus = overallSuccess ? 'SENT' : `FAILED (${errorMessage.trim()})`;
    const logResponseSent = isInstagram 
      ? `DM [${dmSuccess ? 'OK' : 'FAIL'}]: "${dmText}" | Comment Reply [${commentReplySuccess ? 'OK' : 'FAIL'}]: "${commentReplyText}"`
      : commentReplyText;

    // Save final status log
    await prisma.interactionLog.create({
      data: {
        username,
        commentText,
        triggerWord: matchedTrigger,
        status: logStatus,
        responseSent: logResponseSent,
        platform,
        socialPostId: socialPost.id,
      }
    });

    if (!overallSuccess) {
      return NextResponse.json({ error: errorMessage.trim() || 'Failed to reply to comment' }, { status: 500 });
    }

    return NextResponse.json({ success: true, responseText: commentReplyText });
  } catch (error: any) {
    console.error('Comment responder webhook error:', error);
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 });
  }
}
