# Popup Modules

This directory contains the modularized code for the popup interface. The code has been split into logical modules for better maintainability and organization.

## Module Structure

### `state.js`
**Purpose**: Centralized state management

**Exports**:
- `state` - Object containing all application state
- `setCurrentTab(tab)` - Update current active tab
- `setMediaType(type)` - Set media type (ANIME/MANGA)
- `setListData(data)` - Update list data
- `clearListData()` - Clear list data

**State Properties**:
- `currentTab`: Current active tab ('search', 'current', 'planning', 'completed')
- `currentMediaType`: 'ANIME' or 'MANGA'
- `currentListData`: Array of list entries for filtering
- `statusMessageTimeout`: Timeout ID for status message auto-hide
- `listSearchTimeout`: Timeout ID for debounced search

---

### `error-handler.js`
**Purpose**: Error handling and user feedback

**Exports**:
- `setStatusMessageElement(element)` - Initialize status message DOM element
- `handleAPIError(error, defaultMessage)` - Handle API errors with user-friendly messages
- `showError(message, type, duration)` - Show error message
- `showSuccess(message, duration)` - Show success message
- `showStatus(message, type, duration)` - Show generic status message
- `hideStatus()` - Hide status message
- `setLoading(container, message)` - Show loading state in container

**Error Types Handled**:
- `AUTH_ERROR` - Authentication failures (auto-redirects to login)
- `RATE_LIMIT` - API rate limiting
- `NETWORK_ERROR` - Network connectivity issues
- `SERVER_ERROR` - Server-side errors (500+)
- `GRAPHQL_ERROR` - GraphQL-specific errors

---

### `views.js`
**Purpose**: View switching and navigation

**Exports**:
- `setDOMElements(elements)` - Initialize view DOM elements
- `showView(viewName)` - Switch between main views (login/main/loading)
- `showSearchView()` - Show search view
- `showListView(status)` - Show list view with status
- `setActiveTab(activeTab)` - Set active navigation tab
- `showDetailViewUI()` - Show detail view UI

**View Types**:
- `login` - Not logged in state
- `main` - Main application view
- `loading` - Loading state

---

### `card-renderer.js`
**Purpose**: Render result cards for anime/manga

**Exports**:
- `createResultCard(anime)` - Create a result card element

**Card Features**:
- Displays cover image, title, progress
- Shows media status badges (Airing, Finished, etc.)
- Shows user's list status (Watching, Completed, etc.)
- Clickable to show detail view

---

### `search.js`
**Purpose**: Search functionality

**Exports**:
- `setDOMElements(elements)` - Initialize search DOM elements
- `searchAnime(query)` - Search for anime/manga by title

**Features**:
- Validates search query (min 2 characters)
- Shows loading state during search
- Handles errors gracefully
- Displays search results using card renderer

---

### `list-view.js`
**Purpose**: List view and filtering

**Exports**:
- `setDOMElements(elements)` - Initialize list view DOM elements
- `loadList(status)` - Load user's list by status
- `filterList(query)` - Filter list by search/format/status
- `clearFilters()` - Clear all filters
- `updateFormatFilterOptions()` - Update format dropdown based on media type

**List Types**:
- `CURRENT` - Currently watching/reading
- `PLANNING` - Plan to watch/read
- `COMPLETED` - Completed

**Filters**:
- Title search (searches romaji, english, native)
- Format filter (TV, Movie, OVA, etc.)
- Status filter (Airing, Finished, etc.)

---

### `detail-view.js`
**Purpose**: Detailed view for individual anime/manga

**Exports**:
- `setDOMElements(elements)` - Initialize detail view DOM elements
- `selectAnime(anime)` - Select anime and show detail view
- `showDetailView(anime)` - Display detail view
- `updateProgressFromDetail()` - Update progress from detail view

**Features**:
- Displays cover, title, metadata
- Shows current user status and progress
- Progress update input
- Status change buttons (Start, Pause, Drop, Complete, etc.)
- Refreshes data from API on load
- Handles loading state to prevent flashing old content

---

## Main Entry Point

### `popup-refactored.js`
**Purpose**: Main entry point and event listener setup

**Responsibilities**:
- Initialize all modules with DOM elements
- Set up event listeners
- Handle authentication flow
- Manage media type switching
- Route user actions to appropriate modules

---

## Usage Example

```javascript
// Import modules
import { searchAnime } from './modules/search.js';
import { showDetailView } from './modules/detail-view.js';
import { state } from './modules/state.js';

// Use state
console.log(state.currentMediaType); // 'ANIME' or 'MANGA'

// Perform search
await searchAnime('naruto');

// Show detail view
await showDetailView(animeObject);
```

---

## Benefits of Modular Structure

1. **Maintainability**: Easy to find and fix issues in specific functionality
2. **Testability**: Each module can be tested independently
3. **Reusability**: Modules can be reused in other parts of the extension
4. **Clarity**: Clear separation of concerns
5. **Collaboration**: Multiple developers can work on different modules
6. **Scalability**: Easy to add new features without bloating a single file

---

## Migration Notes

The original `popup.js` has been refactored into these modules. The old version is kept as a backup for reference if needed. All functionality remains the same, just better organized.
