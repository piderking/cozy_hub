import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';
import { generateContentWithRetry } from '@/lib/gemini';

// Deterministic regex parsing for Amazon Stars
function extractStarsFromHtml(html: string): number | null {
  // 1. JSON-LD schema metadata (Standard on product pages)
  const jsonLdRegex = /"ratingValue"\s*:\s*"?(\d\.\d)"?/i;
  const jsonLdMatch = html.match(jsonLdRegex);
  if (jsonLdMatch) {
    const val = parseFloat(jsonLdMatch[1]);
    if (val >= 1 && val <= 5) return val;
  }

  // 2. Standard DOM alt labels (e.g. "4.6 out of 5 stars")
  const iconAltRegex = /(\d\.\d)\s*out of 5 stars/i;
  const iconAltMatch = html.match(iconAltRegex);
  if (iconAltMatch) {
    const val = parseFloat(iconAltMatch[1]);
    if (val >= 1 && val <= 5) return val;
  }

  // 3. Simple text occurrences (e.g. "4.6 stars")
  const simpleStarsRegex = /(\d\.\d)\s*stars/i;
  const simpleStarsMatch = html.match(simpleStarsRegex);
  if (simpleStarsMatch) {
    const val = parseFloat(simpleStarsMatch[1]);
    if (val >= 1 && val <= 5) return val;
  }

  return null;
}

// Deterministic regex parsing for Amazon Reviews count
function extractReviewsCountFromHtml(html: string): string | null {
  // 1. JSON-LD schema reviewCount
  const reviewCountRegex = /"reviewCount"\s*:\s*"?(\d+)"?/i;
  const reviewCountMatch = html.match(reviewCountRegex);
  if (reviewCountMatch) {
    const num = parseInt(reviewCountMatch[1], 10);
    if (!isNaN(num) && num > 0) return num.toLocaleString('en-US');
  }

  // 2. JSON-LD schema ratingCount
  const ratingCountRegex = /"ratingCount"\s*:\s*"?(\d+)"?/i;
  const ratingCountMatch = html.match(ratingCountRegex);
  if (ratingCountMatch) {
    const num = parseInt(ratingCountMatch[1], 10);
    if (!isNaN(num) && num > 0) return num.toLocaleString('en-US');
  }

  // 3. Standard text markers (e.g. "12,845 ratings" or "12,845 global ratings")
  const acrRegex = /(\d{1,3}(?:,\d{3})*)\s+(?:global\s+)?ratings/i;
  const acrMatch = html.match(acrRegex);
  if (acrMatch) return acrMatch[1];

  // 4. Fallback reviews text (e.g. "12,845 reviews")
  const reviewsRegex = /(\d{1,3}(?:,\d{3})*)\s+reviews/i;
  const reviewsMatch = html.match(reviewsRegex);
  if (reviewsMatch) return reviewsMatch[1];

  return null;
}

export async function POST(request: Request) {
  try {
    const settings = await getSettings();
    const { gemini_api_key } = settings;

    if (!gemini_api_key || gemini_api_key.includes('your_gemini_api_key')) {
      return NextResponse.json(
        { error: 'Please configure a valid Gemini API Key in the settings dashboard tab first.' },
        { status: 400 }
      );
    }

    const { url, pastedContent } = await request.json();

    let contentToParse = '';

    if (pastedContent && pastedContent.trim().length > 0) {
      contentToParse = pastedContent;
    } else if (url) {
      // Try to fetch the URL directly
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          },
        });
        if (res.ok) {
          contentToParse = await res.text();
        } else {
          throw new Error(`Failed to fetch URL directly (Status: ${res.status}). Please copy and paste the product page text or HTML content instead.`);
        }
      } catch (err: any) {
        return NextResponse.json(
          { error: `Could not fetch Amazon URL directly due to anti-bot protection. Please copy-paste the page text or HTML source code instead: ${err.message}` },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json({ error: 'Please provide either an Amazon URL or paste product HTML/text.' }, { status: 400 });
    }

    // Run deterministic extraction on the full text first
    const regexStars = extractStarsFromHtml(contentToParse);
    const regexReviews = extractReviewsCountFromHtml(contentToParse);

    // Limit text size to avoid token overflow
    const truncatedContent = contentToParse.substring(0, 120000);

    const systemPrompt = settings.prompt_curator || `You are a professional web scraper and structured data extractor. 
Your task is to analyze the provided raw web content (HTML or plain text) of an Amazon product page, extract key information, and return it in a clean, valid JSON format.
Do not make up information. If a field is not found in the text, return an empty string or empty array.
Clean the title: remove seller fluff and keep it readable.
Raw Description: Extract a comprehensive text summary of the original product description, details, specifications or bullet points found on the page.
Category: Choose a single category matching the product (e.g., Bedroom, Living Room, Desk Setup, Kitchen, Tech, Apparel, Outdoors).
Pros: List 2 to 3 pros.
Cons: List 1 to 2 cons.
Features: List 3 to 5 main features.
Stars: Extract the customer rating as a float between 1.0 and 5.0 (e.g., 4.6).
Reviews Count: Extract the total number of ratings/reviews as a formatted string (e.g., "12,845" or "943").`;

    const prompt = `Analyze this Amazon product page content and return structured details in JSON.

${regexStars !== null ? `Note: The customer rating is detected to be around ${regexStars} stars.` : ''}
${regexReviews !== null ? `Note: The review count is detected to be around ${regexReviews} ratings.` : ''}

Content:
${truncatedContent}

Return format (must be valid JSON, no markdown codeblocks, no extra explanation):
{
  "title": "Clean Title of Product",
  "rawDescription": "Detailed overview of the product description, technical details, and original specs gathered from the page.",
  "category": "Bedroom",
  "imagePrompt": "A prompt for image-to-image generation. Since the model can see the reference image, the prompt MUST follow this exact format: 'A photorealistic mockup of the provided product in the reference image. Place it inside a styled [describe environment matching the category] with [describe lighting and aesthetics].'",
  "features": ["feature 1", "feature 2", "feature 3"],
  "pros": ["pro 1", "pro 2"],
  "cons": ["con 1", "con 2"],
  "stars": ${regexStars !== null ? regexStars : 4.5},
  "reviewsCount": "${regexReviews !== null ? regexReviews : '12,845'}"
}
`;

    const response = await generateContentWithRetry({
      apiKey: gemini_api_key,
      prompt: systemPrompt + '\n\n' + prompt,
      responseMimeType: 'application/json',
    });

    const responseText = response.text || '{}';
    try {
      const parsedData = JSON.parse(responseText.trim());
      // Merge exact regex extractions to ensure 100% accuracy
      if (regexStars !== null) {
        parsedData.stars = regexStars;
      }
      if (regexReviews !== null) {
        parsedData.reviewsCount = regexReviews;
      }
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error('Failed to parse Gemini output as JSON:', responseText, parseError);
      // Fallback extraction regex in case JSON mode failed
      const jsonRegex = /\{[\s\S]*\}/;
      const match = responseText.match(jsonRegex);
      if (match) {
        const cleanedJson = JSON.parse(match[0]);
        if (regexStars !== null) {
          cleanedJson.stars = regexStars;
        }
        if (regexReviews !== null) {
          cleanedJson.reviewsCount = regexReviews;
        }
        return NextResponse.json(cleanedJson);
      }
      return NextResponse.json({ error: 'Gemini did not return structured JSON. Please try again.' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Gemini parser error:', error);
    return NextResponse.json({ error: error.message || 'Gemini extraction failed' }, { status: 500 });
  }
}
