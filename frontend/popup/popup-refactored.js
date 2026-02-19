// Main popup script - refactored with modules
import { state, setMediaType, clearNavHistory, popNavHistory, setTitleLanguage } from './modules/state.js';
import { showView, showSearchView, showListView, showSettingsView, setDOMElements as setViewElements } from './modules/views.js';
import { setToastContainer } from './modules/error-handler.js';
import { searchAnime, loadBrowseCategory, clearBrowseCategory, updateBrowseChipsVisibility, resetSeasonBrowser, toggleSeasonBrowser, setSeasonFromSelects, addSearchGenre, clearSearchGenres, setDOMElements as setSearchElements } from './modules/search.js';
import {
  loadList,
  filterList,
  clearFilters,
  addListGenre,
  setDOMElements as setListElements
} from './modules/list-view.js';
import {
  updateProgressFromDetail,
  incrementAndSave,
  clearDetailView,
  isDetailDirty,
  setDOMElements as setDetailElements
} from './modules/detail-view.js';

console.log('AniList Tracker popup loaded');

// AniList named profile colors → hex values
const PROFILE_COLOR_MAP = {
  blue:   { main: '#3db4f2', hover: '#2c9dd9' },
  purple: { main: '#c063ff', hover: '#a855e8' },
  green:  { main: '#4cca51', hover: '#3db341' },
  orange: { main: '#ef881a', hover: '#d97710' },
  red:    { main: '#e13333', hover: '#c92626' },
  pink:   { main: '#fc9dd8', hover: '#e88ac4' },
  gray:   { main: '#677b94', hover: '#5a6b81' },
};

let currentAppearance = { theme: 'dark', cardLayout: 'list', showCovers: true };

function applyAppearance(settings) {
  const { theme, cardLayout, showCovers } = settings;
  document.body.classList.remove('theme-light', 'theme-auto', 'theme-oled', 'theme-dracula', 'theme-catppuccin');
  const themeClassMap = { light: 'theme-light', auto: 'theme-auto', oled: 'theme-oled', dracula: 'theme-dracula', catppuccin: 'theme-catppuccin' };
  if (themeClassMap[theme]) document.body.classList.add(themeClassMap[theme]);
  document.body.classList.toggle('layout-grid', cardLayout === 'grid');
  document.body.classList.toggle('layout-compact', cardLayout === 'compact');
  document.body.classList.toggle('covers-hidden', !showCovers);
}

function setActiveBtn(group, value) {
  if (!group) return;
  group.querySelectorAll('.appearance-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === value);
  });
}

function syncAppearanceUI(settings) {
  setActiveBtn(themeToggle, settings.theme);
  setActiveBtn(layoutToggle, settings.cardLayout);
  setActiveBtn(coversToggle, settings.showCovers ? 'show' : 'hide');
}

function applyProfileColor(profileColor) {
  if (!profileColor) return;
  const entry = PROFILE_COLOR_MAP[profileColor];
  const mainHex = entry ? entry.main : (profileColor.startsWith('#') ? profileColor : null);
  const hoverHex = entry ? entry.hover : mainHex;
  if (!mainHex) return;

  const r = parseInt(mainHex.slice(1, 3), 16);
  const g = parseInt(mainHex.slice(3, 5), 16);
  const b = parseInt(mainHex.slice(5, 7), 16);

  const root = document.documentElement;
  root.style.setProperty('--color-primary', mainHex);
  root.style.setProperty('--color-primary-hover', hoverHex);
  root.style.setProperty('--color-primary-alpha-08', `rgba(${r}, ${g}, ${b}, 0.08)`);
  root.style.setProperty('--color-primary-alpha-15', `rgba(${r}, ${g}, ${b}, 0.15)`);
  root.style.setProperty('--color-primary-alpha-30', `rgba(${r}, ${g}, ${b}, 0.30)`);
}

