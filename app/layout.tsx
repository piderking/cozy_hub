import React from 'react';
import type { Metadata } from 'next';
import { getSettings } from '@/lib/settings';
import CustomThemeProvider from '@/components/CustomThemeProvider';
import './globals.css';
import { Sparkles, Settings } from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: settings.brand_name || 'Cozy Hub',
    description: settings.brand_tagline || 'Curated affiliate product recommendations.',
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();

  return (
    <html lang="en">
      <head>
        <CustomThemeProvider settings={settings} />
      </head>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Public Header */}
          <header className="glass-panel" style={{ margin: '20px auto 0', width: 'calc(100% - 48px)', maxWidth: '1200px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px' }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles className="accent-text" size={24} />
              <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-title)' }}>
                {settings.brand_name || 'Hub'}
              </span>
            </a>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <a href="/" style={{ fontSize: '14px', fontWeight: 600, opacity: 0.85 }}>Catalog</a>
              <a href="/admin" className="glass-button secondary" style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', gap: '6px' }}>
                <Settings size={14} /> Dashboard
              </a>
            </div>
          </header>

          {/* Main Content Area */}
          <main style={{ flex: 1 }}>
            {children}
          </main>

          {/* Public Footer */}
          <footer className="glass-panel" style={{ margin: '40px auto 20px', width: 'calc(100% - 48px)', maxWidth: '1200px', padding: '24px', textAlign: 'center', borderRadius: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <p>© {new Date().getFullYear()} {settings.brand_name || 'Hub'}. All rights reserved.</p>
            <p style={{ marginTop: '6px', fontSize: '11px', opacity: 0.7 }}>
              As an Amazon Associate, we earn from qualifying purchases.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
