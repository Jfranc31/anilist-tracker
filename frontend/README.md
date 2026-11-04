# AniList Tracker - Browser Extension

Browse, search and update your AniList anime and manga list from a browser popup, without opening the AniList website. Works in Chrome and Firefox.

## Development Setup

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Build SCSS:
```bash
npm run build:scss
```

3. For development with auto-compilation:
```bash
npm run dev
```

### Loading the Extension

`manifest.json` is the active manifest. Run `use-chrome.bat` or `use-firefox.bat` to copy the matching browser version over it before loading.

#### Chrome/Edge
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `frontend` folder

#### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `manifest.json` file

## Project Structure

```
frontend/
├── manifest.json              # Active manifest (copied from one of the two below)
├── manifest.chrome.json       # Chrome version (service worker background)
├── manifest.firefox.json      # Firefox version (background scripts)
├── config.js                  # AniList client ID and backend URL
├── polyfill.js                # chrome/browser API aliasing
├── popup/
│   ├── popup.html
│   ├── popup.scss             # Source styles (edit this)
│   ├── popup.css              # Compiled styles (generated)
│   ├── popup-refactored.js    # Popup entry point
│   └── modules/
│       ├── state.js           # Shared popup state
│       ├── views.js           # Switching between views
│       ├── search.js          # Search and Browse tabs
│       ├── list-view.js       # Your list
│       ├── card-renderer.js   # Result cards
│       ├── error-handler.js   # Error and success messages
│       ├── sanitize.js        # Cleans AniList description HTML
│       ├── detail-view.js     # Detail view: header, tracking and saving
│       └── detail/
│           ├── info-tab.js    # Stats, Info tab, description, external links
│           ├── related.js     # Relations and recommendations
│           ├── characters.js  # Character list
│           └── format.js      # Date and status text helpers
├── content/
│   ├── widget.js              # Floating +1 chapter widget for a pinned manga
│   └── widget.css
├── background/
│   └── background.js          # Sign-in and widget progress updates
├── services/
│   └── anilist-pkce.js        # AniList sign-in (PKCE) and GraphQL API
├── utils/
│   └── storage.js             # Extension storage helpers
└── assets/
    └── icons/
```

## Available Scripts

- `npm run dev` - Watch SCSS files and auto-compile
- `npm run build:scss` - Compile SCSS to CSS once
- `npm run watch:scss` - Same as dev

## Features

- Sign in with AniList
- Your anime and manga lists, filtered by status
- Search, plus Trending, This Season, Upcoming, All Time Popular and Top 100
- Detail view with progress, score, dates, rewatches, notes, characters, relations and recommendations
- Floating widget to add a chapter to a pinned manga from any page
