# Cozy Hub 🏠✨

Cozy Hub is a premium, aesthetic curation dashboard for home decor, bedroom layouts, study setups, and lifestyle product reviews. It integrates Google Gemini AI for copywriting curation, Imagen for visual mockup generation, and publishes directly to social media platforms (Instagram, Pinterest, X/Twitter).

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Local Settings
Create or open `.env.local` and configure your API keys:
```env
# Google AI Studio Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Upload-Post API Key & Config
UPLOADPOST_API_KEY=your_uploadpost_api_key_here

# Local SQLite Database Path
DATABASE_URL="file:./dev.db"
```

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

## ☁️ Deploying on Railway

Cozy Hub is fully compatible with one-click hosting on **[Railway](https://railway.com/)**! Because it utilizes SQLite, you must attach a persistent volume to preserve curated listings and configurations when the container restarts.

### Step-by-Step Railway Guide:

1. **Upload Code to GitHub**: Create a repository and push your project files (including `railway.json`).
2. **Deploy on Railway**: 
   * Go to your Railway Dashboard.
   * Click **New Project** -> **Deploy from GitHub repo** and select your Cozy Hub repository.
3. **Configure Environment Variables**:
   Under the **Variables** tab for the service, add:
   * `DATABASE_URL`: `file:/app/data/dev.db` *(Required)*
   * `GEMINI_API_KEY`: *(Optional, can also be configured via settings panel)*
   * `UPLOADPOST_API_KEY`: *(Optional, can also be configured via settings panel)*
   * `PORT`: `3000`
4. **Mount a Persistent Volume**:
   * Navigate to your Cozy Hub service in the Railway Dashboard.
   * Go to the **Volumes** tab.
   * Click **Add Volume**.
   * Set the **Mount Path** strictly to `/app/data` (matches your `/app/data/dev.db` database path).

Railway will build, run migrations, and spin up Cozy Hub automatically! Your SQLite database is fully preserved on redeploys.
