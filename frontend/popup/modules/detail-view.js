// Detail view functionality
import { state, setMediaType, pushNavHistory, getPreferredTitle } from './state.js';
import { showDetailViewUI } from './views.js';
import { showError, showSuccess, handleAPIError } from './error-handler.js';
import { formatDateInput, parseDateInput, todayAsFuzzyDate, formatTimeUntil, statusName, listStatusText } from './detail/format.js';
import { renderStats, renderInfo, renderDescription, renderExternalLinks } from './detail/info-tab.js';
import { renderRelations, renderRecommendations } from './detail/related.js';
import { renderCharacters } from './detail/characters.js';

// DOM elements (will be set by main popup.js)
let detailCover, detailTitle, detailMeta, detailStatus;
let detailProgressLabel, detailEpisodeInput, detailProgressPlus, detailUpdateBtn;
let detailStatusButtons, detailScoreInput, detailVolumeInput;
let detailVolumeControl, detailScoreControl, detailStatusSelect, detailStatusLabel;
let detailInfoStats, detailMetaBlock, detailCharacters, detailRecommendations, detailExternalLinks, detailDescription, detailRelations, detailTrackingPanel, detailInfoPanel, detailInfoTab, detailCharactersPanel, detailRecsPanel;
let detailTrackingExtra, detailStartedAt, detailCompletedAt, detailRewatches, detailRewatchesLabel, detailNotesControl, detailNotes;
let detailTabBtns, detailBanner;
let detailPinBtn, detailPinRow;
let cleanSnapshot = null;

function captureCleanSnapshot() {
  cleanSnapshot = {
    status: detailStatusSelect?.value || '',
    progress: detailEpisodeInput?.value || '0',
    score: detailScoreInput?.value || '0',
    volume: detailVolumeInput?.value || '0',
    startedAt: detailStartedAt?.value || '',
    completedAt: detailCompletedAt?.value || '',
    rewatches: detailRewatches?.value || '0',
    notes: detailNotes?.value || ''
  };
}

export function isDetailDirty() {
  if (!cleanSnapshot) return false;
  return (
    (detailStatusSelect?.value || '') !== cleanSnapshot.status ||
    (detailEpisodeInput?.value || '0') !== cleanSnapshot.progress ||
    (detailScoreInput?.value || '0') !== cleanSnapshot.score ||
    (detailVolumeInput?.value || '0') !== cleanSnapshot.volume ||
    (detailStartedAt?.value || '') !== cleanSnapshot.startedAt ||
    (detailCompletedAt?.value || '') !== cleanSnapshot.completedAt ||
    (detailRewatches?.value || '0') !== cleanSnapshot.rewatches ||
    (detailNotes?.value || '') !== cleanSnapshot.notes
  );
}

export function setDOMElements(elements) {
  detailCover = elements.detailCover;
  detailTitle = elements.detailTitle;
  detailMeta = elements.detailMeta;
  detailStatus = elements.detailStatus;
  detailProgressLabel = elements.detailProgressLabel;
  detailEpisodeInput = elements.detailEpisodeInput;
  detailProgressPlus = elements.detailProgressPlus;
  detailUpdateBtn = elements.detailUpdateBtn;
  detailStatusButtons = elements.detailStatusButtons;
  detailScoreInput = elements.detailScoreInput;
  detailVolumeInput = elements.detailVolumeInput;
  detailVolumeControl = elements.detailVolumeControl;
  detailScoreControl = elements.detailScoreControl;
  detailStatusSelect = elements.detailStatusSelect;
  detailStatusLabel = elements.detailStatusLabel;
  detailInfoStats = elements.detailInfoStats;
  detailMetaBlock = elements.detailMetaBlock;
  detailCharacters = elements.detailCharacters;
  detailRecommendations = elements.detailRecommendations;
  detailExternalLinks = elements.detailExternalLinks;
  detailDescription = elements.detailDescription;
  detailRelations = elements.detailRelations;
  detailTrackingExtra = elements.detailTrackingExtra;
  detailStartedAt = elements.detailStartedAt;
  detailCompletedAt = elements.detailCompletedAt;
  detailRewatches = elements.detailRewatches;
  detailRewatchesLabel = elements.detailRewatchesLabel;
  detailNotesControl = elements.detailNotesControl;
  detailNotes = elements.detailNotes;
  detailTrackingPanel = elements.detailTrackingPanel;
  detailInfoPanel = elements.detailInfoPanel;
  detailInfoTab = elements.detailInfoTab;
  detailCharactersPanel = elements.detailCharactersPanel;
  detailRecsPanel = elements.detailRecsPanel;
  detailTabBtns = elements.detailTabBtns;
  detailBanner = elements.detailBanner;
  detailPinBtn = elements.detailPinBtn;
  detailPinRow = elements.detailPinRow;

  // Set up tab switching
  if (detailTabBtns) {
    const panelMap = {
      tracking: () => detailTrackingPanel,
      details: () => detailInfoPanel,
      info: () => detailInfoTab,
      characters: () => detailCharactersPanel,
      recs: () => detailRecsPanel,
    };
    detailTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        detailTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Object.values(panelMap).forEach(get => get()?.classList.add('hidden'));
        panelMap[tab]?.()?.classList.remove('hidden');
      });
    });
  }

  // Clamp progress inputs and update +1 button state on value change
  if (detailEpisodeInput) {
    detailEpisodeInput.addEventListener('input', () => {
      clampInput(detailEpisodeInput);
      updatePlusButtonState();
    });
  }
  if (detailVolumeInput) {
    detailVolumeInput.addEventListener('input', () => {
      clampInput(detailVolumeInput);
    });
  }
}

