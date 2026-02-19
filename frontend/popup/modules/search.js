// Search functionality
import { state } from './state.js';
import { handleAPIError, setSkeletonLoading, emptyStateHTML, ICON_SEARCH, ICON_NO_RESULTS } from './error-handler.js';
import { createResultCard } from './card-renderer.js';

// Cache TTL: 1 hour for browse/season data (doesn't change often)
const CACHE_TTL = 60 * 60 * 1000;

// DOM elements (will be set by main popup.js)
let resultsContainer = null;

// Pagination state
let currentQuery = '';
let currentPage = 1;
let hasNextPage = false;

// Browse category state
let activeBrowseCategory = null;
let browsePage = 1;
let browseHasNextPage = false;

// Genre filter state
let activeGenreFilters = [];
let searchGenreChipsContainer = null;

// Season browser state
let seasonBrowseActive = false;
let currentSeason = 'WINTER';
let currentSeasonYear = 2026;
let seasonPage = 1;
let seasonHasNextPage = false;
const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

// Determine current season from date
(function initSeason() {
  const now = new Date();
  const month = now.getMonth();
  currentSeasonYear = now.getFullYear();
  if (month < 3) currentSeason = 'WINTER';
  else if (month < 6) currentSeason = 'SPRING';
  else if (month < 9) currentSeason = 'SUMMER';
  else currentSeason = 'FALL';
})();

// Helper: get next season/year from current
function getNextSeason() {
  const idx = SEASONS.indexOf(currentSeason);
  if (idx < 3) return { season: SEASONS[idx + 1], year: currentSeasonYear };
  return { season: SEASONS[0], year: currentSeasonYear + 1 };
}

// Category display names
const CATEGORY_TITLES = {
  'trending': 'Trending Now',
  'this-season': 'Popular This Season',
  'upcoming': 'Upcoming Next Season',
  'popular': 'All Time Popular',
  'top-rated': 'Top 100'
};

export function setDOMElements(elements) {
  resultsContainer = elements.resultsContainer;
  searchGenreChipsContainer = elements.searchGenreChipsContainer || null;
}

function genresForAPI() {
  return activeGenreFilters.length > 0 ? activeGenreFilters : null;
}

function genreCacheKey() {
  return activeGenreFilters.length > 0 ? '_' + activeGenreFilters.join(',') : '';
}

function reloadActiveView() {
  if (seasonBrowseActive) {
    loadSeasonResults();
  } else if (activeBrowseCategory) {
    browsePage = 1;
    browseHasNextPage = false;
    loadBrowseCategoryData(activeBrowseCategory);
  } else if (currentQuery) {
    searchAnime(currentQuery);
  }
}

export function addSearchGenre(genre) {
  if (!genre || activeGenreFilters.includes(genre)) return;
  activeGenreFilters.push(genre);
  renderSearchGenreChips();
  reloadActiveView();
}

export function removeSearchGenre(genre) {
  activeGenreFilters = activeGenreFilters.filter(g => g !== genre);
  renderSearchGenreChips();
  reloadActiveView();
}

export function clearSearchGenres() {
  activeGenreFilters = [];
  renderSearchGenreChips();
}

function renderSearchGenreChips() {
  if (!searchGenreChipsContainer) return;
  searchGenreChipsContainer.innerHTML = '';
  for (const genre of activeGenreFilters) {
    const chip = document.createElement('span');
    chip.className = 'active-genre-chip';
    chip.innerHTML = `${genre} <button class="genre-chip-remove">&times;</button>`;
    chip.querySelector('.genre-chip-remove').addEventListener('click', () => removeSearchGenre(genre));
    searchGenreChipsContainer.appendChild(chip);
  }
}

// ─── Default empty state ──────────────────────────────────────────────────

function showDefaultEmptyState() {
  if (!resultsContainer) return;
  const mediaName = state.currentMediaType === 'ANIME' ? 'anime' : 'manga';
  resultsContainer.innerHTML = emptyStateHTML(ICON_SEARCH, `Search or browse ${mediaName} to get started.`);
}

// ─── Search ───────────────────────────────────────────────────────────────