// DOM elements
const loginView = document.getElementById('login-view');
const mainView = document.getElementById('main-view');
const loadingView = document.getElementById('loading-view');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userName = document.getElementById('user-name');
const userAvatar = document.getElementById('user-avatar');
const tabSearch = document.getElementById('tab-search');
const tabWatching = document.getElementById('tab-watching');
const tabPlanning = document.getElementById('tab-planning');
const tabCompleted = document.getElementById('tab-completed');
const tabPaused = document.getElementById('tab-paused');
const tabDropped = document.getElementById('tab-dropped');
const tabRepeating = document.getElementById('tab-repeating');
const searchView = document.getElementById('search-view');
const listView = document.getElementById('list-view');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const resultsContainer = document.getElementById('results-container');
const listSearchInput = document.getElementById('list-search-input');
const listContainer = document.getElementById('list-container');
const formatFilter = document.getElementById('format-filter');
const statusFilter = document.getElementById('status-filter');
const statusFilterLabel = document.getElementById('status-filter-label');
const genreFilter = document.getElementById('genre-filter');
const listGenreChips = document.getElementById('list-genre-chips');
const searchGenreChips = document.getElementById('search-genre-chips');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const sortSelect = document.getElementById('sort-select');
const listCount = document.getElementById('list-count');
const detailView = document.getElementById('detail-view');
const backBtn = document.getElementById('back-btn');
const detailCover = document.getElementById('detail-cover');
const detailTitle = document.getElementById('detail-title');
const detailMeta = document.getElementById('detail-meta');
const detailStatus = document.getElementById('detail-status');
const detailProgressLabel = document.getElementById('detail-progress-label');
const detailEpisodeInput = document.getElementById('detail-episode-input');
const detailProgressPlus = document.getElementById('detail-progress-plus');
const detailUpdateBtn = document.getElementById('detail-update-btn');
const detailStatusButtons = document.getElementById('detail-status-buttons');
const detailScoreInput = document.getElementById('detail-score-input');
const detailVolumeInput = document.getElementById('detail-volume-input');
const detailVolumeControl = document.getElementById('detail-volume-control');
const detailScoreControl = document.getElementById('detail-score-control');
const detailStatusSelect = document.getElementById('detail-status-select');
const detailStatusLabel = document.getElementById('detail-status-label');
const detailDescription = document.getElementById('detail-description');
const detailRelations = document.getElementById('detail-relations');
const detailTrackingPanel = document.getElementById('detail-tracking-panel');
const detailInfoPanel = document.getElementById('detail-info-panel');
const detailBanner = document.getElementById('detail-banner');
const detailTabBtns = document.querySelectorAll('.detail-tab-btn');
const toastContainer = document.getElementById('toast-container');
const toggleAnime = document.getElementById('toggle-anime');
const toggleManga = document.getElementById('toggle-manga');
const userBanner = document.getElementById('user-banner');
const settingsBtn = document.getElementById('settings-btn');
const settingsView = document.getElementById('settings-view');
const settingsAvatar = document.getElementById('settings-avatar');
const settingsUsername = document.getElementById('settings-username');
const settingsProfileLink = document.getElementById('settings-profile-link');
const settingsTitleLanguage = document.getElementById('settings-title-language');
const settingsScoreFormat = document.getElementById('settings-score-format');
const settingsProfileColor = document.getElementById('settings-profile-color');
const settingsLogoutBtn = document.getElementById('settings-logout-btn');
const settingsBackBtn = document.getElementById('settings-back-btn');
const themeToggle = document.getElementById('theme-toggle');
const layoutToggle = document.getElementById('layout-toggle');
const coversToggle = document.getElementById('covers-toggle');

// Initialize modules with DOM elements
setViewElements({
  loginView,
  mainView,
  loadingView,
  searchView,
  listView,
  detailView,
  settingsView,
  tabSearch,
  tabWatching,
  tabPlanning,
  tabCompleted,
  tabPaused,
  tabDropped,
  tabRepeating,
  searchInput,
  settingsBtn
});

setToastContainer(toastContainer);

setSearchElements({ resultsContainer, searchGenreChipsContainer: searchGenreChips });

