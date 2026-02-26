# Privacy Policy for AniList Tracker

**Last Updated**: February 25, 2026

## Introduction

AniList Tracker ("the Extension") is a browser extension that helps you track your anime and manga progress through AniList. This privacy policy explains what data we collect, how we use it, and your rights regarding your data.

## Data We Collect

### Authentication Data
- **AniList Access Token**: When you log in with your AniList account, we store an OAuth access token to authenticate your requests to the AniList API.
- **User Profile Information**: We retrieve and temporarily cache your AniList username, avatar, and preferences (score format, title language) to display in the extension.

### Usage Preferences
- **Theme Settings**: Your selected theme (Dark, OLED, Light, or Auto).
- **Card Layout Preferences**: Your preferred card layout (List, Grid, or Compact).
- **Media Type**: Whether you're currently viewing anime or manga.
- **Cover Display Settings**: Whether you prefer to show or hide cover images.

### Temporary Cache Data
- **List Data**: Your anime/manga lists are temporarily cached (2 minutes) to improve performance.
- **User Data**: Your profile information is cached (5 minutes) to reduce API calls.
- **Media Details**: Currently selected anime/manga for quick access.

## How We Use Your Data

We use the collected data solely to:
1. **Authenticate with AniList**: Your access token is used to make authorized API requests on your behalf.
2. **Display Your Lists**: We fetch and display your anime/manga lists from AniList.
3. **Update Your Progress**: We send updates to AniList when you change your watch/read progress.
4. **Improve Performance**: We cache data temporarily to reduce API calls and improve loading speed.
5. **Remember Your Preferences**: We store your theme and layout preferences for a better user experience.

## Where Your Data is Stored

### Local Storage
All your data is stored **locally on your device** using your browser's built-in storage (`chrome.storage.local`):
- Your AniList access token
- Your cached profile information
- Your preference settings
- Temporarily cached list data

### External Services
The Extension communicates with:
1. **AniList GraphQL API** (`https://graphql.anilist.co`): To fetch and update your anime/manga lists.
2. **AniList OAuth** (`https://anilist.co`): For authentication.
3. **Our Backend Server** (`https://anilist-tracker-production.up.railway.app`): Only for OAuth token exchange during login (your token is immediately passed to you and not stored on our servers).

## Data We Do NOT Collect

- ❌ We do NOT track your browsing history
- ❌ We do NOT collect analytics or usage statistics
- ❌ We do NOT store your password (OAuth authentication only)
- ❌ We do NOT sell or share your data with third parties
- ❌ We do NOT use cookies or tracking scripts
- ❌ We do NOT access data from other websites

## Data Sharing

We **do not share, sell, or trade** your personal information with anyone. Your data is:
- Stored locally on your device
- Only sent to AniList's official API to sync your lists
- Never sent to analytics services or advertisers

## Data Security

- **OAuth Authentication**: We use industry-standard OAuth 2.0 for secure authentication.
- **HTTPS Only**: All API communications use encrypted HTTPS connections.
- **Local Storage Only**: Your sensitive data (access token) is stored only on your device.
- **No Server Storage**: Our backend does not store your access token or any personal data.

## Your Rights and Data Control

You have complete control over your data:

### View Your Data
All your data is stored locally. You can inspect it using your browser's developer tools (Storage tab).

### Delete Your Data
You can delete your data at any time:
1. **Logout**: Click the "Logout" button in settings to clear all data.
2. **Uninstall**: Removing the extension deletes all stored data.
3. **Browser Storage**: Clear your browser's extension storage.

### Revoke Access
You can revoke the Extension's access to your AniList account:
1. Go to [AniList Settings > Apps](https://anilist.co/settings/apps)
2. Find "AniList Tracker" and click "Revoke"
3. Logout from the Extension to clear local data

## Data Retention

- **Access Token**: Stored until you logout or uninstall.
- **Profile Cache**: Expires after 5 minutes and is refreshed as needed.
- **List Cache**: Expires after 2 minutes and is invalidated when you make updates.
- **Preferences**: Stored until you change them or uninstall.

## Updates to This Policy

We may update this privacy policy from time to time. When we do:
- The "Last Updated" date at the top will change
- Significant changes will be noted in the extension's changelog
- Continued use of the Extension after changes constitutes acceptance

## Third-Party Services

This Extension relies on:
- **AniList** ([Privacy Policy](https://anilist.co/terms)): For anime/manga data and authentication.

We are not responsible for the privacy practices of AniList or other third-party services.

## Children's Privacy

The Extension does not knowingly collect data from users under 13 years of age. AniList's terms of service require users to be at least 13 years old.

## Contact

If you have questions about this privacy policy or your data:
- **GitHub Issues**: [github.com/Jfranc31/anilist-tracker/issues](https://github.com/Jfranc31/anilist-tracker/issues)
- **Email**: borutofrank@gmail.com

## Consent

By using the AniList Tracker extension, you consent to this privacy policy.

---

## Summary (TL;DR)

✅ **What we collect**: AniList access token, your lists, and preferences
✅ **Where it's stored**: Locally on your device
✅ **How we use it**: To sync with AniList and show your lists
✅ **Who we share with**: Nobody (except AniList API for syncing)
✅ **How to delete**: Click "Logout" in settings or uninstall

**We respect your privacy. Your data stays on your device.**
