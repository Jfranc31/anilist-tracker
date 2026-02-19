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

console.log('AniList Tracker background script loaded');

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);

  if (details.reason === 'install') {
    console.log('First time install - initializing...');
    initializeExtension();
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});

// Initialize extension on first install
async function initializeExtension() {
  try {
    await chrome.storage.local.set({
      isAuthenticated: false,
      user: null,
      settings: {
        autoUpdate: true,
        notifications: true
      }
    });

    console.log('Extension initialized successfully');
  } catch (error) {
    console.error('Error initializing extension:', error);
  }
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background:', message.type);

  switch (message.type) {
    case 'AUTHENTICATE':
      handleAuthentication()
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true; // Keep channel open for async response

    case 'UPDATE_PROGRESS':
      handleProgressUpdate(message.data)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'GET_USER_DATA':
      handleGetUserData()
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'ANIME_DETECTED':
      console.log('Anime detected:', message.data);
      sendResponse({ success: true });
      return true;

    default:
      console.warn('Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
  }
});

// Authentication handler - runs OAuth flow in background
async function handleAuthentication() {
  console.log('Starting authentication in background...');
  try {
    const { token, user } = await AniListAPI.authenticate();

    // Save to storage
    await Storage.saveAuthData(token, user);

    console.log('Authentication successful:', user.name);
    return { success: true, user };
  } catch (error) {
    console.error('Authentication failed:', error);
    return { success: false, error: error.message };
  }
}

// Progress update handler
async function handleProgressUpdate(data) {
  console.log('Handling progress update...', data);
  try {
    const result = await AniListAPI.updateProgress(data.mediaId, data.progress, data.status);
    return { success: true, result };
  } catch (error) {
    console.error('Progress update failed:', error);
    return { success: false, error: error.message };
  }
}

// Get user data handler
async function handleGetUserData() {
  console.log('Getting user data...');
  const result = await chrome.storage.local.get(['user', 'isAuthenticated']);
  return result;
}