function clampInput(input) {
  let val = parseInt(input.value);
  if (isNaN(val) || val < 0) {
    input.value = 0;
    val = 0;
  }
  const max = parseInt(input.max);
  if (!isNaN(max) && max > 0 && val > max) {
    input.value = max;
    val = max;
  }
  input.classList.toggle('at-min', val <= 0);
  input.classList.toggle('at-max', !isNaN(max) && max > 0 && val >= max);
}

function updatePlusButtonState() {
  if (!detailProgressPlus || !detailEpisodeInput) return;
  const current = parseInt(detailEpisodeInput.value) || 0;
  const max = parseInt(detailEpisodeInput.max);
  const atMax = !isNaN(max) && max > 0 && current >= max;
  detailProgressPlus.classList.toggle('hidden', atMax);

  // Toggle clamped class on inputs for cursor feedback on native spinner
  detailEpisodeInput.classList.toggle('at-max', atMax);
  detailEpisodeInput.classList.toggle('at-min', current <= 0);
}

// Empty every part of the detail view so the previous title never shows through
function resetDetailContent() {
  if (detailBanner) {
    detailBanner.style.backgroundImage = '';
    detailBanner.classList.add('hidden');
    detailBanner.classList.remove('cover-fallback');
  }
  const headerEl = detailCover?.closest('.detail-header');
  if (headerEl) headerEl.style.removeProperty('--series-color');

  if (detailCover) detailCover.style.display = 'none';
  if (detailTitle) detailTitle.textContent = '';
  if (detailMeta) detailMeta.textContent = '';
  if (detailStatus) detailStatus.textContent = '';
  if (detailStatusSelect) detailStatusSelect.value = '';
  // Score and volumes are only filled in for titles on the list; reset them so a
  // title that isn't on the list never saves the previous title's values
  if (detailScoreInput) detailScoreInput.value = '0';
  if (detailVolumeInput) detailVolumeInput.value = '0';
  if (detailStatusButtons) detailStatusButtons.innerHTML = '';
  if (detailInfoStats) detailInfoStats.innerHTML = '';
  if (detailMetaBlock) detailMetaBlock.innerHTML = '';
  if (detailCharacters) detailCharacters.innerHTML = '';
  if (detailRecommendations) detailRecommendations.innerHTML = '';
  if (detailExternalLinks) detailExternalLinks.innerHTML = '';
  if (detailDescription) detailDescription.innerHTML = '';
  if (detailRelations) detailRelations.innerHTML = '';
  if (detailTrackingExtra) detailTrackingExtra.classList.add('hidden');
  if (detailStartedAt) detailStartedAt.value = '';
  if (detailCompletedAt) detailCompletedAt.value = '';
  if (detailRewatches) detailRewatches.value = '0';
  if (detailNotesControl) detailNotesControl.classList.add('hidden');
  if (detailNotes) detailNotes.value = '';
}

// Clear the detail view content — call when navigating away so the next open starts blank
export function clearDetailView() {
  resetDetailContent();
}