setListElements({
  listContainer,
  listSearchInput,
  formatFilter,
  statusFilter,
  statusFilterLabel,
  genreFilter,
  genreChipsContainer: listGenreChips,
  sortSelect,
  listCount
});

setDetailElements({
  detailCover,
  detailTitle,
  detailMeta,
  detailStatus,
  detailProgressLabel,
  detailEpisodeInput,
  detailProgressPlus,
  detailUpdateBtn,
  detailStatusButtons,
  detailScoreInput,
  detailVolumeInput,
  detailVolumeControl,
  detailScoreControl,
  detailStatusSelect,
  detailStatusLabel,
  detailDescription,
  detailRelations,
  detailTrackingPanel,
  detailInfoPanel,
  detailTabBtns,
  detailBanner
});

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await initializePopup();
});

async function initializePopup() {
  const savedAppearance = await Storage.getAppearance();
  currentAppearance = savedAppearance;
  applyAppearance(currentAppearance);

  showView('loading');

  try {
    const isLoggedIn = await Storage.isAuthenticated();

    if (isLoggedIn) {
      await showMainView();
    } else {
      showView('login');
    }
  } catch (error) {
    console.error('Error initializing popup:', error);
    showView('login');
  }
}

async function showMainView() {
  try {
    // Fetch fresh user data from API to pick up latest preferences (titleLanguage, scoreFormat, bannerImage)
    // Falls back to cached data if the request fails
    let user = await Storage.getUser();
    try {
      const freshUser = await AniListAPI.getCurrentUser();
      if (freshUser) {
        await Storage.setUser(freshUser);
        user = freshUser;
      }
    } catch (e) {
      console.warn('Could not refresh user data, using cached:', e);
    }

    if (user) {
      userName.textContent = user.name;
      userAvatar.src = user.avatar.medium;
      userAvatar.alt = `${user.name}'s avatar`;
      setTitleLanguage(user.options?.titleLanguage || 'ROMAJI');
      applyProfileColor(user.options?.profileColor);
      if (user.bannerImage && userBanner) {
        userBanner.style.backgroundImage = `url(${user.bannerImage})`;
        userBanner.classList.remove('hidden');
      } else if (userBanner) {
        userBanner.classList.add('hidden');
      }

      // Populate settings view
      if (settingsAvatar) { settingsAvatar.src = user.avatar.medium; settingsAvatar.alt = `${user.name}'s avatar`; }
      if (settingsUsername) settingsUsername.textContent = user.name;
      if (settingsProfileLink) settingsProfileLink.href = `https://anilist.co/user/${user.name}`;
      if (settingsTitleLanguage) {
        const langMap = { ROMAJI: 'Romaji', ENGLISH: 'English', NATIVE: 'Native' };
        settingsTitleLanguage.textContent = langMap[user.options?.titleLanguage] || user.options?.titleLanguage || 'Romaji';
      }
      if (settingsProfileColor) {
        const pc = user.options?.profileColor;
        const pcName = pc ? (pc.charAt(0).toUpperCase() + pc.slice(1)) : '—';
        settingsProfileColor.textContent = pcName;
        if (pc) settingsProfileColor.style.color = PROFILE_COLOR_MAP[pc]?.main || (pc.startsWith('#') ? pc : '');
      }
      if (settingsScoreFormat) {
        const fmtMap = { POINT_100: '0–100', POINT_10_DECIMAL: '0–10 (decimal)', POINT_10: '0–10', POINT_5: '0–5 stars', POINT_3: '0–3 smileys' };
        const fmt = user.mediaListOptions?.scoreFormat;
        settingsScoreFormat.textContent = fmtMap[fmt] || fmt || '0–10';
      }
    }

    showView('main');
    syncAppearanceUI(currentAppearance);

    // Restore persisted media type
    const { currentMediaType: savedType } = await chrome.storage.local.get('currentMediaType');
    if (savedType && savedType !== state.currentMediaType) {
      setMediaType(savedType);
      toggleAnime.classList.toggle('active', savedType === 'ANIME');
      toggleManga.classList.toggle('active', savedType === 'MANGA');
      if (savedType === 'MANGA') {
        tabWatching.querySelector('.tab-label').textContent = 'Reading';
        tabPlanning.querySelector('.tab-label').textContent = 'Plan to Read';
        tabRepeating.querySelector('.tab-label').textContent = 'Rereading';
        searchInput.placeholder = 'Search manga...';
        const seasonToggleBtn = document.getElementById('season-toggle-btn');
        if (seasonToggleBtn) seasonToggleBtn.classList.add('hidden');
        updateBrowseChipsVisibility();
      }
    }

    // Check if there's a selected anime
    const result = await chrome.storage.local.get(['selectedAnime']);
    if (result.selectedAnime) {
      const { showDetailView } = await import('./modules/detail-view.js');
      await showDetailView(result.selectedAnime);
    } else {
      showSearchView();
    }

    // Load statistics after a delay to avoid rate-limiting (settings view isn't immediately visible)
    if (user) setTimeout(() => loadStatistics(user.id), 2000);
  } catch (error) {
    console.error('Error showing main view:', error);
    showView('login');
  }
}

