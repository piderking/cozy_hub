import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';

// Curated dataset of simulated cozy products for instant dashboard testing without an API key
const MOCK_PRODUCTS = [
  // Lamps
  {
    title: 'Aesthetic Pleated Ceramic Table Lamp',
    asin: 'B0CR1LAM01',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&auto=format&fit=crop&q=80',
    price: '$29.99',
    stars: 4.7,
    reviewsCount: '512',
    url: 'https://www.amazon.com/dp/B0CR1LAM01',
    category: 'lamp'
  },
  {
    title: 'Minimalist Walnut Wood Desk Lamp',
    asin: 'B0CR1LAM02',
    image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=500&auto=format&fit=crop&q=80',
    price: '$42.50',
    stars: 4.8,
    reviewsCount: '890',
    url: 'https://www.amazon.com/dp/B0CR1LAM02',
    category: 'lamp'
  },
  {
    title: 'Amber Glass Mushroom Ambient Lamp',
    asin: 'B0CR1LAM03',
    image: 'https://images.unsplash.com/photo-1543294001-f7cbfe92237e?w=500&auto=format&fit=crop&q=80',
    price: '$24.99',
    stars: 4.6,
    reviewsCount: '1,243',
    url: 'https://www.amazon.com/dp/B0CR1LAM03',
    category: 'lamp'
  },
  // Desk Setup / Organizers
  {
    title: 'Premium Merino Wool Desk Mat (Dark Grey)',
    asin: 'B0CR1DSK01',
    image: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=500&auto=format&fit=crop&q=80',
    price: '$38.00',
    stars: 4.9,
    reviewsCount: '310',
    url: 'https://www.amazon.com/dp/B0CR1DSK01',
    category: 'desk'
  },
  {
    title: 'Solid Walnut Wood Desk Shelf & Monitor Riser',
    asin: 'B0CR1DSK02',
    image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&auto=format&fit=crop&q=80',
    price: '$89.00',
    stars: 4.8,
    reviewsCount: '142',
    url: 'https://www.amazon.com/dp/B0CR1DSK02',
    category: 'desk'
  },
  {
    title: 'Magnetic Leather Cable Organizer Dock',
    asin: 'B0CR1DSK03',
    image: 'https://images.unsplash.com/photo-1616440347437-b1c73416efc2?w=500&auto=format&fit=crop&q=80',
    price: '$14.99',
    stars: 4.5,
    reviewsCount: '95',
    url: 'https://www.amazon.com/dp/B0CR1DSK03',
    category: 'desk'
  },
  // Blankets / Comfort
  {
    title: 'Chunky Knit Chenille Throw Blanket (Warm Beige)',
    asin: 'B0CR1TEX01',
    image: 'https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?w=500&auto=format&fit=crop&q=80',
    price: '$35.99',
    stars: 4.7,
    reviewsCount: '2,410',
    url: 'https://www.amazon.com/dp/B0CR1TEX01',
    category: 'blanket'
  },
  {
    title: 'Bouclé Ribbed Decorative Cushion Covers (Pack of 2)',
    asin: 'B0CR1TEX02',
    image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500&auto=format&fit=crop&q=80',
    price: '$18.99',
    stars: 4.6,
    reviewsCount: '560',
    url: 'https://www.amazon.com/dp/B0CR1TEX02',
    category: 'blanket'
  },
  // Ceramics / Mugs
  {
    title: 'Handcrafted Speckled Wabi-Sabi Ceramic Mug',
    asin: 'B0CR1CER01',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
    price: '$16.50',
    stars: 4.8,
    reviewsCount: '230',
    url: 'https://www.amazon.com/dp/B0CR1CER01',
    category: 'mug'
  },
  {
    title: 'Double-Walled Glass Mug (Aesthetic Ribbed)',
    asin: 'B0CR1CER02',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80',
    price: '$12.99',
    stars: 4.7,
    reviewsCount: '412',
    url: 'https://www.amazon.com/dp/B0CR1CER02',
    category: 'mug'
  }
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';

    if (!query) {
      return NextResponse.json({ error: 'Search query parameter "q" is required' }, { status: 400 });
    }

    const settings = await getSettings();
    const apiKey = settings.rapidapi_key;
    const apiHost = settings.rapidapi_host || 'real-time-amazon-data.p.rapidapi.com';

    // 1. SIMULATION MODE (No API Key set, or set to mock values)
    if (!apiKey || apiKey === 'your_rapidapi_key' || apiKey.trim() === '') {
      console.log(`[Amazon Search] RapidAPI Key not set. Running in simulation mode for query: "${query}"`);
      
      const lowerQuery = query.toLowerCase();
      
      // Filter mock database by query matching tags/keywords
      let filtered = MOCK_PRODUCTS.filter(item => {
        return (
          item.title.toLowerCase().includes(lowerQuery) ||
          item.category.toLowerCase().includes(lowerQuery)
        );
      });

      // If no exact match, return a diverse mixture
      if (filtered.length === 0) {
        filtered = MOCK_PRODUCTS.slice(0, 5);
      }

      // Map clean simulated products (excluding metadata field category)
      const cleanSimulated = filtered.map(({ category, ...rest }) => rest);

      // Return a simulated response after a tiny artificial delay
      await new Promise(resolve => setTimeout(resolve, 800));

      return NextResponse.json({
        success: true,
        isSimulated: true,
        results: cleanSimulated
      });
    }

    // 2. REAL RAPIDAPI MODE
    console.log(`[Amazon Search] Calling RapidAPI (${apiHost}) for query: "${query}"`);
    
    // Construct the search URL for Real-Time Amazon Data API on RapidAPI
    const url = `https://${apiHost}/search?query=${encodeURIComponent(query)}&page=1&country=US&sort_by=RELEVANCE&product_condition=ALL`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost
      }
    });
    
    if (!response.ok) {
      throw new Error(`RapidAPI responded with status ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' && !data.data) {
      throw new Error(data.message || 'RapidAPI request failed or returned invalid status');
    }

    const productsList = data.data?.products || [];

    const results = productsList.map((item: any) => {
      // Parse star rating safely
      let parsedStars = 4.5;
      if (item.product_star_rating !== undefined && item.product_star_rating !== null) {
        const parsed = parseFloat(item.product_star_rating);
        if (!isNaN(parsed)) {
          parsedStars = parsed;
        }
      }

      // Parse ratings count safely
      let formattedReviews = '0';
      if (item.product_num_ratings !== undefined && item.product_num_ratings !== null) {
        const num = parseInt(item.product_num_ratings, 10);
        if (!isNaN(num)) {
          formattedReviews = num.toLocaleString('en-US');
        } else {
          formattedReviews = String(item.product_num_ratings);
        }
      }

      return {
        title: item.product_title || '',
        asin: item.asin || '',
        image: item.product_photo || '',
        price: item.product_price || '',
        stars: parsedStars,
        reviewsCount: formattedReviews,
        url: item.product_url || `https://www.amazon.com/dp/${item.asin}`
      };
    });

    return NextResponse.json({
      success: true,
      isSimulated: false,
      results
    });

  } catch (error: any) {
    console.error('Amazon Search API route error:', error);
    return NextResponse.json({ error: error.message || 'Failed to search products' }, { status: 500 });
  }
}