// Select anime and show detail view
export async function selectAnime(anime) {
  // Store selected anime
  const result = await Storage.setWithFeedback('selectedAnime', anime);
  if (!result.success) {
    handleAPIError({ type: 'STORAGE_ERROR', message: result.message });
  }
  // Show detail view
  await showDetailView(anime);
}

// Open a related title or recommendation, remembering the current one for Back
async function openRelatedMedia(media, type) {
  const currentResult = await chrome.storage.local.get(['selectedAnime']);
  if (currentResult.selectedAnime) {
    pushNavHistory({ anime: currentResult.selectedAnime, mediaType: state.currentMediaType });
  }

  if (type && type !== state.currentMediaType) {
    setMediaType(type);
    const toggleAnime = document.getElementById('toggle-anime');
    const toggleManga = document.getElementById('toggle-manga');
    if (toggleAnime && toggleManga) {
      toggleAnime.classList.toggle('active', type === 'ANIME');
      toggleManga.classList.toggle('active', type === 'MANGA');
    }
  }

  selectAnime(media);
}

// Show detail view for selected anime
export async function showDetailView(anime) {
  // Show detail view with loading state first
  showDetailViewUI();
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  const scrollContainer = document.querySelector('.container');
  if (scrollContainer) scrollContainer.scrollTop = 0;

  // Reset to tracking tab
  if (detailTabBtns) {
    detailTabBtns.forEach(b => b.classList.remove('active'));
    detailTabBtns[0]?.classList.add('active');
  }
  if (detailTrackingPanel) detailTrackingPanel.classList.remove('hidden');
  if (detailInfoPanel) detailInfoPanel.classList.add('hidden');
  if (detailInfoTab) detailInfoTab.classList.add('hidden');
  if (detailCharactersPanel) detailCharactersPanel.classList.add('hidden');
  if (detailRecsPanel) detailRecsPanel.classList.add('hidden');

  // Clear all stale content immediately — show skeleton so old series doesn't flash
  resetDetailContent();
  if (detailTitle) {
    detailTitle.innerHTML = '<div class="skeleton detail-skeleton-title"></div>';
  }
  if (detailMeta) {
    detailMeta.innerHTML = '<div class="skeleton detail-skeleton-meta"></div>';
  }

  // Refetch if missing detail fields
  const needsRefresh = !anime.mediaListEntry || !anime.description || !anime.relations || !anime.studios || !anime.characters?.edges;

  if (needsRefresh) {
    try {
      const refreshedAnime = await AniListAPI.getMediaById(anime.id);

      if (refreshedAnime) {
        anime = refreshedAnime;
        // Update storage with refreshed data
        const result = await Storage.setWithFeedback('selectedAnime', anime);
        if (!result.success) {
          console.warn('Failed to cache refreshed anime:', result.message);
        }
      }
    } catch (error) {
      console.error('Error refreshing media data:', error);
      // Continue with current data
    }
  }

  // Now populate with actual data
  const listEntry = anime.mediaListEntry;
  const cover = anime.coverImage.large || anime.coverImage.medium || '';
  const title = getPreferredTitle(anime.title);
  const isManga = state.currentMediaType === 'MANGA';
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

  // Apply series banner image (fall back to blurred cover if no banner)
  if (detailBanner) {
    if (anime.bannerImage) {
      detailBanner.style.backgroundImage = `url(${anime.bannerImage})`;
      detailBanner.classList.remove('hidden', 'cover-fallback');
    } else if (cover) {
      detailBanner.style.backgroundImage = `url(${cover})`;
      detailBanner.classList.remove('hidden');
      detailBanner.classList.add('cover-fallback');
    } else {
      detailBanner.style.backgroundImage = '';
      detailBanner.classList.add('hidden');
      detailBanner.classList.remove('cover-fallback');
    }
  }

  // Apply series color accent
  const seriesColor = anime.coverImage?.color;
  const detailHeader = detailCover?.closest('.detail-header');
  if (detailHeader) {
    if (seriesColor) detailHeader.style.setProperty('--series-color', seriesColor);
    else detailHeader.style.removeProperty('--series-color');
  }

  // Set cover and basic info
  if (detailCover) {
    detailCover.src = cover;
    detailCover.alt = title;
    detailCover.style.display = 'block';
  }
  if (detailTitle) detailTitle.textContent = title;
  if (detailMeta) {
    let metaHtml = `${totalProgress} ${progressLabel} • <span class="status-badge ${statusBadgeClass}">${statusText}</span>`;
    if (!isManga && anime.nextAiringEpisode) {
      const { episode, timeUntilAiring } = anime.nextAiringEpisode;
      metaHtml += `<br><span class="detail-airing-next">Ep ${episode} in ${formatTimeUntil(timeUntilAiring)}</span>`;
    }
    detailMeta.innerHTML = metaHtml;
  }

  // Update progress label
  if (detailProgressLabel) {
    detailProgressLabel.textContent = isManga ? 'Chapter Progress' : 'Episode Progress';
  }

  // Determine user's status and progress
  const progress = listEntry ? (listEntry.progress || 0) : 0;
  const statusLine = listStatusText(listEntry?.status, progress, totalProgress, isManga);

  if (detailStatus) {
    detailStatus.textContent = statusLine.text;
    detailStatus.className = `detail-status ${statusLine.cls}`;
  }

  // Set up status select options (text varies by media type)
  if (detailStatusSelect) {
    const opts = detailStatusSelect.options;
    // opts[0] = "Not on List" (unchanged)
    opts[1].text = isManga ? 'Reading' : 'Watching';
    opts[2].text = isManga ? 'Plan to Read' : 'Plan to Watch';
    // opts[3] = 'Completed', opts[4] = 'Paused', opts[5] = 'Dropped' (unchanged)
    opts[6].text = isManga ? 'Rereading' : 'Rewatching';
    detailStatusSelect.value = listEntry?.status || '';
  }
  if (detailStatusLabel) {
    detailStatusLabel.textContent = 'Status';
  }

  // Set up progress input — always shows actual progress value
  if (detailEpisodeInput) {
    detailEpisodeInput.value = progress;
    detailEpisodeInput.max = totalProgress !== '?' ? totalProgress : '';
    detailEpisodeInput.parentElement.parentElement.style.display = 'block';
  }
  updatePlusButtonState();

  // Set up volume progress (manga only, shown when on list)
  if (detailVolumeControl) {
    if (isManga && listEntry) {
      detailVolumeControl.classList.remove('hidden');
      if (detailVolumeInput) {
        detailVolumeInput.value = listEntry.progressVolumes || 0;
        detailVolumeInput.max = anime.volumes || '';
      }
    } else {
      detailVolumeControl.classList.add('hidden');
    }
  }

  // Pin to Widget button (manga on list only)
  if (detailPinRow) {
    if (isManga && listEntry) {
      detailPinRow.classList.remove('hidden');
      // Sync button state with current pinnedManga in storage
      const { pinnedManga } = await chrome.storage.local.get('pinnedManga');
      if (pinnedManga?.id === anime.id) {
        if (detailPinBtn) { detailPinBtn.textContent = 'Unpin from Widget'; detailPinBtn.classList.add('active'); }
      } else {
        if (detailPinBtn) { detailPinBtn.textContent = 'Pin to Widget'; detailPinBtn.classList.remove('active'); }
      }
      // Wire click (replace any previous handler by cloning)
      if (detailPinBtn) {
        const freshBtn = detailPinBtn.cloneNode(true);
        detailPinBtn.replaceWith(freshBtn);
        detailPinBtn = freshBtn;
        detailPinBtn.addEventListener('click', async () => {
          const { pinnedManga: current } = await chrome.storage.local.get('pinnedManga');
          if (current?.id === anime.id) {
            await chrome.storage.local.remove('pinnedManga');
            detailPinBtn.textContent = 'Pin to Widget';
            detailPinBtn.classList.remove('active');
          } else {
            const entry = anime.mediaListEntry;
            await chrome.storage.local.set({ pinnedManga: {
              id: anime.id,
              title: getPreferredTitle(anime.title),
              progress: entry?.progress || 0,
              chapters: anime.chapters || null,
              status: entry?.status || 'CURRENT',
              coverImage: anime.coverImage?.medium || anime.coverImage?.large || '',
              score: entry?.score || 0,
              progressVolumes: entry?.progressVolumes || 0
            }});
            detailPinBtn.textContent = 'Unpin from Widget';
            detailPinBtn.classList.add('active');
          }
        });
      }
    } else {
      detailPinRow.classList.add('hidden');
    }
  }

  // Set up score input (shown when on list, respects user's AniList score format)
  if (detailScoreControl) {
    if (listEntry) {
      detailScoreControl.classList.remove('hidden');
      if (detailScoreInput) {
        const user = await Storage.getUser();
        const scoreFormat = user?.mediaListOptions?.scoreFormat || 'POINT_10_DECIMAL';
        const scoreConfigs = {
          POINT_100:       { min: 0, max: 100, step: 1,   label: 'Score (0-100)' },
          POINT_10_DECIMAL:{ min: 0, max: 10,  step: 0.5, label: 'Score (0-10)' },
          POINT_10:        { min: 0, max: 10,  step: 1,   label: 'Score (0-10)' },
          POINT_5:         { min: 0, max: 5,   step: 1,   label: 'Score (0-5)' },
          POINT_3:         { min: 0, max: 3,   step: 1,   label: 'Score (0-3)' }
        };
        const cfg = scoreConfigs[scoreFormat] || scoreConfigs.POINT_10_DECIMAL;
        detailScoreInput.min = cfg.min;
        detailScoreInput.max = cfg.max;
        detailScoreInput.step = cfg.step;
        detailScoreInput.value = listEntry.score || 0;
        const scoreLabel = detailScoreControl.querySelector('label');
        if (scoreLabel) scoreLabel.textContent = cfg.label;
      }
    } else {
      detailScoreControl.classList.add('hidden');
    }
  }

  // Status buttons: only Remove from List when on list
  if (detailStatusButtons) {
    detailStatusButtons.innerHTML = '';
    if (listEntry) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-danger';
      removeBtn.textContent = 'Remove from List';
      removeBtn.onclick = () => removeFromList(listEntry.id);
      detailStatusButtons.appendChild(removeBtn);
    }
  }

  // Update rewatches label for media type
  if (detailRewatchesLabel) {
    detailRewatchesLabel.textContent = isManga ? 'Total Rereads' : 'Total Rewatches';
  }

  // Show extra row + notes when on list
  if (listEntry) {
    if (detailTrackingExtra) detailTrackingExtra.classList.remove('hidden');
    if (detailStartedAt) detailStartedAt.value = formatDateInput(listEntry.startedAt);
    if (detailCompletedAt) detailCompletedAt.value = formatDateInput(listEntry.completedAt);
    if (detailRewatches) detailRewatches.value = listEntry.repeat || 0;
    if (detailNotesControl) detailNotesControl.classList.remove('hidden');
    if (detailNotes) detailNotes.value = listEntry.notes || '';
  } else {
    if (detailTrackingExtra) detailTrackingExtra.classList.add('hidden');
    if (detailNotesControl) detailNotesControl.classList.add('hidden');
  }

  // Populate the Info, Characters and Recs tabs
  if (detailInfoStats) renderStats(anime, detailInfoStats);
  if (detailMetaBlock) renderInfo(anime, detailMetaBlock);
  if (detailDescription) renderDescription(anime, detailDescription);
  if (detailRelations) renderRelations(anime, detailRelations, openRelatedMedia);
  if (detailCharacters) renderCharacters(anime, detailCharacters);
  if (detailRecommendations) renderRecommendations(anime, detailRecommendations, openRelatedMedia);
  if (detailExternalLinks) renderExternalLinks(anime, detailExternalLinks);

  captureCleanSnapshot();
}