function switchMediaType(type) {
  setMediaType(type);
  chrome.storage.local.set({ currentMediaType: type });
  clearNavHistory();

  // Update toggle button states
  if (type === 'ANIME') {
    toggleAnime.classList.add('active');
    toggleManga.classList.remove('active');
  } else {
    toggleAnime.classList.remove('active');
    toggleManga.classList.add('active');
  }

  // Update tab labels based on media type
  if (type === 'ANIME') {
    tabWatching.querySelector('.tab-label').textContent = 'Watching';
    tabPlanning.querySelector('.tab-label').textContent = 'Plan to Watch';
    tabRepeating.querySelector('.tab-label').textContent = 'Rewatching';
    searchInput.placeholder = 'Search anime...';
  } else {
    tabWatching.querySelector('.tab-label').textContent = 'Reading';
    tabPlanning.querySelector('.tab-label').textContent = 'Plan to Read';
    tabRepeating.querySelector('.tab-label').textContent = 'Rereading';
    searchInput.placeholder = 'Search manga...';
  }

  // Clear selected anime
  chrome.storage.local.remove('selectedAnime');

  // Season browser is anime-only
  const seasonToggleBtn = document.getElementById('season-toggle-btn');
  if (seasonToggleBtn) seasonToggleBtn.classList.toggle('hidden', type === 'MANGA');

  // Update browse chips visibility (hide anime-only chips for manga)
  updateBrowseChipsVisibility();
  resetSeasonBrowser();
  clearSearchGenres();

  // Reload current view
  if (state.currentTab === 'search') {
    searchInput.value = '';
    clearBrowseCategory();
  } else {
    const statusMap = {
      'current': 'CURRENT',
      'planning': 'PLANNING',
      'completed': 'COMPLETED',
      'paused': 'PAUSED',
      'dropped': 'DROPPED',
      'repeating': 'REPEATING'
    };
    if (statusMap[state.currentTab]) {
      loadList(statusMap[state.currentTab]);
    }
  }
}

// Event listeners
loginBtn.addEventListener('click', async () => {
  console.log('Login button clicked');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Connecting...';

  try {
    console.log('Sending authentication request to background script...');

    // Send message to background script to handle authentication
    // The background script persists even when popup closes during OAuth flow
    const response = await chrome.runtime.sendMessage({ type: 'AUTHENTICATE' });

    console.log('Authentication response:', response);

    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.success || !response.user) {
      throw new Error('Invalid authentication response from background script');
    }

    console.log('Authentication successful, showing main view');
    // The background script already saved the data, just show the main view
    await showMainView();
  } catch (error) {
    console.error('Login failed:', error);
    console.error('Error stack:', error.stack);
    alert(`Login failed: ${error.message}\n\nPlease check the console for details.`);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Connect to AniList';
  }
});

logoutBtn.addEventListener('click', async () => {
  await Storage.clearAuthData();
  showView('login');
});

