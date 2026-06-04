'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Settings, 
  FolderSearch, 
  Trash2, 
  Plus, 
  ExternalLink, 
  Copy, 
  Check, 
  Send, 
  Save, 
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  FolderPlus,
  Eye,
  FileText,
  Share2,
  LogOut
} from 'lucide-react';
import styles from './admin.module.css';

interface Product {
  id: string;
  title: string;
  originalUrl: string;
  affiliateUrl: string;
  category: string;
  mainImage: string;
  galleryImages: string; // JSON string containing { prompt }
  customDescription: string;
  pros: string; // JSON string
  cons: string; // JSON string
  isPublished: boolean;
  stars?: number | null;
  reviewsCount?: string | null;
  createdAt: string;
}

interface HubSettings {
  brand_name: string;
  brand_tagline: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  gemini_api_key: string;
  uploadpost_api_key: string;
  uploadpost_username: string;
  pinterest_board_id: string;
  amazon_tag: string;
  niche_prompt_directive: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'listings' | 'curator' | 'settings'>('listings');
  
  // Auth State
  const [authStatus, setAuthStatus] = useState<'loading' | 'needs_setup' | 'needs_login' | 'authorized'>('loading');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Settings State
  const [settings, setSettings] = useState<HubSettings>({
    brand_name: '',
    brand_tagline: '',
    primary_color: '#d97706',
    secondary_color: '#1e293b',
    background_color: '#0b0f17',
    text_color: '#f8fafc',
    gemini_api_key: '',
    uploadpost_api_key: '',
    uploadpost_username: '',
    pinterest_board_id: '',
    amazon_tag: '',
    niche_prompt_directive: '',
  });

  // Listings State
  const [products, setProducts] = useState<Product[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Curator / Form State
  const [amazonUrl, setAmazonUrl] = useState('');
  const [pastedHtml, setPastedHtml] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageInstructions, setImageInstructions] = useState('');
  const [curatedProduct, setCuratedProduct] = useState({
    id: '', // Empty if new
    title: '',
    originalUrl: '',
    affiliateUrl: '',
    rawDescription: '', // Stores Amazon details
    category: 'Bedroom',
    mainImage: '',
    originalProductImage: '', // Original product photo URL
    imagePrompt: '', // Image generation prompt
    originalImagePrompt: '', // Original prompt generated initially
    customDescription: '',
    pros: [] as string[],
    cons: [] as string[],
    isPublished: true,
    stars: 0.0,
    reviewsCount: '0',
  });

  // Generated Social Media Drafts
  const [socialDrafts, setSocialDrafts] = useState({
    instagramPost: '',
    pinterestPost: '',
    xPost: '',
  });

