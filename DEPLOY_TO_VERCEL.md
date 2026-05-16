# Deploy Your Fishing App to Vercel - Step by Step

## Method 1: Direct from Figma (Easiest)

### Step 1: Export from Figma Make
1. In Figma, find your Make file
2. Look for **"Share"** or **"Publish"** button
3. Or check the menu (3 dots) for **"Export"** or **"Download code"**
4. Download as ZIP file
5. Save to your Downloads folder

### Step 2: Unzip the File
1. Find the ZIP in your Downloads
2. Right-click → Extract/Unzip
3. You'll get a folder with all your code

### Step 3: Sign Up for Vercel
1. Go to https://vercel.com
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"** (easiest)
4. Or use email if you prefer
5. Complete sign-up (it's free!)

### Step 4: Create New Project
1. Once logged in, click **"Add New..."**
2. Select **"Project"**
3. You'll see the import screen

### Step 5: Upload Your Code
1. Look for **"Import Git Repository"** section
2. Scroll down to find **"Deploy from .zip or drag and drop"**
3. **Drag your unzipped folder** onto the screen
4. Or click to browse and select the folder

### Step 6: Configure (Usually Auto-Detected)
Vercel should automatically detect:
- **Framework Preset:** Vite
- **Build Command:** `pnpm run build` or `npm run build`
- **Output Directory:** `dist`

If not auto-detected, set:
- Framework: **Vite**
- Build Command: `pnpm run build`
- Output Directory: `dist`

### Step 7: Deploy!
1. Click **"Deploy"** button
2. Wait 1-2 minutes while it builds
3. You'll see: "Congratulations! 🎉"
4. You get a URL like: `your-app-vercel.app`

### Step 8: Test Your PWA
1. **Open the Vercel URL** on your Chromebook
2. **Hard refresh:** Ctrl+Shift+R
3. **Browse the app** for 30 seconds
4. **Check the 3-dot menu** (⋮)
5. **"Install app"** should appear! ✅

---

## Method 2: Using GitHub (More Professional)

### Step 1: Push Code to GitHub
1. Export code from Figma Make
2. Create GitHub account (if you don't have one)
3. Create new repository
4. Upload your code files
5. Commit

### Step 2: Connect Vercel to GitHub
1. Go to https://vercel.com
2. Sign up with GitHub
3. Click **"Add New..." → "Project"**
4. Select your repository
5. Click **"Import"**

### Step 3: Deploy
1. Vercel auto-detects settings
2. Click **"Deploy"**
3. Done!

**Bonus:** Every time you update code on GitHub, Vercel auto-deploys! 🚀

---

## Method 3: Vercel CLI (For Developers)

If you have the code locally:

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to your project folder
cd your-fishing-app

# Deploy
vercel

# Follow the prompts
# Choose default options
# Get instant deployment!
```

---

## After Deployment

### Your App is Live! 🎉

You'll get a URL like:
- `https://fishing-app-abc123.vercel.app`
- Or customize: `https://ocean-city-fishing.vercel.app`

### Test PWA Installation:

1. **Open URL on Chromebook**
2. **Check Settings → PWA Status**
   - All should be GREEN ✅
3. **Browse for 30 seconds**
4. **3-dot menu → "Install app"**
5. **Works!** 🎣

---

## Troubleshooting Deployment

### Build Fails?

**Error:** "Command failed: pnpm run build"

**Fix:** Add environment variables or check package.json

Check the build logs in Vercel dashboard for specific errors.

### Site Shows Blank Page?

**Fix:** Check these settings:
- Output Directory: `dist` (not `build`)
- Build Command: `pnpm run build`
- Framework: Vite

### PWA Still Doesn't Install?

After deploying, try:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+Shift+R)
3. Close all tabs with the app
4. Reopen
5. Wait 30 seconds
6. Check menu again

---

## Figma Make Export Tips

### If You Can't Find Export Option:

**Option A: Use Figma's Dev Mode**
1. Open your Make file
2. Switch to **Dev Mode** (top right)
3. Look for code export options

**Option B: Manual Copy**
1. You can manually copy files
2. Create folder structure locally
3. Copy all your code files
4. Create `package.json` with dependencies
5. Deploy that folder

**Option C: Ask in Figma Community**
- Figma Make is new
- Export process may vary
- Check Figma docs or forum

---

## Package.json for Manual Setup

If you need to create package.json manually:

```json
{
  "name": "offshore-fishing-app",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.487.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.7.0",
    "vite": "^6.3.5",
    "vite-plugin-pwa": "^0.20.5",
    "workbox-window": "^7.4.1"
  }
}
```

---

## Free Vercel Plan Includes:

✅ Unlimited deployments
✅ HTTPS automatic
✅ CDN (fast worldwide)
✅ Auto-scaling
✅ Custom domains
✅ Preview deployments
✅ Analytics

Perfect for your fishing app!

---

## Alternative Free Hosting

If Vercel doesn't work:

### Netlify:
1. Go to https://netlify.com
2. Drag & drop your folder
3. Instant deploy
4. Done!

### Cloudflare Pages:
1. https://pages.cloudflare.com
2. Upload or connect GitHub
3. Deploy
4. Free & fast

### GitHub Pages:
1. Push to GitHub
2. Settings → Pages
3. Enable
4. Free hosting

All work great for PWAs!

---

## Expected Timeline

- Export from Figma: **2 minutes**
- Sign up for Vercel: **2 minutes**
- Upload & deploy: **2 minutes**
- **Total: ~5-10 minutes**

Then your PWA is live and installable! 🚀

---

## Need Help?

If you get stuck:
1. Screenshot the error
2. Check Vercel build logs
3. Ask me for help with specific error messages

Let me know when you've exported the code and I'll help with next steps!
