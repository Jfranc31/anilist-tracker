// Detail view functionality
import { state, setMediaType, pushNavHistory, getPreferredTitle } from './state.js';
import { showDetailViewUI } from './views.js';
import { showError, showSuccess, handleAPIError } from './error-handler.js';

// DOM elements (will be set by main popup.js)
let detailCover, detailTitle, detailMeta, detailStatus;
let detailProgressLabel, detailEpisodeInput, detailProgressPlus, detailUpdateBtn;
let detailStatusButtons, detailScoreInput, detailVolumeInput;
let detailVolumeControl, detailScoreControl, detailStatusSelect, detailStatusLabel;
let detailDescription, detailRelations, detailTrackingPanel, detailInfoPanel;
let detailTabBtns, detailBanner;
let cleanSnapshot = null;

function captureCleanSnapshot() {
  cleanSnapshot = {
    status: detailStatusSelect?.value || '',
    progress: detailEpisodeInput?.value || '0',
    score: detailScoreInput?.value || '0',
    volume: detailVolumeInput?.value || '0'
  };
}

export function isDetailDirty() {
  if (!cleanSnapshot) return false;
  return (
    (detailStatusSelect?.value || '') !== cleanSnapshot.status ||
    (detailEpisodeInput?.value || '0') !== cleanSnapshot.progress ||
    (detailScoreInput?.value || '0') !== cleanSnapshot.score ||
    (detailVolumeInput?.value || '0') !== cleanSnapshot.volume
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
  detailDescription = elements.detailDescription;
  detailRelations = elements.detailRelations;
  detailTrackingPanel = elements.detailTrackingPanel;
  detailInfoPanel = elements.detailInfoPanel;
  detailTabBtns = elements.detailTabBtns;
  detailBanner = elements.detailBanner;

  // Set up tab switching
  if (detailTabBtns) {
    detailTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        detailTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (tab === 'tracking') {
          detailTrackingPanel?.classList.remove('hidden');
          detailInfoPanel?.classList.add('hidden');
        } else {
          detailTrackingPanel?.classList.add('hidden');
          detailInfoPanel?.classList.remove('hidden');
        }
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

// Clear the detail view content — call when navigating away so the next open starts blank
export function clearDetailView() {
  if (detailBanner) {
    detailBanner.style.backgroundImage = '';
    detailBanner.classList.add('hidden');
  }
  const headerEl = detailCover?.closest('.detail-header');
  if (headerEl) headerEl.style.removeProperty('--series-color');

  if (detailCover) detailCover.style.display = 'none';
  if (detailTitle) detailTitle.textContent = '';
  if (detailMeta) detailMeta.textContent = '';
  if (detailStatus) detailStatus.textContent = '';
  if (detailStatusSelect) detailStatusSelect.value = '';
  if (detailStatusButtons) detailStatusButtons.innerHTML = '';
  if (detailDescription) detailDescription.innerHTML = '';
  if (detailRelations) detailRelations.innerHTML = '';
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

function formatTimeUntil(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Show detail view for selected anime
export async function showDetailView(anime) {
  // Show detail view with loading state first
  showDetailViewUI();

  // Reset to tracking tab
  if (detailTabBtns) {
    detailTabBtns.forEach(b => b.classList.remove('active'));
    detailTabBtns[0]?.classList.add('active');
  }
  if (detailTrackingPanel) detailTrackingPanel.classList.remove('hidden');
  if (detailInfoPanel) detailInfoPanel.classList.add('hidden');

  // Clear all stale content immediately — show skeleton so old series doesn't flash
  if (detailBanner) {
    detailBanner.style.backgroundImage = '';
    detailBanner.classList.add('hidden');
  }
  const headerEl = detailCover?.closest('.detail-header');
  if (headerEl) headerEl.style.removeProperty('--series-color');

  if (detailCover) detailCover.style.display = 'none';

  if (detailTitle) {
    detailTitle.innerHTML = '<div class="skeleton detail-skeleton-title"></div>';
  }
  if (detailMeta) {
    detailMeta.innerHTML = '<div class="skeleton detail-skeleton-meta"></div>';
  }
  if (detailStatus) detailStatus.textContent = '';
  if (detailStatusSelect) detailStatusSelect.value = '';
  if (detailStatusButtons) detailStatusButtons.innerHTML = '';
  if (detailDescription) detailDescription.innerHTML = '';
  if (detailRelations) detailRelations.innerHTML = '';

  // Only refetch if data is stale (no mediaListEntry)
  const needsRefresh = !anime.mediaListEntry;

  if (needsRefresh) {
    try {
      const query = anime.title.romaji || anime.title.english;
      const searchResults = await AniListAPI.searchAnimeList(query, 1, 5, state.currentMediaType);
      const refreshedAnime = searchResults.media.find(m => m.id === anime.id);

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

  // Apply series banner image
  if (detailBanner) {
    if (anime.bannerImage) {
      detailBanner.style.backgroundImage = `url(${anime.bannerImage})`;
      detailBanner.classList.remove('hidden');
    } else {
      detailBanner.style.backgroundImage = '';
      detailBanner.classList.add('hidden');
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
  let userStatus = 'Not on list';
  let progress = 0;
  let statusClass = 'not-on-list';

  if (listEntry) {
    progress = listEntry.progress || 0;
    const listStatus = listEntry.status;

    // Action verbs based on media type
    const progressVerb = isManga ? 'Read' : 'Watched';
    const planVerb = isManga ? 'Plan to Read' : 'Plan to Watch';
    const repeatVerb = isManga ? 'Rereading' : 'Rewatching';

    switch(listStatus) {
      case 'CURRENT':
        userStatus = `${progressVerb} ${progress}/${totalProgress}`;
        statusClass = 'watching';
        break;
      case 'COMPLETED':
        userStatus = `Completed ${progress}/${totalProgress}`;
        statusClass = 'completed';
        break;
      case 'PLANNING':
        userStatus = planVerb;
        statusClass = 'planning';
        break;
      case 'PAUSED':
        userStatus = `Paused - ${progressVerb} ${progress}/${totalProgress}`;
        statusClass = 'paused';
        break;
      case 'DROPPED':
        userStatus = `Dropped - ${progressVerb} ${progress}/${totalProgress}`;
        statusClass = 'dropped';
        break;
      case 'REPEATING':
        userStatus = `${repeatVerb} ${progress}/${totalProgress}`;
        statusClass = 'rewatching';
        break;
    }
  }

  if (detailStatus) {
    detailStatus.textContent = userStatus;
    detailStatus.className = `detail-status ${statusClass}`;
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

  // Populate description with show more/less toggle
  if (detailDescription) {
    const raw = anime.description || 'No description available.';
    detailDescription.innerHTML = '';

    const textEl = document.createElement('div');
    textEl.className = 'description-text collapsed';
    textEl.innerHTML = raw;
    detailDescription.appendChild(textEl);

    // Use plain-text length to decide — panel may be hidden so scrollHeight is 0
    const plainLength = textEl.textContent.trim().length;
    if (plainLength > 200) {
      const toggle = document.createElement('button');
      toggle.className = 'description-toggle';
      toggle.textContent = 'Show more';
      toggle.addEventListener('click', () => {
        const isCollapsed = textEl.classList.toggle('collapsed');
        toggle.textContent = isCollapsed ? 'Show more' : 'Show less';
      });
      detailDescription.appendChild(toggle);
    }
  }

  // Populate relations
  if (detailRelations) {
    detailRelations.innerHTML = '';
    const relations = anime.relations?.edges || [];

    const relevantTypes = ['PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY', 'SPIN_OFF', 'ALTERNATIVE', 'ADAPTATION', 'SOURCE', 'OTHER', 'COMPILATION', 'CONTAINS', 'SUMMARY'];
    const typeLabels = {
      PREQUEL: 'Prequel',
      SEQUEL: 'Sequel',
      PARENT: 'Parent Story',
      SIDE_STORY: 'Side Story',
      SPIN_OFF: 'Spin-off',
      ALTERNATIVE: 'Alternative',
      ADAPTATION: 'Adaptation',
      SOURCE: 'Source',
      OTHER: 'Other',
      COMPILATION: 'Compilation',
      CONTAINS: 'Contains',
      SUMMARY: 'Summary'
    };

    const filtered = relations.filter(e => relevantTypes.includes(e.relationType));

    if (filtered.length === 0) {
      detailRelations.innerHTML = '<p style="font-size:13px;color:#a0a0a0;">No related entries found.</p>';
    } else {
      // Add filter input for large relation lists
      if (filtered.length > 3) {
        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.placeholder = 'Filter relations...';
        filterInput.className = 'relations-filter-input';
        filterInput.addEventListener('input', () => {
          const q = filterInput.value.toLowerCase();
          detailRelations.querySelectorAll('.relation-card').forEach(card => {
            const title = card.querySelector('.relation-title')?.textContent.toLowerCase() || '';
            card.style.display = title.includes(q) ? '' : 'none';
          });
        });
        detailRelations.appendChild(filterInput);
      }

      for (const edge of filtered) {
        const node = edge.node;
        const relTitle = getPreferredTitle(node.title);
        const relCover = node.coverImage?.medium || '';
        const relType = typeLabels[edge.relationType] || edge.relationType;
        const relFormat = node.format ? node.format.replace(/_/g, ' ') : '';
        const listStatus = node.mediaListEntry?.status;

        const card = document.createElement('div');
        card.className = 'relation-card';
        card.innerHTML = `
          ${relCover ? `<img src="${relCover}" alt="${relTitle}" class="relation-cover">` : ''}
          <div class="relation-info">
            <div class="relation-type">${relType}</div>
            <div class="relation-title">${relTitle}</div>
            ${relFormat ? `<div class="relation-meta">${relFormat}</div>` : ''}
          </div>
          ${listStatus ? `<span class="relation-status-badge on-list">${listStatus.charAt(0) + listStatus.slice(1).toLowerCase()}</span>` : ''}
        `;

        card.addEventListener('click', async () => {
          // Push current anime + media type to history so back button can restore both
          const currentResult = await chrome.storage.local.get(['selectedAnime']);
          if (currentResult.selectedAnime) {
            pushNavHistory({ anime: currentResult.selectedAnime, mediaType: state.currentMediaType });
          }

          // Switch media type if relation is a different type (e.g. manga relation on anime page)
          if (node.type && node.type !== state.currentMediaType) {
            setMediaType(node.type);
            // Sync the toggle button UI
            const toggleAnime = document.getElementById('toggle-anime');
            const toggleManga = document.getElementById('toggle-manga');
            if (toggleAnime && toggleManga) {
              toggleAnime.classList.toggle('active', node.type === 'ANIME');
              toggleManga.classList.toggle('active', node.type === 'MANGA');
            }
          }

          const relAnime = {
            id: node.id,
            title: node.title,
            coverImage: node.coverImage || { large: '', medium: '' },
            mediaListEntry: node.mediaListEntry || null,
            status: node.status,
            type: node.type
          };
          selectAnime(relAnime);
        });

        detailRelations.appendChild(card);
      }
    }
  }

  captureCleanSnapshot();
}

function todayAsFuzzyDate() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

// Patch the local anime entry and update only the tracking UI — no API refetch, no full re-render
async function patchLocalEntry(anime, savedEntry) {
  const isManga = state.currentMediaType === 'MANGA';
  const totalProgress = isManga ? (anime.chapters || '?') : (anime.episodes || '?');
  const { id, status, progress, score, progressVolumes } = savedEntry;

  // Update in-memory mediaListEntry
  anime.mediaListEntry = { ...(anime.mediaListEntry || {}), id, status, progress, score, progressVolumes };

  // Persist to storage with error handling
  const result = await Storage.setWithFeedback('selectedAnime', anime);
  if (!result.success) {
    showError(result.message, 'warning', 3000);
  }

  // Update the status text line
  const progressVerb = isManga ? 'Read' : 'Watched';
  const planVerb = isManga ? 'Plan to Read' : 'Plan to Watch';
  const repeatVerb = isManga ? 'Rereading' : 'Rewatching';

  let userStatus = 'Not on list';
  let statusClass = 'not-on-list';
  switch (status) {
    case 'CURRENT':
      userStatus = `${progressVerb} ${progress}/${totalProgress}`;
      statusClass = 'watching';
      break;
    case 'COMPLETED':
      userStatus = `Completed ${progress}/${totalProgress}`;
      statusClass = 'completed';
      break;
    case 'PLANNING':
      userStatus = planVerb;
      statusClass = 'planning';
      break;
    case 'PAUSED':
      userStatus = `Paused - ${progressVerb} ${progress}/${totalProgress}`;
      statusClass = 'paused';
      break;
    case 'DROPPED':
      userStatus = `Dropped - ${progressVerb} ${progress}/${totalProgress}`;
      statusClass = 'dropped';
      break;
    case 'REPEATING':
      userStatus = `${repeatVerb} ${progress}/${totalProgress}`;
      statusClass = 'rewatching';
      break;
  }

  if (detailStatus) {
    detailStatus.textContent = userStatus;
    detailStatus.className = `detail-status ${statusClass}`;
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
    const startedAt = (!prevStatus || prevStatus === 'PLANNING') && targetStatus === 'CURRENT'
      ? todayAsFuzzyDate() : undefined;
    const completedAt = autoCompleting || targetStatus === 'COMPLETED'
      ? todayAsFuzzyDate() : undefined;

    const savedEntry = await AniListAPI.updateProgress(anime.id, progress, targetStatus, score, progressVolumes, startedAt, completedAt);

    const statusNames = {
      'CURRENT': isManga ? 'Reading' : 'Watching',
      'PLANNING': isManga ? 'Plan to Read' : 'Plan to Watch',
      'COMPLETED': 'Completed', 'PAUSED': 'Paused',
      'DROPPED': 'Dropped',
      'REPEATING': isManga ? 'Rereading' : 'Rewatching'
    };
    showSuccess(`Saved! (${statusNames[targetStatus]})`);

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

  const selectedStatus = detailStatusSelect?.value;
  if (!selectedStatus) {
    showError('Please select a status first.');
    return;
  }

  plusBtn.disabled = true;
  const origText = plusBtn.textContent;
  plusBtn.textContent = '...';

  try {
    const autoCompleting = selectedStatus === 'CURRENT' && total > 0 && next >= total;
    const targetStatus = autoCompleting ? 'COMPLETED' : selectedStatus;
    const score = detailScoreInput ? parseFloat(detailScoreInput.value) || 0 : undefined;
    const progressVolumes = (isManga && detailVolumeInput) ? parseInt(detailVolumeInput.value) || 0 : undefined;

    const prevStatus = anime.mediaListEntry?.status;
    const startedAt = (!prevStatus || prevStatus === 'PLANNING') && targetStatus === 'CURRENT'
      ? todayAsFuzzyDate() : undefined;
    const completedAt = autoCompleting || targetStatus === 'COMPLETED'
      ? todayAsFuzzyDate() : undefined;

    const savedEntry = await AniListAPI.updateProgress(anime.id, next, targetStatus, score, progressVolumes, startedAt, completedAt);

    const statusNames = {
      'CURRENT': isManga ? 'Reading' : 'Watching',
      'PLANNING': isManga ? 'Plan to Read' : 'Plan to Watch',
      'COMPLETED': 'Completed', 'PAUSED': 'Paused',
      'DROPPED': 'Dropped',
      'REPEATING': isManga ? 'Rereading' : 'Rewatching'
    };
    showSuccess(`Saved! ${targetStatus !== selectedStatus ? `(${statusNames[targetStatus]})` : `${isManga ? 'Ch.' : 'Ep.'} ${next}`}`);

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

