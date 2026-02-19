# AniList Tracker - Quick Start Guide

## Prerequisites

- Node.js installed (v16 or higher)
- Chrome browser
- AniList developer account with Client ID and Client Secret

## Setup Steps

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Copy environment file
cp .env.example .env

# Edit .env and add your credentials (already done!)
# ANILIST_CLIENT_ID=35250
# ANILIST_CLIENT_SECRET=your_secret_here
# ANILIST_REDIRECT_URI=https://jakligfjhpffidlhcejohgojjndjmool.chromiumapp.org/

# Install dependencies
npm install

# Start the backend server
npm run dev
```

The backend should now be running on `http://localhost:3001`

### 2. Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `frontend` folder from this project
5. The extension should now be loaded

### 3. Test the Authentication Flow

1. Click the extension icon in Chrome toolbar
2. Click "Connect to AniList" button
3. A new tab will open with AniList OAuth page
4. Authorize the application
5. The tab will redirect and close automatically
6. The extension should now show your AniList profile

**Expected Flow:**
```
Extension → Opens OAuth tab
User → Authorizes on AniList
AniList → Redirects with code
Extension → Captures code, sends to backend
Backend → Exchanges code for token (using client_secret)
Backend → Returns token to extension
Extension → Fetches user data
Extension → Shows main view with user info
```

## Troubleshooting

### Backend won't start
- Check that port 3001 is not in use
- Verify all dependencies are installed (`npm install`)
- Check for syntax errors in console

### Extension won't load
- Make sure you're loading the `frontend` folder, not the root
- Check console for JavaScript errors
- Reload the extension after any changes

### Authentication fails
1. Check backend is running (`http://localhost:3001/health` should return OK)
2. Verify client_secret in backend `.env` matches AniList settings
3. Check browser console (F12) and background service worker console for errors
4. Ensure redirect URI in AniList settings is exactly: `https://jakligfjhpffidlhcejohgojjndjmool.chromiumapp.org/`

### Tab doesn't close after auth
- Check background service worker console for errors
- The tab should close automatically when redirect is detected
- If it doesn't close, there may be an error in token exchange

## Viewing Logs

### Backend Logs
Look at the terminal where you ran `npm run dev`

### Extension Logs
- **Popup:** Right-click extension icon → Inspect popup → Console tab
- **Background:** Go to `chrome://extensions/` → AniList Tracker → "Inspect views: service worker" → Console tab
- **Content Script:** Open streaming site, press F12 → Console tab

## Next Steps

Once authentication works:
1. Navigate to a streaming site (Crunchyroll, etc.)
2. Open the extension popup
3. It should detect the anime you're watching
4. Update your episode progress directly from the popup

## Current Status

✅ Backend OAuth token exchange
✅ Extension authentication flow
✅ User data retrieval
⏳ Anime detection on streaming sites (placeholder)
⏳ Progress update functionality (ready, needs testing)