searchBtn.addEventListener('click', () => {
  const query = searchInput.value.trim();
  searchAnime(query);
});

searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const query = searchInput.value.trim();
    searchAnime(query);
  }
});

// Tab navigation
tabSearch.addEventListener('click', () => {
  showSearchView();
});

tabWatching.addEventListener('click', () => {
  showListView('CURRENT');
});

tabPlanning.addEventListener('click', () => {
  showListView('PLANNING');
});

tabCompleted.addEventListener('click', () => {
  showListView('COMPLETED');
});

tabPaused.addEventListener('click', () => {
  showListView('PAUSED');
});

tabDropped.addEventListener('click', () => {
  showListView('DROPPED');
});

tabRepeating.addEventListener('click', () => {
  showListView('REPEATING');
});

// List search/filter (debounced)
listSearchInput.addEventListener('input', () => {
  clearTimeout(state.listSearchTimeout);
  state.listSearchTimeout = setTimeout(() => {
    filterList();
  }, 300);
});

// Format filter
formatFilter.addEventListener('change', () => {
  filterList();
});

// Status filter
statusFilter.addEventListener('change', () => {
  filterList();
});

// Genre filter (list view) — acts as a picker: selecting a genre adds it as a chip
genreFilter?.addEventListener('change', () => {
  const genre = genreFilter.value;
  if (genre) {
    addListGenre(genre);
    genreFilter.value = '';
  }
});

// Sort select
sortSelect.addEventListener('change', () => {
  filterList();
});

// Clear filters button
clearFiltersBtn.addEventListener('click', () => {
  clearFilters();
});

// Back button - pop navigation history or return to list/search
backBtn.addEventListener('click', async () => {
  if (isDetailDirty()) {
    const confirmed = confirm('You have unsaved changes. Leave without saving?');
    if (!confirmed) return;
  }

  const prev = popNavHistory();

  if (prev) {
    // Restore media type if it changed
    const prevAnime = prev.anime;
    const prevMediaType = prev.mediaType;
    if (prevMediaType && prevMediaType !== state.currentMediaType) {
      setMediaType(prevMediaType);
      toggleAnime.classList.toggle('active', prevMediaType === 'ANIME');
      toggleManga.classList.toggle('active', prevMediaType === 'MANGA');
    }
    // Navigate back to previous detail view entry
    await chrome.storage.local.set({ selectedAnime: prevAnime });
    const { showDetailView } = await import('./modules/detail-view.js');
    await showDetailView(prevAnime);
  } else {
    // No history — return to list/search; clear detail view so next open starts blank
    clearDetailView();
    await chrome.storage.local.remove('selectedAnime');

    if (state.currentTab === 'search') {
      showSearchView();
    } else {
      const statusMap = {
        'current': 'CURRENT',
        'planning': 'PLANNING',
        'completed': 'COMPLETED',
        'paused': 'PAUSED',
        'dropped': 'DROPPED',
        'repeating': 'REPEATING'
      };
      await showListView(statusMap[state.currentTab]);
    }
  }
});

// Progress +1 button — increments and immediately saves to AniList
detailProgressPlus.addEventListener('click', () => {
  incrementAndSave(detailProgressPlus);
});

// Detail view update button
detailUpdateBtn.addEventListener('click', () => {
  updateProgressFromDetail();
});

// Media type toggle buttons
toggleAnime.addEventListener('click', () => {
  if (state.currentMediaType !== 'ANIME') {
    switchMediaType('ANIME');
  }
});

toggleManga.addEventListener('click', () => {
  if (state.currentMediaType !== 'MANGA') {
    switchMediaType('MANGA');
  }
});

// Settings button — toggles settings view; clicking again returns to the previous tab
settingsBtn.addEventListener('click', () => {
  if (settingsBtn.classList.contains('active')) {
    // Close settings — return to whichever tab was active
    const statusMap = {
      'current': 'CURRENT',
      'planning': 'PLANNING',
      'completed': 'COMPLETED',
      'paused': 'PAUSED',
      'dropped': 'DROPPED',
      'repeating': 'REPEATING'
    };
    if (state.currentTab === 'search') {
      showSearchView();
    } else if (statusMap[state.currentTab]) {
      showListView(statusMap[state.currentTab]);
    } else {
      showSearchView();
    }
  } else {
    showSettingsView();
  }
});