  // UI States
  const [loading, setLoading] = useState({
    settings: true,
    products: true,
    parse: false,
    generate: false,
    save: false,
    publish: false,
    mockup: false,
    refine: false,
  });

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Settings and Products
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/admin/auth');
      if (res.ok) {
        const data = await res.json();
        if (!data.isPasswordSet) {
          setAuthStatus('needs_setup');
        } else if (!data.isAuthenticated) {
          setAuthStatus('needs_login');
        } else {
          setAuthStatus('authorized');
          fetchSettings();
          fetchProducts();
        }
      } else {
        setAuthStatus('needs_login');
      }
    } catch (err) {
      console.error(err);
      setAuthStatus('needs_login');
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent, action: 'setup' | 'login') => {
    e.preventDefault();
    setAuthError('');
    setLoading(prev => ({ ...prev, save: true }));
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, password: passwordInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordInput('');
        setAuthStatus('authorized');
        fetchSettings();
        fetchProducts();
        showMessage(action === 'setup' ? 'Password configured!' : 'Logged in successfully!');
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred');
    } finally {
      setLoading(prev => ({ ...prev, save: false }));
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      if (res.ok) {
        setAuthStatus('needs_login');
        showMessage('Logged out successfully');
      }
    } catch (err) {
      console.error(err);
      showMessage('Failed to log out', 'error');
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error(err);
      showMessage('Failed to load settings', 'error');
    } finally {
      setLoading(prev => ({ ...prev, settings: false }));
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
      showMessage('Failed to load products history', 'error');
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(prev => ({ ...prev, save: true }));
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        // Apply dynamic stylesheet settings instantly for the admin view too
        document.documentElement.style.setProperty('--primary-color', data.settings.primary_color);
        document.documentElement.style.setProperty('--secondary-color', data.settings.secondary_color);
        document.documentElement.style.setProperty('--background-color', data.settings.background_color);
        document.documentElement.style.setProperty('--text-color', data.settings.text_color);
        showMessage('Settings and themes updated successfully');
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save settings');
      }
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setLoading(prev => ({ ...prev, save: false }));
    }
  };

  // Parsing amazon product page content using Gemini
  const handleParseProduct = async () => {
    if (!amazonUrl.trim() && !pastedHtml.trim()) {
      showMessage('Please provide an Amazon URL or paste product HTML/Text content first.', 'error');
      return;
    }

    setLoading(prev => ({ ...prev, parse: true }));
    try {
      const res = await fetch('/api/curate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: amazonUrl,
          pastedContent: pastedHtml,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse product');
      }

      // Generate tracking link automatically if Amazon Tag is configured
      let affiliateUrl = amazonUrl;
      if (settings.amazon_tag && amazonUrl) {
        try {
          const urlObj = new URL(amazonUrl);
          urlObj.searchParams.set('tag', settings.amazon_tag);
          affiliateUrl = urlObj.toString();
        } catch (_) {
          // Fallback if URL constructor fails
        }
      }

      setCuratedProduct(prev => ({
        ...prev,
        title: data.title || '',
        category: data.category || 'Bedroom',
        originalUrl: amazonUrl,
        affiliateUrl: affiliateUrl || amazonUrl,
        rawDescription: data.rawDescription || data.features?.join('\n') || '',
        pros: data.pros || [],
        cons: data.cons || [],
        imagePrompt: data.imagePrompt || '', // Set extracted image prompt
        originalImagePrompt: data.imagePrompt || '', // Set original prompt reference
        mainImage: data.mainImage || prev.mainImage,
        stars: data.stars !== undefined ? data.stars : 0.0,
        reviewsCount: data.reviewsCount !== undefined ? data.reviewsCount : '0',
      }));

      showMessage('Raw product data gathered! Verify and review in Panel 1.');
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setLoading(prev => ({ ...prev, parse: false }));
    }
  };

  // Generate customized copywriting (Title + Descriptions + Social media posts) using Gemini
  const handleGenerateCopywriting = async () => {
    if (!curatedProduct.title) {
      showMessage('Please extract or fill in the product title first in Panel 1.', 'error');
      return;
    }

    setLoading(prev => ({ ...prev, generate: true }));
    try {
      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: curatedProduct.title,
          rawDescription: curatedProduct.rawDescription,
          category: curatedProduct.category,
          features: curatedProduct.rawDescription,
          pros: curatedProduct.pros,
          cons: curatedProduct.cons,
          mainImage: curatedProduct.originalProductImage,
          affiliateUrl: curatedProduct.affiliateUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate copy');
      }

      // If prompt is empty, let's also fetch a template prompt based on the newly generated clean title
      let fetchedPrompt = curatedProduct.imagePrompt;
      if (!fetchedPrompt) {
        try {
          const promptRes = await fetch('/api/generate-mockup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'generate',
              title: data.customTitle || curatedProduct.title,
              rawDescription: curatedProduct.rawDescription,
              category: curatedProduct.category,
              mainImage: curatedProduct.originalProductImage,
            }),
          });
          const promptData = await promptRes.json();
          if (promptRes.ok) {
            fetchedPrompt = promptData.prompt;
          }
        } catch (_) {}
      }

      setCuratedProduct(prev => ({
        ...prev,
        title: data.customTitle || prev.title, // Update with clean, aesthetic title
        customDescription: data.customDescription || '',
        imagePrompt: fetchedPrompt || prev.imagePrompt,
        originalImagePrompt: prev.originalImagePrompt || fetchedPrompt || prev.imagePrompt,
      }));

      setSocialDrafts({
        instagramPost: data.instagramPost || '',
        pinterestPost: data.pinterestPost || '',
        xPost: data.xPost || '',
      });

      showMessage('AI theme title, description, and social posts generated in Panel 2 & 3!');
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setLoading(prev => ({ ...prev, generate: false }));
    }
  };

  // Refine / Tweak the image generation prompt based on instructions
  const handleRefinePrompt = async () => {
    if (!curatedProduct.imagePrompt) {
      showMessage('Please extract details or generate copywriting first to populate the prompt.', 'error');
      return;
    }
    if (!imageInstructions.trim()) {
      showMessage('Please type prompt revision instructions first.', 'error');
      return;
    }

    setLoading(prev => ({ ...prev, refine: true }));
    try {
      const res = await fetch('/api/generate-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refine',
          originalPrompt: curatedProduct.imagePrompt,
          instructions: imageInstructions,
          title: curatedProduct.title,
          category: curatedProduct.category,
          rawDescription: curatedProduct.rawDescription,
          mainImage: curatedProduct.originalProductImage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to refine prompt');
      }

      setCuratedProduct(prev => ({
        ...prev,
        imagePrompt: data.prompt,
      }));
      setImageInstructions('');
      showMessage('Prompt refined successfully based on your instructions!');
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setLoading(prev => ({ ...prev, refine: false }));
    }
  };

  // Generate AI Environment Mockup Image using the current prompt text
  const handleGenerateMockup = async () => {
    if (!curatedProduct.originalProductImage) {
      showMessage('Product Image URL is required in Panel 1 before generating an AI mockup.', 'error');
      return;
    }
    if (!curatedProduct.imagePrompt) {
      showMessage('Please enter an Image Generation Prompt first.', 'error');
      return;
    }

    setLoading(prev => ({ ...prev, mockup: true }));
    try {
      const res = await fetch('/api/generate-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mockup',
          prompt: curatedProduct.imagePrompt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate mockup');
      }

      setCuratedProduct(prev => ({
        ...prev,
        mainImage: data.imageUrl, // Set generated base64 mockup as the main image
      }));

      showMessage('AI environment mockup generated successfully! Review in Panel 2.');
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setLoading(prev => ({ ...prev, mockup: false }));
    }
  };

  // Save product details to the database (Create/Update)
  const handleSaveProduct = async () => {
    if (!curatedProduct.title) {
      showMessage('Title is required before saving.', 'error');
      return;
    }
    if (!curatedProduct.originalProductImage) {
      showMessage('Product Image URL (Mandatory Reference URL) is required in Panel 1 before saving.', 'error');
      return;
    }

    setLoading(prev => ({ ...prev, save: true }));
    try {
      const url = curatedProduct.id 
        ? `/api/products/${curatedProduct.id}` 
        : '/api/products';
      const method = curatedProduct.id ? 'PUT' : 'POST';

      // Fallback social media copy if none was generated/filled in Panel 3 (FTC Compliant #ad)
      const defaultInsta = `#ad ✨ ${curatedProduct.title}\n\n${curatedProduct.customDescription || curatedProduct.rawDescription}\n\nCheck the link in our bio to find this deal! 🏠✨\n\n#cozyhome #decor #lifestyle`;
      const defaultPin = `#ad 📌 ${curatedProduct.title} - ${curatedProduct.customDescription || curatedProduct.rawDescription}\n\nPin this to save for later!`;
      const defaultX = `#ad ✨ ${curatedProduct.title.substring(0, 50)}\n\n${(curatedProduct.customDescription || curatedProduct.rawDescription || '').substring(0, 150)}...\n\nGrab the deal here: [LINK] 🛍️`;

      const igContent = socialDrafts.instagramPost.trim() || defaultInsta;
      const pinContent = socialDrafts.pinterestPost.trim() || defaultPin;
      const xContent = socialDrafts.xPost.trim() || defaultX;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...curatedProduct,
          price: '', // Always blank out price
          // Save prompt, original prompt, raw description, original product image, and social posts to preserve them
          galleryImages: JSON.stringify({ 
            prompt: curatedProduct.imagePrompt,
            originalPrompt: curatedProduct.originalImagePrompt,
            rawDescription: curatedProduct.rawDescription,
            originalProductImage: curatedProduct.originalProductImage,
            socialDrafts: {
              instagram: igContent,
              pinterest: pinContent,
              x: xContent,
            }
          }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save product');
      }

      // Sync drafts visually in UI
      setSocialDrafts({
        instagramPost: igContent,
        pinterestPost: pinContent,
        xPost: xContent,
      });

      showMessage(curatedProduct.id ? 'Product listing updated!' : 'Product listing saved to catalog!');
      
      setCuratedProduct(prev => ({
        ...prev,
        id: data.product?.id || prev.id || '',
      }));
      
      fetchProducts();
      if (curatedProduct.id) {
        setActiveTab('listings');
      }
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setLoading(prev => ({ ...prev, save: false }));
    }
  };

  const handleEditProduct = (prod: Product) => {
    let prosArr: string[] = [];
    let consArr: string[] = [];
    let promptStr = '';
    let originalPromptStr = '';
    let rawDescriptionStr = '';
    let originalProductImageStr = '';
    let socialDraftsObj = { instagram: '', pinterest: '', x: '' };

    try { prosArr = JSON.parse(prod.pros); } catch(_) {}
    try { consArr = JSON.parse(prod.cons); } catch(_) {}
    try {
      const galleryData = JSON.parse(prod.galleryImages);
      if (galleryData && typeof galleryData === 'object' && !Array.isArray(galleryData)) {
        promptStr = galleryData.prompt || '';
        originalPromptStr = galleryData.originalPrompt || '';
        rawDescriptionStr = galleryData.rawDescription || '';
        originalProductImageStr = galleryData.originalProductImage || '';
        if (galleryData.socialDrafts) {
          socialDraftsObj = {
            instagram: galleryData.socialDrafts.instagram || '',
            pinterest: galleryData.socialDrafts.pinterest || '',
            x: galleryData.socialDrafts.x || '',
          };
        }
      }
    } catch (_) {}

    setCuratedProduct({
      id: prod.id,
      title: prod.title,
      originalUrl: prod.originalUrl,
      affiliateUrl: prod.affiliateUrl,
      rawDescription: rawDescriptionStr || prod.customDescription, // Fallback to custom description if old format
      category: prod.category,
      mainImage: prod.mainImage,
      originalProductImage: originalProductImageStr || prod.mainImage, // Fallback to mainImage for old format
      imagePrompt: promptStr,
      originalImagePrompt: originalPromptStr || promptStr,
      customDescription: prod.customDescription,
      pros: prosArr,
      cons: consArr,
      isPublished: prod.isPublished,
      stars: prod.stars !== undefined && prod.stars !== null ? prod.stars : 0.0,
      reviewsCount: prod.reviewsCount !== undefined && prod.reviewsCount !== null ? prod.reviewsCount : '0',
    });

    setSocialDrafts({
      instagramPost: socialDraftsObj.instagram || `${prod.title}\n\n${prod.customDescription}\n\nCheck the link in our bio to find this deal! 🏠✨\n\n#cozyhome #decor #lifestyle`,
      pinterestPost: socialDraftsObj.pinterest || `${prod.title} - ${prod.customDescription}\n\nPin this to save for later!`,
      xPost: socialDraftsObj.x || `✨ ${prod.title.substring(0, 50)}\n\n${prod.customDescription.substring(0, 150)}...\n\nGrab the deal here: [LINK] 🛍️`,
    });

    setActiveTab('curator');
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showMessage('Listing deleted successfully');
        fetchProducts();
      } else {
        const err = await res.json();
        throw new Error(err.error);
      }
    } catch (err: any) {
      showMessage(err.message, 'error');
    }
  };

  // Dynamically download mockup or original cover image locally
  const handleDownloadImage = async () => {
    const imageUrl = curatedProduct.mainImage || curatedProduct.originalProductImage;
    if (!imageUrl) {
      showMessage('No image available to download.', 'error');
      return;
    }
    try {
      if (imageUrl.startsWith('data:image')) {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = `cozyhub-${curatedProduct.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'product'}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showMessage('Cover image download started');
      } else {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `cozyhub-${curatedProduct.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'product'}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        showMessage('Cover image download started');
      }
    } catch (err) {
      // CORS fallback: open in a new tab so user can manually right-click save
      window.open(imageUrl, '_blank');
      showMessage('Opening image in new window (Right-click to save)');
    }
  };

  // Copy to clipboard helper
  const handleCopyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Publish to Socials via Ayrshare (Individual)
  const handlePublishToSocials = async (platform: string, content: string) => {
    let finalContent = content.trim();
    if (!finalContent) {
      if (platform === 'instagram') {
        finalContent = `#ad ✨ ${curatedProduct.title}\n\n${curatedProduct.customDescription || curatedProduct.rawDescription}\n\nCheck the link in our bio to find this deal! 🏠✨\n\n#cozyhome #decor #lifestyle`;
      } else if (platform === 'pinterest') {
        finalContent = `#ad 📌 ${curatedProduct.title} - ${curatedProduct.customDescription || curatedProduct.rawDescription}\n\nPin this to save for later!`;
      } else if (platform === 'twitter') {
        finalContent = `#ad ✨ ${curatedProduct.title.substring(0, 50)}\n\n${(curatedProduct.customDescription || curatedProduct.rawDescription || '').substring(0, 150)}...\n\nGrab the deal here: [LINK] 🛍️`;
      }
    }

    if (!finalContent.trim()) {
      showMessage('Draft is empty. Generate or type content first.', 'error');
      return;
    }

    setLoading(prev => ({ ...prev, publish: true }));
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const mediaUrls = curatedProduct.id 
        ? [`${origin}/api/images/${curatedProduct.id}`]
        : (curatedProduct.mainImage && curatedProduct.mainImage.startsWith('http') ? [curatedProduct.mainImage] : undefined);

      const payload = {
        productId: curatedProduct.id || undefined,
        postContent: finalContent,
        platforms: [platform],
        mediaUrls: mediaUrls,
      };

      const res = await fetch('/api/publish-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Publishing failed');
      }

      // Update state visually if they published with fallback
      if (!content.trim()) {
        setSocialDrafts(prev => ({
          ...prev,
          [`${platform}Post`]: finalContent,
        }));
      }

      showMessage(`Post successfully sent to ${platform} via Upload-Post!`);
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setLoading(prev => ({ ...prev, publish: false }));
    }
  };

  // Publish to ALL Socials at once (Instagram, Pinterest, X/Twitter)
  const handlePublishToAllSocials = async () => {
    setLoading(prev => ({ ...prev, publish: true }));
    let successCount = 0;
    const failedPlatforms: string[] = [];

    const defaultInsta = `#ad ✨ ${curatedProduct.title}\n\n${curatedProduct.customDescription || curatedProduct.rawDescription}\n\nCheck the link in our bio to find this deal! 🏠✨\n\n#cozyhome #decor #lifestyle`;
    const defaultPin = `#ad 📌 ${curatedProduct.title} - ${curatedProduct.customDescription || curatedProduct.rawDescription}\n\nPin this to save for later!`;
    const defaultX = `#ad ✨ ${curatedProduct.title.substring(0, 50)}\n\n${(curatedProduct.customDescription || curatedProduct.rawDescription || '').substring(0, 150)}...\n\nGrab the deal here: [LINK] 🛍️`;

    const platformsToPost = [];
    const igContent = socialDrafts.instagramPost.trim() || defaultInsta;
    const pinContent = socialDrafts.pinterestPost.trim() || defaultPin;
    const xContent = socialDrafts.xPost.trim() || defaultX;

    if (igContent) platformsToPost.push({ name: 'instagram', content: igContent });
    if (pinContent) platformsToPost.push({ name: 'pinterest', content: pinContent });
    if (xContent) platformsToPost.push({ name: 'twitter', content: xContent });

    if (platformsToPost.length === 0) {
      showMessage('No social drafts are ready to publish.', 'error');
      setLoading(prev => ({ ...prev, publish: false }));
      return;
    }

    // Sync drafts visually in UI
    setSocialDrafts({
      instagramPost: igContent,
      pinterestPost: pinContent,
      xPost: xContent,
    });

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const mediaUrls = curatedProduct.id 
      ? [`${origin}/api/images/${curatedProduct.id}`]
      : (curatedProduct.mainImage && curatedProduct.mainImage.startsWith('http') ? [curatedProduct.mainImage] : undefined);

    for (const item of platformsToPost) {
      try {
        const payload = {
          productId: curatedProduct.id || undefined,
          postContent: item.content,
          platforms: [item.name],
          mediaUrls: mediaUrls,
        };

        const res = await fetch('/api/publish-social', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          successCount++;
        } else {
          failedPlatforms.push(item.name);
        }
      } catch (err) {
        failedPlatforms.push(item.name);
      }
    }

    setLoading(prev => ({ ...prev, publish: false }));
    if (failedPlatforms.length === 0) {
      showMessage(`Successfully posted to all ${successCount} platforms!`);
    } else {
      showMessage(`Posted to ${successCount} platforms. Failed for: ${failedPlatforms.join(', ')}`, 'error');
    }
  };

  // Filter listings
  const filteredProducts = products.filter(prod => {
    const matchCategory = filterCategory === 'All' || prod.category === filterCategory;
    const matchSearch = prod.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        prod.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  if (authStatus === 'loading') {
    return (
      <div className={`container ${styles.adminWrapper}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Loader2 className="spinner" size={48} />
      </div>
    );
  }

  if (authStatus === 'needs_setup') {
    return (
      <div className={`container ${styles.authContainer}`}>
        <div className={`glass-card ${styles.authCard}`}>
          <h2>Setup Admin Dashboard</h2>
          <p>Choose a secure password to protect your Cozy Hub admin workspace. On subsequent runs, you will log in with this password.</p>
          {authError && (
            <div className={`${styles.alert} ${styles.alertError}`} style={{ marginBottom: '16px' }}>
              <AlertCircle size={18} />
              <span>{authError}</span>
            </div>
          )}
          <form onSubmit={(e) => handleAuthSubmit(e, 'setup')} className={styles.authForm}>
            <div className={styles.authFormGroup}>
              <label htmlFor="setupPassword">New Password</label>
              <input
                id="setupPassword"
                type="password"
                className="glass-input"
                placeholder="At least 4 characters"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
              />
            </div>
            <button type="submit" className={styles.authSubmitBtn} disabled={loading.save}>
              {loading.save ? <Loader2 className="spinner" size={16} /> : 'Create Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (authStatus === 'needs_login') {
    return (
      <div className={`container ${styles.authContainer}`}>
        <div className={`glass-card ${styles.authCard}`}>
          <h2>Admin Login</h2>
          <p>Provide your password to access the Cozy Hub admin controls.</p>
          {authError && (
            <div className={`${styles.alert} ${styles.alertError}`} style={{ marginBottom: '16px' }}>
              <AlertCircle size={18} />
              <span>{authError}</span>
            </div>
          )}
          <form onSubmit={(e) => handleAuthSubmit(e, 'login')} className={styles.authForm}>
            <div className={styles.authFormGroup}>
              <label htmlFor="loginPassword">Password</label>
              <input
                id="loginPassword"
                type="password"
                className="glass-input"
                placeholder="Enter password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
              />
            </div>
            <button type="submit" className={styles.authSubmitBtn} disabled={loading.save}>
              {loading.save ? <Loader2 className="spinner" size={16} /> : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${styles.adminWrapper}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>{settings.brand_name || 'Hub'} Dashboard</h1>
          <p>{settings.brand_tagline || 'Manage your affiliate workspace and site theme.'}</p>
        </div>
        <div className={styles.tabNav}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'listings' ? styles.activeTabBtn : ''}`}
            onClick={() => setActiveTab('listings')}
          >
            <FolderSearch size={16} /> Listings History
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'curator' ? styles.activeTabBtn : ''}`}
            onClick={() => setActiveTab('curator')}
          >
            <Sparkles size={16} /> Curator Panels
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.activeTabBtn : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={16} /> Hub Settings
          </button>
          <button 
            className={styles.tabBtn}
            onClick={handleLogout}
            style={{ color: '#ef4444' }}
            title="Log out from admin session"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Global alert messages */}
      {message && (
        <div className={`${styles.alert} ${message.type === 'error' ? styles.alertError : styles.alertSuccess}`}>
          <AlertCircle size={18} />
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Tab Content */}
      <div className={styles.mainContent}>
        {/* Listings History Tab */}
        {activeTab === 'listings' && (
          <div className="animated-fade-in">
            <div className={styles.listingsHeader}>
              <input 
                type="text" 
                placeholder="Search products..." 
                className="glass-input" 
                style={{ maxWidth: '300px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className={styles.filterControls}>
                <select 
                  className={styles.filterSelect}
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  <option value="Bedroom">Bedroom</option>
                  <option value="Living Room">Living Room</option>
                  <option value="Desk Setup">Desk Setup</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Tech">Tech</option>
                  <option value="Apparel">Apparel</option>
                  <option value="Outdoors">Outdoors</option>
                </select>
                <button 
                  className="glass-button" 
                  onClick={() => {
                    setCuratedProduct({
                      id: '',
                      title: '',
                      originalUrl: '',
                      affiliateUrl: '',
                      rawDescription: '',
                      category: 'Bedroom',
                      mainImage: '',
                      originalProductImage: '',
                      imagePrompt: '',
                      originalImagePrompt: '',
                      customDescription: '',
                      pros: [],
                      cons: [],
                      isPublished: true,
                      stars: 0.0,
                      reviewsCount: '0',
                    });
                    setActiveTab('curator');
                  }}
                >
                  <Plus size={16} /> New Product
                </button>
              </div>
            </div>

            {loading.products ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <Loader2 className="spinner" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="glass-panel" style={{ padding: '80px', textAlign: 'center' }}>
                <FolderPlus size={48} className="text-muted" style={{ margin: '0 auto 16px' }} />
                <h3>No Listings Found</h3>
                <p className="text-muted" style={{ marginTop: '8px' }}>Start by curating a product from Amazon details.</p>
              </div>
            ) : (
              <div className={styles.listingsGrid}>
                {filteredProducts.map(prod => (
                  <div key={prod.id} className={`glass-card ${styles.productCard}`}>
                    <div className={styles.cardImageWrapper}>
                      {prod.mainImage ? (
                        <img src={prod.mainImage} alt={prod.title} className={styles.cardImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                          <ImageIcon size={32} className="text-muted" />
                        </div>
                      )}
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardCategory}>{prod.category}</div>
                      <h3 className={styles.cardTitle}>{prod.title}</h3>
                      <div className={styles.cardMeta}>
                        <span className={`${styles.cardBadge} ${prod.isPublished ? styles.publishedBadge : styles.draftBadge}`}>
                          {prod.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <div className={styles.cardActions}>
                        <button className="glass-button secondary" style={{ flex: 1, padding: '8px 12px' }} onClick={() => handleEditProduct(prod)}>
                          Edit / Curate
                        </button>
                        <a href={`/product/${prod.id}`} target="_blank" rel="noreferrer" className="glass-button secondary" style={{ display: 'inline-flex', padding: '8px', width: '38px', justifyContent: 'center' }}>
                          <Eye size={16} />
                        </a>
                        <button 
                          className="glass-button secondary" 
                          style={{ padding: '8px', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444', width: '38px', justifyContent: 'center' }}
                          onClick={() => handleDeleteProduct(prod.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3-Panel Step-by-Step Curator View */}
        {activeTab === 'curator' && (
          <div className={`${styles.curatorGrid} animated-fade-in`}>
            
            {/* PANEL 1: GATHER & REVIEW RAW DATA */}
            <div className={`glass-panel ${styles.panel}`}>
              <h2>
                <FileText className="accent-text" size={18} />
                Panel 1: Ingest & Review
              </h2>
              
              {!curatedProduct.id && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
                  <div className={styles.formGroup}>
                    <label>Amazon URL</label>
                    <input 
                      type="text" 
                      placeholder="https://www.amazon.com/dp/..." 
                      className="glass-input"
                      value={amazonUrl}
                      onChange={(e) => setAmazonUrl(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Or Paste Product HTML/Text</label>
                    <textarea 
                      placeholder="Paste page text/HTML..." 
                      className="glass-input"
                      style={{ minHeight: '80px', resize: 'vertical' }}
                      value={pastedHtml}
                      onChange={(e) => setPastedHtml(e.target.value)}
                    />
                  </div>

                  <button 
                    className="glass-button" 
                    onClick={handleParseProduct}
                    disabled={loading.parse}
                    style={{ width: '100%' }}
                  >
                    {loading.parse ? (
                      <>
                        <Loader2 className="spinner" style={{ width: '14px', height: '14px' }} /> Extracting details...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} /> Gather Raw Product Details
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Parsed / Reviewed details */}
              <div>
                <div className={styles.formGroup}>
                  <label>Original Title (Extracted)</label>
                  <input 
                    type="text" 
                    placeholder="Parsed title" 
                    className="glass-input"
                    value={curatedProduct.title}
                    onChange={(e) => setCuratedProduct(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Original Product Image URL <span style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    type="text" 
                    placeholder="Paste original Amazon product image URL..." 
                    className="glass-input"
                    value={curatedProduct.originalProductImage}
                    onChange={(e) => setCuratedProduct(prev => ({ ...prev, originalProductImage: e.target.value }))}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Original Description Summary</label>
                  <textarea 
                    placeholder="Parsed original description, specifications, and details summary..." 
                    className="glass-input"
                    style={{ minHeight: '120px', resize: 'vertical' }}
                    value={curatedProduct.rawDescription}
                    onChange={(e) => setCuratedProduct(prev => ({ ...prev, rawDescription: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Category</label>
                  <select 
                    className={styles.filterSelect}
                    style={{ width: '100%', height: '42px' }}
                    value={curatedProduct.category}
                    onChange={(e) => setCuratedProduct(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="Bedroom">Bedroom</option>
                    <option value="Living Room">Living Room</option>
                    <option value="Desk Setup">Desk Setup</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Tech">Tech</option>
                    <option value="Apparel">Apparel</option>
                    <option value="Outdoors">Outdoors</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Affiliate URL</label>
                  <input 
                    type="text" 
                    placeholder="https://amzn.to/..." 
                    className="glass-input"
                    value={curatedProduct.affiliateUrl}
                    onChange={(e) => setCuratedProduct(prev => ({ ...prev, affiliateUrl: e.target.value }))}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Amazon Stars (Rating)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="0"
                      max="5"
                      placeholder="e.g. 4.6" 
                      className="glass-input"
                      value={curatedProduct.stars || ''}
                      onChange={(e) => setCuratedProduct(prev => ({ ...prev, stars: parseFloat(e.target.value) || 0.0 }))}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Reviews/Ratings Count</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 12,845" 
                      className="glass-input"
                      value={curatedProduct.reviewsCount || ''}
                      onChange={(e) => setCuratedProduct(prev => ({ ...prev, reviewsCount: e.target.value }))}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Pros (comma separated)</label>
                    <input 
                      type="text" 
                      placeholder="Pro highlights" 
                      className="glass-input"
                      value={curatedProduct.pros.join(', ')}
                      onChange={(e) => setCuratedProduct(prev => ({ ...prev, pros: e.target.value.split(',').map(s => s.trim()) }))}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Cons (comma separated)</label>
                    <input 
                      type="text" 
                      placeholder="Con alerts" 
                      className="glass-input"
                      value={curatedProduct.cons.join(', ')}
                      onChange={(e) => setCuratedProduct(prev => ({ ...prev, cons: e.target.value.split(',').map(s => s.trim()) }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* PANEL 2: CREATIVE & THEME GENERATION */}
            <div className={`glass-panel ${styles.panel}`}>
              <h2>
                <Sparkles className="accent-text" size={18} />
                Panel 2: Creative AI Curation
              </h2>

              <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
                <button 
                  className="glass-button" 
                  style={{ width: '100%' }}
                  onClick={handleGenerateCopywriting}
                  disabled={loading.generate}
                >
                  {loading.generate ? (
                    <>
                      <Loader2 className="spinner" style={{ width: '14px', height: '14px' }} /> Curation Engine Running...
                    </>
                  ) : (
                    'Generate Theme Copy & Socials'
                  )}
                </button>
                <p className="text-muted" style={{ fontSize: '11px', marginTop: '6px', textAlign: 'center' }}>
                  Uses Gemini to rewrite the title and description to fit the website's tone of voice.
                </p>
              </div>

              {/* Theme custom title */}
              <div className={styles.formGroup}>
                <label>Themed Title (Fits website)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Minimalist Walnut Desk Lamp" 
                  className="glass-input"
                  value={curatedProduct.title}
                  onChange={(e) => setCuratedProduct(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {/* Website custom review */}
              <div className={styles.formGroup}>
                <label>Website Review Narrative</label>
                <textarea 
                  className="glass-input" 
                  style={{ minHeight: '110px', resize: 'vertical' }}
                  value={curatedProduct.customDescription}
                  onChange={(e) => setCuratedProduct(prev => ({ ...prev, customDescription: e.target.value }))}
                  placeholder="Aesthetic website review text will be generated here by Gemini. Review and edit."
                />
              </div>

              {/* Original Prompt Reference */}
              {curatedProduct.originalImagePrompt && (
                <div className={styles.originalPromptBox}>
                  <div className={styles.originalPromptHeader}>
                    <span>Original Prompt Reference</span>
                    <button 
                      type="button" 
                      className={styles.resetPromptBtn}
                      onClick={() => setCuratedProduct(prev => ({ ...prev, imagePrompt: prev.originalImagePrompt }))}
                      title="Reset current prompt to the original prompt"
                    >
                      Reset to Original
                    </button>
                  </div>
                  <div className={styles.originalPromptContent}>
                    {curatedProduct.originalImagePrompt}
                  </div>
                </div>
              )}

              {/* AI Image Generation Prompt */}
              <div className={styles.formGroup}>
                <label>AI Image Generation Prompt (Editable)</label>
                <textarea 
                  className="glass-input"
                  style={{ minHeight: '80px', fontSize: '12px', resize: 'vertical' }}
                  value={curatedProduct.imagePrompt}
                  onChange={(e) => setCuratedProduct(prev => ({ ...prev, imagePrompt: e.target.value }))}
                  placeholder="A detailed mockup image prompt will show up here. Tweak it manually or use instructions below."
                />
              </div>

              {/* Revision Instructions */}
              <div className={styles.formGroup} style={{ marginTop: '-10px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600 }}>Tweak Prompt Instructions (Revisions)</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input 
                    type="text" 
                    placeholder="e.g. change table to dark granite, add a plant..." 
                    className="glass-input"
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                    value={imageInstructions}
                    onChange={(e) => setImageInstructions(e.target.value)}
                  />
                  <button 
                    className="glass-button secondary" 
                    style={{ padding: '6px 12px', fontSize: '11px', whiteSpace: 'nowrap', display: 'flex', gap: '4px', alignItems: 'center' }}
                    onClick={handleRefinePrompt}
                    disabled={loading.refine}
                  >
                    {loading.refine ? <Loader2 className="spinner" style={{ width: '10px', height: '10px' }} /> : 'Refine'}
                  </button>
                </div>
              </div>

              {/* Final Cover Image */}
              <div className={styles.formGroup}>
                <label>Featured Theme Cover Image</label>
                
                {(curatedProduct.mainImage || curatedProduct.originalProductImage) ? (
                  <div style={{ position: 'relative', width: '100%', height: '180px', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px', border: '1px solid var(--border-color)' }}>
                    <img 
                      src={curatedProduct.mainImage || curatedProduct.originalProductImage} 
                      alt="Cover Preview" 
                      style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#0b0f17' }} 
                    />
                    {curatedProduct.mainImage && curatedProduct.mainImage !== curatedProduct.originalProductImage && (
                      <button 
                        type="button"
                        className="glass-button secondary" 
                        style={{ position: 'absolute', top: '6px', right: '6px', padding: '6px 10px', fontSize: '11px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-color)' }}
                        onClick={() => setCuratedProduct(prev => ({ ...prev, mainImage: '' }))}
                        title="Reset mockup cover image to original photo"
                      >
                        Reset to Original
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', background: 'rgba(0,0,0,0.2)', border: '1px dashed var(--border-color)', borderRadius: '8px', marginBottom: '12px' }}>
                    <ImageIcon size={32} className="text-muted" style={{ marginBottom: '8px' }} />
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No original product image URL set in Panel 1.</p>
                  </div>
                )}

                <button 
                  type="button"
                  className="glass-button" 
                  style={{ width: '100%', gap: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', background: 'var(--primary-color)', color: '#fff' }} 
                  onClick={handleGenerateMockup}
                  disabled={loading.mockup}
                >
                  {loading.mockup ? (
                    <>
                      <Loader2 className="spinner" style={{ width: '14px', height: '14px' }} /> Mocking...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Generate AI Mockup
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* PANEL 3: SOCIAL MEDIA HUB & PUBLISHING */}
            <div className={`glass-panel ${styles.panel}`}>
              <h2>
                <Share2 className="accent-text" size={18} />
                Panel 3: Social Hub & Publish
              </h2>

              {/* Action Buttons to save database & post to socials */}
              <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="isPublished"
                    checked={curatedProduct.isPublished}
                    onChange={(e) => setCuratedProduct(prev => ({ ...prev, isPublished: e.target.checked }))}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="isPublished" style={{ margin: 0, cursor: 'pointer', fontSize: '12px' }}>Publish immediately to web catalog</label>
                </div>

                {/* Make sure user saves first before sharing, to generate a dynamic local URL for Upload-Post */}
                <button 
                  className="glass-button" 
                  style={{ width: '100%', padding: '10px' }} 
                  onClick={handleSaveProduct}
                  disabled={loading.save}
                >
                  <Save size={14} /> Save Listing to Hub
                </button>

                <button 
                  className="glass-button" 
                  style={{ width: '100%', background: 'linear-gradient(135deg, var(--primary-color) 0%, #be123c 100%)', border: 'none', padding: '12px' }}
                  onClick={handlePublishToAllSocials}
                  disabled={loading.publish || !curatedProduct.id}
                >
                  {loading.publish ? (
                    <>
                      <Loader2 className="spinner" style={{ width: '14px', height: '14px' }} /> Auto-Posting...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> 📢 Post to All Socials (Upload-Post)
                    </>
                  )}
                </button>
                {!curatedProduct.id && (
                  <p className="text-muted" style={{ fontSize: '10px', textAlign: 'center', marginTop: '-4px' }}>
                    *Save the product listing first to enable posting with images.
                  </p>
                )}
              </div>

              {/* Manual Share Workspace Helper */}
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px dashed rgba(255, 255, 255, 0.15)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 6px', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={14} /> Manual Posting Workspace
                </h3>
                <p className="text-muted" style={{ fontSize: '11px', marginBottom: '12px' }}>
                  Use this space to download the cover mockup image and copy formatted social text drafts for manual sharing.
                </p>
                
                <button
                  type="button"
                  className="glass-button secondary"
                  style={{ width: '100%', gap: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', marginBottom: '12px', borderColor: 'rgba(255,255,255,0.2)' }}
                  onClick={handleDownloadImage}
                >
                  📥 Download Cover Mockup Image
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Instagram Caption</span>
                    <button 
                      type="button"
                      className="glass-button secondary" 
                      style={{ padding: '3px 8px', fontSize: '10px' }}
                      onClick={() => handleCopyToClipboard(socialDrafts.instagramPost, 'manual_ig')}
                    >
                      {copiedKey === 'manual_ig' ? 'Copied!' : 'Copy Text'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Pinterest Pin Description</span>
                    <button 
                      type="button"
                      className="glass-button secondary" 
                      style={{ padding: '3px 8px', fontSize: '10px' }}
                      onClick={() => handleCopyToClipboard(socialDrafts.pinterestPost, 'manual_pin')}
                    >
                      {copiedKey === 'manual_pin' ? 'Copied!' : 'Copy Text'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>X (Twitter) Post</span>
                    <button 
                      type="button"
                      className="glass-button secondary" 
                      style={{ padding: '3px 8px', fontSize: '10px' }}
                      onClick={() => handleCopyToClipboard(socialDrafts.xPost, 'manual_x')}
                    >
                      {copiedKey === 'manual_x' ? 'Copied!' : 'Copy Text'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Platform lists */}
              <div style={{ display: 'grid', gap: '16px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
                {/* Instagram Area */}
                <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary-color)' }}>Instagram Post</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        className="glass-button secondary" 
                        style={{ padding: '3px 6px' }}
                        onClick={() => handleCopyToClipboard(socialDrafts.instagramPost, 'ig')}
                      >
                        {copiedKey === 'ig' ? <Check size={10} /> : <Copy size={10} />}
                      </button>
                      <button 
                        className="glass-button" 
                        style={{ padding: '3px 8px', fontSize: '10px' }}
                        onClick={() => handlePublishToSocials('instagram', socialDrafts.instagramPost)}
                        disabled={loading.publish || !curatedProduct.id}
                      >
                        Post
                      </button>
                    </div>
                  </div>
                  <textarea 
                    className="glass-input" 
                    style={{ minHeight: '60px', fontSize: '11px', padding: '6px' }}
                    value={socialDrafts.instagramPost}
                    onChange={(e) => setSocialDrafts(prev => ({ ...prev, instagramPost: e.target.value }))}
                  />
                </div>

                {/* Pinterest Area */}
                <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary-color)' }}>Pinterest Description</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        className="glass-button secondary" 
                        style={{ padding: '3px 6px' }}
                        onClick={() => handleCopyToClipboard(socialDrafts.pinterestPost, 'pin')}
                      >
                        {copiedKey === 'pin' ? <Check size={10} /> : <Copy size={10} />}
                      </button>
                      <button 
                        className="glass-button" 
                        style={{ padding: '3px 8px', fontSize: '10px' }}
                        onClick={() => handlePublishToSocials('pinterest', socialDrafts.pinterestPost)}
                        disabled={loading.publish || !curatedProduct.id}
                      >
                        Post
                      </button>
                    </div>
                  </div>
                  <textarea 
                    className="glass-input" 
                    style={{ minHeight: '60px', fontSize: '11px', padding: '6px' }}
                    value={socialDrafts.pinterestPost}
                    onChange={(e) => setSocialDrafts(prev => ({ ...prev, pinterestPost: e.target.value }))}
                  />
                </div>

                {/* X Area */}
                <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary-color)' }}>X (Twitter) Post</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        className="glass-button secondary" 
                        style={{ padding: '3px 6px' }}
                        onClick={() => handleCopyToClipboard(socialDrafts.xPost, 'x')}
                      >
                        {copiedKey === 'x' ? <Check size={10} /> : <Copy size={10} />}
                      </button>
                      <button 
                        className="glass-button" 
                        style={{ padding: '3px 8px', fontSize: '10px' }}
                        onClick={() => handlePublishToSocials('twitter', socialDrafts.xPost)}
                        disabled={loading.publish || !curatedProduct.id}
                      >
                        Post
                      </button>
                    </div>
                  </div>
                  <textarea 
                    className="glass-input" 
                    style={{ minHeight: '50px', fontSize: '11px', padding: '6px' }}
                    value={socialDrafts.xPost}
                    onChange={(e) => setSocialDrafts(prev => ({ ...prev, xPost: e.target.value }))}
                  />
                </div>

              </div>
            </div>

          </div>
        )}

        {/* Settings & Customizers Tab */}
        {activeTab === 'settings' && (
          <div className="animated-fade-in">
            {loading.settings ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <Loader2 className="spinner" />
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className={styles.settingsGrid}>
                {/* Branding Block */}
                <div className={`glass-panel ${styles.settingsCard}`}>
                  <h2>Branding Profile</h2>
                  <div className={styles.formGroup}>
                    <label>Shop Name / Brand Name</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      value={settings.brand_name}
                      onChange={(e) => setSettings(prev => ({ ...prev, brand_name: e.target.value }))}
                      placeholder="e.g. Cozy Hub"
                    />
                    <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                      This changes the logo, website titles, footer disclaimers, and SEO headers dynamically across the public site.
                    </p>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Tagline / Description</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      value={settings.brand_tagline}
                      onChange={(e) => setSettings(prev => ({ ...prev, brand_tagline: e.target.value }))}
                      placeholder="Curated aesthetic setups and items..."
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Amazon Associates Tracking ID (Tag)</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      value={settings.amazon_tag}
                      onChange={(e) => setSettings(prev => ({ ...prev, amazon_tag: e.target.value }))}
                      placeholder="e.g. cozyhub-20"
                    />
                  </div>
                </div>

                {/* Visual Style Theme Block */}
                <div className={`glass-panel ${styles.settingsCard}`}>
                  <h2>Theme Customization</h2>
                  <div className={styles.colorPickerRow}>
                    <div className={styles.formGroup}>
                      <label>Accent Color</label>
                      <div className={styles.colorInputWrapper}>
                        <input 
                          type="color" 
                          value={settings.primary_color}
                          onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                        />
                        <span>{settings.primary_color}</span>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Glass Card Base</label>
                      <div className={styles.colorInputWrapper}>
                        <input 
                          type="color" 
                          value={settings.secondary_color}
                          onChange={(e) => setSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                        />
                        <span>{settings.secondary_color}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.colorPickerRow}>
                    <div className={styles.formGroup}>
                      <label>Background</label>
                      <div className={styles.colorInputWrapper}>
                        <input 
                          type="color" 
                          value={settings.background_color}
                          onChange={(e) => setSettings(prev => ({ ...prev, background_color: e.target.value }))}
                        />
                        <span>{settings.background_color}</span>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Text Main</label>
                      <div className={styles.colorInputWrapper}>
                        <input 
                          type="color" 
                          value={settings.text_color}
                          onChange={(e) => setSettings(prev => ({ ...prev, text_color: e.target.value }))}
                        />
                        <span>{settings.text_color}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-muted" style={{ fontSize: '12px', marginTop: '10px' }}>
                    Changes apply immediately to both public catalog layout sheets and the admin console on save.
                  </p>
                </div>

                {/* API Credentials Block */}
                <div className={`glass-panel ${styles.settingsCard}`} style={{ gridColumn: 'span 2' }}>
                  <h2>API Keys & Credentials</h2>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Gemini API Key (Google AI Studio)</label>
                      <input 
                        type="password" 
                        className="glass-input" 
                        value={settings.gemini_api_key}
                        onChange={(e) => setSettings(prev => ({ ...prev, gemini_api_key: e.target.value }))}
                        placeholder="AI Studio API Key"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Upload-Post API Key</label>
                      <input 
                        type="password" 
                        className="glass-input" 
                        value={settings.uploadpost_api_key}
                        onChange={(e) => setSettings(prev => ({ ...prev, uploadpost_api_key: e.target.value }))}
                        placeholder="Upload-Post API Key"
                      />
                    </div>
                  </div>
                  <div className={styles.formRow} style={{ marginTop: '-10px' }}>
                    <div className={styles.formGroup}>
                      <label>Upload-Post Profile Username</label>
                      <input 
                        type="text" 
                        className="glass-input" 
                        value={settings.uploadpost_username}
                        onChange={(e) => setSettings(prev => ({ ...prev, uploadpost_username: e.target.value }))}
                        placeholder="e.g. cozy_hub_profile"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Pinterest Board ID (For Pinterest posting)</label>
                      <input 
                        type="text" 
                        className="glass-input" 
                        value={settings.pinterest_board_id}
                        onChange={(e) => setSettings(prev => ({ ...prev, pinterest_board_id: e.target.value }))}
                        placeholder="e.g. 107579166..."
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Gemini Copywriter Persona Directive (Niche Prompt Instructions)</label>
                    <textarea 
                      className="glass-input" 
                      style={{ minHeight: '80px', resize: 'vertical' }}
                      value={settings.niche_prompt_directive}
                      onChange={(e) => setSettings(prev => ({ ...prev, niche_prompt_directive: e.target.value }))}
                      placeholder="Provide specific instructions to Gemini describing your niche brand's tone of voice, theme, target market, etc."
                    />
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button type="submit" className="glass-button" disabled={loading.save}>
                      <Save size={16} /> Save Configurations
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
