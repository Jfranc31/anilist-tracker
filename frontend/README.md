# AniList Tracker - Browser Extension

Track your anime progress on AniList directly from streaming sites like Crunchyroll, Funimation, and Netflix.

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
├── manifest.json          # Extension configuration
├── popup/                 # Extension popup UI
│   ├── popup.html
│   ├── popup.scss        # Source styles (edit this)
│   ├── popup.css         # Compiled styles (generated)
│   └── popup.js
├── content/               # Content scripts for streaming sites
│   ├── content.js
│   └── sites/
├── background/            # Background service worker
│   └── background.js
├── services/              # API services
│   └── anilist.js
├── utils/                 # Utilities
│   └── storage.js
└── assets/                # Icons and images
    └── icons/
```

## Available Scripts

- `npm run dev` - Watch SCSS files and auto-compile
- `npm run build:scss` - Compile SCSS to CSS once
- `npm run watch:scss` - Same as dev

## Features (Planned)

- [x] SCSS setup with variables and nesting
- [ ] AniList OAuth authentication
- [ ] Detect anime on Crunchyroll
- [ ] Update episode progress
- [ ] Support for multiple streaming sites
- [ ] Offline caching
