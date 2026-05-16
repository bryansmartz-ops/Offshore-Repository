# How to Install on Android Chrome

If you're not seeing the install icon on Android Chrome, here's what to check and how to fix it:

## Why the Install Icon Might Not Show

### 1. **PWA Criteria Not Met Yet**
Chrome needs ALL of these to show the install prompt:
- ✅ HTTPS connection (secure)
- ✅ Valid manifest.json
- ⚠️ **Icons in correct sizes** (this is likely missing!)
- ✅ Registered service worker
- ⚠️ **Service worker must control the page** (needs a page reload)

### 2. **Icons Not Generated Yet**
The PNG icons haven't been created yet. We have the SVG but need actual PNG files.

---

## Quick Fix - Generate Icons Now

### Option 1: Use the Auto-Generator (Easiest)
1. Open this file in your browser:
   ```
   public/generate-icons.html
   ```
2. It will automatically download 3 icon files
3. Move those files to your `/public` folder
4. Reload your app

### Option 2: Use Online Tool (Best Quality)
1. Go to: https://realfavicongenerator.net/
2. Upload: `/public/pwa-icon.svg`
3. Click "Generate"
4. Download the package
5. Extract and copy these to `/public`:
   - `pwa-192x192.png`
   - `pwa-512x512.png`
   - `apple-touch-icon.png`

### Option 3: Manual Install Button
I've added an install button to the **Settings** tab:
1. Open the app
2. Go to **Settings**
3. Click "Install App" button at the top
4. Follow the instructions

---

## How to Install Manually on Android

Even without the automatic prompt, you can install manually:

### Method 1: Chrome Menu
1. Open the app in Chrome
2. Tap the **3-dot menu** (⋮) in top right
3. Look for **"Install app"** or **"Add to Home screen"**
4. Tap it
5. Confirm by tapping **"Install"**

### Method 2: Settings Button
1. In the app, go to **Settings** tab (bottom nav)
2. Tap the **"Install App"** card at the top
3. Follow the on-screen instructions

---

## Verification Steps

### Check if PWA is Ready:
1. Open Chrome DevTools on desktop
2. Go to **Application** tab
3. Check **Manifest** section - should show all details
4. Check **Service Workers** - should show "activated and running"
5. Check **Icons** - should show all 3 sizes

### Force the Install Prompt:
Sometimes you need to:
1. **Close all tabs** with the app
2. **Clear site data**: Settings → Site Settings → (Your site) → Clear & Reset
3. **Reopen** the app
4. **Wait 30 seconds** - prompt should appear

---

## Testing Checklist

- [ ] App is served over HTTPS (required)
- [ ] Icons exist in `/public` folder:
  - [ ] pwa-192x192.png
  - [ ] pwa-512x512.png
  - [ ] apple-touch-icon.png
- [ ] manifest.json is valid
- [ ] Service worker is registered
- [ ] Visited site at least twice (Chrome requirement)
- [ ] Waited at least 5 minutes between visits (Chrome requirement)

---

## Common Issues

### "Install app" option not in Chrome menu
**Causes:**
- Icons missing or wrong size
- Not served over HTTPS
- Service worker not activated
- Didn't meet engagement criteria

**Solution:**
1. Generate icons using Method above
2. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R)
3. Close and reopen Chrome
4. Try again in 5 minutes

### Install button works but automatic prompt doesn't
**This is normal!** Chrome is very picky about when to show the automatic prompt:
- User must visit site 2+ times
- With at least 5 minutes between visits
- User must "engage" with the site (scroll, click, etc.)
- Chrome randomly decides when to show it

**Solution:** Use the manual install button in Settings instead!

---

## After Installation

Once installed, you'll get:
- ✅ App icon on home screen
- ✅ Launches in fullscreen (no browser UI)
- ✅ Works offline
- ✅ Fast loading from cache
- ✅ Splash screen on launch
- ✅ Access to GPS, camera, etc.

---

## Still Not Working?

1. **Generate the icons first** - this is probably the issue
2. Check console for errors (Chrome DevTools → Console)
3. Verify manifest loads: Open `https://your-app-url/manifest.json`
4. Use Lighthouse audit: DevTools → Lighthouse → "Progressive Web App"
5. Use manual install button in Settings tab

The most likely issue is missing PNG icons. Generate them using one of the methods above!
