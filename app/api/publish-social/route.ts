import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const settings = await getSettings();
    const { zernio_api_key, pinterest_board_id } = settings;

    if (!zernio_api_key || zernio_api_key.includes('your_')) {
      return NextResponse.json(
        { error: 'Please configure a valid Zernio API Key in your env variables first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { productId, collectionId, postContent, platforms, mediaUrls, triggerWords } = body;

    if (!postContent || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json({ error: 'Post content and at least one target platform are required' }, { status: 400 });
    }

    // Fetch product or collection details
    const product = productId ? await prisma.product.findUnique({ where: { id: productId } }) : null;
    const collection = collectionId ? await prisma.collection.findUnique({ where: { id: collectionId } }) : null;

    // Map platforms, filtering out X / Twitter
    const mappedPlatforms = platforms
      .map(p => p.toLowerCase())
      .filter(p => p !== 'x' && p !== 'twitter');

    if (mappedPlatforms.length === 0) {
      return NextResponse.json({ error: 'No valid platforms selected. Twitter/X is not supported.' }, { status: 400 });
    }

    // Ensure title is short (Pinterest limits title to 100 chars max)
    let postTitle = 'Cozy Hub Recommendation';
    if (product?.title) {
      postTitle = product.title;
    } else if (collection?.title) {
      postTitle = collection.title;
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

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    // Handle Pinterest Options
    let pinterestOptions: any = undefined;
    if (mappedPlatforms.includes('pinterest')) {
      if (!pinterest_board_id) {
        return NextResponse.json(
          { error: 'Pinterest Board ID is required in settings to publish to Pinterest.' },
          { status: 400 }
        );
      }
      
      let pinterestLink = origin;
      if (collection) {
        pinterestLink = `${origin}/collections/${collection.slug}`;
      } else if (product?.affiliateUrl) {
        pinterestLink = product.affiliateUrl;
      }

      pinterestOptions = {
        boardId: pinterest_board_id,
        board_id: pinterest_board_id,
        title: postTitle,
        link: pinterestLink
      };
    }

    // Prepare media URLs and media IDs
    const zernioMediaUrls: string[] = [];
    const zernioMediaIds: string[] = [];

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
              
              const mediaFormData = new FormData();
              mediaFormData.append('file', fileBlob, `image.${ext}`);
              mediaFormData.append('type', 'image');

              console.log('Uploading base64 mockup image to Zernio...');
              const mediaRes = await fetch('https://zernio.com/api/v1/media', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${zernio_api_key}`,
                },
                body: mediaFormData
              });

              if (mediaRes.ok) {
                const mediaData = await mediaRes.json();
                const mediaId = mediaData.media_id || mediaData.id;
                if (mediaId) {
                  zernioMediaIds.push(mediaId);
                  console.log(`Successfully uploaded base64 to Zernio. Media ID: ${mediaId}`);
                } else {
                  console.error('Zernio media upload succeeded but returned no ID:', mediaData);
                }
              } else {
                const errText = await mediaRes.text();
                console.error(`Zernio media upload failed with status ${mediaRes.status}:`, errText);
              }
            }
          } else {
            // It's a remote URL. Zernio supports direct mediaUrls.
            zernioMediaUrls.push(mediaUrl);
          }
        } catch (err) {
          console.error('Error handling/attaching image for Zernio:', err);
        }
      }
    }

    // Fetch connected accounts from Zernio
    console.log('Fetching connected accounts from Zernio...');
    const accountsRes = await fetch('https://zernio.com/api/v1/accounts', {
      headers: {
        'Authorization': `Bearer ${zernio_api_key}`,
      },
    });

    if (!accountsRes.ok) {
      const errText = await accountsRes.text();
      return NextResponse.json(
        { error: `Failed to fetch connected accounts from Zernio: ${errText}` },
        { status: accountsRes.status }
      );
    }

    const accountsData = await accountsRes.json();
    const accountsList = accountsData.accounts || [];

    const zernioPlatformsPayload = [];
    for (const plat of mappedPlatforms) {
      const matchedAccount = accountsList.find((acc: any) => acc.platform === plat && acc.isActive !== false);
      if (matchedAccount) {
        zernioPlatformsPayload.push({
          platform: plat,
          accountId: matchedAccount._id,
        });
      } else {
        return NextResponse.json(
          { error: `No active connected account found in Zernio for platform: ${plat}. Please link it in your Zernio dashboard first.` },
          { status: 400 }
        );
      }
    }

    if (zernioPlatformsPayload.length === 0) {
      return NextResponse.json(
        { error: 'No active connected social accounts found in Zernio for the selected platforms.' },
        { status: 400 }
      );
    }

    console.log(`Sending upload request to Zernio for platforms:`, JSON.stringify(zernioPlatformsPayload));

    // Call Zernio API
    const zernioPayload: any = {
      text: postDescription,
      platforms: zernioPlatformsPayload
    };

    if (zernioMediaUrls.length > 0) {
      zernioPayload.mediaUrls = zernioMediaUrls;
    }
    if (zernioMediaIds.length > 0) {
      zernioPayload.media_ids = zernioMediaIds;
    }
    if (pinterestOptions) {
      zernioPayload.pinterest_options = pinterestOptions;
      zernioPayload.pinterestOptions = pinterestOptions; // double-write for compatibility
    }

    const response = await fetch('https://zernio.com/api/v1/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${zernio_api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(zernioPayload)
    });

    const responseData = await response.json();

    if (!response.ok || responseData.status === 'error' || responseData.success === false) {
      console.error('Zernio publish failed:', responseData);

      // Log a failed post in the database
      await prisma.socialPost.create({
        data: {
          productId: productId || null,
          collectionId: collectionId || null,
          platform: platforms.join(', '),
          generatedContent: postContent,
          status: 'FAILED',
          triggerWords: triggerWords || 'link,store,recommendations',
        },
      });

      return NextResponse.json(
        { error: responseData.message || responseData.error || 'Failed to post through Zernio API' },
        { status: response.status || 500 }
      );
    }

    // Save successful post record to the database
    // Note: Zernio returns the post ID in responseData.id
    await prisma.socialPost.create({
      data: {
        productId: productId || null,
        collectionId: collectionId || null,
        platform: platforms.join(', '),
        generatedContent: postContent,
        status: 'SENT',
        ayrshareRefId: responseData.id || responseData.postId || '',
        triggerWords: triggerWords || 'link,store,recommendations',
      },
    });

    return NextResponse.json({ success: true, data: responseData });
  } catch (error: any) {
    console.error('Zernio integration handler error:', error);
    return NextResponse.json({ error: error.message || 'Social publishing failed' }, { status: 500 });
  }
}