export async function searchAnime(query) {
  if (!query || query.trim().length < 2) {
    if (resultsContainer) {
      resultsContainer.innerHTML = emptyStateHTML(ICON_SEARCH, 'Enter at least 2 characters to search.');
    }
    return;
  }

  // Exit season browse mode when searching
  if (seasonBrowseActive) {
    seasonBrowseActive = false;
    const seasonBrowser = document.getElementById('season-browser');
    const searchSection = document.querySelector('.search-section');
    const seasonToggleBtn = document.getElementById('season-toggle-btn');
    seasonBrowser?.classList.add('hidden');
    searchSection?.classList.remove('hidden');
    seasonToggleBtn?.classList.remove('active');
  }

  // Deselect browse category when searching
  if (activeBrowseCategory) {
    activeBrowseCategory = null;
    updateChipUI();
  }

  currentQuery = query;
  currentPage = 1;

  const mediaName = state.currentMediaType === 'ANIME' ? 'anime' : 'manga';
  setSkeletonLoading(resultsContainer, 4);

  try {
    const searchResults = await AniListAPI.searchAnimeList(query, 1, 10, state.currentMediaType, genresForAPI());

    if (!searchResults || !searchResults.media || searchResults.media.length === 0) {
      if (resultsContainer) {
        resultsContainer.innerHTML = emptyStateHTML(ICON_NO_RESULTS, `No ${mediaName} found. Try a different search term.`);
      }
      return;
    }

    hasNextPage = searchResults.pageInfo?.hasNextPage || false;
    await displaySearchResults(searchResults.media);
    if (hasNextPage) appendLoadMoreButton();
  } catch (error) {
    console.error('Search error:', error);
    const formattedError = handleAPIError(error, 'Search failed. Please try again.');

    if (!formattedError.requiresReauth && resultsContainer) {
      resultsContainer.innerHTML = `<p class="hint error">${formattedError.message}</p>`;
    }
  }
}

async function loadMore() {
  if (!hasNextPage || !currentQuery) return;

  const loadMoreBtn = resultsContainer?.querySelector('.load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading...';
  }

  try {
    currentPage++;
    const searchResults = await AniListAPI.searchAnimeList(currentQuery, currentPage, 10, state.currentMediaType, genresForAPI());

    if (!searchResults || !searchResults.media) return;

    hasNextPage = searchResults.pageInfo?.hasNextPage || false;
    loadMoreBtn?.remove();

    const startIdx = resultsContainer.querySelectorAll('.result-card').length;
    for (const [i, anime] of searchResults.media.entries()) {
      const card = await createResultCard(anime, startIdx + i);
      resultsContainer.appendChild(card);
    }

    if (hasNextPage) appendLoadMoreButton();
  } catch (error) {
    console.error('Load more error:', error);
    if (loadMoreBtn) {
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = 'Load more';
    }
    handleAPIError(error, 'Failed to load more results.');
  }
}

function appendLoadMoreButton() {
  if (!resultsContainer) return;
  const btn = document.createElement('button');
  btn.className = 'load-more-btn';
  btn.textContent = 'Load more';
  btn.addEventListener('click', loadMore);
  resultsContainer.appendChild(btn);
}

async function displaySearchResults(animeList) {
  if (!resultsContainer) return;
  resultsContainer.innerHTML = '';

  for (const [i, anime] of animeList.entries()) {
    const resultCard = await createResultCard(anime, i);
    resultsContainer.appendChild(resultCard);
  }
}

// ─── Browse Categories ──────────────────────────────────────────────────────

function updateChipUI() {
  const chips = document.querySelectorAll('.browse-chip');
  chips.forEach(chip => {
    chip.classList.toggle('active', chip.dataset.category === activeBrowseCategory);
  });
}

export function updateBrowseChipsVisibility() {
  const isManga = state.currentMediaType === 'MANGA';
  document.querySelectorAll('.browse-chip.anime-only').forEach(chip => {
    chip.classList.toggle('hidden', isManga);
  });
}

export function clearBrowseCategory() {
  activeBrowseCategory = null;
  updateChipUI();
  showDefaultEmptyState();
}

export async function loadBrowseCategory(category) {
  if (!resultsContainer) return;

  // Toggle off if same category clicked again
  if (activeBrowseCategory === category) {
    clearBrowseCategory();
    return;
  }

  activeBrowseCategory = category;
  browsePage = 1;
  browseHasNextPage = false;
  updateChipUI();

  await loadBrowseCategoryData(category);
}

