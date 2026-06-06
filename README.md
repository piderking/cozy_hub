# Cozy Hub 🏠✨

Cozy Hub is a premium, aesthetic curation dashboard for home decor, bedroom layouts, study setups, and lifestyle product reviews. It integrates Google Gemini AI for copywriting curation, Imagen for visual mockup generation, and publishes directly to social media platforms (Instagram, Pinterest, X/Twitter).

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Local Settings
All API keys and credentials are now securely loaded from environment variables rather than being exposed in the admin dashboard. 

Create or open `.env.local` in the project root and configure your credentials:
```env
# Google AI Studio Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Zernio Integration Credentials
ZERNIO_API_KEY=your_zernio_api_key_here

# Local SQLite Database Path
DATABASE_URL="file:./dev.db"
```

*Note: For backwards compatibility, the application also accepts `UPLOADPOST_API_KEY` and `AYRSHARE_API_KEY` as fallbacks.*

### 3. Spin Up Local DB
```bash
npx prisma generate
npx prisma db push
```

### 4. Start the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
Open the Admin Panel at [http://localhost:3000/admin](http://localhost:3000/admin).

---

## 📸 Instagram Connection & Auto-Responder Setup

Instagram does not support clickable links inside post captions. Cozy Hub includes an automatic comment responder that replies to comments matching target keywords (e.g., "link", "store", "recommendations") with the direct product or collection page link.

### Step-by-Step Setup:

1. **Link Instagram Business Account to Zernio**:
   * Log into your **Zernio** dashboard.
   * Go to the **Accounts** or **Integrations** tab.
   * Click **Connect Instagram** (or connect your Facebook Page).
   * Follow the prompts to log into Facebook and select the **Instagram Business Account** connected to your page, granting all required permissions.

2. **Register the Webhook**:
   * Navigate to the **Webhooks** section in your Zernio dashboard.
   * Register a new webhook pointing to: `https://your-cozy-hub-domain.railway.app/api/webhooks/social-comment`.
   * Subscribe to the **`comment.received`** event.

---

## 📖 Feature Walkthrough Guide

Follow this walkthrough to explore and configure every feature inside the Cozy Hub Admin Dashboard:

### 1. Catalog Product Curation
* **How it works**: Go to the **Curator Panels** tab.
  1. Paste an Amazon product URL under **Panel 1: Ingest & Review**.
  2. Paste the raw HTML details or specification texts, then click **Parse Product Data**.
  3. Under **Panel 2: Creative AI Curation**, click **Generate prompt**. This prompts Gemini to write a detailed visual mockup description of the item. You can edit this prompt, then click **Generate AI Mockup** to run Google's Imagen model and create a gorgeous room mockup.
  4. Click **Generate Theme Copy & Socials** to prompt Gemini to write a custom title, search-engine-optimized description, and captions for Instagram (complete with auto-responder comment prompts) and Pinterest.
  5. Under **Panel 3: Social Hub & Publish**, review the copy, download the cover image for manual posting, or click **Publish to Platform** to auto-post. Click **Save Listing** to publish it to your website.

### 2. AI Scene Collections (Product Bundling)
* **How it works**: Go to the **AI Collections** tab.
  1. Click **Create Collection** at the top right.
  2. Input a collection Title (e.g., "Minimalist Amber Study Setup") and Description.
  3. Select multiple products from the checkbox grid representing products you want to feature together in a single scene.
  4. Click **Generate Scene Prompt**. Gemini analyzes all selected products and writes a visual prompt describing them combined in a single cohesive space.
  5. Click **Generate AI Image** to call Imagen. It generates a single room scene containing the items.
  6. Click **Generate Social Copy** to create captions. The Instagram caption automatically incorporates a call-to-action to comment a trigger word.
  7. Click **Save Collection** to save the collection and make its public page active (e.g., `/collections/minimalist-amber-study-setup`). This collection page displays the AI scene image and lists all grouped products with uncloaked affiliate buttons.

### 3. Influencer Reels & Video Planner
* **How it works**: Go to the **Influencer Panel** tab.
  1. Select the products you want to feature in a video from the list on the left.
  2. Click **Generate Video Outline**.
  3. Gemini writes a structured short-form video concept package:
     * **Theme Title** (e.g., "3 Dorm Room Upgrades You Need ☁️").
     * **Hook Options**: 3 visual and voiceover hooks to maximize viewer retention.
     * **Scene-by-Scene Script**: Visual directives (what to film) paired with voiceover script (what to say) and text overlays.
     * **Caption Draft**: Instantly copyable social post text with the `#ad` affiliate disclosure and comment trigger CTA.
     * **Aesthetic Styling Tips**: Recommendations for lofi audio tracks, warm lighting styles, and video transitions.

### 4. Auto-Responder Triggers & Simulation
* **How it works**: Go to the **Auto-Responder Logs** tab.
  1. **Post Trigger Settings**: Lists all published social posts. For each post, you can review its caption, see its linked product/collection, and customize its trigger keywords (comma-separated, e.g., `link,setup,dorm`). Click **Update Triggers** to save.
  2. **Webhook Simulator**: Test trigger words without waiting for real comments.
     * Select a post from the dropdown list.
     * Enter a test username (e.g., `cozy_critic`).
     * Enter comment text (e.g., `"need the setup link!"` which contains the trigger word `"link"`).
     * Click **Run Mock Webhook Test**. The webhook matches the trigger, builds the reply, logs it, and simulates sending it.
  3. **Interaction Logs History**: Audits all responses. Review the timestamp, username, comment, matched trigger word, and status (e.g. `SENT (SIMULATED)` or `SENT` for real comments). You can delete specific logs or clear all history.

---

## ☁️ Deploying on Railway

Cozy Hub is fully compatible with hosting on **[Railway](https://railway.com/)**! Because it utilizes SQLite, you must attach a persistent volume to preserve curated listings and configurations when the container restarts.

### Step-by-Step Railway Guide:

1. **Upload Code to GitHub**: Create a repository and push your project files.
2. **Deploy on Railway**: 
   * Go to your Railway Dashboard.
   * Click **New Project** -> **Deploy from GitHub repo** and select your Cozy Hub repository.
3. **Configure Environment Variables**:
   Under the **Variables** tab for the service, add:
   * `DATABASE_URL`: `file:/app/data/dev.db` *(Required)*
   * `GEMINI_API_KEY`: *(Required for AI Generation)*
   * `ZERNIO_API_KEY`: *(Required for social posting & comment responder)*
   * `PORT`: `3000`
4. **Mount a Persistent Volume**:
   * Navigate to your Cozy Hub service in the Railway Dashboard.
   * Go to the **Volumes** tab.
   * Click **Add Volume**.
   * Set the **Mount Path** strictly to `/app/data` (matches your `/app/data/dev.db` database path).

Railway will build, run migrations, and spin up Cozy Hub automatically! Your SQLite database is fully preserved on redeploys.
