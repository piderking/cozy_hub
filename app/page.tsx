import React from 'react';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { ImageIcon, ChevronRight } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function CatalogPage({ searchParams }: PageProps) {
  const settings = await getSettings();
  const params = await searchParams;
  const activeCategory = params.category || 'All';

  // Categories list
  const categories = ['All', 'Bedroom', 'Living Room', 'Desk Setup', 'Kitchen', 'Tech', 'Apparel', 'Outdoors'];

  // Query database
  const whereClause: any = { isPublished: true };
  if (activeCategory !== 'All') {
    whereClause.category = activeCategory;
  }

  const products = await prisma.product.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="container animated-fade-in" style={{ padding: '40px 24px' }}>
      {/* Hero Banner */}
      <section style={{ textAlign: 'center', marginBottom: '48px', padding: '40px 0' }}>
        <h1 style={{ fontSize: '40px', fontWeight: 800, marginBottom: '12px', background: 'linear-gradient(135deg, var(--text-color) 0%, rgba(255, 255, 255, 0.7) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {settings.brand_name || 'Hub'} Recommendations
        </h1>
        <p className="text-muted" style={{ fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
          {settings.brand_tagline || 'Explore high quality items curated specifically for your home and lifestyle.'}
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px', fontStyle: 'italic', opacity: 0.8 }}>
          As an Amazon Associate, this site earns from qualifying purchases. We recommend products we love.
        </p>
      </section>

      {/* Category Selection Bar */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '40px', borderBottom: '1px solid var(--border-color)' }}>
        {categories.map((cat) => {
          const isActive = cat === activeCategory;
          const queryUrl = cat === 'All' ? '/' : `/?category=${encodeURIComponent(cat)}`;
          
          return (
            <a 
              key={cat} 
              href={queryUrl}
              className={`glass-button ${isActive ? '' : 'secondary'}`}
              style={{ 
                padding: '8px 18px', 
                fontSize: '13px', 
                borderRadius: '20px', 
                whiteSpace: 'nowrap',
                fontWeight: isActive ? 700 : 500
              }}
            >
              {cat}
            </a>
          );
        })}
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="glass-panel" style={{ padding: '80px 24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <ImageIcon size={48} className="text-muted" style={{ margin: '0 auto 16px' }} />
          <h3>No Recommendations Yet</h3>
          <p className="text-muted" style={{ marginTop: '8px', fontSize: '14px' }}>
            We are currently updating our list of products in the {activeCategory !== 'All' ? `"${activeCategory}" category` : 'catalog'}. Check back soon!
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '32px' }}>
          {products.map((prod) => (
            <a 
              key={prod.id} 
              href={`/product/${prod.id}`}
              className="glass-card"
              style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
            >
              {/* Product Card Image */}
              <div style={{ position: 'relative', width: '100%', height: '220px', background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-color)' }}>
                {prod.mainImage ? (
                  <img 
                    src={prod.mainImage} 
                    alt={prod.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <ImageIcon size={40} className="text-muted" />
                  </div>
                )}
              </div>

              {/* Product Card Details */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary-color)', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  {prod.category}
                </span>
                
                {prod.stars !== null && prod.stars !== undefined && prod.stars > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '12px' }}>
                    <span style={{ color: '#fbbf24', display: 'inline-flex', gap: '1px', fontSize: '13px' }} title={`${prod.stars} out of 5 stars`}>
                      {'★'.repeat(Math.round(prod.stars))}
                      {'☆'.repeat(5 - Math.round(prod.stars))}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                      {prod.stars} ({prod.reviewsCount || '0'})
                    </span>
                  </div>
                )}

                <h3 style={{ fontSize: '16px', margin: '0 0 12px', lineHeight: '1.4', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {prod.title}
                </h3>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                  <span className="accent-text" style={{ fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    View Details & Deal <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
