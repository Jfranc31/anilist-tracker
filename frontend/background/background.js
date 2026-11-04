// Background script for AniList Tracker extension
// Supports both Chrome service worker and Firefox background page

// Check if running as service worker (Chrome) or background page (Firefox)
if (typeof importScripts === 'function') {
  // Service worker context (Chrome) - need to import dependencies
  importScripts('../polyfill.js');
  importScripts('../config.js');
  importScripts('../utils/storage.js');
  importScripts('../services/anilist-pkce.js');
}
// Otherwise running as background page (Firefox) - dependencies already loaded via manifest

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    initializeExtension();
  }
});

// Initialize extension on first install
async function initializeExtension() {
  try {
    await chrome.storage.local.set({
      isAuthenticated: false,
      user: null
    });
  } catch (error) {
    console.error('Error initializing extension:', error);
  }
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'AUTHENTICATE':
      handleAuthentication()
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true; // Keep channel open for async response

    case 'INCREMENT_CHAPTER':
      handleIncrementChapter(message.data)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;

    default:
      console.warn('Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
  }
});

// Authentication handler - runs OAuth flow in background
async function handleAuthentication() {
  try {
    const { token, user } = await AniListAPI.authenticate();

    // Save to storage
    await Storage.saveAuthData(token, user);

    return { success: true, user };
  } catch (error) {
    console.error('Authentication failed:', error);
    return { success: false, error: error.message };
  }
}

// +1 chapter from the widget. Reads the current progress from AniList and saves
// current + 1, so a widget showing an old number can never roll progress back.
async function handleIncrementChapter({ mediaId }) {
  try {
    const { chapters, entry } = await AniListAPI.getListEntry(mediaId);
    if (!entry) {
      return { success: false, notOnList: true };
    }

    const next = (entry.progress || 0) + 1;
    if (chapters && next > chapters) {
      return { success: false, atMax: true, entry, chapters };
    }

    const autoComplete = chapters && next >= chapters;
    const status = autoComplete ? 'COMPLETED' : (entry.status || 'CURRENT');
    const saved = await AniListAPI.updateProgress(mediaId, next, status);
    await Storage.clearMediaCaches(); // cached lists/browse results now show old progress
    return { success: true, entry: saved, chapters };
  } catch (error) {
    console.error('Chapter increment failed:', error);
    return { success: false, error: error.message || 'Failed to save' };
  }
}
