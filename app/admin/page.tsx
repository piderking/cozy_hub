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
  LogOut,
  Library,
  Video,
  MessageSquare,
  Play,
  RefreshCw,
  Download
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
  zernio_api_key: string;
  pinterest_board_id: string;
  amazon_tag: string;
  niche_prompt_directive: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'listings' | 'curator' | 'settings' | 'collections' | 'influencer' | 'responder'>('listings');
  
  // New States for AI Collections
  const [collections, setCollections] = useState<any[]>([]);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [collectionForm, setCollectionForm] = useState({
    title: '',
    description: '',
    selectedProductIds: [] as string[],
    scenePrompt: '',
    sceneImage: '',
    triggerWord: 'cozy',
    instagramPost: '',
    pinterestPost: '',
  });
  const [isGeneratingCollPrompt, setIsGeneratingCollPrompt] = useState(false);
  const [isGeneratingCollScene, setIsGeneratingCollScene] = useState(false);
  const [isGeneratingCollCopy, setIsGeneratingCollCopy] = useState(false);
  const [isPublishingColl, setIsPublishingColl] = useState(false);
  const [collLoading, setCollLoading] = useState(false);

  // New States for Influencer Video Scripts
  const [influencerProducts, setInfluencerProducts] = useState<string[]>([]);
  const [influencerScript, setInfluencerScript] = useState<any | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // New States for Auto-Responder Comment Logs
  const [socialPosts, setSocialPosts] = useState<any[]>([]);
  const [interactionLogs, setInteractionLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [simForm, setSimForm] = useState({
    socialPostId: '',
    username: 'cozy_critic',
    commentText: 'link'
  });
  const [isSimulating, setIsSimulating] = useState(false);

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
    zernio_api_key: '',
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

  // New Tab Hooks and Observers
  useEffect(() => {
    if (authStatus === 'authorized') {
      if (activeTab === 'collections') {
        fetchCollections();
      } else if (activeTab === 'responder') {
        fetchResponderData();
      }
    }
  }, [activeTab, authStatus]);

  // AI Collections Fetching & CRUD
  const fetchCollections = async () => {
    try {
      const res = await fetch('/api/collections');
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
      }
    } catch (err) {
      console.error('Error fetching collections:', err);
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;
    try {
      const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showMessage('Collection deleted successfully!');
        fetchCollections();
      } else {
        const data = await res.json();
        showMessage(data.error || 'Failed to delete collection', 'error');
      }
    } catch (err: any) {
      showMessage(err.message, 'error');
    }
  };

  // Generating Collection Prompt
  const handleGenerateCollectionPrompt = async () => {
    if (collectionForm.selectedProductIds.length === 0) {
      showMessage('Please select at least one product for the collection.', 'error');
      return;
    }
    setIsGeneratingCollPrompt(true);
    try {
      const selectedProducts = products.filter(p => collectionForm.selectedProductIds.includes(p.id));
      const res = await fetch('/api/generate-collection-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', products: selectedProducts }),
      });
      const data = await res.json();
      if (res.ok) {
        setCollectionForm(prev => ({ ...prev, scenePrompt: data.prompt }));
        showMessage('AI Scene prompt generated successfully!');
      } else {
        showMessage(data.error || 'Failed to generate prompt', 'error');
      }
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setIsGeneratingCollPrompt(false);
    }
  };

  // Generating Collection Blended Scene Mockup
  const handleGenerateCollectionScene = async () => {
    if (!collectionForm.scenePrompt) {
      showMessage('Please generate or enter an AI Scene prompt first.', 'error');
      return;
    }
    setIsGeneratingCollScene(true);
    try {
      const res = await fetch('/api/generate-collection-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mockup', prompt: collectionForm.scenePrompt }),
      });
      const data = await res.json();
      if (res.ok) {
        setCollectionForm(prev => ({ ...prev, sceneImage: data.imageUrl }));
        showMessage('AI Scene image generated successfully!');
      } else {
        showMessage(data.error || 'Failed to generate scene image', 'error');
      }
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setIsGeneratingCollScene(false);
    }
  };

  // Generating Collection Social Copy
  const handleGenerateCollectionCopy = async () => {
    if (!collectionForm.title || !collectionForm.description) {
      showMessage('Title and Description are required to generate copy.', 'error');
      return;
    }
    setIsGeneratingCollCopy(true);
    try {
      const selectedProducts = products.filter(p => collectionForm.selectedProductIds.includes(p.id));
      const res = await fetch('/api/collections/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: collectionForm.title,
          description: collectionForm.description,
          products: selectedProducts,
          triggerWord: collectionForm.triggerWord,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCollectionForm(prev => ({
          ...prev,
          instagramPost: data.instagramPost || '',
          pinterestPost: data.pinterestPost || '',
        }));
        showMessage('Social captions generated successfully!');
      } else {
        showMessage(data.error || 'Failed to generate copy', 'error');
      }
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setIsGeneratingCollCopy(false);
    }
  };

  // Saving Collection
  const handleSaveCollection = async () => {
    const { title, description, selectedProductIds, sceneImage } = collectionForm;
    if (!title || !description || selectedProductIds.length === 0 || !sceneImage) {
      showMessage('Please complete Title, Description, select products, and generate the AI Scene Image.', 'error');
      return;
    }
    setCollLoading(true);
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, products: selectedProductIds, sceneImage }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage('Collection saved successfully!');
        setIsCreatingCollection(false);
        setCollectionForm({
          title: '',
          description: '',
          selectedProductIds: [],
          scenePrompt: '',
          sceneImage: '',
          triggerWord: 'cozy',
          instagramPost: '',
          pinterestPost: '',
        });
        fetchCollections();
      } else {
        showMessage(data.error || 'Failed to save collection', 'error');
      }
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setCollLoading(false);
    }
  };

  // Publishing Collection Social Post
  const handlePublishCollectionSocial = async (platform: 'instagram' | 'pinterest', text: string) => {
    if (!text.trim()) {
      showMessage('Post content is empty.', 'error');
      return;
    }
    setIsPublishingColl(true);
    try {
      const payload = {
        collectionId: undefined, // Send if we have it, otherwise fallback
        postContent: text,
        platforms: [platform],
        mediaUrls: collectionForm.sceneImage ? [collectionForm.sceneImage] : undefined,
        triggerWords: collectionForm.triggerWord,
      };
      const res = await fetch('/api/publish-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(`Successfully posted to ${platform} via Upload-Post!`);
      } else {
        showMessage(data.error || 'Publishing failed', 'error');
      }
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setIsPublishingColl(false);
    }
  };

  // Generate Influencer script
  const handleGenerateInfluencerScript = async () => {
    if (influencerProducts.length === 0) {
      showMessage('Please select at least one product for script generation.', 'error');
      return;
    }
    setIsGeneratingScript(true);
    try {
      const selectedProducts = products.filter(p => influencerProducts.includes(p.id));
      const res = await fetch('/api/generate-reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: selectedProducts }),
      });
      const data = await res.json();
      if (res.ok) {
        setInfluencerScript(data);
        showMessage('Influencer video script package generated successfully!');
      } else {
        showMessage(data.error || 'Failed to generate script', 'error');
      }
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Fetch responder data (posts & logs)
  const fetchResponderData = async () => {
    setLogsLoading(true);
    try {
      // Fetch posts
      const resPosts = await fetch('/api/social-logs?type=posts');
      if (resPosts.ok) {
        const data = await resPosts.json();
        setSocialPosts(data.posts || []);
        if (data.posts && data.posts.length > 0 && !simForm.socialPostId) {
          setSimForm(prev => ({ ...prev, socialPostId: data.posts[0].id }));
        }
      }
      // Fetch logs
      const resLogs = await fetch('/api/social-logs');
      if (resLogs.ok) {
        const data = await resLogs.json();
        setInteractionLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching responder data:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Update triggers
  const handleUpdateTriggerWords = async (socialPostId: string, triggerWords: string) => {
    try {
      const res = await fetch('/api/social-logs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ socialPostId, triggerWords }),
      });
      if (res.ok) {
        showMessage('Trigger words updated successfully!');
        fetchResponderData();
      } else {
        const data = await res.json();
        showMessage(data.error || 'Failed to update trigger words', 'error');
      }
    } catch (err: any) {
      showMessage(err.message, 'error');
    }
  };

  // Run webhook simulator
  const handleSimulateTrigger = async () => {
    if (!simForm.socialPostId) {
      showMessage('Please select a social post in the simulator.', 'error');
      return;
    }
    setIsSimulating(true);
    try {
      const res = await fetch('/api/webhooks/social-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'comment',
          text: simForm.commentText,
          user: simForm.username,
          platform: 'instagram',
          socialPostId: simForm.socialPostId,
          isSimulation: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.simulated && data.responseText) {
          showMessage(`Simulation success! Auto-replied: "${data.responseText}" (Trigger matched: "${data.matchedTrigger}")`);
        } else {
          showMessage(`Simulation processed: "${data.message || 'No trigger word matched'}"`);
        }
        fetchResponderData(); // reload logs
      } else {
        const data = await res.json();
        showMessage(data.error || 'Simulation failed', 'error');
      }
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all interaction logs?')) return;
    try {
      const res = await fetch('/api/social-logs?clearAll=true', { method: 'DELETE' });
      if (res.ok) {
        showMessage('All logs cleared successfully.');
        fetchResponderData();
      } else {
        const data = await res.json();
        showMessage(data.error || 'Failed to clear logs', 'error');
      }
    } catch (err: any) {
      showMessage(err.message, 'error');
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      const res = await fetch(`/api/social-logs?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showMessage('Log entry deleted.');
        fetchResponderData();
      } else {
        const data = await res.json();
        showMessage(data.error || 'Failed to delete log', 'error');
      }
    } catch (err: any) {
      showMessage(err.message, 'error');
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

      // If prompt is empty or does not use the required product copy prefix, fetch a fresh one
      let fetchedPrompt = curatedProduct.imagePrompt;
      const expectedPrefix = 'an aesthetic, photorealistic product mockup of';
      if (!fetchedPrompt || !fetchedPrompt.toLowerCase().startsWith(expectedPrefix)) {
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

      const igContent = socialDrafts.instagramPost.trim() || defaultInsta;
      const pinContent = socialDrafts.pinterestPost.trim() || defaultPin;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...curatedProduct,
          mainImage: curatedProduct.mainImage || curatedProduct.originalProductImage, // Ensure main image is saved
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
    let socialDraftsObj = { instagram: '', pinterest: '' };

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

  // Publish to Socials via Zernio (Individual)
  const handlePublishToSocials = async (platform: string, content: string) => {
    let finalContent = content.trim();
    if (!finalContent) {
      if (platform === 'instagram') {
        finalContent = `#ad ✨ ${curatedProduct.title}\n\n${curatedProduct.customDescription || curatedProduct.rawDescription}\n\nCheck the link in our bio to find this deal! 🏠✨\n\n#cozyhome #decor #lifestyle`;
      } else if (platform === 'pinterest') {
        finalContent = `#ad 📌 ${curatedProduct.title} - ${curatedProduct.customDescription || curatedProduct.rawDescription}\n\nPin this to save for later!`;
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

  // Publish to ALL Socials at once (Instagram, Pinterest)
  const handlePublishToAllSocials = async () => {
    setLoading(prev => ({ ...prev, publish: true }));
    let successCount = 0;
    const failedPlatforms: string[] = [];

    const defaultInsta = `#ad ✨ ${curatedProduct.title}\n\n${curatedProduct.customDescription || curatedProduct.rawDescription}\n\nCheck the link in our bio to find this deal! 🏠✨\n\n#cozyhome #decor #lifestyle`;
    const defaultPin = `#ad 📌 ${curatedProduct.title} - ${curatedProduct.customDescription || curatedProduct.rawDescription}\n\nPin this to save for later!`;

    const platformsToPost = [];
    const igContent = socialDrafts.instagramPost.trim() || defaultInsta;
    const pinContent = socialDrafts.pinterestPost.trim() || defaultPin;

    if (igContent) platformsToPost.push({ name: 'instagram', content: igContent });
    if (pinContent) platformsToPost.push({ name: 'pinterest', content: pinContent });

    if (platformsToPost.length === 0) {
      showMessage('No social drafts are ready to publish.', 'error');
      setLoading(prev => ({ ...prev, publish: false }));
      return;
    }

    // Sync drafts visually in UI
    setSocialDrafts({
      instagramPost: igContent,
      pinterestPost: pinContent,
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
            className={`${styles.tabBtn} ${activeTab === 'collections' ? styles.activeTabBtn : ''}`}
            onClick={() => setActiveTab('collections')}
          >
            <Library size={16} /> AI Collections
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'influencer' ? styles.activeTabBtn : ''}`}
            onClick={() => setActiveTab('influencer')}
          >
            <Video size={16} /> Influencer Panel
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'responder' ? styles.activeTabBtn : ''}`}
            onClick={() => setActiveTab('responder')}
          >
            <MessageSquare size={16} /> Auto-Responder Logs
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

                {/* Store Config Block */}
                <div className={`glass-panel ${styles.settingsCard}`} style={{ gridColumn: 'span 2' }}>
                  <h2>Store Integrations & Directives</h2>
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

        {/* AI Collections Tab */}
        {activeTab === 'collections' && (
          <div className="animated-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2>AI Scene Collections</h2>
              <button 
                className="glass-button" 
                onClick={() => {
                  setIsCreatingCollection(!isCreatingCollection);
                  if (!isCreatingCollection) {
                    setCollectionForm({
                      title: '',
                      description: '',
                      selectedProductIds: [],
                      scenePrompt: '',
                      sceneImage: '',
                      triggerWord: 'cozy',
                      instagramPost: '',
                      pinterestPost: '',
                    });
                  }
                }}
              >
                {isCreatingCollection ? 'Back to Collections' : <><Plus size={16} /> Create Collection</>}
              </button>
            </div>

            {!isCreatingCollection ? (
              // Collections List
              collections.length === 0 ? (
                <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <Library size={48} className="text-muted" style={{ margin: '0 auto 16px' }} />
                  <h3>No Collections Yet</h3>
                  <p className="text-muted" style={{ marginTop: '8px' }}>
                    Click "Create Collection" to bundle multiple products into an AI generated scene.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                  {collections.map((col) => (
                    <div key={col.id} className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ height: '180px', position: 'relative', background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-color)' }}>
                        {col.sceneImage ? (
                          <img src={col.sceneImage} alt={col.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <ImageIcon size={32} className="text-muted" />
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{col.title}</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {col.description}
                        </p>
                        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          <strong>Products:</strong> {col.products?.length || 0} items
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                          <a 
                            href={`/collections/${col.slug}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="glass-button secondary"
                            style={{ flex: 1, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px' }}
                          >
                            <Eye size={14} /> View Page
                          </a>
                          <button 
                            className="glass-button" 
                            style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                            onClick={() => handleDeleteCollection(col.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Create Collection Form
              <div className={styles.curatorGrid}>
                {/* Left Column: Form Details & Products */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Collection Configurations</h3>
                  <div className={styles.formGroup}>
                    <label>Collection Title</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="e.g. Vanilla Cozy Dorm Room Setup" 
                      value={collectionForm.title}
                      onChange={(e) => setCollectionForm(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Collection Description</label>
                    <textarea 
                      className="glass-input" 
                      style={{ minHeight: '100px', resize: 'vertical' }}
                      placeholder="Describe the aesthetic and purpose of this scene bundle..."
                      value={collectionForm.description}
                      onChange={(e) => setCollectionForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Instagram Trigger Word (Case-insensitive keyword to auto-reply link)</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="e.g. cozy, room, desk" 
                      value={collectionForm.triggerWord}
                      onChange={(e) => setCollectionForm(prev => ({ ...prev, triggerWord: e.target.value }))}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label style={{ marginBottom: '12px' }}>Select Products to Group in this Scene (Min: 1)</label>
                    <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(0, 0, 0, 0.1)' }}>
                      {products.map((p) => {
                        const isChecked = collectionForm.selectedProductIds.includes(p.id);
                        return (
                          <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', cursor: 'pointer', borderRadius: '4px', background: isChecked ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setCollectionForm(prev => ({
                                  ...prev,
                                  selectedProductIds: checked 
                                    ? [...prev.selectedProductIds, p.id]
                                    : prev.selectedProductIds.filter(id => id !== p.id)
                                }));
                              }}
                            />
                            {p.mainImage && <img src={p.mainImage} alt="" style={{ width: '30px', height: '30px', objectFit: 'cover', borderRadius: '4px' }} />}
                            <span style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Column: AI Scene Image & Social Captions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>AI Scene Generator</h3>
                    
                    {collectionForm.sceneImage ? (
                      <div style={{ width: '100%', marginBottom: '20px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <img src={collectionForm.sceneImage} alt="Scene Mockup" style={{ width: '100%', display: 'block' }} />
                      </div>
                    ) : (
                      <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border-color)', borderRadius: '8px', marginBottom: '20px', background: 'rgba(0,0,0,0.1)' }}>
                        <ImageIcon size={48} className="text-muted" style={{ marginBottom: '8px' }} />
                        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>AI Scene Image will display here</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                      <button 
                        className="glass-button" 
                        style={{ flex: 1 }}
                        onClick={handleGenerateCollectionPrompt}
                        disabled={isGeneratingCollPrompt || collectionForm.selectedProductIds.length === 0}
                      >
                        {isGeneratingCollPrompt ? <Loader2 className="spinner" size={16} /> : 'Generate Scene Prompt'}
                      </button>
                      <button 
                        className="glass-button"
                        style={{ flex: 1 }}
                        onClick={handleGenerateCollectionScene}
                        disabled={isGeneratingCollScene || !collectionForm.scenePrompt}
                      >
                        {isGeneratingCollScene ? <Loader2 className="spinner" size={16} /> : 'Generate AI Image'}
                      </button>
                    </div>

                    {collectionForm.scenePrompt && (
                      <div className={styles.formGroup}>
                        <label>AI Prompt Directive</label>
                        <textarea 
                          className="glass-input" 
                          style={{ minHeight: '80px', fontSize: '13px' }}
                          value={collectionForm.scenePrompt}
                          onChange={(e) => setCollectionForm(prev => ({ ...prev, scenePrompt: e.target.value }))}
                        />
                      </div>
                    )}

                    {collectionForm.sceneImage && (
                      <button 
                        className="glass-button secondary" 
                        style={{ width: '100%', background: 'var(--primary-color)', color: '#fff', border: 'none' }}
                        onClick={handleSaveCollection}
                        disabled={collLoading}
                      >
                        {collLoading ? <Loader2 className="spinner" size={16} /> : <><Save size={16} /> Save Collection</>}
                      </button>
                    )}
                  </div>

                  {collectionForm.sceneImage && (
                    <div className="glass-panel" style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Social Content & Publish</h3>
                      
                      <button 
                        className="glass-button" 
                        style={{ width: '100%', marginBottom: '20px' }}
                        onClick={handleGenerateCollectionCopy}
                        disabled={isGeneratingCollCopy}
                      >
                        {isGeneratingCollCopy ? <Loader2 className="spinner" size={16} /> : 'Generate Social Copy'}
                      </button>

                      {collectionForm.instagramPost && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          <div className={styles.previewSection}>
                            <h3>Instagram Caption (DM Auto-Responder Enabled)</h3>
                            <div className={styles.previewContent}>
                              {collectionForm.instagramPost}
                              <div className={styles.copyOverlay}>
                                <button className="glass-button secondary" onClick={() => navigator.clipboard.writeText(collectionForm.instagramPost)}>
                                  <Copy size={12} />
                                </button>
                              </div>
                            </div>
                            <button 
                              className="glass-button" 
                              style={{ width: '100%', marginTop: '8px' }}
                              onClick={() => handlePublishCollectionSocial('instagram', collectionForm.instagramPost)}
                              disabled={isPublishingColl}
                            >
                              Publish Instagram Reel/Post
                            </button>
                          </div>

                          <div className={styles.previewSection}>
                            <h3>Pinterest Pin Description (Direct landing page link embedded)</h3>
                            <div className={styles.previewContent}>
                              {collectionForm.pinterestPost}
                              <div className={styles.copyOverlay}>
                                <button className="glass-button secondary" onClick={() => navigator.clipboard.writeText(collectionForm.pinterestPost)}>
                                  <Copy size={12} />
                                </button>
                              </div>
                            </div>
                            <button 
                              className="glass-button" 
                              style={{ width: '100%', marginTop: '8px' }}
                              onClick={() => handlePublishCollectionSocial('pinterest', collectionForm.pinterestPost)}
                              disabled={isPublishingColl}
                            >
                              Publish Pinterest Pin
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Influencer Panel Tab */}
        {activeTab === 'influencer' && (
          <div className="animated-fade-in">
            <h2>Influencer Video Planner & Script Generator</h2>
            <p className="text-muted" style={{ marginBottom: '24px' }}>
              Select catalog products and generate aesthetic short-form video hooks, visual outlines, script/voiceover drafts, and suggested trigger words.
            </p>

            <div className={styles.curatorGrid}>
              {/* Left Column: Product Selector */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>1. Select Products</h3>
                <div style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(0, 0, 0, 0.1)' }}>
                  {products.map((p) => {
                    const isChecked = influencerProducts.includes(p.id);
                    return (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', cursor: 'pointer', borderRadius: '4px', background: isChecked ? 'rgba(255,255,255,0.03)' : 'transparent', marginBottom: '4px' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setInfluencerProducts(prev => checked 
                              ? [...prev, p.id]
                              : prev.filter(id => id !== p.id)
                            );
                          }}
                        />
                        {p.mainImage && <img src={p.mainImage} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{p.title}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.category}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <button 
                  className="glass-button" 
                  style={{ width: '100%', marginTop: '20px', background: 'var(--primary-color)', color: '#fff', border: 'none' }}
                  onClick={handleGenerateInfluencerScript}
                  disabled={isGeneratingScript || influencerProducts.length === 0}
                >
                  {isGeneratingScript ? <Loader2 className="spinner" size={16} /> : <><Sparkles size={16} /> Generate Video Outline</>}
                </button>
              </div>

              {/* Right Column: Script Output */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>2. Generated Video Script</h3>
                
                {isGeneratingScript ? (
                  <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 className="spinner" size={48} style={{ marginBottom: '16px' }} />
                    <p className="text-muted">Gemini is structuring your aesthetic video outlines...</p>
                  </div>
                ) : influencerScript ? (
                  <div className="animated-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--primary-color)', display: 'block', marginBottom: '4px' }}>Reel Concept Theme</span>
                      <h4 style={{ fontSize: '20px', fontWeight: 800 }}>{influencerScript.themeTitle}</h4>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                      <h5 style={{ fontWeight: 700, marginBottom: '10px', color: 'var(--primary-color)', fontSize: '13px' }}>Suggested Comment Trigger Keywords</h5>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {influencerScript.suggestedTriggers?.map((trig: string) => (
                          <span key={trig} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                            {trig}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 style={{ fontWeight: 700, marginBottom: '12px', fontSize: '14px' }}>Video Hook Options</h5>
                      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {influencerScript.hookOptions?.map((hook: string, index: number) => (
                          <li key={index} style={{ fontSize: '13px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px', position: 'relative' }}>
                            <strong>Hook {index + 1}:</strong> {hook}
                            <button 
                              style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                              onClick={() => navigator.clipboard.writeText(hook)}
                              title="Copy Hook"
                            >
                              <Copy size={12} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h5 style={{ fontWeight: 700, marginBottom: '12px', fontSize: '14px' }}>Visual Scene-by-Scene Script Outlines</h5>
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                        {influencerScript.scenes?.map((scene: any) => (
                          <div key={scene.sceneNumber} style={{ borderBottom: scene.sceneNumber !== influencerScript.scenes.length ? '1px solid var(--border-color)' : 'none', padding: '16px', background: 'rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                              <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>Scene {scene.sceneNumber}</span>
                              <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Overlay: "{scene.onScreenText}"</span>
                            </div>
                            <p style={{ fontSize: '13px', marginBottom: '6px' }}><strong>Visual:</strong> {scene.visualDirective}</p>
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}><strong>Audio/Voice:</strong> "{scene.voiceoverScript}"</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 style={{ fontWeight: 700, marginBottom: '6px', fontSize: '14px' }}>Production & Aesthetic Tips</h5>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>{influencerScript.aestheticTips}</p>
                    </div>

                    {influencerScript.captionDraft && (
                      <div className={styles.previewSection}>
                        <h3>Instagram Caption Draft (Ready to Post)</h3>
                        <div className={styles.previewContent}>
                          {influencerScript.captionDraft}
                          <div className={styles.copyOverlay}>
                            <button className="glass-button secondary" onClick={() => navigator.clipboard.writeText(influencerScript.captionDraft)}>
                              <Copy size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '14px' }}>
                    Select products and click "Generate Video Outline" to generate video scripts.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Comment Auto-Responder & Logs Tab */}
        {activeTab === 'responder' && (
          <div className="animated-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <h2>Instagram Comment Auto-Responder Logs & Triggers</h2>
            <p className="text-muted" style={{ marginTop: '-24px', marginBottom: '10px' }}>
              Define trigger keywords for sent posts (e.g. comments with "link" trigger direct responses), test with the simulation card, and monitor live comment interaction logs.
            </p>

            <div className={styles.curatorGrid}>
              {/* Left Column: Triggers Settings */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>1. Post Trigger Settings</h3>
                {logsLoading ? (
                  <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 className="spinner" size={24} />
                  </div>
                ) : socialPosts.length === 0 ? (
                  <p className="text-muted" style={{ fontStyle: 'italic', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No sent social posts found. Try publishing products or collections first.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '450px', overflowY: 'auto' }}>
                    {socialPosts.map((post) => {
                      const linkName = post.product ? `Product: {post.product.title}` : (post.collection ? `Collection: {post.collection.title}` : 'Cozy Hub');
                      const linkTitle = post.product ? post.product.title : (post.collection ? post.collection.title : 'Cozy Hub');
                      return (
                        <div key={post.id} style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '8px' }}>
                            <span>Platform: {post.platform.toUpperCase()}</span>
                            <span>Ref ID: {post.ayrshareRefId || 'N/A'}</span>
                          </div>
                          <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>{linkTitle}</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '12px' }}>
                            "{post.generatedContent}"
                          </p>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input 
                              type="text" 
                              defaultValue={post.triggerWords || 'link,store,recommendations'}
                              className="glass-input"
                              placeholder="Triggers (comma-separated)"
                              style={{ flex: 1, padding: '6px 12px', fontSize: '13px' }}
                              id={`trig-input-${post.id}`}
                            />
                            <button 
                              className="glass-button secondary" 
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => {
                                const inputVal = (document.getElementById(`trig-input-${post.id}`) as HTMLInputElement)?.value;
                                handleUpdateTriggerWords(post.id, inputVal);
                              }}
                            >
                              Update Triggers
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Webhook Simulator */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>2. Comment Webhook Simulator</h3>
                <div className="authForm" style={{ gap: '16px' }}>
                  <div className={styles.formGroup} style={{ marginBottom: '12px' }}>
                    <label>Select Social Post to Target</label>
                    <select 
                      className={styles.filterSelect}
                      style={{ width: '100%', padding: '10px' }}
                      value={simForm.socialPostId}
                      onChange={(e) => setSimForm(prev => ({ ...prev, socialPostId: e.target.value }))}
                    >
                      <option value="">-- Choose Post --</option>
                      {socialPosts.map((post) => {
                        const linkName = post.product ? `Product: ${post.product.title.substring(0,30)}` : (post.collection ? `Collection: ${post.collection.title.substring(0,30)}` : 'Post');
                        return (
                          <option key={post.id} value={post.id}>
                            [{post.platform}] {linkName} ({post.ayrshareRefId ? `Ref: ${post.ayrshareRefId.substring(0,6)}` : 'No Ref'})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  
                  <div className={styles.formGroup} style={{ marginBottom: '12px' }}>
                    <label>Mock Username</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="e.g. cozy_room_critic"
                      value={simForm.username}
                      onChange={(e) => setSimForm(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                    <label>Mock Comment Text (Includes trigger word to trigger auto-reply)</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="e.g. send link please!"
                      value={simForm.commentText}
                      onChange={(e) => setSimForm(prev => ({ ...prev, commentText: e.target.value }))}
                    />
                  </div>

                  <button 
                    className="glass-button" 
                    style={{ width: '100%', background: 'var(--primary-color)', color: '#fff', border: 'none' }}
                    onClick={handleSimulateTrigger}
                    disabled={isSimulating || !simForm.socialPostId}
                  >
                    {isSimulating ? <Loader2 className="spinner" size={16} /> : <><Play size={16} /> Run Mock Webhook Test</>}
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Row: Interaction Logs Table */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', margin: 0 }}>3. Interaction Logs History</h3>
                {interactionLogs.length > 0 && (
                  <button className="glass-button" style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={handleClearLogs}>
                    Clear Interaction History
                  </button>
                )}
              </div>

              {logsLoading ? (
                <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 className="spinner" size={24} />
                </div>
              ) : interactionLogs.length === 0 ? (
                <p className="text-muted" style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', fontSize: '13px' }}>No interactions logged yet. Try simulating a comment above!</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '12px' }}>Timestamp</th>
                        <th style={{ padding: '12px' }}>Social Post</th>
                        <th style={{ padding: '12px' }}>Username</th>
                        <th style={{ padding: '12px' }}>Comment Text</th>
                        <th style={{ padding: '12px' }}>Matched Trigger</th>
                        <th style={{ padding: '12px' }}>Auto-Reply Response</th>
                        <th style={{ padding: '12px' }}>Status</th>
                        <th style={{ padding: '12px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interactionLogs.map((log) => {
                        const postLabel = log.socialPost?.product 
                          ? `Product: ${log.socialPost.product.title.substring(0,20)}...` 
                          : (log.socialPost?.collection ? `Collection: ${log.socialPost.collection.title.substring(0,20)}...` : 'General Post');
                        
                        let statusColor = '#94a3b8'; // Slate 400
                        if (log.status.includes('SENT')) statusColor = '#10b981'; // Green 500
                        else if (log.status.includes('FAILED')) statusColor = '#ef4444'; // Red 500
                        else if (log.status === 'NO_TRIGGER_MATCH') statusColor = '#f59e0b'; // Amber 500

                        return (
                          <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(0,0,0,0.05)' }}>
                            <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
                            <td style={{ padding: '12px' }} title={log.socialPostId || ''}>{postLabel}</td>
                            <td style={{ padding: '12px', fontWeight: 700 }}>@{log.username}</td>
                            <td style={{ padding: '12px' }}>"{log.commentText}"</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                                {log.triggerWord}
                              </span>
                            </td>
                            <td style={{ padding: '12px' }}>{log.responseSent}</td>
                            <td style={{ padding: '12px', fontWeight: 700, color: statusColor }}>{log.status}</td>
                            <td style={{ padding: '12px' }}>
                              <button 
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                onClick={() => handleDeleteLog(log.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