async function loadBrowseCategoryData(category) {
  if (!resultsContainer) return;

  const type = state.currentMediaType;
  const cacheKey = `browse_${category}_${type}${genreCacheKey()}`;

  // Check persistent cache first (only for page 1)
  const cached = await Storage.getCache(cacheKey, CACHE_TTL);
  if (cached) {
    const isOldFormat = Array.isArray(cached);
    const media = isOldFormat ? cached : cached.media;
    // Old cache format (plain array) didn't store hasNextPage — assume more pages if full page
    browseHasNextPage = isOldFormat ? media.length >= 20 : (cached.hasNextPage || false);
    await displayBrowseResults(media, CATEGORY_TITLES[category], category);
    if (browseHasNextPage) appendBrowseLoadMoreButton();
    return;
  }

  // Fetch from API
  setSkeletonLoading(resultsContainer, 4);

  try {
    const result = await fetchBrowsePage(category, type, 1);

    if (!result.media || result.media.length === 0) {
      resultsContainer.innerHTML = emptyStateHTML(ICON_NO_RESULTS, `No results found for ${CATEGORY_TITLES[category]}.`);
      return;
    }

    browseHasNextPage = result.hasNextPage;
    Storage.setCache(cacheKey, { media: result.media, hasNextPage: result.hasNextPage });
    await displayBrowseResults(result.media, CATEGORY_TITLES[category], category);
    if (browseHasNextPage) appendBrowseLoadMoreButton();
  } catch (error) {
    console.error(`Browse ${category} error:`, error);
    handleAPIError(error, `Failed to load ${CATEGORY_TITLES[category]}.`);
  }
}

async function fetchBrowsePage(category, type, page) {
  let result;
  const genres = genresForAPI();

  switch (category) {
    case 'trending':
      result = await AniListAPI.getTrending(type, page, 20, genres);
      break;
    case 'this-season':
      result = await AniListAPI.getSeasonMedia(currentSeason, currentSeasonYear, type, page, 20, genres);
      break;
    case 'upcoming': {
      const next = getNextSeason();
      result = await AniListAPI.getSeasonMedia(next.season, next.year, type, page, 20, genres);
      break;
    }
    case 'popular':
      result = await AniListAPI.getPopularAllTime(type, page, 20, genres);
      break;
    case 'top-rated':
      result = await AniListAPI.getTopRated(type, page, 20, genres);
      break;
  }

  return { media: result.media, hasNextPage: result.pageInfo?.hasNextPage || false };
}

async function loadMoreBrowse() {
  if (!browseHasNextPage || !activeBrowseCategory) return;

  const loadMoreBtn = resultsContainer?.querySelector('.load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading...';
  }

  try {
    browsePage++;
    const result = await fetchBrowsePage(activeBrowseCategory, state.currentMediaType, browsePage);

    if (!result.media) return;

    browseHasNextPage = result.hasNextPage;
    loadMoreBtn?.remove();

    const startIdx = resultsContainer.querySelectorAll('.result-card').length;
    const showRank = activeBrowseCategory === 'top-rated';
    for (const [i, anime] of result.media.entries()) {
      const options = showRank ? { rank: startIdx + i + 1 } : {};
      const card = await createResultCard(anime, startIdx + i, options);
      resultsContainer.appendChild(card);
    }

    if (browseHasNextPage) appendBrowseLoadMoreButton();
  } catch (error) {
    console.error('Browse load more error:', error);
    if (loadMoreBtn) {
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = 'Load more';
    }
    handleAPIError(error, 'Failed to load more results.');
  }
}

function appendBrowseLoadMoreButton() {
  if (!resultsContainer) return;
  const btn = document.createElement('button');
  btn.className = 'load-more-btn';
  btn.textContent = 'Load more';
  btn.addEventListener('click', loadMoreBrowse);
  resultsContainer.appendChild(btn);
}

async function displayBrowseResults(mediaList, title, category) {
  if (!resultsContainer) return;
  resultsContainer.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'trending-header';
  header.innerHTML = `<h4 class="trending-title">${title}</h4>`;
  resultsContainer.appendChild(header);

  const showRank = category === 'top-rated';
  for (const [i, anime] of mediaList.entries()) {
    const options = showRank ? { rank: i + 1 } : {};
    const card = await createResultCard(anime, i, options);
    resultsContainer.appendChild(card);
  }
}

// ─── Season Browser ─────────────────────────────────────────────────────────

function populateYearSelect() {
  const yearSelect = document.getElementById('season-year-select');
  if (!yearSelect) return;
  const now = new Date().getFullYear();
  yearSelect.innerHTML = '';
  for (let y = now + 1; y >= 1970; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  }
  yearSelect.value = currentSeasonYear;
}

function syncSeasonSelects() {
  const seasonSelect = document.getElementById('season-select');
  const yearSelect = document.getElementById('season-year-select');
  if (seasonSelect) seasonSelect.value = currentSeason;
  if (yearSelect) yearSelect.value = currentSeasonYear;
}