// Patch the local anime entry and update only the tracking UI — no API refetch, no full re-render
async function patchLocalEntry(anime, savedEntry) {
  const isManga = state.currentMediaType === 'MANGA';
  const totalProgress = isManga ? (anime.chapters || '?') : (anime.episodes || '?');
  const { id, status, progress, score, progressVolumes, startedAt, completedAt, repeat, notes } = savedEntry;

  // Update in-memory mediaListEntry
  anime.mediaListEntry = { ...(anime.mediaListEntry || {}), id, status, progress, score, progressVolumes, startedAt, completedAt, repeat, notes };

  // Show extra row and update inputs with AniList-confirmed values
  if (detailTrackingExtra) detailTrackingExtra.classList.remove('hidden');
  if (detailStartedAt) detailStartedAt.value = formatDateInput(startedAt);
  if (detailCompletedAt) detailCompletedAt.value = formatDateInput(completedAt);
  if (detailRewatches) detailRewatches.value = repeat || 0;
  if (detailNotesControl) detailNotesControl.classList.remove('hidden');
  if (detailNotes) detailNotes.value = notes || '';

  // Persist to storage with error handling
  const result = await Storage.setWithFeedback('selectedAnime', anime);
  if (!result.success) {
    showError(result.message, 'warning', 3000);
  }

  // Update the status text line
  const statusLine = listStatusText(status, progress, totalProgress, isManga);
  if (detailStatus) {
    detailStatus.textContent = statusLine.text;
    detailStatus.className = `detail-status ${statusLine.cls}`;
  }

  // Update tracking inputs
  if (detailStatusSelect) detailStatusSelect.value = status;
  if (detailEpisodeInput) detailEpisodeInput.value = progress;
  if (detailScoreInput && score !== undefined) detailScoreInput.value = score;
  if (detailVolumeInput && progressVolumes !== undefined) detailVolumeInput.value = progressVolumes;

  // Show score control if it was hidden (entry just added to list)
  if (detailScoreControl) detailScoreControl.classList.remove('hidden');

  // Add remove button if not already present
  if (detailStatusButtons && id && !detailStatusButtons.querySelector('.btn-danger')) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-danger';
    removeBtn.textContent = 'Remove from List';
    removeBtn.onclick = () => removeFromList(id);
    detailStatusButtons.appendChild(removeBtn);
  }

  captureCleanSnapshot();
}

