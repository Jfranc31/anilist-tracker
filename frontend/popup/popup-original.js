// Popup script for AniList Tracker extension - Search-based UI

console.log('AniList Tracker popup loaded');

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
const searchView = document.getElementById('search-view');
const listView = document.getElementById('list-view');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const resultsContainer = document.getElementById('results-container');
const listSearchInput = document.getElementById('list-search-input');
const listContainer = document.getElementById('list-container');
const formatFilter = document.getElementById('format-filter');
const statusFilter = document.getElementById('status-filter');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const detailView = document.getElementById('detail-view');
const backBtn = document.getElementById('back-btn');
const detailCover = document.getElementById('detail-cover');
const detailTitle = document.getElementById('detail-title');
const detailMeta = document.getElementById('detail-meta');
const detailStatus = document.getElementById('detail-status');
const detailProgressLabel = document.getElementById('detail-progress-label');
const detailEpisodeInput = document.getElementById('detail-episode-input');
const detailUpdateBtn = document.getElementById('detail-update-btn');
const detailStatusButtons = document.getElementById('detail-status-buttons');
const statusMessage = document.getElementById('status-message');
const toggleAnime = document.getElementById('toggle-anime');
const toggleManga = document.getElementById('toggle-manga');

// Store timeout ID for status message
let statusMessageTimeout = null;

// Track current tab, list data, and media type
let currentTab = 'search';
let currentListData = [];
let currentMediaType = 'ANIME'; // 'ANIME' or 'MANGA'

// Error handling utilities
function handleAPIError(error, defaultMessage = 'An error occurred') {
  const formattedError = AniListAPI.formatError(error);

  // Handle authentication errors - prompt re-login
  if (formattedError.requiresReauth) {
    showError(formattedError.message, 'error', 10000);
    // Auto-redirect to login after a delay
    setTimeout(() => {
      showView('login');
    }, 2000);
    return formattedError;
  }

  // Handle rate limiting
  if (formattedError.type === 'RATE_LIMIT') {
    showError(formattedError.message, 'warning', 10000);
    return formattedError;
  }

  // Handle network errors
  if (formattedError.type === 'NETWORK_ERROR') {
    showError(formattedError.message, 'error', 5000);
    return formattedError;
  }

  // Handle server errors
  if (formattedError.type === 'SERVER_ERROR') {
    showError(formattedError.message, 'error', 5000);
    return formattedError;
  }

  // Handle GraphQL errors
  if (formattedError.type === 'GRAPHQL_ERROR') {
    showError(formattedError.message, 'error', 5000);
    return formattedError;
  }

  // Default error handling
  showError(formattedError.message || defaultMessage, 'error', 5000);
  return formattedError;
}

function showError(message, type = 'error', duration = 5000) {
  showStatus(message, type, duration);
}

function showSuccess(message, duration = 3000) {
  showStatus(message, 'success', duration);
}

function showStatus(message, type = 'info', duration = 3000) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.classList.remove('hidden');

  // Clear existing timeout
  if (statusMessageTimeout) {
    clearTimeout(statusMessageTimeout);
  }

  // Auto-hide after duration
  statusMessageTimeout = setTimeout(() => {
    hideStatus();
  }, duration);
}

function hideStatus() {
  statusMessage.classList.add('hidden');
  if (statusMessageTimeout) {
    clearTimeout(statusMessageTimeout);
    statusMessageTimeout = null;
  }
}

// Loading state utilities
function setLoading(container, message = 'Loading...') {
  if (container) {
    container.innerHTML = `<div class="loading-state"><div class="loader"></div><p>${message}</p></div>`;
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await initializePopup();
});

