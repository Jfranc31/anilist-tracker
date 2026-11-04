# AniList Tracker - Store Listing Content

## Short Description (Chrome Web Store - 132 characters max)

Track your anime and manga progress on AniList directly from your browser. Quick updates, search, and list management made easy.

---

## Detailed Description (Both Stores)

**Track your anime and manga progress effortlessly with AniList Tracker!**

AniList Tracker is a lightweight browser extension that connects directly to your AniList account, letting you manage your anime and manga lists without leaving your browser.

### 🎯 Key Features

**Quick Progress Updates**
- Update your watch/read progress with a single click
- Increment episodes watched or chapters read instantly
- Change status (Watching, Completed, Plan to Watch, etc.)
- Update scores using your preferred scoring format

**Powerful Search & Browse**
- Search thousands of anime and manga titles
- Browse trending shows and seasonal anime
- Filter by genre with multi-select support
- Quick-add titles to your Plan to Watch/Read list

**Beautiful List Management**
- View all your lists (Watching, Completed, Planning, etc.)
- Filter and sort your collection
- See real-time progress and episode counts
- Three card layouts: List, Grid, and Compact views

**Floating Manga Widget**
- Pin a manga and get a small +1 chapter button on any page you read on
- Hide it on a page with one click, unpin it from the popup

**Smart Features**
- Cached data for fast loading
- Dark theme (AniList, OLED) and Light theme options
- Auto-sync with your AniList account
- View detailed information including synopsis, genres, and relations

**Privacy First**
- All data stored locally on your device
- Secure OAuth authentication (no password storage)
- No tracking, analytics, or third-party data sharing
- Open source on GitHub

### 📱 How It Works

1. Click the extension icon in your browser toolbar
2. Connect your AniList account (one-time setup)
3. Start tracking! Search, browse, and update your progress instantly

### 🔒 Privacy & Security

Your data privacy is our priority:
- OAuth 2.0 secure authentication
- All data stored locally on your device
- No server-side data storage
- No tracking or analytics
- Read our full [Privacy Policy](https://github.com/Jfranc31/anilist-tracker/blob/main/PRIVACY.md)

### 💬 Support & Feedback

Found a bug or have a feature request? Visit our [GitHub repository](https://github.com/Jfranc31/anilist-tracker) to report issues or suggest improvements.

### ⚡ Perfect For

- Anime and manga enthusiasts who want quick access to their lists
- AniList users who prefer browser-based tracking
- Anyone looking for a lightweight, privacy-focused tracking solution

**Note:** This extension requires an AniList account (free at anilist.co).

---

## Chrome Web Store Categories

**Primary Category:** Productivity
**Secondary Category:** Entertainment

---

## Firefox Add-ons Categories

**Primary Category:** Other
**Secondary Category:** Shopping & Entertainment

---

## Keywords/Tags (for search visibility)

anilist, anime, manga, tracker, watch list, anime tracker, manga tracker, myanimelist, progress tracker, anime list, manga list, otaku, seasonal anime, anime database

---

## Screenshots Captions

**Screenshot 1 (Login):**
"Connect your AniList account securely with OAuth 2.0"

**Screenshot 2 (Search/Browse):**
"Search and browse anime with trending shows, seasonal releases, and genre filters"

**Screenshot 3 (List View):**
"Manage your watching list with filters, sorting, and quick progress updates"

**Screenshot 4 (Settings):**
"Customize your experience with themes, card layouts, and appearance options"

---

## Promotional Tile Text (Optional - Chrome only, 440x280 image with text overlay)

**Main Text:** "Track AniList on the Go"
**Subtext:** "Fast • Private • Easy"

---

## Version Release Notes (v1.2.0)

Reliability update: fixes several bugs, some of which could change your AniList list by mistake.

- Fixed: the "+" quick-add button on an outdated browse result could reset a title you had already started back to Plan to Watch with 0 progress. It now checks your list first.
- Fixed: the manga widget's +1 could roll progress back if you had updated it elsewhere. It now always adds one to your current AniList progress, and stays in sync with the popup.
- Fixed: removing a pinned manga from your list now unpins it (the widget could add it back).
- Fixed: logging out now clears all account data, so a different account never sees or changes the previous account's lists.
- Fixed: adding a new title could copy the previous title's score.
- Fixed: "This Season" and "Upcoming" no longer change after using the season browser.
- Fixed: a failed list load now shows the error instead of an empty list.
- Fixed: switching Anime/Manga while a title is open no longer breaks Save.
- Fixed: clicking quickly between search and browse tabs no longer shows the wrong results.
- Improved: clearer messages and automatic retries when AniList is temporarily unavailable.
- Improved: AniList descriptions are cleaned before display; removed debug logging and unused code.

---

## Version Release Notes (v1.0.0)

**Initial Release**

Features:
- AniList OAuth authentication
- Search and browse anime/manga
- View and manage all list statuses
- Quick progress updates and scoring
- Genre filtering and season browsing
- Multiple themes (AniList, OLED, Light)
- Three card layout options
- Cached data for performance
- Cross-browser support (Chrome & Firefox)

---

## Additional Store Information

**Website:** https://github.com/Jfranc31/anilist-tracker
**Support URL:** https://github.com/Jfranc31/anilist-tracker/issues
**Privacy Policy URL:** https://github.com/Jfranc31/anilist-tracker/blob/main/PRIVACY.md

**Permissions Justification:**

- **storage** - Store user preferences and cached data locally
- **tabs** - Open the AniList login page in a tab, detect the OAuth redirect URL in that tab, and close it once login completes
- **content script on all sites (`<all_urls>`)** - Show the optional floating manga widget (a +1 chapter button for a manga the user pinned) on whatever site they read manga on. On each page it only checks whether a manga is pinned and, if so, adds its own small element; it does not read page content or track browsing, and shows nothing when no manga is pinned
- **host_permissions (graphql.anilist.co)** - Fetch anime/manga data from AniList API
- **host_permissions (anilist.co)** - AniList OAuth authentication
- **host_permissions (anilist-tracker-production.up.railway.app)** - OAuth token exchange (backend server)

---

## Target Audience

- Age: 13+ (per AniList terms of service)
- Users: AniList community members, anime/manga fans
- Geography: Global (extension supports multiple languages via AniList)
- Use Case: Quick anime/manga progress tracking without leaving the browser

---

## Competitive Advantages

✅ **Privacy-focused** - No analytics, all data local
✅ **Fast** - Cached data, optimized API calls
✅ **Beautiful UI** - Matches AniList design, multiple themes
✅ **Feature-rich** - Genre filters, season browse, quick-add
✅ **Open source** - Transparent, community-driven
✅ **Cross-browser** - Chrome and Firefox support