// Settings back button — same logic as clicking the gear icon to close
settingsBackBtn?.addEventListener('click', () => {
  settingsBtn.click();
});

// Settings logout button
settingsLogoutBtn.addEventListener('click', async () => {
  await Storage.clearAuthData();
  showView('login');
});

// Season browser event listeners
const seasonToggleBtn = document.getElementById('season-toggle-btn');
const seasonSelect = document.getElementById('season-select');
const seasonYearSelect = document.getElementById('season-year-select');

const seasonCloseBtn = document.getElementById('season-close-btn');

seasonToggleBtn?.addEventListener('click', () => toggleSeasonBrowser());
seasonCloseBtn?.addEventListener('click', () => toggleSeasonBrowser());
seasonSelect?.addEventListener('change', () => setSeasonFromSelects());
seasonYearSelect?.addEventListener('change', () => setSeasonFromSelects());

// Browse chips event delegation
const browseChipsContainer = document.getElementById('browse-chips');
browseChipsContainer?.addEventListener('click', (e) => {
  const chip = e.target.closest('.browse-chip');
  if (!chip) return;
  loadBrowseCategory(chip.dataset.category);
});

// Genre filter (search/browse view) — acts as a picker: selecting a genre adds it as a chip
const searchGenreFilter = document.getElementById('search-genre-filter');
searchGenreFilter?.addEventListener('change', () => {
  const genre = searchGenreFilter.value;
  if (genre) {
    addSearchGenre(genre);
    searchGenreFilter.value = '';
  }
});

// Appearance toggle handlers
[themeToggle, layoutToggle, coversToggle].forEach(group => {
  if (!group) return;
  group.addEventListener('click', async (e) => {
    const btn = e.target.closest('.appearance-btn');
    if (!btn) return;
    const key = group.id === 'theme-toggle' ? 'theme'
              : group.id === 'layout-toggle' ? 'cardLayout' : 'covers';
    if (key === 'covers') {
      currentAppearance.showCovers = btn.dataset.value === 'show';
    } else {
      currentAppearance[key] = btn.dataset.value;
    }
    applyAppearance(currentAppearance);
    syncAppearanceUI(currentAppearance);
    await Storage.setAppearance(currentAppearance);
  });
});

// Statistics loader (non-blocking, cached for 1 hour)
const STATS_CACHE_TTL = 60 * 60 * 1000;

function renderStats(statsContainer, stats) {
  const { anime, manga } = stats;
  const daysWatched = (anime.minutesWatched / 1440).toFixed(1);

  statsContainer.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${anime.count}</div>
        <div class="stat-label">Anime</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${anime.episodesWatched.toLocaleString()}</div>
        <div class="stat-label">Episodes</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${daysWatched}</div>
        <div class="stat-label">Days Watched</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${anime.meanScore.toFixed(1)}</div>
        <div class="stat-label">Mean Score</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${manga.count}</div>
        <div class="stat-label">Manga</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${manga.chaptersRead.toLocaleString()}</div>
        <div class="stat-label">Chapters Read</div>
      </div>
    </div>
  `;
}

async function loadStatistics(userId) {
  const statsContainer = document.getElementById('stats-container');
  if (!statsContainer) return;

  // Check persistent cache first
  const cached = await Storage.getCache('userStatistics', STATS_CACHE_TTL);
  if (cached) {
    renderStats(statsContainer, cached);
    return;
  }

  try {
    const stats = await AniListAPI.getUserStatistics(userId);
    Storage.setCache('userStatistics', stats); // persist
    renderStats(statsContainer, stats);
  } catch (error) {
    console.error('Failed to load statistics:', error);
    statsContainer.innerHTML = '<p class="settings-note">Could not load statistics.</p>';
  }
}
