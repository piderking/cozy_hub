import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { Check, X, ExternalLink, ImageIcon, ArrowLeft } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const settings = await getSettings();
  const { id } = await params;

  // Retrieve product
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    notFound();
  }

  // Parse JSON data arrays safely
  let pros: string[] = [];
  let cons: string[] = [];
  try {
    pros = JSON.parse(product.pros);
  } catch (_) {}
  try {
    cons = JSON.parse(product.cons);
  } catch (_) {}

  return (
    <div className="container animated-fade-in" style={{ padding: '40px 24px' }}>
      {/* Back button link */}
      <a 
        href="/" 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: 'var(--text-muted)', 
          fontSize: '14px', 
          fontWeight: 600, 
          marginBottom: '32px',
          transition: 'var(--transition)'
        }}
        className="back-link"
      >
        <ArrowLeft size={16} /> Back to Catalog
      </a>

      {/* Main Product Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'start', marginBottom: '56px' }} className="product-layout-grid">
        {/* Product Image Column */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '24px', overflow: 'hidden' }}>
          {product.mainImage ? (
            <img 
              src={product.mainImage} 
              alt={product.title} 
              style={{ width: '100%', maxHeight: '450px', objectFit: 'contain', borderRadius: '12px' }} 
            />
          ) : (
            <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ImageIcon size={64} className="text-muted" />
            </div>
          )}
        </div>

        {/* Product Details Column */}
        <div style={{ padding: '10px 0' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary-color)', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>
            {product.category}
          </span>
          <h1 style={{ fontSize: '32px', lineHeight: '1.3', marginBottom: '16px', fontWeight: 800 }}>
            {product.title}
          </h1>

          {product.stars !== null && product.stars !== undefined && product.stars > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', padding: '6px 16px', borderRadius: '20px', width: 'fit-content' }}>
              <span style={{ color: '#fbbf24', display: 'inline-flex', gap: '2px', fontSize: '15px' }} title={`${product.stars} out of 5 stars`}>
                {'★'.repeat(Math.round(product.stars))}
                {'☆'.repeat(5 - Math.round(product.stars))}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-color)' }}>
                {product.stars} out of 5
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                ({product.reviewsCount || '0'} reviews on Amazon)
              </span>
            </div>
          )}

          {/* View Deal Call To Action */}
          {(() => {
            let buyLink = product.affiliateUrl || product.originalUrl;
            if (settings.amazon_tag) {
              try {
                const urlObj = new URL(product.originalUrl);
                urlObj.searchParams.set('tag', settings.amazon_tag);
                buyLink = urlObj.toString();
              } catch (_) {}
            }
            return (
              <a 
                href={buyLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="glass-button"
                style={{ 
                  display: 'inline-flex', 
                  padding: '16px 36px', 
                  fontSize: '16px', 
                  borderRadius: '12px', 
                  width: '100%', 
                  justifyContent: 'center',
                  textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }}
              >
                Buy on Amazon <ExternalLink size={18} />
              </a>
            );
          })()}

          {/* Amazon Disclaimer disclosure */}
          <p className="text-muted" style={{ fontSize: '12px', textAlign: 'center', marginTop: '12px', fontStyle: 'italic', opacity: 0.9 }}>
            As an Amazon Associate, we earn from qualifying purchases. Clicking the button above redirects you to Amazon.com with our partner ID ({settings.amazon_tag || 'cozyhub-20'}).
          </p>
        </div>
      </div>

      {/* Narrative Curation / Review */}
      {product.customDescription && (
        <section className="glass-panel" style={{ padding: '40px', marginBottom: '40px', borderRadius: '24px' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            Why We Recommend It
          </h2>
          <p style={{ fontSize: '15px', lineHeight: '1.7', color: 'rgba(255, 255, 255, 0.95)' }}>
            {product.customDescription}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontStyle: 'italic' }}>
            As an Amazon Associate, we earn from qualifying purchases. This product recommendation contains affiliate links that direct you to Amazon.com.
          </p>
        </section>
      )}

      {/* Pros & Cons Section */}
      {(pros.length > 0 || cons.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }} className="pros-cons-grid">
          {/* Pros list */}
          {pros.length > 0 && (
            <div className="glass-panel" style={{ padding: '30px', borderRadius: '20px', borderLeft: '4px solid #10b981' }}>
              <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', marginBottom: '16px' }}>
                <Check size={18} /> Pros & Highlights
              </h3>
              <ul style={{ listStyle: 'none', display: 'grid', gap: '10px' }}>
                {pros.map((pro, index) => (
                  <li key={index} style={{ display: 'flex', gap: '10px', fontSize: '14px', alignItems: 'baseline' }}>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cons list */}
          {cons.length > 0 && (
            <div className="glass-panel" style={{ padding: '30px', borderRadius: '20px', borderLeft: '4px solid #ef4444' }}>
              <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', marginBottom: '16px' }}>
                <X size={18} /> Points To Consider
              </h3>
              <ul style={{ listStyle: 'none', display: 'grid', gap: '10px' }}>
                {cons.map((con, index) => (
                  <li key={index} style={{ display: 'flex', gap: '10px', fontSize: '14px', alignItems: 'baseline' }}>
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>✗</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Responsive stylesheet hacks for CSS grids */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .product-layout-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .pros-cons-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
        }
      ` }} />
    </div>
  );
}
