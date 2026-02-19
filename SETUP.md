# Setup Guide for AniList Tracker

## Prerequisites

Before you can use the extension, you need to register it with AniList to get OAuth credentials.

## Step 1: Register Your Application on AniList

1. Go to [AniList Developer Settings](https://anilist.co/settings/developer)
2. Click "Create New Client"
3. Fill in the details:
   - **Name**: AniList Tracker (or any name you prefer)
   - **Redirect URI**: Get this from the extension (see Step 2)

## Step 2: Get Your Extension's Redirect URI

1. Load your extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `frontend` folder

2. Open the browser console (F12) and run:
   ```javascript
   chrome.identity.getRedirectURL()
   ```

3. Copy the URL that appears (it will look like: `https://<extension-id>.chromiumapp.org/`)

4. Go back to AniList Developer Settings and paste this URL as the **Redirect URI**

5. Click "Save"

## Step 3: Configure the Extension

1. Copy your **Client ID** from AniList (it's shown after you create the client)

2. Open `frontend/config.js` in your code editor

3. Replace `YOUR_CLIENT_ID_HERE` with your actual Client ID:
   ```javascript
   ANILIST_CLIENT_ID: '12345', // Your actual Client ID
   ```

4. Save the file

5. Reload the extension:
   - Go to `chrome://extensions/`
   - Click the reload icon on your extension

## Step 4: Update anilist.js to Use Config

1. Open `frontend/services/anilist.js`

2. Update the CLIENT_ID line to use the config:
   ```javascript
   CLIENT_ID: CONFIG.ANILIST_CLIENT_ID,
   ```

3. Make sure config.js is loaded in your HTML files before anilist.js

## Step 5: Test Authentication

1. Click on the extension icon in your browser
2. Click "Connect to AniList"
3. You should be redirected to AniList to authorize the app
4. After authorization, you should be logged in

## Troubleshooting

### "Invalid client_id" error
- Make sure you copied the Client ID correctly from AniList
- Check that there are no extra spaces or quotes

### "Invalid redirect_uri" error
- Make sure the Redirect URI in AniList matches exactly what `chrome.identity.getRedirectURL()` returns
- The extension ID changes if you reload the extension in unpacked mode - you may need to update the Redirect URI

### Extension doesn't load
- Check the browser console for errors
- Make sure all JavaScript files are present
- Try reloading the extension

## Development Notes

### Loading the Config
Make sure to include the config.js file in your popup.html:
```html
<script src="../config.js"></script>
<script src="../utils/storage.js"></script>
<script src="../services/anilist.js"></script>
<script src="popup.js"></script>
```

### For Production
When publishing the extension:
1. You'll need to register a permanent Client ID for the published version
2. The Redirect URI will be based on your published extension ID
3. Update config.js with the production Client ID

## Next Steps

Once authentication is working, you can:
1. Test searching for anime
2. Test updating progress
3. Implement content script detection on streaming sites