// Detail view action functions
export async function updateProgressFromDetail() {
  const result = await chrome.storage.local.get(['selectedAnime']);
  if (!result.selectedAnime || !detailEpisodeInput || !detailUpdateBtn) return;

  const anime = result.selectedAnime;
  const selectedStatus = detailStatusSelect?.value;
  const isManga = state.currentMediaType === 'MANGA';
  const progress = parseInt(detailEpisodeInput.value) || 0;
  const total = isManga ? (anime.chapters || 0) : (anime.episodes || 0);

  if (!selectedStatus) {
    showError('Please select a status.');
    return;
  }

  detailUpdateBtn.disabled = true;
  detailUpdateBtn.textContent = 'Saving...';

  try {
    const autoCompleting = selectedStatus === 'CURRENT' && total > 0 && progress >= total;
    const targetStatus = autoCompleting ? 'COMPLETED' : selectedStatus;
    const score = detailScoreInput ? parseFloat(detailScoreInput.value) || 0 : undefined;
    const progressVolumes = (isManga && detailVolumeInput) ? parseInt(detailVolumeInput.value) || 0 : undefined;

    const prevStatus = anime.mediaListEntry?.status;
    const startedAtVal = detailStartedAt?.value;
    const completedAtVal = detailCompletedAt?.value;
    const startedAt = startedAtVal
      ? parseDateInput(startedAtVal)
      : ((!prevStatus || prevStatus === 'PLANNING') && targetStatus === 'CURRENT' ? todayAsFuzzyDate() : undefined);
    const completedAt = completedAtVal
      ? parseDateInput(completedAtVal)
      : (autoCompleting || targetStatus === 'COMPLETED' ? todayAsFuzzyDate() : undefined);
    const repeat = detailRewatches ? parseInt(detailRewatches.value) || 0 : undefined;
    const notes = detailNotes ? detailNotes.value : undefined;

    const savedEntry = await AniListAPI.updateProgress(anime.id, progress, targetStatus, score, progressVolumes, startedAt, completedAt, repeat, notes);

    showSuccess(`Saved! (${statusName(targetStatus, isManga)})`);

    await patchLocalEntry(anime, savedEntry);

    // Clear list caches so updated data is fetched next time
    await Storage.clearListCaches(state.currentMediaType);
  } catch (error) {
    console.error('Update failed:', error);
    handleAPIError(error, 'Failed to update. Please try again.');
  } finally {
    detailUpdateBtn.disabled = false;
    detailUpdateBtn.textContent = 'Save';
  }
}