export function toggleSeasonBrowser() {
  seasonBrowseActive = !seasonBrowseActive;
  const seasonBrowser = document.getElementById('season-browser');
  const searchSection = document.querySelector('.search-section');
  const seasonToggleBtn = document.getElementById('season-toggle-btn');
  const browseChips = document.getElementById('browse-chips');

  if (seasonBrowseActive) {
    // Deselect browse chips when entering season mode
    activeBrowseCategory = null;
    updateChipUI();

    populateYearSelect();
    syncSeasonSelects();
    seasonBrowser?.classList.remove('hidden');
    searchSection?.classList.add('hidden');
    browseChips?.classList.add('hidden');
    seasonToggleBtn?.classList.add('active');
    loadSeasonResults();
  } else {
    seasonBrowser?.classList.add('hidden');
    searchSection?.classList.remove('hidden');
    browseChips?.classList.remove('hidden');
    seasonToggleBtn?.classList.remove('active');
    showDefaultEmptyState();
  }
}

export function resetSeasonBrowser() {
  if (seasonBrowseActive) {
    seasonBrowseActive = false;
    const seasonBrowser = document.getElementById('season-browser');
    const searchSection = document.querySelector('.search-section');
    const seasonToggleBtn = document.getElementById('season-toggle-btn');
    const browseChips = document.getElementById('browse-chips');
    seasonBrowser?.classList.add('hidden');
    searchSection?.classList.remove('hidden');
    browseChips?.classList.remove('hidden');
    seasonToggleBtn?.classList.remove('active');
  }
}

export function setSeasonFromSelects() {
  const seasonSelect = document.getElementById('season-select');
  const yearSelect = document.getElementById('season-year-select');
  if (seasonSelect) currentSeason = seasonSelect.value;
  if (yearSelect) currentSeasonYear = parseInt(yearSelect.value);
  loadSeasonResults();
}

async function loadSeasonResults() {
  if (!resultsContainer) return;

  seasonPage = 1;
  seasonHasNextPage = false;

  // Check persistent cache first (keyed by season + year + media type + genre)
  const cacheKey = `seasonCache_${currentSeason}_${currentSeasonYear}_${state.currentMediaType}${genreCacheKey()}`;
  const cached = await Storage.getCache(cacheKey, CACHE_TTL);
  if (cached) {
    const isOldFormat = Array.isArray(cached);
    const media = isOldFormat ? cached : cached.media;
    seasonHasNextPage = isOldFormat ? media.length >= 20 : (cached.hasNextPage || false);
    await displaySeasonResults(media);
    if (seasonHasNextPage) appendSeasonLoadMoreButton();
    return;
  }

  setSkeletonLoading(resultsContainer, 4);

  try {
    const result = await AniListAPI.getSeasonMedia(currentSeason, currentSeasonYear, state.currentMediaType, 1, 20, genresForAPI());
    if (!result.media || result.media.length === 0) {
      const mediaName = state.currentMediaType === 'ANIME' ? 'anime' : 'manga';
      resultsContainer.innerHTML = emptyStateHTML(ICON_NO_RESULTS, `No ${mediaName} found for this season.`);
      return;
    }
    seasonHasNextPage = result.pageInfo?.hasNextPage || false;
    Storage.setCache(cacheKey, { media: result.media, hasNextPage: seasonHasNextPage });
    await displaySeasonResults(result.media);
    if (seasonHasNextPage) appendSeasonLoadMoreButton();
  } catch (error) {
    console.error('Season load error:', error);
    handleAPIError(error, 'Failed to load season data.');
  }
}

async function loadMoreSeason() {
  if (!seasonHasNextPage) return;

  const loadMoreBtn = resultsContainer?.querySelector('.load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading...';
  }

  try {
    seasonPage++;
    const result = await AniListAPI.getSeasonMedia(currentSeason, currentSeasonYear, state.currentMediaType, seasonPage, 20, genresForAPI());

    if (!result.media) return;

    seasonHasNextPage = result.pageInfo?.hasNextPage || false;
    loadMoreBtn?.remove();

    const startIdx = resultsContainer.querySelectorAll('.result-card').length;
    for (const [i, anime] of result.media.entries()) {
      const card = await createResultCard(anime, startIdx + i);
      resultsContainer.appendChild(card);
    }

    if (seasonHasNextPage) appendSeasonLoadMoreButton();
  } catch (error) {
    console.error('Season load more error:', error);
    if (loadMoreBtn) {
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = 'Load more';
    }
    handleAPIError(error, 'Failed to load more results.');
  }
}

function appendSeasonLoadMoreButton() {
  if (!resultsContainer) return;
  const btn = document.createElement('button');
  btn.className = 'load-more-btn';
  btn.textContent = 'Load more';
  btn.addEventListener('click', loadMoreSeason);
  resultsContainer.appendChild(btn);
}

async function displaySeasonResults(mediaList) {
  if (!resultsContainer) return;
  resultsContainer.innerHTML = '';
  for (const [i, anime] of mediaList.entries()) {
    const card = await createResultCard(anime, i);
    resultsContainer.appendChild(card);
  }
}
