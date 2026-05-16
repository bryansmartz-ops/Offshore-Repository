# Fixed: Vite Not Copying _redirects to dist

## The Error

```
A "_redirects" file is present in the repository but is missing 
in the publish directory "dist"
```

**What this means:**
- Netlify found `_redirects` in your code ✅
- But after Vite built the project, `_redirects` wasn't in the `dist` folder ❌
- Netlify needs it in `dist` to actually use it

## The Fix

I just updated `vite.config.ts` to explicitly:
- ✅ Set `publicDir: 'public'`
- ✅ Set `copyPublicDir: true` in build config
- ✅ Ensure files from `/public` get copied to `/dist`

**This tells Vite:** "Copy everything from /public to /dist during build"

---

## What You Need to Do

### Export and Redeploy with Updated Config

**Since you're using Figma Make, you need to:**

1. **Export the code from Figma Make again**
   - This export will include the updated `vite.config.ts`
   - Plus the `_redirects` files in the right places

2. **Upload to Netlify**
   - Drag the new export to Netlify
   - Or trigger a new deploy with the updated code

3. **Watch the build log**
   - Should NOT show the "_redirects" error anymore
   - Build should succeed

4. **Test**
   - https://leafy-speculoos-0b0975.netlify.app/manifest.json
   - Should show JSON! ✅

---

## Files That Need to Be in Your Export

Make sure your export includes:

```
/
├── vite.config.ts          ← Updated with copyPublicDir
├── netlify.toml            ← Deploy config
├── _redirects              ← Root level (backup)
├── public/
│   ├── _redirects          ← Gets copied to dist/
│   ├── manifest.json       ← Gets copied to dist/
│   ├── pwa-192x192.png     ← Gets copied to dist/
│   └── pwa-512x512.png     ← Gets copied to dist/
└── package.json
```

---

## After Redeploying

### Build Log Should Show:

```
✔ Building for production...
✔ Copying public directory...
✔ dist/_redirects created
✔ Build complete
```

### Then Test:

1. **Manifest:** https://leafy-speculoos-0b0975.netlify.app/manifest.json
   - Should show JSON ✅

2. **Icon:** https://leafy-speculoos-0b0975.netlify.app/pwa-192x192.png
   - Should show image ✅

3. **App:**
   - Open app
   - Settings → PWA Status
   - All GREEN ✅

---

## Alternative: Manual Fix in Netlify

**If you can't export/redeploy right now:**

You can add `_redirects` content directly in Netlify settings:

1. Go to: https://app.netlify.com/sites/leafy-speculoos-0b0975/settings/deploys#post-processing
2. Scroll to "Redirects and rewrites"
3. Add these rules:
   ```
   /manifest.json    /manifest.json    200
   /manifest.webmanifest    /manifest.webmanifest    200
   /*.png    /:splat    200
   /*.ico    /:splat    200
   /*    /index.html    200
   ```
4. Save
5. Trigger new deploy
6. Should work!

**But this is manual** - better to have it in the code.

---

## Why This Happened

**Default Vite behavior:**
- Should copy `/public` to `/dist` automatically
- But Figma Make's export might not have set it explicitly
- Some Vite configurations need it spelled out

**The fix:**
- Explicitly tell Vite: `copyPublicDir: true`
- Ensures `/public/_redirects` → `/dist/_redirects`
- Netlify finds it and uses it ✅

---

## Summary

**Problem:** Vite not copying public files to dist  
**Fix:** Updated vite.config.ts with explicit copy settings  
**Next:** Export from Figma Make and redeploy to Netlify  
**Result:** _redirects in dist folder, manifest serves correctly ✅

---

## Ready to Redeploy?

**Steps:**
1. Export from Figma Make (includes fix)
2. Upload to Netlify
3. Wait for build (should succeed now)
4. Test manifest URL
5. PWA works! 🎣

The fix is in your code - just needs to be deployed! 🚀
