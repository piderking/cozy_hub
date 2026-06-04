import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const settings = await getSettings();
    const { uploadpost_api_key, uploadpost_username, pinterest_board_id } = settings;

    if (!uploadpost_api_key || uploadpost_api_key.includes('your_')) {
      return NextResponse.json(
        { error: 'Please configure a valid Upload-Post API Key in the settings tab first.' },
        { status: 400 }
      );
    }
    if (!uploadpost_username) {
      return NextResponse.json(
        { error: 'Please configure your Upload-Post Profile Username in the settings tab first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { productId, postContent, platforms, mediaUrls } = body;

    if (!postContent || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json({ error: 'Post content and at least one target platform are required' }, { status: 400 });
    }

    // Fetch product details for affiliate URL if needed
    const product = productId ? await prisma.product.findUnique({ where: { id: productId } }) : null;

    // Map platforms: 'twitter' -> 'x'
    const mappedPlatforms = platforms.map(p => {
      const lower = p.toLowerCase();
      if (lower === 'twitter') return 'x';
      return lower;
    });

    const formData = new FormData();
    formData.append('user', uploadpost_username);
    mappedPlatforms.forEach(p => {
      formData.append('platform[]', p);
    });

    // Ensure title is short (Pinterest limits title to 100 chars max)
    let postTitle = 'Cozy Hub Recommendation';
    if (product?.title) {
      postTitle = product.title;
    } else {
      const firstLine = postContent.split('\n')[0].trim().replace(/^[^a-zA-Z0-9]+/, '');
      if (firstLine && firstLine.length > 3) {
        postTitle = firstLine;
      } else {
        postTitle = postContent;
      }
    }
    if (postTitle.length > 95) {
      postTitle = postTitle.substring(0, 92) + '...';
    }

    // Ensure description is under 500 characters for Pinterest limits
    let postDescription = postContent;
    if (mappedPlatforms.includes('pinterest') && postDescription.length > 500) {
      postDescription = postDescription.substring(0, 495) + '...';
    }

    formData.append('title', postTitle);
    formData.append('description', postDescription);

    if (mappedPlatforms.includes('pinterest')) {
      if (!pinterest_board_id) {
        return NextResponse.json(
          { error: 'Pinterest Board ID is required in settings to publish to Pinterest.' },
          { status: 400 }
        );
      }
      formData.append('pinterest_board_id', pinterest_board_id);
      if (product?.affiliateUrl) {
        formData.append('pinterest_link', product.affiliateUrl);
      }
    }

    // Attach photos
    let hasPhotos = false;
    if (mediaUrls && mediaUrls.length > 0) {
      for (const mediaUrl of mediaUrls) {
        try {
          if (mediaUrl.startsWith('data:image')) {
            const matches = mediaUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              const contentType = matches[1];
              const ext = contentType.split('/')[1] || 'png';
              const buffer = Buffer.from(matches[2], 'base64');
              const fileBlob = new Blob([buffer], { type: contentType });
              formData.append('photos[]', fileBlob, `image.${ext}`);
              hasPhotos = true;
            }
          } else {
            // Fetch remote/local URL
            const imageRes = await fetch(mediaUrl);
            if (imageRes.ok) {
              const blob = await imageRes.blob();
              const contentType = imageRes.headers.get('content-type') || 'image/png';
              const ext = contentType.split('/')[1] || 'png';
              formData.append('photos[]', blob, `image.${ext}`);
              hasPhotos = true;
            }
          }
        } catch (err) {
          console.error('Error fetching/attaching image for Upload-Post:', err);
        }
      }
    }

    const endpoint = hasPhotos 
      ? 'https://api.upload-post.com/api/upload_photos' 
      : 'https://api.upload-post.com/api/upload_text';

    console.log(`Sending upload request to Upload-Post (${endpoint}) for platforms:`, mappedPlatforms);

    // Call Upload-Post API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Apikey ${uploadpost_api_key}`,
      },
      body: formData,
    });

    const responseData = await response.json();

    if (!response.ok || responseData.success === false) {
      console.error('Upload-Post publish failed:', responseData);

      // If productId is provided, log a failed post in the database
      if (productId) {
        await prisma.socialPost.create({
          data: {
            productId,
            platform: platforms.join(', '),
            generatedContent: postContent,
            status: 'FAILED',
          },
        });
      }

      return NextResponse.json(
        { error: responseData.message || responseData.error || 'Failed to post through Upload-Post API' },
        { status: response.status || 500 }
      );
    }

    // Save successful post record to the database
    if (productId) {
      await prisma.socialPost.create({
        data: {
          productId,
          platform: platforms.join(', '),
          generatedContent: postContent,
          status: 'SENT',
          ayrshareRefId: responseData.request_id || responseData.job_id || '',
        },
      });
    }

    return NextResponse.json({ success: true, data: responseData });
  } catch (error: any) {
    console.error('Upload-Post integration handler error:', error);
    return NextResponse.json({ error: error.message || 'Social publishing failed' }, { status: 500 });
  }
}
