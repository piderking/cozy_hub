import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { ArrowLeft, ExternalLink, ImageIcon, Sparkles } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CollectionDetailPage({ params }: PageProps) {
  const settings = await getSettings();
  const { slug } = await params;

  // Retrieve the collection by its unique slug, including its products
  const collection = await prisma.collection.findUnique({
    where: { slug },
    include: {
      products: {
        where: { isPublished: true }
      }
    }
  });

  if (!collection) {
    notFound();
  }

  return (
    <div className="container animated-fade-in" style={{ padding: '40px 24px' }}>
      {/* Back button */}
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

      {/* Collection Hero Section */}
      <div 
        className="glass-panel collection-hero-grid" 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '1.2fr 1fr', 
          gap: '40px', 
          padding: '32px', 
          borderRadius: '24px', 
          marginBottom: '56px',
          alignItems: 'center'
        }}
      >
        {/* Left: AI Generated Scene Image */}
        <div style={{ borderRadius: '16px', overflow: 'hidden', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {collection.sceneImage ? (
            <img 
              src={collection.sceneImage} 
              alt={collection.title} 
              style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', borderRadius: '16px' }}
            />
          ) : (
            <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ImageIcon size={64} className="text-muted" />
            </div>
          )}
        </div>

        {/* Right: Collection Details */}
        <div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary-color)', letterSpacing: '0.05em', marginBottom: '12px' }}>
            <Sparkles size={14} /> AI Curated Scene Bundle
          </span>
          <h1 style={{ fontSize: '36px', lineHeight: '1.2', fontWeight: 800, marginBottom: '20px' }}>
            {collection.title}
          </h1>
          <p style={{ fontSize: '15px', lineHeight: '1.7', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '24px' }}>
            {collection.description}
          </p>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <p className="text-muted" style={{ fontSize: '12px', fontStyle: 'italic' }}>
              This page showcases a collection of products designed to complement each other. As an Amazon Associate, we earn from qualifying purchases when you use our links.
            </p>
          </div>
        </div>
      </div>

      {/* Products list heading */}
      <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '32px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        Featured Products in this Scene ({collection.products.length})
      </h2>

      {/* Products Grid */}
      {collection.products.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
          <p className="text-muted">No published products are currently in this collection.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '32px' }} className="collection-products-grid">
          {collection.products.map((product) => (
            <div 
              key={product.id} 
              className="glass-card"
              style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
            >
              {/* Image header */}
              <div style={{ position: 'relative', width: '100%', height: '200px', background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-color)' }}>
                {product.mainImage ? (
                  <img 
                    src={product.mainImage} 
                    alt={product.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <ImageIcon size={36} className="text-muted" />
                  </div>
                )}
              </div>

              {/* Product Body */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary-color)', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  {product.category}
                </span>

                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 10px', lineHeight: '1.4', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {product.title}
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {product.customDescription || product.title}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
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
                        style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', gap: '8px', fontSize: '13px', padding: '10px 16px' }}
                      >
                        Buy on Amazon <ExternalLink size={14} />
                      </a>
                    );
                  })()}
                  <a 
                    href={`/product/${product.id}`}
                    style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}
                    className="hover-underline"
                  >
                    View Our Full Review
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FTC Affiliate Disclaimer Box */}
      <footer className="glass-panel" style={{ marginTop: '56px', padding: '24px', textAlign: 'center', borderRadius: '16px' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6', fontStyle: 'italic', margin: 0 }}>
          As an Amazon Associate, {settings.brand_name || 'Cozy Hub'} earns from qualifying purchases. The product recommendations above contain affiliate links that redirect you to Amazon.com with our partner tag ({settings.amazon_tag || 'cozyhub-20'}).
        </p>
      </footer>

      {/* Responsive layout styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 900px) {
          .collection-hero-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
        @media (max-width: 600px) {
          .collection-products-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
        }
        .hover-underline:hover {
          text-decoration: underline;
          color: var(--text-color) !important;
        }
      ` }} />
    </div>
  );
}