export async function incrementAndSave(plusBtn) {
  const result = await chrome.storage.local.get(['selectedAnime']);
  if (!result.selectedAnime || !detailEpisodeInput) return;

  const anime = result.selectedAnime;
  const isManga = state.currentMediaType === 'MANGA';
  const total = isManga ? (anime.chapters || 0) : (anime.episodes || 0);
  const current = parseInt(detailEpisodeInput.value) || 0;
  const next = total > 0 ? Math.min(current + 1, total) : current + 1;

  const selectedStatus = detailStatusSelect?.value || '';

  plusBtn.disabled = true;
  const origText = plusBtn.textContent;
  plusBtn.textContent = '...';

  try {
    // If not actively watching/reading (unlisted, planning, paused, dropped),
    // treat +1 as "start now" → CURRENT. REPEATING/COMPLETED keep their status.
    const nonActive = ['', 'PLANNING', 'PAUSED', 'DROPPED'];
    const effectiveStatus = nonActive.includes(selectedStatus) ? 'CURRENT' : selectedStatus;

    // Auto-complete: hitting the last episode/chapter marks as finished.
    // Works whether starting fresh (movie/one-shot) or already in progress.
    const autoCompleting = effectiveStatus === 'CURRENT' && total > 0 && next >= total;
    const targetStatus = autoCompleting ? 'COMPLETED' : effectiveStatus;

    const score = detailScoreInput ? parseFloat(detailScoreInput.value) || 0 : undefined;
    const progressVolumes = (isManga && detailVolumeInput) ? parseInt(detailVolumeInput.value) || 0 : undefined;

    const prevStatus = anime.mediaListEntry?.status;
    const startedAtVal = detailStartedAt?.value;
    const completedAtVal = detailCompletedAt?.value;
    // Set startedAt today when starting fresh (not previously on list, or only planned)
    const startingFresh = !prevStatus || prevStatus === 'PLANNING';
    const startedAt = startedAtVal
      ? parseDateInput(startedAtVal)
      : (startingFresh ? todayAsFuzzyDate() : undefined);
    const completedAt = completedAtVal
      ? parseDateInput(completedAtVal)
      : (autoCompleting ? todayAsFuzzyDate() : undefined);

    const savedEntry = await AniListAPI.updateProgress(anime.id, next, targetStatus, score, progressVolumes, startedAt, completedAt);

    showSuccess(`Saved! ${targetStatus !== selectedStatus ? `(${statusName(targetStatus, isManga)})` : `${isManga ? 'Ch.' : 'Ep.'} ${next}`}`);

    await patchLocalEntry(anime, savedEntry);

    // Clear list caches so updated data is fetched next time
    await Storage.clearListCaches(state.currentMediaType);
  } catch (error) {
    console.error('Increment save failed:', error);
    handleAPIError(error, 'Failed to save. Please try again.');
  } finally {
    plusBtn.disabled = false;
    plusBtn.textContent = origText;
    updatePlusButtonState();
  }
}

