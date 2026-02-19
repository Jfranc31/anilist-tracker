// Configuration file for AniList Tracker
// You need to register your extension on AniList to get a Client ID

const CONFIG = {
  // IMPORTANT: Replace this with your actual Client ID from AniList
  // Follow the setup guide in SETUP.md to get your Client ID
  ANILIST_CLIENT_ID: '35250',

  // These are standard and don't need to be changed
  ANILIST_API_URL: 'https://graphql.anilist.co',
  ANILIST_AUTH_URL: 'https://anilist.co/api/v2/oauth/authorize',

  // Backend API Configuration
  BACKEND_URL: 'https://anilist-tracker-production.up.railway.app',

  // Extension settings
  SETTINGS: {
    AUTO_UPDATE: true,
    NOTIFICATIONS: true,
    DETECTION_INTERVAL: 5000 // ms
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
