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
  Download,
  Palette,
  Sliders,
  User,
  Terminal,
  Search,
  ChevronDown,
  ChevronUp
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
  store_url: string;
  bot_username: string;

  // New Brand profile fields
  target_audience: string;
  store_aesthetic: string;
  brand_voice: string;
  brand_color_ideas: string;
  content_focus: string;
  store_direction: string;
  instagram_cta_style: string;
  exclude_keywords: string;

  // New Custom Prompt fields
  prompt_curator: string;
  prompt_copywriter: string;
  prompt_collection_copy: string;
  prompt_suggest: string;
  prompt_influencer: string;
  prompt_scene_prompt: string;
  prompt_mockup_prompt: string;
}

const DEFAULT_PROMPTS = {
  prompt_curator: `You are a professional web scraper and structured data extractor. 
Your task is to analyze the provided raw web content (HTML or plain text) of an Amazon product page, extract key information, and return it in a clean, valid JSON format.
Do not make up information. If a field is not found in the text, return an empty string or empty array.
Clean the title: remove seller fluff and keep it readable.
Raw Description: Extract a comprehensive text summary of the original product description, details, specifications or bullet points found on the page.
Category: Choose a single category matching the product (e.g., Bedroom, Living Room, Desk Setup, Kitchen, Tech, Apparel, Outdoors).
Pros: List 2 to 3 pros.
Cons: List 1 to 2 cons.
Features: List 3 to 5 main features.
Stars: Extract the customer rating as a float between 1.0 and 5.0 (e.g., 4.6).
Reviews Count: Extract the total number of ratings/reviews as a formatted string (e.g., "12,845" or "943").`,

  prompt_copywriter: `You are an expert affiliate marketer, SEO copywriter, and social media content creator.
Your job is to write compelling copy for a product catalog named "{brand_name}" and draft matching social media posts to drive clicks.

Follow these brand guidelines:
"{niche_prompt_directive}"

Make all copy visually beautiful, stylish, and highly engaging by incorporating plenty of appropriate emojis (like ✨, 🏠, 🛋️, 🌸, 🌿) across the title, description, and social posts.

CRITICAL COMPLIANCE REQUIREMENT: You MUST include a clear affiliate relationship disclosure (such as '#ad' or '#CommissionsEarned') in the very first line of each social media post draft (Instagram, Pinterest) to comply with FTC "Above the Fold" guidelines. This disclosure must appear before any link or main body content.

Use the product title, raw description, and category details to capture its aesthetic style, colors, materials, and design details in your copywriting. Make sure the custom description fits the style of the product.

Do NOT mention any pricing or cost in the catalog description or social media posts, as static prices violate Amazon Associates policies.

Write the following:
1. Custom Title: A clean, aesthetic, and themed title for the product listing with an emoji (e.g. "Minimalist Walnut Desk Lamp 💡" instead of the original long junk-filled Amazon title).
2. Custom Description: A rich, paragraph-based website review/description (150-250 words) with emojis that describes the product, why it's great, and how it fits into the brand's style/niche.
3. Instagram Caption: Engaging, pretty caption. The first line must contain the affiliate disclosure (e.g. "#ad ✨ [Title]"), followed by a visual hook, body paragraphs, emojis, and a block of 5 to 10 relevant, targeted hashtags (e.g., #homedecor #cozyhome etc.). CRITICAL: Do NOT put any URL link, web address, link string, or the comment/DM call-to-action in the Instagram caption text.
4. Instagram First Comment: A clean first comment containing the call-to-action instructing users to comment or DM a specific trigger word (e.g., "DM 'COZY' or comment 'DESK' for the link to shop! 🛍️✨").
5. Pinterest Pin Title: A short, catching title for the Pinterest Pin under 100 characters (incorporate aesthetic words or emojis if fitting).
6. Pinterest Pin Description: SEO-optimized, highly engaging description. The first line must contain the affiliate disclosure (e.g. "#ad 📌 [Title]"), emphasizing benefits, aesthetic appeal, emojis, and hashtags. CRITICAL: The entire Pinterest pin description text MUST be strictly under 480 characters to comply with Pinterest's maximum length limits. Do NOT put any URL link, website address, or link string in the Pinterest pin description text (it will be linked via the Pin metadata instead).`,

  prompt_collection_copy: `You are a professional social media manager and copywriter for an aesthetic lifestyle brand named "{brand_name}".
Your task is to write high-converting social media copy for a themed scene bundle (Collection) that features multiple products.
Brand guidelines:
"{niche_prompt_directive}"

The collection details:
Title: "{title}"
Description: "{description}"
Products in this scene:
{productsList}

CRITICAL COMPLIANCE & TRIGGER RULES:
1. First line of EVERY post must start with an FTC-compliant affiliate disclosure (e.g. '#ad').
2. For Instagram: The caption must explicitly instruct users to comment or DM a specific word (we suggest: "{triggerWord}") to receive the link to this collection in their DMs automatically (e.g., "Comment '{triggerWord}' or DM me to get the setup details sent to your DMs! 💻✨"). Do NOT include any direct link, URL, or website address in the Instagram caption text.
3. For Pinterest: The description must be under 480 characters. Do NOT put any URL link or website address in the Pinterest pin description text (it will be linked via the Pin metadata instead).
4. Use plenty of appropriate emojis to style the text beautifully.`,

  prompt_suggest: `You are a professional interior stylist, visual merchandiser, and marketing coordinator for an aesthetic home decor and lifestyle brand named "{brand_name}".
Your task is to review the catalog products and suggest a themed scene bundle (Collection) that groups 2 to 4 products that logically and beautifully fit together.

Brand guidelines:
"{niche_prompt_directive}"

Review this catalog:
{productsSummary}

Choose a cohesive aesthetic theme (e.g. "Warm Bedtime Sanctuary", "Cozy Dorm Study Essentials", "Minimalist Living Room Corner").
Suggest:
1. Title: An engaging, aesthetic title for the collection.
2. Description: A beautiful, paragraph-based description (100-150 words) describing the scene, the styling, and how the products complement each other.
3. TriggerWord: A single, short, clean trigger word for Instagram comments (e.g. "cozy", "desk", "room", "nook").
4. Product IDs: The array of matching product IDs you selected from the list above. You MUST choose ONLY valid IDs from the list provided. Do not invent any new IDs.`,

  prompt_influencer: `You are a viral social media director and creative copywriter for an aesthetic home decor and lifestyle brand named "{brand_name}".
Your task is to generate a comprehensive short-form video creation package (Reel / TikTok script outline) tailored to promote a curated set of products.
Our brand guidelines:
"{niche_prompt_directive}"

The package must contain hook options, a suggested comment responder trigger word, an engaging caption encouraging comments, scene-by-scene filming instructions, and visual/styling tips.`,

  prompt_scene_prompt: `You are a professional visual art director for an aesthetic lifestyle brand named "{brand_name}".
Your task is to write a high-quality, professional image generation prompt for a multimodal model.
The prompt must describe a single, cohesive, styled environment (like a cozy bedroom, a minimalist desk setup, or a warm living room nook) that naturally blends the products shown in the reference images together:

{productsListStr}

Use the brand guidelines:
"{niche_prompt_directive}"

The prompt MUST follow this exact structural format and phrasing:
"A photorealistic composite scene containing the provided products in the reference images. Place them together inside a styled [describe the environment/furniture and placements], [describe lighting, composition, and visual qualities]."

CRITICAL VISUAL COMPLIANCE:
1. Do NOT describe the products themselves. The model can see the reference images, so describing product details (like shape, color, or text) is unnecessary and causes the AI to hallucinate incorrect details.
2. Focus entirely on describing the environment, placement, and visual styling of the scene where the products are placed.
3. The prompt MUST start with the exact phrase: "A photorealistic composite scene containing the provided products in the reference images. Place them together inside a styled " followed by your environment description.
4. Output ONLY the raw prompt text. Do not write introductory words or wrap in quotes. Keep it to 2 or 3 concise descriptive sentences.`,

  prompt_mockup_prompt: `You are a visual art director for an aesthetic product review brand named "{brand_name}".
Your task is to write a high-quality, professional image generation prompt for a multimodal image-to-image model.
The goal of the prompt is to visualize the product provided in the reference image inside a themed environment matching these guidelines:
"{niche_prompt_directive}"

The prompt MUST follow this exact structural format and phrasing:
"A photorealistic mockup of the provided product in the reference image. Place it inside a styled [describe the environment/background details matching the category '{category}' and guidelines], [describe lighting, composition, and visual qualities]."

CRITICAL INSTRUCTIONS:
1. Do NOT describe the product itself. The model can see the reference image, so describing the product details (like shape, color, or text) is unnecessary and causes the AI to hallucinate incorrect details.
2. Focus entirely on describing the environment, placement, and lighting where the product should be placed.
3. The prompt MUST start with the exact phrase: "A photorealistic mockup of the provided product in the reference image. Place it inside a " followed by your environment description.
4. Output ONLY the raw prompt text. Do not write introductory words or wrap in quotes. Keep it to 1 or 2 concise descriptive sentences.`
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'listings' | 'curator' | 'settings' | 'collections' | 'influencer' | 'responder' | 'finder'>('listings');
  
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
  const [activeInspectionProduct, setActiveInspectionProduct] = useState<any>(null);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [isSuggestingCollection, setIsSuggestingCollection] = useState(false);

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
    store_url: '',
    bot_username: '',

    target_audience: '',
    store_aesthetic: '',
    brand_voice: '',
    brand_color_ideas: '',
    content_focus: '',
    store_direction: '',
    instagram_cta_style: '',
    exclude_keywords: '',

    prompt_curator: '',
    prompt_copywriter: '',
    prompt_collection_copy: '',
    prompt_suggest: '',
    prompt_influencer: '',
    prompt_scene_prompt: '',
    prompt_mockup_prompt: '',
  });

  const [activeSettingsSection, setActiveSettingsSection] = useState<'profile' | 'visuals' | 'integrations' | 'prompts'>('profile');
  const [isGeneratingDirection, setIsGeneratingDirection] = useState(false);
  const [generatedDirectionResult, setGeneratedDirectionResult] = useState<any | null>(null);

  // Listings State
  const [products, setProducts] = useState<Product[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Curator / Form State
  const [amazonUrl, setAmazonUrl] = useState('');
  const [pastedHtml, setPastedHtml] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageInstructions, setImageInstructions] = useState('');

  // Amazon Product Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Amazon Finder Auto-Crawler States
  const [finderActive, setFinderActive] = useState(false);
  const [finderInterval, setFinderInterval] = useState(5); // interval in minutes
  const [finderLimit, setFinderLimit] = useState(5); // limit per search
  const [finderNiches, setFinderNiches] = useState('lamp, desk organizer, throw blanket, coffee mug, monitor stand, fairy lights');
  const [finderStatus, setFinderStatus] = useState('Idle');
  const [finderCountdown, setFinderCountdown] = useState(300); // countdown in seconds
  const [finderLogs, setFinderLogs] = useState<{ time: string; text: string }[]>([]);
  const [finderResults, setFinderResults] = useState<any[]>([]);
  const [nicheIndex, setNicheIndex] = useState(0);

  // AI Semantic Manual Search States
  const [aiSearchInput, setAiSearchInput] = useState('');
  const [aiSearchExplanation, setAiSearchExplanation] = useState('');
  const [aiSearchResultsList, setAiSearchResultsList] = useState<any[]>([]);
  const [aiSearchRunning, setAiSearchRunning] = useState(false);
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
    instagramFirstComment: '',
    pinterestPost: '',
    pinterestTitle: '',
    pinterestLink: '',
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
      const selectedProducts = products.filter(p => collectionForm.selectedProductIds.includes(p.id));
      const res = await fetch('/api/generate-collection-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mockup',
          prompt: collectionForm.scenePrompt,
          products: selectedProducts,
        }),
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

  const handleSuggestCollection = async () => {
    setIsSuggestingCollection(true);
    try {
      const res = await fetch('/api/collections/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success && data.suggestion) {
        const { title, description, triggerWord, productIds } = data.suggestion;
        setCollectionForm(prev => ({
          ...prev,
          title: title || '',
          description: description || '',
          triggerWord: triggerWord || 'cozy',
          selectedProductIds: productIds || [],
        }));
        showMessage('AI suggested collection loaded! You can now generate the scene.');
      } else {
        showMessage(data.error || 'Failed to get collection suggestion', 'error');
      }
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setIsSuggestingCollection(false);
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
        showMessage(`Successfully posted to ${platform} via Zernio!`);
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

  // Remove social post trigger settings
  const handleRemoveSocialPost = async (socialPostId: string) => {
    if (!confirm('Are you sure you want to remove this post trigger and its responder settings?')) {
      return;
    }
    try {
      const res = await fetch(`/api/social-logs?postId=${socialPostId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showMessage('Post trigger settings removed successfully!');
        fetchResponderData();
      } else {
        const data = await res.json();
        showMessage(data.error || 'Failed to remove post trigger settings', 'error');
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

  const handleGenerateDirection = async () => {
    if (!settings.brand_name) {
      showMessage('Please enter a Brand Name first.', 'error');
      return;
    }
    
    setIsGeneratingDirection(true);
    setGeneratedDirectionResult(null);
    try {
      const res = await fetch('/api/settings/generate-direction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: settings.brand_name,
          target_audience: settings.target_audience,
          store_aesthetic: settings.store_aesthetic,
          brand_voice: settings.brand_voice,
          brand_color_ideas: settings.brand_color_ideas,
          content_focus: settings.content_focus
        })
      });
      
      const data = await res.json();
      if (res.ok && data.suggestion) {
        setGeneratedDirectionResult(data.suggestion);
        showMessage('Brand direction suggested successfully! Review details below.');
      } else {
        showMessage(data.error || 'Failed to suggest brand direction', 'error');
      }
    } catch (err: any) {
      showMessage(err.message || 'Error generating brand direction', 'error');
    } finally {
      setIsGeneratingDirection(false);
    }
  };

  const handleApplyGeneratedDirection = () => {
    if (!generatedDirectionResult) return;
    
    setSettings(prev => ({
      ...prev,
      brand_tagline: generatedDirectionResult.brand_tagline || prev.brand_tagline,
      store_direction: generatedDirectionResult.store_direction || prev.store_direction,
      niche_prompt_directive: generatedDirectionResult.niche_prompt_directive || prev.niche_prompt_directive
    }));
    
    showMessage('Applied generated direction, tagline, and guidelines. Click "Save Configurations" to persist.');
  };

  const handleApplyGeneratedColors = () => {
    if (!generatedDirectionResult || !generatedDirectionResult.colors) return;
    
    const { primary_color, secondary_color, background_color, text_color } = generatedDirectionResult.colors;
    
    setSettings(prev => ({
      ...prev,
      primary_color: primary_color || prev.primary_color,
      secondary_color: secondary_color || prev.secondary_color,
      background_color: background_color || prev.background_color,
      text_color: text_color || prev.text_color
    }));
    
    showMessage('Applied recommended colors to color picker inputs. Click "Save Configurations" to persist.');
  };

  const handleResetPrompt = (key: 'prompt_curator' | 'prompt_copywriter' | 'prompt_collection_copy' | 'prompt_suggest' | 'prompt_influencer' | 'prompt_scene_prompt' | 'prompt_mockup_prompt') => {
    setSettings(prev => ({
      ...prev,
      [key]: DEFAULT_PROMPTS[key] || ''
    }));
    showMessage('Reset prompt template to default value. Click "Save Configurations" to persist.');
  };

  // Amazon product search handler
  const handleAmazonSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setSearchError('');
    try {
      const res = await fetch(`/api/search-amazon?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to search products');
      }
      setSearchResults(data.results || []);
    } catch (err: any) {
      console.error(err);
      setSearchError(err.message || 'An error occurred while searching');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleImportProduct = (prod: any) => {
    setAmazonUrl(prod.url);
    setCuratedProduct(prev => ({
      ...prev,
      title: prod.title,
      originalUrl: prod.url,
      affiliateUrl: prod.url,
      mainImage: prod.image,
      originalProductImage: prod.image,
      stars: parseFloat(prod.stars) || 4.5,
      reviewsCount: String(prod.reviewsCount) || '0',
    }));
    setImageUrlInput(prod.image);
    setActiveTab('curator');
    showMessage(`Successfully imported "${prod.title.substring(0, 30)}..."! Review details below.`, 'success');
  };

  const addFinderLog = (text: string) => {
    const time = new Date().toLocaleTimeString();
    setFinderLogs(prev => [{ time, text }, ...prev.slice(0, 49)]);
  };

  const runAutoSearch = async () => {
    const nicheList = finderNiches.split(',').map(n => n.trim()).filter(Boolean);
    if (nicheList.length === 0) {
      addFinderLog('Error: Niche list is empty. Auto-finder paused.');
      setFinderActive(false);
      return;
    }

    const currentNiche = nicheList[nicheIndex % nicheList.length];
    setNicheIndex(prev => prev + 1);

    addFinderLog(`Starting automated crawl for keyword: "${currentNiche}"`);
    setFinderStatus(`Searching for "${currentNiche}"...`);

    try {
      const res = await fetch(`/api/search-amazon?q=${encodeURIComponent(currentNiche)}`);
      if (!res.ok) {
        throw new Error(`Failed to search. Status: ${res.status}`);
      }
      const data = await res.json();
      const newProducts = data.results || [];
      
      if (newProducts.length === 0) {
        addFinderLog(`Crawl completed for "${currentNiche}". No new items found.`);
      } else {
        const sliceCount = Math.min(newProducts.length, finderLimit);
        const productsToImport = newProducts.slice(0, sliceCount);
        
        setFinderResults(prev => {
          const existingAsins = new Set(prev.map((p: any) => p.asin));
          const filtered = productsToImport.filter((p: any) => !existingAsins.has(p.asin));
          return [...filtered, ...prev];
        });
        
        addFinderLog(`Crawl completed for "${currentNiche}". Found ${newProducts.length} items. Added ${productsToImport.length} to feed.`);
      }
    } catch (err: any) {
      console.error(err);
      addFinderLog(`Crawl failed for "${currentNiche}": ${err.message || 'Unknown error'}`);
    }

    setFinderCountdown(finderInterval * 60);
  };

  // Automated Finder Crawler Timer Effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (finderActive) {
      if (finderCountdown <= 0) {
        runAutoSearch();
      } else {
        timer = setTimeout(() => {
          setFinderCountdown(prev => prev - 1);
        }, 1000);
      }
    } else {
      setFinderStatus('Paused');
    }
    return () => clearTimeout(timer);
  }, [finderActive, finderCountdown]);

  // Update status message on countdown tick
  useEffect(() => {
    if (finderActive) {
      const minutes = Math.floor(finderCountdown / 60);
      const seconds = finderCountdown % 60;
      setFinderStatus(`Next search in ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
    }
  }, [finderCountdown, finderActive]);

  useEffect(() => {
    setFinderCountdown(finderInterval * 60);
  }, [finderInterval]);

  const handleAiSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiSearchInput.trim()) return;

    setAiSearchRunning(true);
    setAiSearchExplanation('');
    try {
      const res = await fetch('/api/search-amazon/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: aiSearchInput })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to perform AI search');
      }
      setAiSearchResultsList(data.results || []);
      setAiSearchExplanation(data.explanation || '');
      showMessage(`AI processed search successfully! Found ${data.results?.length || 0} items.`, 'success');
    } catch (err: any) {
      console.error(err);
      showMessage(err.message || 'Failed to complete AI semantic search', 'error');
    } finally {
      setAiSearchRunning(false);
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
      const expectedPrefix = 'a photorealistic mockup of the provided product';
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
        instagramFirstComment: data.instagramFirstComment || '',
        pinterestPost: data.pinterestPost || '',
        pinterestTitle: data.pinterestTitle || data.customTitle || curatedProduct.title || '',
        pinterestLink: data.pinterestLink || curatedProduct.affiliateUrl || curatedProduct.originalUrl || '',
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
          mainImage: curatedProduct.originalProductImage,
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
              instagramFirstComment: socialDrafts.instagramFirstComment || '',
              pinterest: pinContent,
              pinterestTitle: socialDrafts.pinterestTitle || '',
              pinterestLink: socialDrafts.pinterestLink || '',
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
        instagramFirstComment: socialDrafts.instagramFirstComment,
        pinterestPost: pinContent,
        pinterestTitle: socialDrafts.pinterestTitle,
        pinterestLink: socialDrafts.pinterestLink,
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
    let socialDraftsObj = {
      instagram: '',
      instagramFirstComment: '',
      pinterest: '',
      pinterestTitle: '',
      pinterestLink: '',
    };

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
            instagramFirstComment: galleryData.socialDrafts.instagramFirstComment || '',
            pinterest: galleryData.socialDrafts.pinterest || '',
            pinterestTitle: galleryData.socialDrafts.pinterestTitle || '',
            pinterestLink: galleryData.socialDrafts.pinterestLink || '',
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
      instagramFirstComment: socialDraftsObj.instagramFirstComment || '',
      pinterestPost: socialDraftsObj.pinterest || `${prod.title} - ${prod.customDescription}\n\nPin this to save for later!`,
      pinterestTitle: socialDraftsObj.pinterestTitle || prod.title || '',
      pinterestLink: socialDraftsObj.pinterestLink || prod.affiliateUrl || prod.originalUrl || '',
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

      const platObj: any = {
        name: platform,
        content: finalContent
      };

      if (platform === 'instagram' && socialDrafts.instagramFirstComment) {
        platObj.instagramFirstComment = socialDrafts.instagramFirstComment;
      }
      if (platform === 'pinterest') {
        platObj.pinterestTitle = socialDrafts.pinterestTitle || undefined;
        platObj.pinterestLink = socialDrafts.pinterestLink || undefined;
      }

      const payload = {
        productId: curatedProduct.id || undefined,
        mediaUrls: mediaUrls,
        platforms: [platObj],
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

      showMessage(`Post successfully sent to ${platform} via Zernio!`);
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setLoading(prev => ({ ...prev, publish: false }));
    }
  };

  // Publish to ALL Socials at once (Instagram, Pinterest)
  const handlePublishToAllSocials = async () => {
    setLoading(prev => ({ ...prev, publish: true }));

    const defaultInsta = `#ad ✨ ${curatedProduct.title}\n\n${curatedProduct.customDescription || curatedProduct.rawDescription}\n\nCheck the link in our bio to find this deal! 🏠✨\n\n#cozyhome #decor #lifestyle`;
    const defaultPin = `#ad 📌 ${curatedProduct.title} - ${curatedProduct.customDescription || curatedProduct.rawDescription}\n\nPin this to save for later!`;

    const platformsList: any[] = [];
    const igContent = socialDrafts.instagramPost.trim() || defaultInsta;
    const pinContent = socialDrafts.pinterestPost.trim() || defaultPin;

    if (igContent) {
      platformsList.push({
        name: 'instagram',
        content: igContent,
        instagramFirstComment: socialDrafts.instagramFirstComment || undefined
      });
    }
    if (pinContent) {
      platformsList.push({
        name: 'pinterest',
        content: pinContent,
        pinterestTitle: socialDrafts.pinterestTitle || undefined,
        pinterestLink: socialDrafts.pinterestLink || undefined
      });
    }

    if (platformsList.length === 0) {
      showMessage('No social drafts are ready to publish.', 'error');
      setLoading(prev => ({ ...prev, publish: false }));
      return;
    }

    // Sync drafts visually in UI
    setSocialDrafts({
      instagramPost: igContent,
      instagramFirstComment: socialDrafts.instagramFirstComment,
      pinterestPost: pinContent,
      pinterestTitle: socialDrafts.pinterestTitle,
      pinterestLink: socialDrafts.pinterestLink,
    });

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const mediaUrls = curatedProduct.id 
      ? [`${origin}/api/images/${curatedProduct.id}`]
      : (curatedProduct.mainImage && curatedProduct.mainImage.startsWith('http') ? [curatedProduct.mainImage] : undefined);

    try {
      const payload = {
        productId: curatedProduct.id || undefined,
        mediaUrls: mediaUrls,
        platforms: platformsList
      };

      const res = await fetch('/api/publish-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        showMessage(`Successfully posted to all ${platformsList.length} platforms via Zernio!`);
      } else {
        showMessage(`Publishing failed: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (err: any) {
      showMessage(`Publishing failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(prev => ({ ...prev, publish: false }));
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

  const tabHeaders: Record<string, { title: string; subtext: string }> = {
    listings: {
      title: 'Catalog Listings',
      subtext: 'View, search, edit and manage your active affiliate catalog products'
    },
    curator: {
      title: 'AI Product Curator',
      subtext: 'Ingest raw Amazon details to generate optimized, aesthetic affiliate copy'
    },
    collections: {
      title: 'AI Scene Collections',
      subtext: 'Group matching products and generate blended, photorealistic AI mockups'
    },
    influencer: {
      title: 'Influencer Planner',
      subtext: 'Generate video hooks, voiceover scripts, and auto-reply trigger keywords'
    },
    responder: {
      title: 'Auto-Responder Logs',
      subtext: 'Track real-time Instagram webhook requests, DM dispatches, and public replies'
    },
    finder: {
      title: 'Amazon Product Finder',
      subtext: 'Automate product discovery and query products with AI-powered instructions'
    },
    settings: {
      title: 'Hub Settings',
      subtext: 'Configure your brand style, affiliate partner tags, and external API keys'
    }
  };
  const activeHeader = tabHeaders[activeTab] || { title: 'Dashboard', subtext: 'Manage your workspace' };

  return (
    <div className={`container ${styles.adminWrapper}`}>
      {/* Sidebar Navigation */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <Sparkles className="accent-text" size={20} />
          <h2>{settings.brand_name || 'Hub'} Control</h2>
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
            className={`${styles.tabBtn} ${activeTab === 'finder' ? styles.activeTabBtn : ''}`}
            onClick={() => setActiveTab('finder')}
          >
            <Search size={16} /> Amazon Finder
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.activeTabBtn : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={16} /> Hub Settings
          </button>
        </div>

        <button 
          className={styles.logoutBtn}
          onClick={handleLogout}
          title="Log out from admin session"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>

      {/* Main Content Pane */}
      <div className={styles.mainContent}>
        {/* Active View Header */}
        <div className={styles.contentHeader}>
          <h1>{activeHeader.title}</h1>
          <p>{activeHeader.subtext}</p>
        </div>

        {/* Global alert messages */}
        {message && (
          <div className={`${styles.alert} ${message.type === 'error' ? styles.alertError : styles.alertSuccess}`}>
            <AlertCircle size={18} />
            <span>{message.text}</span>
          </div>
        )}
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
                    <div 
                      className={styles.cardImageWrapper}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActiveInspectionProduct(prod);
                        setIsInspectionModalOpen(true);
                      }}
                      title="Click to inspect product"
                    >
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
                      <h3 
                        className={styles.cardTitle}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setActiveInspectionProduct(prod);
                          setIsInspectionModalOpen(true);
                        }}
                        title="Click to inspect product"
                      >
                        {prod.title}
                      </h3>
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
                <>
                  {/* Find Products on Amazon Drawer */}
                  <div style={{ 
                    borderBottom: '1px solid var(--border-color)', 
                    paddingBottom: '16px', 
                    marginBottom: '16px',
                    background: 'rgba(217, 119, 6, 0.03)',
                    border: '1px solid rgba(217, 119, 6, 0.1)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}>
                    <div 
                      onClick={() => setShowSearch(!showSearch)} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', color: 'var(--primary-color)' }}>
                        <Search size={16} />
                        Find Products on Amazon
                      </span>
                      {showSearch ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>

                    {showSearch && (
                      <div style={{ marginTop: '16px' }} className="animated-fade-in">
                        <form onSubmit={handleAmazonSearch} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                          <input 
                            type="text" 
                            placeholder="Search for cozy items (e.g. lamp, desk organizer)..." 
                            className="glass-input"
                            style={{ flex: 1 }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          <button 
                            type="submit" 
                            className="glass-button" 
                            disabled={searchLoading}
                            style={{ minWidth: '80px' }}
                          >
                            {searchLoading ? <Loader2 className="spinner" size={14} /> : 'Search'}
                          </button>
                        </form>

                        {searchError && (
                          <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertCircle size={14} /> {searchError}
                          </div>
                        )}

                        {searchResults.length > 0 ? (
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                            gap: '12px', 
                            maxHeight: '300px', 
                            overflowY: 'auto',
                            paddingRight: '4px',
                            marginTop: '8px'
                          }}>
                            {searchResults.map((prod, idx) => (
                              <div 
                                key={idx} 
                                style={{ 
                                  background: 'rgba(255, 255, 255, 0.03)', 
                                  border: '1px solid var(--border-color)', 
                                  borderRadius: '8px', 
                                  padding: '8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  gap: '8px',
                                  position: 'relative'
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {prod.image && (
                                    <div style={{ 
                                      width: '100%', 
                                      height: '80px', 
                                      borderRadius: '6px', 
                                      overflow: 'hidden', 
                                      background: 'rgba(0,0,0,0.2)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      <img 
                                        src={prod.image} 
                                        alt={prod.title} 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                      />
                                    </div>
                                  )}
                                  <div style={{ 
                                    fontSize: '11px', 
                                    fontWeight: '500', 
                                    lineHeight: '1.2', 
                                    height: '2.4em', 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical'
                                  }}>
                                    {prod.title}
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                                    <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{prod.price || 'N/A'}</span>
                                    <span style={{ color: '#fbbf24' }}>★ {prod.stars}</span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button 
                                    onClick={() => handleImportProduct(prod)}
                                    className="glass-button"
                                    style={{ padding: '4px 6px', fontSize: '10px', flex: 1, height: '24px', justifyContent: 'center' }}
                                  >
                                    Import
                                  </button>
                                  <a 
                                    href={prod.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="glass-button"
                                    style={{ padding: '4px', width: '24px', height: '24px', justifyContent: 'center', flexShrink: 0 }}
                                  >
                                    <ExternalLink size={10} />
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          !searchLoading && searchQuery && (
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                              No products found matching your search.
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

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
                </>
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

                {/* Make sure user saves first before sharing, to generate a dynamic local URL for Zernio */}
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
                      <Send size={14} /> 📢 Post to All Socials (Zernio)
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
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-color)', opacity: 0.8 }}>First Comment (Optional)</label>
                      <span style={{ fontSize: '9px', opacity: 0.6 }}>{(socialDrafts.instagramFirstComment || '').length}/2200</span>
                    </div>
                    <textarea 
                      className="glass-input" 
                      style={{ minHeight: '50px', fontSize: '11px', padding: '6px' }}
                      placeholder="Drop any extra context or a CTA here."
                      value={socialDrafts.instagramFirstComment || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length <= 2200) {
                          setSocialDrafts(prev => ({ ...prev, instagramFirstComment: val }));
                        }
                      }}
                    />
                  </div>
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
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Pinterest Title */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-color)', opacity: 0.8 }}>Title (Optional)</label>
                        <span style={{ fontSize: '9px', opacity: 0.6 }}>{(socialDrafts.pinterestTitle || '').length}/100</span>
                      </div>
                      <input 
                        type="text"
                        className="glass-input" 
                        style={{ fontSize: '11px', padding: '6px' }}
                        placeholder="Enter a custom title for your Pin..."
                        value={socialDrafts.pinterestTitle || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.length <= 100) {
                            setSocialDrafts(prev => ({ ...prev, pinterestTitle: val }));
                          }
                        }}
                      />
                      <p style={{ fontSize: '9px', opacity: 0.6, margin: '0' }}>Custom title for your Pin. If not provided, the first line of the main content will be used.</p>
                    </div>

                    {/* Pinterest Destination Link */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-color)', opacity: 0.8 }}>Destination Link (Optional)</label>
                      <input 
                        type="text"
                        className="glass-input" 
                        style={{ fontSize: '11px', padding: '6px' }}
                        placeholder="https://example.com/your-landing-page"
                        value={socialDrafts.pinterestLink || ''}
                        onChange={(e) => setSocialDrafts(prev => ({ ...prev, pinterestLink: e.target.value }))}
                      />
                      <p style={{ fontSize: '9px', opacity: 0.6, margin: '0' }}>Set the clickable URL for your Pin. This becomes the Pin's outbound link.</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* Amazon Finder Tab */}
        {activeTab === 'finder' && (
          <div className="animated-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Top Grid: Automated Finder & AI Semantic Search */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              
              {/* Card 1: Automated Finder Controller */}
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)', fontSize: '15px' }}>
                    <RefreshCw className={finderActive ? "spinner" : ""} size={18} />
                    Automated Product Finder
                  </h3>
                  <span style={{ 
                    fontSize: '11px', 
                    padding: '3px 8px', 
                    borderRadius: '20px', 
                    fontWeight: '600',
                    background: finderActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    color: finderActive ? '#10b981' : 'var(--text-muted)'
                  }}>
                    {finderStatus}
                  </span>
                </div>

                <p className="text-muted" style={{ fontSize: '12px', margin: 0 }}>
                  Automatically discovers Amazon products on a schedule and populates them in the discovered feed below.
                </p>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px' }}>Search Interval (minutes)</label>
                    <input 
                      type="number" 
                      min="1" 
                      className="glass-input" 
                      value={finderInterval} 
                      onChange={(e) => setFinderInterval(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px' }}>Limit per Search</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="10"
                      className="glass-input" 
                      value={finderLimit} 
                      onChange={(e) => setFinderLimit(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label style={{ fontSize: '11px' }}>Rotated Niches / Keywords (comma-separated)</label>
                  <textarea 
                    className="glass-input" 
                    style={{ minHeight: '60px', fontSize: '12px', resize: 'vertical' }}
                    value={finderNiches} 
                    onChange={(e) => setFinderNiches(e.target.value)} 
                    placeholder="e.g. lamp, wood organizer, throw blanket"
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <button 
                    onClick={() => {
                      if (!finderActive) {
                        addFinderLog('Auto-finder activated.');
                        runAutoSearch();
                        setFinderActive(true);
                      } else {
                        addFinderLog('Auto-finder paused.');
                        setFinderActive(false);
                      }
                    }} 
                    className="glass-button"
                    style={{ 
                      flex: 1, 
                      background: finderActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(217, 119, 6, 0.15)',
                      borderColor: finderActive ? 'rgba(239, 68, 68, 0.3)' : 'var(--primary-color)',
                      color: finderActive ? '#ef4444' : 'var(--primary-color)',
                      fontWeight: '600'
                    }}
                  >
                    {finderActive ? 'Pause Auto-Finder' : 'Start Auto-Finder'}
                  </button>
                  <button 
                    onClick={() => {
                      runAutoSearch();
                    }}
                    className="glass-button"
                    disabled={finderActive && finderStatus.includes('Searching')}
                    style={{ padding: '0 16px' }}
                  >
                    Run Now
                  </button>
                </div>

                {/* Event Logs Console */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', opacity: 0.8 }}>Finder Operations Console Log</span>
                  <div style={{ 
                    background: 'rgba(0,0,0,0.4)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    padding: '8px 12px', 
                    height: '100px', 
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    color: '#10b981'
                  }}>
                    {finderLogs.length === 0 ? (
                      <span style={{ color: 'var(--text-muted)' }}>Console idle. Awaiting triggers...</span>
                    ) : (
                      finderLogs.map((log, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>[{log.time}]</span>
                          <span>{log.text}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: AI Semantic Search */}
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)', fontSize: '15px' }}>
                  <Sparkles size={18} />
                  AI Semantic Finder
                </h3>

                <p className="text-muted" style={{ fontSize: '12px', margin: 0 }}>
                  Describe the style or specific vibe of the products you want to find. Gemini will analyze your instruction, target optimized listings, and query Amazon.
                </p>

                <form onSubmit={handleAiSemanticSearch} style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  <div className={styles.formGroup} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '11px' }}>Search Instruction / Vibe Description</label>
                    <textarea 
                      placeholder="e.g. Find me some top rated minimalist warm-glow wood lamps under $50..." 
                      className="glass-input"
                      style={{ flex: 1, minHeight: '80px', fontSize: '12px', resize: 'vertical' }}
                      value={aiSearchInput}
                      onChange={(e) => setAiSearchInput(e.target.value)}
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="glass-button" 
                    disabled={aiSearchRunning}
                    style={{ width: '100%', fontWeight: '600' }}
                  >
                    {aiSearchRunning ? (
                      <>
                        <Loader2 className="spinner" size={14} /> AI Processing & Searching...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} /> Run AI Search
                      </>
                    )}
                  </button>
                </form>

                {aiSearchExplanation && (
                  <div style={{ 
                    background: 'rgba(217, 119, 6, 0.05)', 
                    border: '1px solid rgba(217, 119, 6, 0.2)', 
                    borderRadius: '8px', 
                    padding: '10px 14px', 
                    fontSize: '11px',
                    lineHeight: '1.4'
                  }}>
                    <strong style={{ color: 'var(--primary-color)' }}>Gemini Focus:</strong> {aiSearchExplanation}
                  </div>
                )}
              </div>
            </div>

            {/* AI Semantic Search Results Grid */}
            {aiSearchResultsList.length > 0 && (
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: 'var(--primary-color)' }}>
                  AI Search Results Feed
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
                  gap: '16px' 
                }}>
                  {aiSearchResultsList.map((prod, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '12px', 
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {prod.image && (
                          <div style={{ 
                            width: '100%', 
                            height: '110px', 
                            borderRadius: '8px', 
                            overflow: 'hidden', 
                            background: 'rgba(0,0,0,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <img 
                              src={prod.image} 
                              alt={prod.title} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          </div>
                        )}
                        <div style={{ 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          lineHeight: '1.3', 
                          height: '2.6em', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {prod.title}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                          <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{prod.price || 'N/A'}</span>
                          <span style={{ color: '#fbbf24' }}>★ {prod.stars} ({prod.reviewsCount})</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          onClick={() => handleImportProduct(prod)}
                          className="glass-button"
                          style={{ padding: '6px', fontSize: '11px', flex: 1, height: '30px', justifyContent: 'center' }}
                        >
                          Import to Curator
                        </button>
                        <a 
                          href={prod.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="glass-button"
                          style={{ padding: '6px', width: '30px', height: '30px', justifyContent: 'center', flexShrink: 0 }}
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Section: Discovered Feed */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
                <FolderSearch size={18} />
                Discovered Products Feed ({finderResults.length})
              </h3>
              
              {finderResults.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px', 
                  color: 'var(--text-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Search size={24} style={{ opacity: 0.5 }} />
                  <span>No products discovered yet. Configure the auto-crawler above or run a manual search.</span>
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                  gap: '16px' 
                }}>
                  {finderResults.map((prod, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '12px', 
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {prod.image && (
                          <div style={{ 
                            width: '100%', 
                            height: '120px', 
                            borderRadius: '8px', 
                            overflow: 'hidden', 
                            background: 'rgba(0,0,0,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <img 
                              src={prod.image} 
                              alt={prod.title} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          </div>
                        )}
                        <div style={{ 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          lineHeight: '1.3', 
                          height: '2.6em', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {prod.title}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                          <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{prod.price || 'N/A'}</span>
                          <span style={{ color: '#fbbf24' }}>★ {prod.stars} ({prod.reviewsCount})</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          onClick={() => handleImportProduct(prod)}
                          className="glass-button"
                          style={{ padding: '6px', fontSize: '11px', flex: 1, height: '30px', justifyContent: 'center' }}
                        >
                          Import to Curator
                        </button>
                        <a 
                          href={prod.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="glass-button"
                          style={{ padding: '6px', width: '30px', height: '30px', justifyContent: 'center', flexShrink: 0 }}
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                {/* Sub-Navigation for settings tabs */}
                <div className={styles.settingsSubNav}>
                  <button 
                    type="button"
                    className={`${styles.settingsSubNavBtn} ${activeSettingsSection === 'profile' ? styles.settingsSubNavBtnActive : ''}`}
                    onClick={() => setActiveSettingsSection('profile')}
                  >
                    <User size={14} /> Brand Profile & Direction
                  </button>
                  <button 
                    type="button"
                    className={`${styles.settingsSubNavBtn} ${activeSettingsSection === 'visuals' ? styles.settingsSubNavBtnActive : ''}`}
                    onClick={() => setActiveSettingsSection('visuals')}
                  >
                    <Palette size={14} /> Color Theme & Palette
                  </button>
                  <button 
                    type="button"
                    className={`${styles.settingsSubNavBtn} ${activeSettingsSection === 'integrations' ? styles.settingsSubNavBtnActive : ''}`}
                    onClick={() => setActiveSettingsSection('integrations')}
                  >
                    <Sliders size={14} /> Shop Configurations
                  </button>
                  <button 
                    type="button"
                    className={`${styles.settingsSubNavBtn} ${activeSettingsSection === 'prompts' ? styles.settingsSubNavBtnActive : ''}`}
                    onClick={() => setActiveSettingsSection('prompts')}
                  >
                    <Terminal size={14} /> AI Prompt Templates
                  </button>
                </div>

                {/* Brand Profile Section */}
                {activeSettingsSection === 'profile' && (
                  <div className={`glass-panel ${styles.settingsCard}`} style={{ gridColumn: 'span 2' }}>
                    <h2><User size={20} /> Brand Profile & Direction</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                      <div className={styles.formGroup}>
                        <label>Shop / Brand Name</label>
                        <input 
                          type="text" 
                          className="glass-input" 
                          value={settings.brand_name}
                          onChange={(e) => setSettings(prev => ({ ...prev, brand_name: e.target.value }))}
                          placeholder="e.g. Cozy Hub"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Brand Tagline</label>
                        <input 
                          type="text" 
                          className="glass-input" 
                          value={settings.brand_tagline}
                          onChange={(e) => setSettings(prev => ({ ...prev, brand_tagline: e.target.value }))}
                          placeholder="e.g. Hand-picked items to make your space feel like home"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '16px' }}>
                      <div className={styles.formGroup}>
                        <label>Target Audience</label>
                        <textarea 
                          className="glass-input" 
                          style={{ minHeight: '60px', resize: 'vertical' }}
                          value={settings.target_audience}
                          onChange={(e) => setSettings(prev => ({ ...prev, target_audience: e.target.value }))}
                          placeholder="Describe your ideal customers (e.g. design-conscious students, remote workers)"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Store Aesthetic Style</label>
                        <input 
                          type="text" 
                          className="glass-input" 
                          value={settings.store_aesthetic}
                          onChange={(e) => setSettings(prev => ({ ...prev, store_aesthetic: e.target.value }))}
                          placeholder="e.g. Cozy warm minimalist, Japandi, Dark Academia"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '16px' }}>
                      <div className={styles.formGroup}>
                        <label>Brand Voice & Tone</label>
                        <input 
                          type="text" 
                          className="glass-input" 
                          value={settings.brand_voice}
                          onChange={(e) => setSettings(prev => ({ ...prev, brand_voice: e.target.value }))}
                          placeholder="e.g. Warm, welcoming, inspiring, descriptive"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Color Theme Concepts / Ideas</label>
                        <input 
                          type="text" 
                          className="glass-input" 
                          value={settings.brand_color_ideas}
                          onChange={(e) => setSettings(prev => ({ ...prev, brand_color_ideas: e.target.value }))}
                          placeholder="e.g. terracotta, earth tones, soft amber, dark charcoal"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '16px' }}>
                      <div className={styles.formGroup}>
                        <label>Curation Focus / Product Categories</label>
                        <input 
                          type="text" 
                          className="glass-input" 
                          value={settings.content_focus}
                          onChange={(e) => setSettings(prev => ({ ...prev, content_focus: e.target.value }))}
                          placeholder="e.g. ambient lighting, minimalist desk setups, comfort blankets"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Instagram Auto-DM CTA Format</label>
                        <input 
                          type="text" 
                          className="glass-input" 
                          value={settings.instagram_cta_style}
                          onChange={(e) => setSettings(prev => ({ ...prev, instagram_cta_style: e.target.value }))}
                          placeholder="DM me '{TRIGGER}' or comment '{TRIGGER}' for the link!"
                        />
                        <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                          Use <code>{`{TRIGGER}`}</code> as a placeholder for the automated keyword.
                        </p>
                      </div>
                    </div>

                    <div className={styles.formGroup} style={{ marginTop: '16px' }}>
                      <label>Exclude Keywords (Comma separated)</label>
                      <input 
                        type="text" 
                        className="glass-input" 
                        value={settings.exclude_keywords}
                        onChange={(e) => setSettings(prev => ({ ...prev, exclude_keywords: e.target.value }))}
                        placeholder="e.g. cheap, bargain, deal, buy now"
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                      <button 
                        type="button" 
                        className="glass-button" 
                        style={{ background: 'var(--primary-color)', color: '#fff', border: 'none' }}
                        onClick={handleGenerateDirection}
                        disabled={isGeneratingDirection}
                      >
                        {isGeneratingDirection ? <><Loader2 className="spinner" size={16} /> Generating Brand Direction...</> : <><Sparkles size={16} /> Generate Store Theme & Visual Direction</>}
                      </button>
                    </div>

                    {generatedDirectionResult && (
                      <div className="glass-panel animated-fade-in" style={{ marginTop: '20px', padding: '20px', border: '1px solid var(--primary-color)' }}>
                        <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <Sparkles className="accent-text" size={18} /> Generated Brand Suggestions
                        </h3>
                        
                        <div style={{ marginBottom: '12px' }}>
                          <strong>Recommended Tagline:</strong>
                          <p style={{ fontStyle: 'italic', marginTop: '4px', fontSize: '13px' }}>"{generatedDirectionResult.brand_tagline}"</p>
                        </div>
                        
                        <div style={{ marginBottom: '12px' }}>
                          <strong>Store Direction & Positioning Manifesto:</strong>
                          <p style={{ marginTop: '4px', fontSize: '13px', lineHeight: '1.5' }}>{generatedDirectionResult.store_direction}</p>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <strong>Optimized Gemini Persona Directive:</strong>
                          <p style={{ marginTop: '4px', fontSize: '12px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px' }}>{generatedDirectionResult.niche_prompt_directive}</p>
                        </div>

                        {generatedDirectionResult.colors && (
                          <div style={{ marginBottom: '20px' }}>
                            <strong>Suggested Visual Color Scheme:</strong>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', alignItems: 'center' }}>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: generatedDirectionResult.colors.primary_color, border: '1px solid rgba(255,255,255,0.2)' }} title={`Accent: ${generatedDirectionResult.colors.primary_color}`} />
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: generatedDirectionResult.colors.secondary_color, border: '1px solid rgba(255,255,255,0.2)' }} title={`Card Base: ${generatedDirectionResult.colors.secondary_color}`} />
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: generatedDirectionResult.colors.background_color, border: '1px solid rgba(255,255,255,0.2)' }} title={`Background: ${generatedDirectionResult.colors.background_color}`} />
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: generatedDirectionResult.colors.text_color, border: '1px solid rgba(255,255,255,0.2)' }} title={`Text Main: ${generatedDirectionResult.colors.text_color}`} />
                              </div>
                              <button 
                                type="button" 
                                className="glass-button secondary" 
                                style={{ padding: '4px 10px', fontSize: '11px' }}
                                onClick={handleApplyGeneratedColors}
                              >
                                Apply Colors
                              </button>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button 
                            type="button" 
                            className="glass-button" 
                            style={{ padding: '8px 16px', fontSize: '12px' }}
                            onClick={handleApplyGeneratedDirection}
                          >
                            Apply Text & Guidelines
                          </button>
                          <button 
                            type="button" 
                            className="glass-button secondary" 
                            style={{ padding: '8px 16px', fontSize: '12px' }}
                            onClick={() => setGeneratedDirectionResult(null)}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}

                    <div className={styles.formGroup} style={{ marginTop: '24px' }}>
                      <label>Store Direction Narrative (Active)</label>
                      <textarea 
                        className="glass-input" 
                        style={{ minHeight: '80px', resize: 'vertical' }}
                        value={settings.store_direction}
                        onChange={(e) => setSettings(prev => ({ ...prev, store_direction: e.target.value }))}
                        placeholder="Manifesto narrative detailing the store theme..."
                      />
                    </div>

                    <div className={styles.formGroup} style={{ marginTop: '16px' }}>
                      <label>Gemini Copywriter Persona Directive (Niche Prompt Instructions - Active)</label>
                      <textarea 
                        className="glass-input" 
                        style={{ minHeight: '80px', resize: 'vertical' }}
                        value={settings.niche_prompt_directive}
                        onChange={(e) => setSettings(prev => ({ ...prev, niche_prompt_directive: e.target.value }))}
                        placeholder="Guideline rules passed to AI copywriting..."
                      />
                    </div>
                  </div>
                )}

                {/* Color Theme & Palette Section */}
                {activeSettingsSection === 'visuals' && (
                  <>
                    <div className={`glass-panel ${styles.settingsCard}`}>
                      <h2><Palette size={20} /> Color Theme Customization</h2>
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

                    <div className={`glass-panel ${styles.settingsCard}`}>
                      <h2>Visual Theme Live Preview</h2>
                      <div 
                        style={{ 
                          padding: '24px', 
                          borderRadius: '8px', 
                          background: settings.background_color, 
                          border: `1px solid ${settings.secondary_color}`,
                          minHeight: '180px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                        }}
                      >
                        <div>
                          <h4 style={{ color: settings.text_color, margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700 }}>Cozy Setup Preview</h4>
                          <p style={{ color: settings.text_color, opacity: 0.7, margin: 0, fontSize: '13px', lineHeight: '1.4' }}>
                            This preview card dynamically simulates how your storefront elements render using the active color selectors.
                          </p>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                          <button 
                            type="button" 
                            className="glass-button" 
                            style={{ 
                              background: settings.primary_color, 
                              color: '#fff', 
                              border: 'none', 
                              padding: '8px 16px', 
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'default'
                            }}
                          >
                            Accent Color
                          </button>
                          <button 
                            type="button" 
                            className="glass-button secondary" 
                            style={{ 
                              background: 'transparent', 
                              color: settings.text_color, 
                              border: `1px solid ${settings.secondary_color}`, 
                              padding: '8px 16px', 
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'default'
                            }}
                          >
                            Border Color
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Shop Configurations Section */}
                {activeSettingsSection === 'integrations' && (
                  <div className={`glass-panel ${styles.settingsCard}`} style={{ gridColumn: 'span 2' }}>
                    <h2><Sliders size={20} /> Shop Configurations & Integration Settings</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                      <div className={styles.formGroup}>
                        <label>Store Base URL (Domain)</label>
                        <input 
                          type="text" 
                          className="glass-input" 
                          value={settings.store_url}
                          onChange={(e) => setSettings(prev => ({ ...prev, store_url: e.target.value }))}
                          placeholder="e.g. https://cozyhub.up.railway.app"
                        />
                        <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                          Used as the base domain for affiliate redirects and scene links sent to auto-DMs.
                        </p>
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
                        <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                          Appended to catalog Amazon links automatically for affiliate tracking commissions.
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '16px' }}>
                      <div className={styles.formGroup}>
                        <label>Instagram Account Username</label>
                        <input 
                          type="text" 
                          className="glass-input" 
                          value={settings.bot_username || ''}
                          onChange={(e) => setSettings(prev => ({ ...prev, bot_username: e.target.value }))}
                          placeholder="e.g. _cozy_hub"
                        />
                        <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                          Used to identify and ignore webhooks generated by the bot's own public comments.
                        </p>
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
                        <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                          The board ID where automated pins will be published via Zernio.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Prompt Templates Section */}
                {activeSettingsSection === 'prompts' && (
                  <div className={`glass-panel ${styles.settingsCard}`} style={{ gridColumn: 'span 2' }}>
                    <h2><Terminal size={20} /> AI Prompt Templates Customizer</h2>
                    <p className="text-muted" style={{ fontSize: '13px', marginBottom: '24px' }}>
                      Fully customize the system instructions and rules that Gemini uses across different tasks. 
                      Use dynamic placeholders inside curly braces (e.g. <code>{`{brand_name}`}</code>) which will be filled in automatically.
                    </p>

                    {/* Curator prompt */}
                    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong style={{ fontSize: '14px' }}>1. AI Curator Scraper Prompt (Parsing Amazon Pages)</strong>
                        <button type="button" className="glass-button secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => handleResetPrompt('prompt_curator')}>Reset to Default</button>
                      </div>
                      <textarea 
                        className="glass-input" 
                        style={{ minHeight: '120px', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical' }}
                        value={settings.prompt_curator}
                        onChange={(e) => setSettings(prev => ({ ...prev, prompt_curator: e.target.value }))}
                      />
                      <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                        Inputs analyzed: Amazon HTML/Plain Text source. Output must return structured JSON format containing titles, description features, pros, cons, ratings.
                      </p>
                    </div>

                    {/* Copywriter prompt */}
                    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong style={{ fontSize: '14px' }}>2. Product Copywriter Persona Prompt (Descriptions & Captions)</strong>
                        <button type="button" className="glass-button secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => handleResetPrompt('prompt_copywriter')}>Reset to Default</button>
                      </div>
                      <textarea 
                        className="glass-input" 
                        style={{ minHeight: '140px', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical' }}
                        value={settings.prompt_copywriter}
                        onChange={(e) => setSettings(prev => ({ ...prev, prompt_copywriter: e.target.value }))}
                      />
                      <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                        Available placeholders: <code>{`{brand_name}`}</code>, <code>{`{niche_prompt_directive}`}</code>. Output must return custom titles, website descriptions, IG captions, Pinterest pins.
                      </p>
                    </div>

                    {/* Collection copy prompt */}
                    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong style={{ fontSize: '14px' }}>3. Scene Collection Copywriter Prompt (Social Captions)</strong>
                        <button type="button" className="glass-button secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => handleResetPrompt('prompt_collection_copy')}>Reset to Default</button>
                      </div>
                      <textarea 
                        className="glass-input" 
                        style={{ minHeight: '120px', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical' }}
                        value={settings.prompt_collection_copy}
                        onChange={(e) => setSettings(prev => ({ ...prev, prompt_collection_copy: e.target.value }))}
                      />
                      <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                        Available placeholders: <code>{`{brand_name}`}</code>, <code>{`{niche_prompt_directive}`}</code>, <code>{`{title}`}</code>, <code>{`{description}`}</code>, <code>{`{productsList}`}</code>, <code>{`{triggerWord}`}</code>.
                      </p>
                    </div>

                    {/* Collections suggest prompt */}
                    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong style={{ fontSize: '14px' }}>4. Scene Collection Suggestion Prompt (Gemini Bundles)</strong>
                        <button type="button" className="glass-button secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => handleResetPrompt('prompt_suggest')}>Reset to Default</button>
                      </div>
                      <textarea 
                        className="glass-input" 
                        style={{ minHeight: '120px', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical' }}
                        value={settings.prompt_suggest}
                        onChange={(e) => setSettings(prev => ({ ...prev, prompt_suggest: e.target.value }))}
                      />
                      <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                        Available placeholders: <code>{`{brand_name}`}</code>, <code>{`{niche_prompt_directive}`}</code>, <code>{`{productsSummary}`}</code>.
                      </p>
                    </div>

                    {/* Influencer prompt */}
                    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong style={{ fontSize: '14px' }}>5. Influencer Video Planner Prompt (Video Scripts & Hooks)</strong>
                        <button type="button" className="glass-button secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => handleResetPrompt('prompt_influencer')}>Reset to Default</button>
                      </div>
                      <textarea 
                        className="glass-input" 
                        style={{ minHeight: '120px', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical' }}
                        value={settings.prompt_influencer}
                        onChange={(e) => setSettings(prev => ({ ...prev, prompt_influencer: e.target.value }))}
                      />
                      <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                        Available placeholders: <code>{`{brand_name}`}</code>, <code>{`{niche_prompt_directive}`}</code>. Generates hooks, trigger suggestions, and scene details.
                      </p>
                    </div>

                    {/* Scene prompt */}
                    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong style={{ fontSize: '14px' }}>6. Scene Mockup Image Prompt Generator (Collection Art Prompt)</strong>
                        <button type="button" className="glass-button secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => handleResetPrompt('prompt_scene_prompt')}>Reset to Default</button>
                      </div>
                      <textarea 
                        className="glass-input" 
                        style={{ minHeight: '140px', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical' }}
                        value={settings.prompt_scene_prompt}
                        onChange={(e) => setSettings(prev => ({ ...prev, prompt_scene_prompt: e.target.value }))}
                      />
                      <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                        Available placeholders: <code>{`{brand_name}`}</code>, <code>{`{niche_prompt_directive}`}</code>, <code>{`{productsListStr}`}</code>.
                      </p>
                    </div>

                    {/* Mockup prompt */}
                    <div style={{ paddingBottom: '10px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong style={{ fontSize: '14px' }}>7. Product Mockup Image Prompt Generator (Single Product Art Prompt)</strong>
                        <button type="button" className="glass-button secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => handleResetPrompt('prompt_mockup_prompt')}>Reset to Default</button>
                      </div>
                      <textarea 
                        className="glass-input" 
                        style={{ minHeight: '140px', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical' }}
                        value={settings.prompt_mockup_prompt}
                        onChange={(e) => setSettings(prev => ({ ...prev, prompt_mockup_prompt: e.target.value }))}
                      />
                      <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                        Available placeholders: <code>{`{brand_name}`}</code>, <code>{`{niche_prompt_directive}`}</code>, <code>{`{category}`}</code>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Universal save button for settings */}
                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="submit" className="glass-button" disabled={loading.save}>
                    <Save size={16} /> Save Configurations
                  </button>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <h3 style={{ fontSize: '18px', margin: 0 }}>Collection Configurations</h3>
                    <button
                      type="button"
                      className="glass-button secondary"
                      style={{ fontSize: '11px', padding: '6px 12px' }}
                      onClick={handleSuggestCollection}
                      disabled={isSuggestingCollection}
                    >
                      {isSuggestingCollection ? <Loader2 className="spinner" size={12} /> : <><Sparkles size={12} /> AI Suggest Bundle</>}
                    </button>
                  </div>
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
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', borderRadius: '4px', background: isChecked ? 'rgba(255,255,255,0.02)' : 'transparent', marginBottom: '4px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1, overflow: 'hidden' }}>
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
                              {p.mainImage && <img src={p.mainImage} alt="" style={{ width: '30px', height: '30px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />}
                              <span style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-color)' }}>{p.title}</span>
                              <span style={{ fontSize: '9px', opacity: 0.6, background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '10px', marginLeft: '6px', flexShrink: 0 }}>
                                {p.category}
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setActiveInspectionProduct(p);
                                setIsInspectionModalOpen(true);
                              }}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                              title="Inspect Product"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
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
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', opacity: 0.8 }}>Triggers:</span>
                            <input 
                              type="text" 
                              defaultValue={post.triggerWords || 'link,store,recommendations'}
                              className="glass-input"
                              placeholder="Triggers (comma-separated)"
                              style={{ flex: 1, padding: '6px 12px', fontSize: '13px' }}
                              id={`trig-input-${post.id}`}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
                            <button 
                              className="glass-button secondary" 
                              style={{ 
                                padding: '6px 12px', 
                                fontSize: '12px', 
                                color: '#ef4444', 
                                borderColor: 'rgba(239, 68, 68, 0.3)',
                                background: 'rgba(239, 68, 68, 0.05)'
                              }}
                              onClick={() => handleRemoveSocialPost(post.id)}
                            >
                              Remove Post
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

      {/* Product Inspection Modal */}
      {isInspectionModalOpen && activeInspectionProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }} onClick={() => setIsInspectionModalOpen(false)}>
          <div style={{
            background: 'rgba(20, 25, 35, 0.85)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary-color)', letterSpacing: '0.05em' }}>
                  {activeInspectionProduct.category}
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>{activeInspectionProduct.title}</h2>
              </div>
              <button 
                onClick={() => setIsInspectionModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-color)', fontSize: '24px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
                {activeInspectionProduct.mainImage ? (
                  <img src={activeInspectionProduct.mainImage} alt={activeInspectionProduct.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
                ) : (
                  <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon size={32} className="text-muted" />
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Rating</label>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>
                    {activeInspectionProduct.stars ? `★ ${activeInspectionProduct.stars} / 5` : 'No rating'}
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                      ({activeInspectionProduct.reviewsCount || '0'} reviews)
                    </span>
                  </span>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Affiliate Link</label>
                  <a href={activeInspectionProduct.affiliateUrl} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: 'var(--primary-color)', wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    View affiliate link <ExternalLink size={12} />
                  </a>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Original Product Link</label>
                  <a href={activeInspectionProduct.originalUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--text-muted)', wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    View original page <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Review Description</label>
              <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'rgba(255,255,255,0.9)' }}>{activeInspectionProduct.customDescription || 'No description provided.'}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Pros</label>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(() => {
                    try {
                      const pros = typeof activeInspectionProduct.pros === 'string' ? JSON.parse(activeInspectionProduct.pros) : activeInspectionProduct.pros;
                      return Array.isArray(pros) && pros.length > 0 ? pros.map((pro: string, i: number) => <li key={i}>{pro}</li>) : <li>None specified</li>;
                    } catch (_) {
                      return <li>None specified</li>;
                    }
                  })()}
                </ul>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Cons</label>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(() => {
                    try {
                      const cons = typeof activeInspectionProduct.cons === 'string' ? JSON.parse(activeInspectionProduct.cons) : activeInspectionProduct.cons;
                      return Array.isArray(cons) && cons.length > 0 ? cons.map((con: string, i: number) => <li key={i}>{con}</li>) : <li>None specified</li>;
                    } catch (_) {
                      return <li>None specified</li>;
                    }
                  })()}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