async function removeFromList(entryId) {
  if (!detailStatusButtons) return;

  // Avoid double-confirmation
  if (detailStatusButtons.querySelector('.remove-confirm')) return;

  const removeBtn = detailStatusButtons.querySelector('.btn-danger');
  if (removeBtn) removeBtn.classList.add('hidden');

  const confirmEl = document.createElement('div');
  confirmEl.className = 'remove-confirm';
  confirmEl.innerHTML = `
    <span class="remove-confirm-text">Remove from list?</span>
    <button class="btn-confirm-no">Cancel</button>
    <button class="btn-confirm-yes">Remove</button>
  `;
  detailStatusButtons.appendChild(confirmEl);

  confirmEl.querySelector('.btn-confirm-no').onclick = () => {
    confirmEl.remove();
    if (removeBtn) removeBtn.classList.remove('hidden');
  };

  confirmEl.querySelector('.btn-confirm-yes').onclick = async () => {
    confirmEl.remove();
    try {
      await AniListAPI.deleteMediaEntry(entryId);
      const isManga = state.currentMediaType === 'MANGA';
      showSuccess(`Removed from your ${isManga ? 'manga' : 'anime'} list.`);

      // Clear list caches so updated data is fetched next time
      await Storage.clearListCaches(state.currentMediaType);

      const result = await chrome.storage.local.get(['selectedAnime']);
      if (result.selectedAnime) {
        await showDetailView(result.selectedAnime);
      }
    } catch (error) {
      console.error('Remove failed:', error);
      if (removeBtn) removeBtn.classList.remove('hidden');
      handleAPIError(error, 'Failed to remove. Please try again.');
    }
  };
}