async function initializePopup() {
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

function showView(viewName) {
  loginView.classList.add('hidden');
  mainView.classList.add('hidden');
  loadingView.classList.add('hidden');

  switch(viewName) {
    case 'login':
      loginView.classList.remove('hidden');
      break;
    case 'main':
      mainView.classList.remove('hidden');
      break;
    case 'loading':
      loadingView.classList.remove('hidden');
      break;
  }
}

async function showMainView() {
  try {
    const user = await Storage.getUser();

    if (user) {
      userName.textContent = user.name;
      userAvatar.src = user.avatar.medium;
      userAvatar.alt = `${user.name}'s avatar`;
    }

    showView('main');

    // Check if there's a selected anime
    const result = await chrome.storage.local.get(['selectedAnime']);
    if (result.selectedAnime) {
      await showDetailView(result.selectedAnime);
    } else {
      showSearchView();
    }
  } catch (error) {
    console.error('Error showing main view:', error);
    showView('login');
  }
}

function showSearchView() {
  currentTab = 'search';
  searchView.classList.remove('hidden');
  listView.classList.add('hidden');
  detailView.classList.add('hidden');
  setActiveTab(tabSearch);
  // Focus search input
  setTimeout(() => searchInput.focus(), 100);
}

async function showListView(status) {
  currentTab = status.toLowerCase();
  searchView.classList.add('hidden');
  listView.classList.remove('hidden');
  detailView.classList.add('hidden');

  // Set active tab
  switch(status) {
    case 'CURRENT':
      setActiveTab(tabWatching);
      break;
    case 'PLANNING':
      setActiveTab(tabPlanning);
      break;
    case 'COMPLETED':
      setActiveTab(tabCompleted);
      break;
  }

  // Load list data
  await loadList(status);
}

function setActiveTab(activeTab) {
  [tabSearch, tabWatching, tabPlanning, tabCompleted].forEach(tab => {
    tab.classList.remove('active');
  });
  activeTab.classList.add('active');
}

async function loadList(status) {
  const mediaName = currentMediaType === 'ANIME' ? 'anime' : 'manga';
  setLoading(listContainer, `Loading ${mediaName} list...`);

  // Reset filters
  listSearchInput.value = '';
  formatFilter.value = '';
  statusFilter.value = '';

  // Update format filter options based on media type
  updateFormatFilterOptions();

  try {
    const entries = await AniListAPI.getUserAnimeList(status, currentMediaType);
    currentListData = entries;

    if (entries.length === 0) {
      listContainer.innerHTML = `<p class="hint">No ${mediaName} in this list yet.</p>`;
      return;
    }

    displayListResults(entries);
  } catch (error) {
    console.error('Error loading list:', error);
    const formattedError = handleAPIError(error, 'Failed to load list. Please try again.');

    // Don't show error in container if it's an auth error (user will be redirected)
    if (!formattedError.requiresReauth) {
      listContainer.innerHTML = `<p class="hint error">${formattedError.message}</p>`;
    }
  }
}

async function displayListResults(entries) {
  listContainer.innerHTML = '';

  for (const entry of entries) {
    // Transform entry to look like search result
    const anime = {
      ...entry.media,
      mediaListEntry: {
        id: entry.id,
        status: entry.status,
        progress: entry.progress,
        score: entry.score,
        repeat: entry.repeat
      }
    };

    const resultCard = await createResultCard(anime);
    listContainer.appendChild(resultCard);
  }
}

function filterList(query = null) {
  // Get filter values
  const searchQuery = (query !== null ? query : listSearchInput.value).trim().toLowerCase();
  const selectedFormat = formatFilter.value;
  const selectedStatus = statusFilter.value;

  // Apply filters
  const filtered = currentListData.filter(entry => {
    // Search filter (across all title variations)
    if (searchQuery.length > 0) {
      const romaji = (entry.media.title.romaji || '').toLowerCase();
      const english = (entry.media.title.english || '').toLowerCase();
      const native = (entry.media.title.native || '').toLowerCase();

      const matchesSearch = romaji.includes(searchQuery) ||
                           english.includes(searchQuery) ||
                           native.includes(searchQuery);

      if (!matchesSearch) return false;
    }

    // Format filter
    if (selectedFormat && entry.media.format !== selectedFormat) {
      return false;
    }

    // Status filter (anime airing status, not user's watch status)
    if (selectedStatus && entry.media.status !== selectedStatus) {
      return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    listContainer.innerHTML = '<p class="hint">No matches found.</p>';
  } else {
    displayListResults(filtered);
  }
}

function clearFilters() {
  listSearchInput.value = '';
  formatFilter.value = '';
  statusFilter.value = '';
  filterList();
}

function updateFormatFilterOptions() {
  if (currentMediaType === 'ANIME') {
    formatFilter.innerHTML = `
      <option value="">All Formats</option>
      <option value="TV">TV</option>
      <option value="TV_SHORT">TV Short</option>
      <option value="MOVIE">Movie</option>
      <option value="SPECIAL">Special</option>
      <option value="OVA">OVA</option>
      <option value="ONA">ONA</option>
      <option value="MUSIC">Music</option>
    `;
  } else {
    formatFilter.innerHTML = `
      <option value="">All Formats</option>
      <option value="MANGA">Manga</option>
      <option value="NOVEL">Light Novel</option>
      <option value="ONE_SHOT">One Shot</option>
    `;
  }
}

function switchMediaType(type) {
  currentMediaType = type;

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
    tabWatching.textContent = 'Watching';
    tabPlanning.textContent = 'Plan to Watch';
  } else {
    tabWatching.textContent = 'Reading';
    tabPlanning.textContent = 'Plan to Read';
  }

  // Clear selected anime
  chrome.storage.local.remove('selectedAnime');

  // Reload current view
  if (currentTab === 'search') {
    resultsContainer.innerHTML = '<p class="hint">Search for ' + (type === 'ANIME' ? 'anime' : 'manga') + ' to update your progress or add to your list.</p>';
    searchInput.value = '';
  } else {
    // Reload list view with new media type
    const statusMap = {
      'current': 'CURRENT',
      'planning': 'PLANNING',
      'completed': 'COMPLETED'
    };
    if (statusMap[currentTab]) {
      loadList(statusMap[currentTab]);
    }
  }
}

function showDetailViewUI() {
  searchView.classList.add('hidden');
  listView.classList.add('hidden');
  detailView.classList.remove('hidden');
}

async function searchAnime(query) {
  if (!query || query.trim().length < 2) {
    resultsContainer.innerHTML = '<p class="hint">Enter at least 2 characters to search.</p>';
    return;
  }

  const mediaName = currentMediaType === 'ANIME' ? 'anime' : 'manga';
  setLoading(resultsContainer, `Searching for ${mediaName}...`);

  try {
    const searchResults = await AniListAPI.searchAnimeList(query, 1, 10, currentMediaType);

    if (!searchResults || !searchResults.media || searchResults.media.length === 0) {
      resultsContainer.innerHTML = `<p class="hint">No ${mediaName} found. Try a different search term.</p>`;
      return;
    }

    // Display results
    await displaySearchResults(searchResults.media);
  } catch (error) {
    console.error('Search error:', error);
    const formattedError = handleAPIError(error, 'Search failed. Please try again.');

    // Don't show error in container if it's an auth error (user will be redirected)
    if (!formattedError.requiresReauth) {
      resultsContainer.innerHTML = `<p class="hint error">${formattedError.message}</p>`;
    }
  }
}

async function displaySearchResults(animeList) {
  resultsContainer.innerHTML = '';

  for (const anime of animeList) {
    const resultCard = await createResultCard(anime);
    resultsContainer.appendChild(resultCard);
  }
}

async function createResultCard(anime) {
  const card = document.createElement('div');
  card.className = 'result-card';

  // Use the mediaListEntry that comes with search results (more accurate)
  const listEntry = anime.mediaListEntry;

  const cover = anime.coverImage.medium || '';
  const title = anime.title.romaji || anime.title.english;
  const isManga = currentMediaType === 'MANGA';

  // For anime: episodes, for manga: chapters
  const totalProgress = isManga ? (anime.chapters || '?') : (anime.episodes || '?');
  const progressLabel = isManga ? 'chapters' : 'episodes';
  const mediaStatus = anime.status; // RELEASING, FINISHED, etc.

  // Determine media status badge class and display text
  let statusBadgeClass = '';
  let statusText = mediaStatus || 'Unknown';

  switch(mediaStatus) {
    case 'RELEASING':
      statusBadgeClass = 'badge-airing';
      statusText = isManga ? 'Publishing' : 'Airing';
      break;
    case 'FINISHED':
      statusBadgeClass = 'badge-finished';
      statusText = 'Finished';
      break;
    case 'NOT_YET_RELEASED':
      statusBadgeClass = 'badge-upcoming';
      statusText = 'Upcoming';
      break;
    case 'CANCELLED':
      statusBadgeClass = 'badge-cancelled';
      statusText = 'Cancelled';
      break;
  }

  // Determine user's status and progress
  let userStatus = 'Not on list';
  let progress = 0;
  let statusClass = 'not-on-list';

  if (listEntry) {
    progress = listEntry.progress || 0;
    const listStatus = listEntry.status;

    // Action verbs based on media type
    const currentVerb = isManga ? 'Reading' : 'Watching';
    const planVerb = isManga ? 'Plan to Read' : 'Plan to Watch';
    const repeatVerb = isManga ? 'Rereading' : 'Rewatching';

    switch(listStatus) {
      case 'CURRENT':
        userStatus = `${currentVerb} (${progress}/${totalProgress})`;
        statusClass = 'watching';
        break;
      case 'COMPLETED':
        userStatus = `Completed (${progress}/${totalProgress})`;
        statusClass = 'completed';
        break;
      case 'PLANNING':
        userStatus = planVerb;
        statusClass = 'planning';
        break;
      case 'PAUSED':
        userStatus = `Paused (${progress}/${totalProgress})`;
        statusClass = 'paused';
        break;
      case 'DROPPED':
        userStatus = `Dropped (${progress}/${totalProgress})`;
        statusClass = 'dropped';
        break;
      case 'REPEATING':
        userStatus = `${repeatVerb} (${progress}/${totalProgress})`;
        statusClass = 'rewatching';
        break;
    }
  }

  card.innerHTML = `
    <img src="${cover}" alt="${title}" class="result-cover">
    <div class="result-info">
      <h4 class="result-title">${title}</h4>
      <p class="result-meta">${totalProgress} ${progressLabel} • <span class="status-badge ${statusBadgeClass}">${statusText}</span></p>
      <p class="result-status ${statusClass}">${userStatus}</p>
    </div>
  `;

  // Make card clickable to select media
  card.addEventListener('click', () => {
    selectAnime(anime);
  });

  return card;
}

// Select anime and show detail view
async function selectAnime(anime) {
  // Store selected anime
  await chrome.storage.local.set({ selectedAnime: anime });
  // Show detail view
  await showDetailView(anime);
}

// Show detail view for selected anime
async function showDetailView(anime) {
  // Show detail view with loading state first
  showDetailViewUI();

  // Clear and show loading in detail view
  detailCover.style.display = 'none';
  detailTitle.textContent = 'Loading...';
  detailMeta.textContent = '';
  detailStatus.textContent = '';
  detailEpisodeInput.parentElement.parentElement.style.display = 'none';
  detailStatusButtons.innerHTML = '';

  // Refresh media data from API to get latest info
  try {
    const query = anime.title.romaji || anime.title.english;
    const searchResults = await AniListAPI.searchAnimeList(query, 1, 5, currentMediaType);
    const refreshedAnime = searchResults.media.find(m => m.id === anime.id);

    if (refreshedAnime) {
      anime = refreshedAnime;
      // Update storage with refreshed data
      await chrome.storage.local.set({ selectedAnime: anime });
    }
  } catch (error) {
    console.error('Error refreshing media data:', error);
  }

  // Now populate with actual data
  const listEntry = anime.mediaListEntry;
  const cover = anime.coverImage.large || anime.coverImage.medium || '';
  const title = anime.title.romaji || anime.title.english;
  const isManga = currentMediaType === 'MANGA';
  const totalProgress = isManga ? (anime.chapters || '?') : (anime.episodes || '?');
  const progressLabel = isManga ? 'chapters' : 'episodes';
  const mediaStatus = anime.status; // RELEASING, FINISHED, etc.

  // Set cover and basic info
  detailCover.src = cover;
  detailCover.alt = title;
  detailCover.style.display = 'block'; // Show cover after loading
  detailTitle.textContent = title;
  detailMeta.textContent = `${totalProgress} ${progressLabel} • ${mediaStatus}`;

  // Update progress label
  detailProgressLabel.textContent = isManga ? 'Chapter Progress' : 'Episode Progress';

  // Determine user's status and progress
  let userStatus = 'Not on list';
  let progress = 0;
  let statusClass = 'not-on-list';

  if (listEntry) {
    progress = listEntry.progress || 0;
    const listStatus = listEntry.status;

    // Action verbs based on media type
    const currentVerb = isManga ? 'Reading' : 'Watching';
    const planVerb = isManga ? 'Plan to Read' : 'Plan to Watch';
    const repeatVerb = isManga ? 'Rereading' : 'Rewatching';
    const progressUnit = isManga ? 'Chapter' : 'Episode';

    switch(listStatus) {
      case 'CURRENT':
        userStatus = `${currentVerb} - ${progressUnit} ${progress} of ${totalProgress}`;
        statusClass = 'watching';
        break;
      case 'COMPLETED':
        userStatus = `Completed - ${progress}/${totalProgress} ${progressLabel}`;
        statusClass = 'completed';
        break;
      case 'PLANNING':
        userStatus = planVerb;
        statusClass = 'planning';
        break;
      case 'PAUSED':
        userStatus = `Paused - ${progressUnit} ${progress} of ${totalProgress}`;
        statusClass = 'paused';
        break;
      case 'DROPPED':
        userStatus = `Dropped - ${currentVerb === 'Reading' ? 'Read' : 'Watched'} ${progress}/${totalProgress} ${progressLabel}`;
        statusClass = 'dropped';
        break;
      case 'REPEATING':
        userStatus = `${repeatVerb} - ${progressUnit} ${progress} of ${totalProgress}`;
        statusClass = 'rewatching';
        break;
    }
  }

  detailStatus.textContent = userStatus;
  detailStatus.className = `detail-status ${statusClass}`;

  // Set up progress input and update button
  if (listEntry && (listEntry.status === 'CURRENT' || listEntry.status === 'REPEATING')) {
    detailEpisodeInput.value = progress + 1;
    detailEpisodeInput.max = totalProgress;
    detailEpisodeInput.parentElement.parentElement.style.display = 'block';
  } else if (listEntry && listEntry.status === 'COMPLETED') {
    detailEpisodeInput.value = progress;
    detailEpisodeInput.max = totalProgress;
    detailEpisodeInput.parentElement.parentElement.style.display = 'block';
  } else {
    detailEpisodeInput.parentElement.parentElement.style.display = 'none';
  }

  // Set up status buttons
  detailStatusButtons.innerHTML = '';

  // Button text based on media type
  const planText = isManga ? 'Add to Plan to Read' : 'Add to Plan to Watch';
  const startText = isManga ? 'Start Reading' : 'Start Watching';
  const resumeText = isManga ? 'Resume Reading' : 'Resume Watching';
  const repeatText = isManga ? 'Reread' : 'Rewatch';

  if (!listEntry) {
    // Not on list - show add button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-status';
    addBtn.textContent = planText;
    addBtn.onclick = () => addToListFromDetail(anime.id);
    detailStatusButtons.appendChild(addBtn);
  } else {
    // On list - show status change buttons
    const currentStatus = listEntry.status;

    if (currentStatus === 'PLANNING') {
      const startBtn = document.createElement('button');
      startBtn.className = 'btn btn-primary';
      startBtn.textContent = startText;
      startBtn.onclick = () => changeStatus(anime.id, 'CURRENT', 1);
      detailStatusButtons.appendChild(startBtn);
    }

    if (currentStatus === 'CURRENT' || currentStatus === 'REPEATING') {
      const pauseBtn = document.createElement('button');
      pauseBtn.className = 'btn btn-status';
      pauseBtn.textContent = 'Pause';
      pauseBtn.onclick = () => changeStatus(anime.id, 'PAUSED', progress);
      detailStatusButtons.appendChild(pauseBtn);

      const dropBtn = document.createElement('button');
      dropBtn.className = 'btn btn-status';
      dropBtn.textContent = 'Drop';
      dropBtn.onclick = () => changeStatus(anime.id, 'DROPPED', progress);
      detailStatusButtons.appendChild(dropBtn);
    }

    if (currentStatus === 'PAUSED' || currentStatus === 'DROPPED') {
      const resumeBtn = document.createElement('button');
      resumeBtn.className = 'btn btn-primary';
      resumeBtn.textContent = resumeText;
      resumeBtn.onclick = () => changeStatus(anime.id, 'CURRENT', progress);
      detailStatusButtons.appendChild(resumeBtn);
    }

    if (currentStatus === 'COMPLETED') {
      const repeatBtn = document.createElement('button');
      repeatBtn.className = 'btn btn-primary';
      repeatBtn.textContent = repeatText;
      repeatBtn.onclick = () => changeStatus(anime.id, 'REPEATING', 1);
      detailStatusButtons.appendChild(repeatBtn);
    }
  }
}

// Detail view action functions
async function updateProgressFromDetail() {
  const result = await chrome.storage.local.get(['selectedAnime']);
  if (!result.selectedAnime) return;

  const anime = result.selectedAnime;
  const progress = parseInt(detailEpisodeInput.value);
  const isManga = currentMediaType === 'MANGA';
  const total = isManga ? (anime.chapters || 0) : (anime.episodes || 0);
  const progressUnit = isManga ? 'chapter' : 'episode';

  if (!progress || progress < 1) {
    showError(`Please enter a valid ${progressUnit} number.`);
    return;
  }

  detailUpdateBtn.disabled = true;
  detailUpdateBtn.textContent = 'Updating...';

  try {
    // Determine status: COMPLETED if reached final progress, otherwise keep current status
    const currentStatus = anime.mediaListEntry?.status || 'CURRENT';
    const targetStatus = (total > 0 && progress >= total) ? 'COMPLETED' : currentStatus;

    await AniListAPI.updateProgress(anime.id, progress, targetStatus);
    showSuccess(`Updated to ${progressUnit} ${progress}!`);

    // Refresh detail view
    await showDetailView(anime);
  } catch (error) {
    console.error('Update failed:', error);
    handleAPIError(error, 'Failed to update. Please try again.');
  } finally {
    detailUpdateBtn.disabled = false;
    detailUpdateBtn.textContent = 'Update';
  }
}

async function addToListFromDetail(mediaId) {
  try {
    await AniListAPI.updateProgress(mediaId, 0, 'PLANNING');
    const planText = currentMediaType === 'MANGA' ? 'Plan to Read' : 'Plan to Watch';
    showSuccess(`Added to ${planText}!`);

    // Refresh detail view
    const result = await chrome.storage.local.get(['selectedAnime']);
    if (result.selectedAnime) {
      await showDetailView(result.selectedAnime);
    }
  } catch (error) {
    console.error('Add failed:', error);
    handleAPIError(error, 'Failed to add. Please try again.');
  }
}

async function changeStatus(mediaId, newStatus, progress) {
  try {
    await AniListAPI.updateProgress(mediaId, progress, newStatus);

    const isManga = currentMediaType === 'MANGA';
    const statusNames = {
      'CURRENT': isManga ? 'reading' : 'watching',
      'PLANNING': isManga ? 'plan to read' : 'plan to watch',
      'COMPLETED': 'completed',
      'PAUSED': 'paused',
      'DROPPED': 'dropped',
      'REPEATING': isManga ? 'rereading' : 'rewatching'
    };

    showSuccess(`Changed to ${statusNames[newStatus]}!`);

    // Refresh detail view
    const result = await chrome.storage.local.get(['selectedAnime']);
    if (result.selectedAnime) {
      await showDetailView(result.selectedAnime);
    }
  } catch (error) {
    console.error('Status change failed:', error);
    handleAPIError(error, 'Failed to change status. Please try again.');
  }
}

// Event listeners
loginBtn.addEventListener('click', async () => {
  console.log('Login button clicked');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Connecting...';

  try {
    const response = await chrome.runtime.sendMessage({ type: 'AUTHENTICATE' });

    if (response.success) {
      console.log('Authentication successful!', response.user.name);
      await showMainView();
    } else {
      throw new Error(response.error || 'Authentication failed');
    }
  } catch (error) {
    console.error('Login failed:', error);
    alert('Failed to connect to AniList. Please try again.\n\nError: ' + error.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Connect to AniList';
  }
});

logoutBtn.addEventListener('click', async () => {
  console.log('Logout button clicked');

  const confirmed = confirm('Are you sure you want to logout?');

  if (confirmed) {
    try {
      await Storage.clearAuthData();
      console.log('Logged out successfully');
      showView('login');
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Failed to logout. Please try again.');
    }
  }
});

// Search functionality
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

// List search/filter (debounced)
let listSearchTimeout;
listSearchInput.addEventListener('input', () => {
  clearTimeout(listSearchTimeout);
  listSearchTimeout = setTimeout(() => {
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

// Clear filters button
clearFiltersBtn.addEventListener('click', () => {
  clearFilters();
});

// Back button - return to previous view and clear selected anime
backBtn.addEventListener('click', async () => {
  await chrome.storage.local.remove('selectedAnime');

  // Return to the tab that was active before detail view
  if (currentTab === 'search') {
    showSearchView();
    // Clear search results
    resultsContainer.innerHTML = '<p class="hint">Search for anime to update your progress or add to your list.</p>';
    searchInput.value = '';
  } else {
    // Return to the list view
    const statusMap = {
      'current': 'CURRENT',
      'planning': 'PLANNING',
      'completed': 'COMPLETED'
    };
    await showListView(statusMap[currentTab]);
  }
});

// Detail view update button
detailUpdateBtn.addEventListener('click', () => {
  updateProgressFromDetail();
});

// Media type toggle buttons
toggleAnime.addEventListener('click', () => {
  if (currentMediaType !== 'ANIME') {
    switchMediaType('ANIME');
  }
});

toggleManga.addEventListener('click', () => {
  if (currentMediaType !== 'MANGA') {
    switchMediaType('MANGA');
  }
});
