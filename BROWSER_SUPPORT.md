# Browser Support

AniList Tracker is designed to work across multiple browsers with minimal configuration.

## ✅ Supported Browsers

### Chromium-Based Browsers (Full Support)
Works out of the box without any modifications:

- **Google Chrome** ✓
- **Microsoft Edge** ✓
- **Brave** ✓
- **Opera** ✓
- **Vivaldi** ✓
- **Arc** ✓

**Installation:** Load unpacked extension from Chrome Extensions page (`chrome://extensions`)

---

### Firefox (Full Support)
Fully compatible with Firefox using our browser polyfill and a Firefox-specific manifest.

**Installation:**
1. Open Firefox
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to the extension folder and select **`manifest.firefox.json`** (not manifest.json)

**Note:** For permanent installation, you'll need to:
- Sign the extension with Mozilla
- Submit to Firefox Add-ons store, OR
- Use Firefox Developer Edition / Nightly with `xpinstall.signatures.required` set to `false`

**Minimum Firefox Version:** 109.0 (for Manifest V3 support)

---

### Safari (Not Supported)
Safari requires a different extension format and build process. Not currently supported.

---

## Technical Details

### Cross-Browser Compatibility

The extension uses multiple strategies to ensure compatibility across browsers:

**1. Browser Polyfill** (`polyfill.js`)
```javascript
// Automatically detects browser and provides unified API
if (typeof browser !== 'undefined') {
  window.chrome = browser; // Firefox → Chrome API
} else {
  window.browser = chrome; // Chrome → Browser API
}
```

**2. Browser-Specific Manifests**
Chrome MV3 and Firefox MV3 use different background script formats, so there are two manifest files:

- **`manifest.json`** — for Chrome/Chromium (uses `service_worker`)
- **`manifest.firefox.json`** — for Firefox (uses `scripts` array)

```json
// manifest.json (Chrome)
"background": { "service_worker": "background/background.js" }

// manifest.firefox.json (Firefox)
"background": { "scripts": ["polyfill.js", "config.js", "utils/storage.js", "services/anilist-pkce.js", "background/background.js"] }
```

The background script detects its context so the same file works for both:
```javascript
if (typeof importScripts === 'function') {
  // Service worker (Chrome) - import dependencies
  importScripts('../polyfill.js');
  // ... etc
}
// Firefox background page - dependencies already loaded via manifest scripts array
```

### What Makes It Cross-Browser

1. **Browser Polyfill** (`polyfill.js`)
   - Loaded first in all contexts
   - Provides `chrome.*` API in Firefox
   - Provides `browser.*` API in Chrome

2. **Manifest V3**
   - Modern extension standard
   - Supported by all major browsers
   - Firefox-specific settings in `browser_specific_settings`

3. **Standard Web APIs**
   - ES6 modules
   - Fetch API
   - Chrome Storage API (compatible with Firefox)
   - Chrome Runtime API (compatible with Firefox)

### Testing Across Browsers

To ensure compatibility:

1. **Chrome/Edge/Brave:**
   ```bash
   # Load extension via chrome://extensions
   # Enable Developer Mode
   # Click "Load Unpacked" → Select frontend folder
   ```

2. **Firefox:**
   ```bash
   # Load via about:debugging
   # Click "Load Temporary Add-on"
   # Select manifest.json from frontend folder
   ```

3. **Test Checklist:**
   - [ ] Extension loads without errors
   - [ ] Authentication flow works
   - [ ] Search functionality works
   - [ ] List views load correctly
   - [ ] Progress updates work
   - [ ] Filters work properly

---

## Known Limitations

### Firefox
- Temporary extensions are removed when Firefox closes
- Requires Mozilla signing for permanent installation
- OAuth identity API may behave slightly differently

### All Browsers
- Backend server must be running (`http://localhost:3001`)
- Or backend must be deployed to public URL

---

## Distribution

### Chrome Web Store
1. Create ZIP of `frontend` folder
2. Upload to Chrome Web Store Developer Dashboard
3. Works for Chrome, Edge, Brave, Opera

### Firefox Add-ons
1. Sign extension with Mozilla
2. Submit to addons.mozilla.org
3. Or use AMO for review

### Self-Hosted
Users can install unpacked/temporary extension from GitHub releases:
1. Download latest release
2. Extract ZIP
3. Load unpacked in respective browser

---

## Future Support

### Planned
- None currently (Chrome + Firefox covers 95%+ of users)

### Not Planned
- Safari (requires significant refactoring)
- Internet Explorer (outdated, not supported)

---

## Development

When developing, test in both Chrome and Firefox to ensure compatibility:

```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend SCSS compilation
cd frontend
npm run watch:scss

# Load extension in both browsers for testing
```

---

## Troubleshooting

### Firefox: "Extension is not signed"
- Use `about:config` → set `xpinstall.signatures.required` to `false` (Developer/Nightly only)
- Or submit to AMO for signing

### Chrome: "Manifest version 3 is required"
- Update Chrome to latest version
- Extension requires Chrome 88+

### All Browsers: "Failed to connect to backend"
- Ensure backend server is running on `http://localhost:3001`
- Check `config.js` for correct `BACKEND_URL`

---

## Contributing

When adding new features, ensure cross-browser compatibility:

1. **Use Standard APIs:** Stick to web standards when possible
2. **Test Both Browsers:** Chrome AND Firefox
3. **Check Polyfill:** Ensure `polyfill.js` covers new APIs
4. **Update Docs:** Document any browser-specific behaviors

---

Made with ❤️ for the anime community
