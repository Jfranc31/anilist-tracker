// List view and filtering
import { state, setListData, getPreferredTitle } from './state.js';
import { handleAPIError, setSkeletonLoading, emptyStateHTML, ICON_EMPTY_LIST, ICON_NO_RESULTS } from './error-handler.js';
import { createResultCard } from './card-renderer.js';

// DOM elements (will be set by main popup.js)
let listContainer, listSearchInput, formatFilter, statusFilter, statusFilterLabel, genreFilter, genreChipsContainer, sortSelect, listCount;
let selectedListGenres = [];

export function setDOMElements(elements) {
  listContainer = elements.listContainer;
  listSearchInput = elements.listSearchInput;
  formatFilter = elements.formatFilter;
  statusFilter = elements.statusFilter;
  statusFilterLabel = elements.statusFilterLabel;
  genreFilter = elements.genreFilter;
  genreChipsContainer = elements.genreChipsContainer;
  sortSelect = elements.sortSelect;
  listCount = elements.listCount;
}

export function addListGenre(genre) {
  if (!genre || selectedListGenres.includes(genre)) return;
  selectedListGenres.push(genre);
  renderListGenreChips();
  filterList();
}

export function removeListGenre(genre) {
  selectedListGenres = selectedListGenres.filter(g => g !== genre);
  renderListGenreChips();
  filterList();
}

function renderListGenreChips() {
  if (!genreChipsContainer) return;
  genreChipsContainer.innerHTML = '';
  for (const genre of selectedListGenres) {
    const chip = document.createElement('span');
    chip.className = 'active-genre-chip';
    chip.innerHTML = `${genre} <button class="genre-chip-remove">&times;</button>`;
    chip.querySelector('.genre-chip-remove').addEventListener('click', () => removeListGenre(genre));
    genreChipsContainer.appendChild(chip);
  }
}

export async function loadList(status) {
  if (!listContainer) return;

  const mediaName = state.currentMediaType === 'ANIME' ? 'anime' : 'manga';
  setSkeletonLoading(listContainer, 5);

  // Reset filters (but preserve sort selection)
  if (listSearchInput) listSearchInput.value = '';
  if (formatFilter) formatFilter.value = '';
  if (statusFilter) statusFilter.value = '';
  if (genreFilter) genreFilter.value = '';
  selectedListGenres = [];
  renderListGenreChips();

  // Update format filter options based on media type
  updateFormatFilterOptions();

  try {
    const entries = await AniListAPI.getUserAnimeList(status, state.currentMediaType);
    setListData(entries);

    if (entries.length === 0) {
      listContainer.innerHTML = emptyStateHTML(ICON_EMPTY_LIST, `No ${mediaName} in this list yet.`);
      return;
    }

    filterList(); // routes through sort logic
  } catch (error) {
    console.error('Error loading list:', error);
    const formattedError = handleAPIError(error, 'Failed to load list. Please try again.');

    // Don't show error in container if it's an auth error (user will be redirected)
    if (!formattedError.requiresReauth) {
      listContainer.innerHTML = `<p class="hint error">${formattedError.message}</p>`;
    }
  }
}

const BATCH_SIZE = 50;

async function renderBatch(entries, offset) {
  const fragment = document.createDocumentFragment();
  const batch = entries.slice(offset, offset + BATCH_SIZE);

  for (const [i, entry] of batch.entries()) {
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
    const card = await createResultCard(anime, offset + i);
    fragment.appendChild(card);
  }
  listContainer.appendChild(fragment);

  const nextOffset = offset + batch.length;
  if (nextOffset < entries.length) {
    // Sentinel triggers the next batch when scrolled into view
    const sentinel = document.createElement('div');
    sentinel.className = 'list-sentinel';
    listContainer.appendChild(sentinel);

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        sentinel.remove();
        renderBatch(entries, nextOffset);
      }
    }, { threshold: 0.1 });
    observer.observe(sentinel);
  }
}

async function displayListResults(entries) {
  if (!listContainer) return;
  listContainer.innerHTML = '';
  await renderBatch(entries, 0);
}

export function filterList(query = null) {
  if (!listSearchInput || !formatFilter || !statusFilter || !listContainer) return;

  // Get filter values
  const searchQuery = (query !== null ? query : listSearchInput.value).trim().toLowerCase();
  const selectedFormat = formatFilter.value;
  const selectedStatus = statusFilter.value;
  // Apply filters
  const filtered = state.currentListData.filter(entry => {
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

    // Genre filter (all selected genres must be present)
    if (selectedListGenres.length > 0) {
      const entryGenres = entry.media.genres || [];
      if (!selectedListGenres.every(g => entryGenres.includes(g))) return false;
    }

    return true;
  });

  // Sort the filtered results
  const sortValue = sortSelect?.value || 'title-asc';
  filtered.sort((a, b) => {
    switch (sortValue) {
      case 'title-asc':
        return getPreferredTitle(a.media.title).localeCompare(getPreferredTitle(b.media.title));
      case 'title-desc':
        return getPreferredTitle(b.media.title).localeCompare(getPreferredTitle(a.media.title));
      case 'score-desc':
        return (b.score || 0) - (a.score || 0);
      case 'score-asc':
        return (a.score || 0) - (b.score || 0);
      case 'progress-desc':
        return (b.progress || 0) - (a.progress || 0);
      case 'progress-asc':
        return (a.progress || 0) - (b.progress || 0);
      case 'updated-desc':
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      default:
        return 0;
    }
  });

  if (listCount) {
    const total = state.currentListData.length;
    listCount.textContent = filtered.length === total
      ? `${total} ${total === 1 ? 'entry' : 'entries'}`
      : `${filtered.length} of ${total}`;
  }

  if (filtered.length === 0) {
    listContainer.innerHTML = emptyStateHTML(ICON_NO_RESULTS, 'No matches found.');
  } else {
    displayListResults(filtered);
  }
}

export function clearFilters() {
  if (!listSearchInput || !formatFilter || !statusFilter) return;

  listSearchInput.value = '';
  formatFilter.value = '';
  statusFilter.value = '';
  if (genreFilter) genreFilter.value = '';
  selectedListGenres = [];
  renderListGenreChips();
  if (sortSelect) sortSelect.value = 'title-asc';
  filterList();
}

export function updateFormatFilterOptions() {
  if (!formatFilter) return;

  if (state.currentMediaType === 'ANIME') {
    // Update format filter
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

    // Update status filter label and options
    if (statusFilterLabel) statusFilterLabel.textContent = 'Anime Status';
    if (statusFilter) {
      statusFilter.innerHTML = `
        <option value="">All Status</option>
        <option value="RELEASING">Airing</option>
        <option value="FINISHED">Finished</option>
        <option value="NOT_YET_RELEASED">Not Yet Aired</option>
        <option value="CANCELLED">Cancelled</option>
      `;
    }
  } else {
    // Update format filter
    formatFilter.innerHTML = `
      <option value="">All Formats</option>
      <option value="MANGA">Manga</option>
      <option value="NOVEL">Light Novel</option>
      <option value="ONE_SHOT">One Shot</option>
    `;

    // Update status filter label and options
    if (statusFilterLabel) statusFilterLabel.textContent = 'Manga Status';
    if (statusFilter) {
      statusFilter.innerHTML = `
        <option value="">All Status</option>
        <option value="RELEASING">Publishing</option>
        <option value="FINISHED">Finished</option>
        <option value="NOT_YET_RELEASED">Not Yet Published</option>
        <option value="CANCELLED">Cancelled</option>
      `;
    }
  }
}
