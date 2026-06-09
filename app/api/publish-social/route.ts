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
    const { 
      productId, 
      collectionId, 
      postContent, 
      platforms, 
      mediaUrls, 
      triggerWords,
      instagramFirstComment,
      pinterestTitle,
      pinterestLink 
    } = body;

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json({ error: 'At least one target platform is required' }, { status: 400 });
    }

    // Fetch product or collection details
    const product = productId ? await prisma.product.findUnique({ where: { id: productId } }) : null;
    const collection = collectionId ? await prisma.collection.findUnique({ where: { id: collectionId } }) : null;

    // Parse platforms array supporting both legacy string array and new unified config object array
    const parsedPlatforms: Array<{
      name: string;
      content: string;
      instagramFirstComment?: string;
      pinterestTitle?: string;
      pinterestLink?: string;
    }> = [];

    for (const p of platforms) {
      if (typeof p === 'string') {
        parsedPlatforms.push({
          name: p.toLowerCase(),
          content: postContent || '',
          instagramFirstComment: instagramFirstComment,
          pinterestTitle: pinterestTitle,
          pinterestLink: pinterestLink
        });
      } else if (p && typeof p === 'object' && p.name) {
        parsedPlatforms.push({
          name: p.name.toLowerCase(),
          content: p.content || postContent || '',
          instagramFirstComment: p.instagramFirstComment || instagramFirstComment,
          pinterestTitle: p.pinterestTitle || pinterestTitle,
          pinterestLink: p.pinterestLink || pinterestLink
        });
      }
    }

    // Filter out X / Twitter
    const mappedPlatforms = parsedPlatforms.filter(p => p.name !== 'x' && p.name !== 'twitter');

    if (mappedPlatforms.length === 0) {
      return NextResponse.json({ error: 'No valid platforms selected. Twitter/X is not supported.' }, { status: 400 });
    }

    // Use first platform caption or root caption as fallback
    const mainContent = mappedPlatforms[0]?.content || postContent || '';

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

    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const zernioPlatformsPayload = [];
    let finalInstagramFirstComment = undefined;
    let finalPinterestTitle = undefined;
    let finalPinterestLink = undefined;

    for (const platInput of mappedPlatforms) {
      const platName = platInput.name;
      const matchedAccount = accountsList.find((acc: any) => acc.platform === platName && acc.isActive !== false);

      if (matchedAccount) {
        const platformObj: any = {
          platform: platName,
          accountId: matchedAccount._id,
          customContent: platInput.content
        };

        if (platName === 'pinterest') {
          if (!pinterest_board_id) {
            return NextResponse.json(
              { error: 'Pinterest Board ID is required in settings to publish to Pinterest.' },
              { status: 400 }
            );
          }
          
          let finalPinterestLinkVal = platInput.pinterestLink;
          if (!finalPinterestLinkVal) {
            finalPinterestLinkVal = origin;
            if (collection) {
              finalPinterestLinkVal = `${origin}/collections/${collection.slug}`;
            } else if (product?.affiliateUrl) {
              finalPinterestLinkVal = product.affiliateUrl;
            }
          }

          // Build post title for Pinterest
          let postTitle = platInput.pinterestTitle;
          if (!postTitle) {
            if (product?.title) {
              postTitle = product.title;
            } else if (collection?.title) {
              postTitle = collection.title;
            } else {
              const firstLine = platInput.content.split('\n')[0].trim().replace(/^[^a-zA-Z0-9]+/, '');
              postTitle = firstLine || 'Cozy Hub Recommendation';
            }
          }
          if (postTitle.length > 95) {
            postTitle = postTitle.substring(0, 92) + '...';
          }

          finalPinterestTitle = postTitle;
          finalPinterestLink = finalPinterestLinkVal;

          const pinterestOpts = {
            boardId: pinterest_board_id,
            title: postTitle,
            link: finalPinterestLinkVal,
          };

          platformObj.boardId = pinterest_board_id;
          platformObj.title = postTitle;
          platformObj.link = finalPinterestLinkVal;
          platformObj.platformSpecificData = pinterestOpts;
          platformObj.pinterestOptions = pinterestOpts;
          platformObj.pinterest_options = pinterestOpts;
        }

        if (platName === 'instagram') {
          const firstCommentText = platInput.instagramFirstComment || instagramFirstComment || '';
          if (firstCommentText) {
            finalInstagramFirstComment = firstCommentText;

            platformObj.firstComment = firstCommentText;
            platformObj.firstCommentText = firstCommentText;
            platformObj.platformSpecificData = {
              firstComment: firstCommentText,
              firstCommentText: firstCommentText,
            };
            platformObj.instagramOptions = {
              firstComment: firstCommentText,
            };
            platformObj.instagram_options = {
              firstComment: firstCommentText,
            };
          }
        }

        zernioPlatformsPayload.push(platformObj);
      } else {
        return NextResponse.json(
          { error: `No active connected account found in Zernio for platform: ${platName}. Please link it in your Zernio dashboard first.` },
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

    // Prepare media items using Zernio's files array schema
    const zernioMediaItems: any[] = [];

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
              mediaFormData.append('files', fileBlob, `image.${ext}`);
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
                const uploadedFile = mediaData.files && mediaData.files[0];
                if (uploadedFile && uploadedFile.url) {
                  zernioMediaItems.push({
                    type: uploadedFile.type || 'image',
                    url: uploadedFile.url,
                    filename: uploadedFile.filename || `image.${ext}`
                  });
                  console.log(`Successfully uploaded base64 to Zernio. CDN URL: ${uploadedFile.url}`);
                } else {
                  console.error('Zernio media upload succeeded but returned no files/url:', mediaData);
                }
              } else {
                const errText = await mediaRes.text();
                console.error(`Zernio media upload failed with status ${mediaRes.status}:`, errText);
              }
            }
          } else if (mediaUrl.startsWith('http') || mediaUrl.startsWith('/')) {
            let absoluteUrl = mediaUrl;
            if (mediaUrl.startsWith('/')) {
              absoluteUrl = `${origin}${mediaUrl}`;
            }

            console.log(`Downloading and uploading image from URL to Zernio: ${absoluteUrl}`);
            const imageFetchRes = await fetch(absoluteUrl);
            if (imageFetchRes.ok) {
              const contentType = imageFetchRes.headers.get('content-type') || 'image/png';
              const buffer = Buffer.from(await imageFetchRes.arrayBuffer());
              const fileBlob = new Blob([buffer], { type: contentType });
              const ext = contentType.split('/')[1] || 'png';

              const mediaFormData = new FormData();
              mediaFormData.append('files', fileBlob, `image.${ext}`);
              mediaFormData.append('type', 'image');

              const mediaRes = await fetch('https://zernio.com/api/v1/media', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${zernio_api_key}`,
                },
                body: mediaFormData
              });

              if (mediaRes.ok) {
                const mediaData = await mediaRes.json();
                const uploadedFile = mediaData.files && mediaData.files[0];
                if (uploadedFile && uploadedFile.url) {
                  zernioMediaItems.push({
                    type: uploadedFile.type || 'image',
                    url: uploadedFile.url,
                    filename: uploadedFile.filename || `image.${ext}`
                  });
                  console.log(`Successfully uploaded image URL to Zernio. CDN URL: ${uploadedFile.url}`);
                } else {
                  console.error('Zernio media upload succeeded but returned no files/url:', mediaData);
                  zernioMediaItems.push({
                    type: 'image',
                    url: mediaUrl,
                    filename: mediaUrl.split('/').pop() || 'image.png'
                  });
                }
              } else {
                const errText = await mediaRes.text();
                console.error(`Zernio media upload failed with status ${mediaRes.status}:`, errText);
                zernioMediaItems.push({
                  type: 'image',
                  url: mediaUrl,
                  filename: mediaUrl.split('/').pop() || 'image.png'
                });
              }
            } else {
              console.error(`Failed to fetch image from URL: ${absoluteUrl}, status: ${imageFetchRes.status}`);
              zernioMediaItems.push({
                type: 'image',
                url: mediaUrl,
                filename: mediaUrl.split('/').pop() || 'image.png'
              });
            }
          } else {
            zernioMediaItems.push({
              type: 'image',
              url: mediaUrl,
              filename: mediaUrl.split('/').pop() || 'image.png'
            });
          }
        } catch (err) {
          console.error('Error handling/attaching image for Zernio:', err);
          zernioMediaItems.push({
            type: 'image',
            url: mediaUrl,
            filename: mediaUrl.split('/').pop() || 'image.png'
          });
        }
      }
    }

    console.log(`Sending upload request to Zernio for platforms:`, JSON.stringify(zernioPlatformsPayload));

    // Call Zernio API
    const zernioPayload: any = {
      content: mainContent,
      platforms: zernioPlatformsPayload
    };

    if (finalInstagramFirstComment) {
      zernioPayload.firstComment = finalInstagramFirstComment;
      zernioPayload.instagramOptions = {
        firstComment: finalInstagramFirstComment
      };
      zernioPayload.instagram_options = {
        firstComment: finalInstagramFirstComment
      };
    }

    if (zernioMediaItems.length > 0) {
      zernioPayload.mediaItems = zernioMediaItems;
    }

    if (finalPinterestTitle || finalPinterestLink) {
      const pinterestOpts = {
        boardId: pinterest_board_id,
        title: finalPinterestTitle,
        link: finalPinterestLink
      };
      zernioPayload.pinterestOptions = pinterestOpts;
      zernioPayload.pinterest_options = pinterestOpts;
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
          platform: mappedPlatforms.map(p => p.name).join(', '),
          generatedContent: mappedPlatforms.map(p => `${p.name}: ${p.content}`).join('\n\n'),
          status: 'FAILED',
          triggerWords: triggerWords || 'link,store,recommendations',
        },
      });

      return NextResponse.json(
        { error: responseData.message || responseData.error || 'Failed to post through Zernio API' },
        { status: response.status || 500 }
      );
    }

    // Auto-extract trigger words from generated content/caption
    const triggersList = ['link', 'store', 'recommendations'];
    if (triggerWords) {
      triggerWords.split(',').forEach((t: string) => triggersList.push(t.trim().toLowerCase()));
    }
    
    const commentRegex = /comment\s+['"“‘]?([a-zA-Z0-9_-]{2,15})['"”’]?/gi;
    const dmRegex = /dm\s+['"“‘]?([a-zA-Z0-9_-]{2,15})['"”’]?/gi;
    
    const allTextToParse = mappedPlatforms.map(p => p.content).join('\n') + '\n' + (postContent || '');
    let match;
    while ((match = commentRegex.exec(allTextToParse)) !== null) {
      if (match[1]) triggersList.push(match[1].toLowerCase());
    }
    while ((match = dmRegex.exec(allTextToParse)) !== null) {
      if (match[1]) triggersList.push(match[1].toLowerCase());
    }
    
    const uniqueTriggers = Array.from(new Set(triggersList)).filter(Boolean).join(',');

    // Save successful post record to the database
    await prisma.socialPost.create({
      data: {
        productId: productId || null,
        collectionId: collectionId || null,
        platform: mappedPlatforms.map(p => p.name).join(', '),
        generatedContent: mappedPlatforms.map(p => `${p.name}: ${p.content}`).join('\n\n'),
        status: 'SENT',
        ayrshareRefId: responseData.id || responseData.postId || responseData.post?._id || responseData.post?.id || '',
        triggerWords: uniqueTriggers,
      },
    });

    return NextResponse.json({ success: true, data: responseData });
  } catch (error: any) {
    console.error('Zernio integration handler error:', error);
    return NextResponse.json({ error: error.message || 'Social publishing failed' }, { status: 500 });
  }
}
