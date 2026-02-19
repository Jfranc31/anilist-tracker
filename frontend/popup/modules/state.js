// State management for popup
// Centralized state to avoid globals scattered across files

export const state = {
  // Current active tab
  currentTab: 'search',

  // Current media type (ANIME or MANGA)
  currentMediaType: 'ANIME',

  // Current list data (for filtering)
  currentListData: [],

  // Status message timeout
  statusMessageTimeout: null,

  // List search timeout (for debouncing)
  listSearchTimeout: null,

  // Navigation history stack for back button (detail → detail)
  navigationHistory: [],

  // User's preferred title language (from AniList account settings)
  titleLanguage: 'ROMAJI',

  // Trending cache (per media type, cleared on popup reload)
  trendingCache: { ANIME: null, MANGA: null }
};

// Helper functions to update state
export function setCurrentTab(tab) {
  state.currentTab = tab;
}

export function setMediaType(type) {
  state.currentMediaType = type;
}

export function setListData(data) {
  state.currentListData = data;
}

export function clearListData() {
  state.currentListData = [];
}

export function pushNavHistory(anime) {
  state.navigationHistory.push(anime);
}

export function popNavHistory() {
  return state.navigationHistory.pop();
}

export function clearNavHistory() {
  state.navigationHistory = [];
}

export function setTitleLanguage(lang) {
  state.titleLanguage = lang;
}

// Returns the preferred title based on user's AniList title language setting
export function getPreferredTitle(titleObj) {
  if (!titleObj) return 'Unknown';
  const lang = state.titleLanguage;
  switch (lang) {
    case 'ENGLISH':
    case 'ENGLISH_STYLISED':
      return titleObj.english || titleObj.romaji || titleObj.native || 'Unknown';
    case 'NATIVE':
      return titleObj.native || titleObj.romaji || titleObj.english || 'Unknown';
    default: // ROMAJI, ROMAJI_STYLISED
      return titleObj.romaji || titleObj.english || titleObj.native || 'Unknown';
  }
}
