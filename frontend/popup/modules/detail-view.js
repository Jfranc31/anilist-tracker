// Detail view functionality
import { state, setMediaType, pushNavHistory, getPreferredTitle } from './state.js';
import { showDetailViewUI } from './views.js';
import { showError, showSuccess, handleAPIError } from './error-handler.js';

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

function formatDateInput(d) {
  if (!d?.year) return '';
  return `${d.year}-${String(d.month || 1).padStart(2, '0')}-${String(d.day || 1).padStart(2, '0')}`;
}

function parseDateInput(val) {
  if (!val) return undefined;
  const [y, m, d] = val.split('-').map(Number);
  return { year: y, month: m, day: d };
}

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

// Clear the detail view content — call when navigating away so the next open starts blank
export function clearDetailView() {
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
  if (detailTrackingExtra) detailTrackingExtra.classList.add('hidden');
  if (detailStartedAt) detailStartedAt.value = '';
  if (detailCompletedAt) detailCompletedAt.value = '';
  if (detailRewatches) detailRewatches.value = '0';
  if (detailNotesControl) detailNotesControl.classList.add('hidden');
  if (detailNotes) detailNotes.value = '';

  // Clear all stale content immediately — show skeleton so old series doesn't flash
  if (detailBanner) {
    detailBanner.style.backgroundImage = '';
    detailBanner.classList.add('hidden');
    detailBanner.classList.remove('cover-fallback');
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
  if (detailInfoStats) detailInfoStats.innerHTML = '';
  if (detailMetaBlock) detailMetaBlock.innerHTML = '';
  if (detailCharacters) detailCharacters.innerHTML = '';
  if (detailRecommendations) detailRecommendations.innerHTML = '';
  if (detailExternalLinks) detailExternalLinks.innerHTML = '';
  if (detailDescription) detailDescription.innerHTML = '';
  if (detailRelations) detailRelations.innerHTML = '';

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

  // Populate description with show more/less toggle
  // Populate quick info stats row
  if (detailInfoStats) {
    const seasonLabels = { WINTER: 'Winter', SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall' };
    const chips = [];

    if (anime.format) chips.push({ label: anime.format.replace(/_/g, ' '), cls: 'stat-chip--format' });
    if (anime.season && anime.seasonYear) chips.push({ label: `${seasonLabels[anime.season] || anime.season} ${anime.seasonYear}`, cls: 'stat-chip--season' });
    if (anime.averageScore) chips.push({ label: `★ ${anime.averageScore}%`, cls: 'stat-chip--score' });

    const genres = (anime.genres || []).slice(0, 8);

    detailInfoStats.innerHTML =
      chips.map(c => `<span class="detail-stat-chip ${c.cls}">${c.label}</span>`).join('') +
      genres.map(g => `<span class="detail-stat-chip stat-chip--genre">${g}</span>`).join('');
  }

  // Populate info tab: dates, studios, producers, source, synonyms
  if (detailMetaBlock) {
    detailMetaBlock.innerHTML = '';

    const addSection = (title, buildFn) => {
      const section = document.createElement('div');
      section.className = 'detail-info-section';
      const h5 = document.createElement('h5');
      h5.textContent = title;
      section.appendChild(h5);
      buildFn(section);
      detailMetaBlock.appendChild(section);
    };

    const fmtDate = d => {
      if (!d?.year) return null;
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const m = d.month ? months[d.month - 1] : '';
      const day = d.day || '';
      if (m && day) return `${m} ${day}, ${d.year}`;
      if (m) return `${m} ${d.year}`;
      return String(d.year);
    };

    const makeStudioBtn = (studio) => {
      const btn = document.createElement('button');
      btn.className = 'detail-info-tag';
      btn.textContent = studio.name;
      if (studio.siteUrl) {
        btn.addEventListener('click', () => chrome.tabs.create({ url: studio.siteUrl }));
      } else {
        btn.classList.add('no-link');
      }
      return btn;
    };

    const startStr = fmtDate(anime.startDate);
    const endStr = fmtDate(anime.endDate);
    if (startStr || endStr) {
      addSection('Aired', section => {
        const row = document.createElement('div');
        row.className = 'detail-info-dates';
        if (startStr) {
          const item = document.createElement('div');
          item.className = 'date-item';
          item.innerHTML = `<span class="date-label">Start</span><span class="date-value">${startStr}</span>`;
          row.appendChild(item);
        }
        if (startStr && endStr) {
          const arrow = document.createElement('span');
          arrow.className = 'date-arrow';
          arrow.textContent = '→';
          row.appendChild(arrow);
        }
        if (endStr) {
          const item = document.createElement('div');
          item.className = 'date-item';
          item.innerHTML = `<span class="date-label">End</span><span class="date-value">${endStr}</span>`;
          row.appendChild(item);
        }
        section.appendChild(row);
      });
    }

    const studioNodes = anime.studios?.nodes || [];
    const animStudios = studioNodes.filter(s => s.isAnimationStudio);
    const producers = studioNodes.filter(s => !s.isAnimationStudio);

    if (animStudios.length > 0) {
      addSection('Studio', section => {
        const tags = document.createElement('div');
        tags.className = 'detail-info-tags';
        animStudios.forEach(s => tags.appendChild(makeStudioBtn(s)));
        section.appendChild(tags);
      });
    }

    if (producers.length > 0) {
      addSection('Producers', section => {
        const tags = document.createElement('div');
        tags.className = 'detail-info-tags';
        const PROD_LIMIT = 8;
        producers.slice(0, PROD_LIMIT).forEach(s => tags.appendChild(makeStudioBtn(s)));
        section.appendChild(tags);
        if (producers.length > PROD_LIMIT) {
          const more = document.createElement('button');
          more.className = 'detail-inline-more';
          more.textContent = `+${producers.length - PROD_LIMIT} more`;
          more.addEventListener('click', () => {
            producers.slice(PROD_LIMIT).forEach(s => tags.appendChild(makeStudioBtn(s)));
            more.remove();
          });
          section.appendChild(more);
        }
      });
    }

    if (anime.source) {
      addSection('Source', section => {
        const badge = document.createElement('span');
        badge.className = 'detail-info-source';
        badge.textContent = anime.source.replace(/_/g, ' ');
        section.appendChild(badge);
      });
    }

    const synonyms = (anime.synonyms || []).filter(s => s && s.trim());
    if (synonyms.length > 0) {
      addSection('Also Known As', section => {
        const tags = document.createElement('div');
        tags.className = 'detail-info-tags';
        const SYN_LIMIT = 6;
        synonyms.slice(0, SYN_LIMIT).forEach(syn => {
          const tag = document.createElement('span');
          tag.className = 'detail-info-tag no-link';
          tag.textContent = syn;
          tags.appendChild(tag);
        });
        section.appendChild(tags);
        if (synonyms.length > SYN_LIMIT) {
          const more = document.createElement('button');
          more.className = 'detail-inline-more';
          more.textContent = `+${synonyms.length - SYN_LIMIT} more`;
          more.addEventListener('click', () => {
            synonyms.slice(SYN_LIMIT).forEach(syn => {
              const tag = document.createElement('span');
              tag.className = 'detail-info-tag no-link';
              tag.textContent = syn;
              tags.appendChild(tag);
            });
            more.remove();
          });
          section.appendChild(more);
        }
      });
    }
  }

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
      const REL_INITIAL = 4;

      const buildRelCard = (edge) => {
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
          const currentResult = await chrome.storage.local.get(['selectedAnime']);
          if (currentResult.selectedAnime) {
            pushNavHistory({ anime: currentResult.selectedAnime, mediaType: state.currentMediaType });
          }

          if (node.type && node.type !== state.currentMediaType) {
            setMediaType(node.type);
            const toggleAnime = document.getElementById('toggle-anime');
            const toggleManga = document.getElementById('toggle-manga');
            if (toggleAnime && toggleManga) {
              toggleAnime.classList.toggle('active', node.type === 'ANIME');
              toggleManga.classList.toggle('active', node.type === 'MANGA');
            }
          }

          selectAnime({
            id: node.id,
            title: node.title,
            coverImage: node.coverImage || { large: '', medium: '' },
            mediaListEntry: node.mediaListEntry || null,
            status: node.status,
            type: node.type
          });
        });

        return card;
      };

      filtered.slice(0, REL_INITIAL).forEach(e => detailRelations.appendChild(buildRelCard(e)));

      if (filtered.length > REL_INITIAL) {
        const btn = document.createElement('button');
        btn.className = 'detail-show-more-btn';
        btn.textContent = `Show ${filtered.length - REL_INITIAL} more`;
        btn.addEventListener('click', () => {
          filtered.slice(REL_INITIAL).forEach(e => detailRelations.appendChild(buildRelCard(e)));
          btn.remove();
        });
        detailRelations.appendChild(btn);
      }
    }
  }

  // Populate characters (relation-card style, paginated)
  if (detailCharacters) {
    detailCharacters.innerHTML = '';
    const CHAR_BATCH = 12;
    const roleLabels = { MAIN: 'Main', SUPPORTING: 'Supporting', BACKGROUND: 'Background' };

    const buildCharCard = (edge) => {
      const char = edge.node;
      const role = roleLabels[edge.role] || edge.role || '';
      const card = document.createElement('div');
      card.className = 'relation-card';
      if (char.siteUrl) {
        card.addEventListener('click', () => chrome.tabs.create({ url: char.siteUrl }));
        card.style.cursor = 'pointer';
      }
      card.innerHTML = `
        ${char.image?.medium ? `<img src="${char.image.medium}" alt="${char.name?.full || ''}" class="relation-cover">` : ''}
        <div class="relation-info">
          ${role ? `<div class="relation-type">${role}</div>` : ''}
          <div class="relation-title">${char.name?.full || ''}</div>
        </div>
      `;
      return card;
    };

    let charEdges = [...(anime.characters?.edges || [])];
    let hasNextPage = anime.characters?.pageInfo?.hasNextPage ?? false;
    let nextPage = 2;
    let shown = 0;

    const list = document.createElement('div');
    list.className = 'relations-list';
    detailCharacters.appendChild(list);

    const btn = document.createElement('button');
    btn.className = 'detail-show-more-btn';

    const updateBtn = () => {
      const buffered = charEdges.length - shown;
      if (buffered > 0 || hasNextPage) {
        const displayCount = Math.min(CHAR_BATCH, buffered > 0 ? buffered : CHAR_BATCH);
        const suffix = hasNextPage && buffered <= CHAR_BATCH ? '+' : '';
        btn.textContent = `Show ${displayCount}${suffix} more`;
        if (!btn.parentNode) detailCharacters.appendChild(btn);
      } else {
        btn.remove();
      }
    };

    const showBatch = () => {
      charEdges.slice(shown, shown + CHAR_BATCH).forEach(e => list.appendChild(buildCharCard(e)));
      shown = Math.min(shown + CHAR_BATCH, charEdges.length);
      updateBtn();
    };

    btn.addEventListener('click', async () => {
      if (charEdges.length > shown) {
        showBatch();
      } else if (hasNextPage) {
        btn.textContent = 'Loading...';
        btn.disabled = true;
        try {
          const result = await AniListAPI.getMediaCharacters(anime.id, nextPage);
          charEdges = charEdges.concat(result.edges || []);
          hasNextPage = result.pageInfo?.hasNextPage ?? false;
          nextPage++;
          btn.disabled = false;
          showBatch();
        } catch {
          btn.textContent = 'Failed to load — retry';
          btn.disabled = false;
        }
      }
    });

    if (charEdges.length > 0) {
      showBatch();
    } else {
      detailCharacters.innerHTML = '<p style="font-size:13px;color:#a0a0a0;">No characters found.</p>';
    }
  }

  // Populate recommendations (relation-card style)
  if (detailRecommendations) {
    detailRecommendations.innerHTML = '';
    const recNodes = (anime.recommendations?.nodes || []).filter(n => n.mediaRecommendation);
    const REC_LIMIT = 6;
    if (recNodes.length > 0) {
      const list = document.createElement('div');
      list.className = 'relations-list';
      const buildRecCard = (rec) => {
        const media = rec.mediaRecommendation;
        const recTitle = getPreferredTitle(media.title);
        const recCover = media.coverImage?.large || media.coverImage?.medium || '';
        const card = document.createElement('div');
        card.className = 'relation-card';
        card.innerHTML = `
          ${recCover ? `<img src="${recCover}" alt="${recTitle}" class="relation-cover">` : ''}
          <div class="relation-info">
            <div class="relation-title">${recTitle}</div>
          </div>
        `;
        card.addEventListener('click', async () => {
          const currentResult = await chrome.storage.local.get(['selectedAnime']);
          if (currentResult.selectedAnime) {
            pushNavHistory({ anime: currentResult.selectedAnime, mediaType: state.currentMediaType });
          }
          selectAnime({ id: media.id, title: media.title, coverImage: media.coverImage || { large: '', medium: '' }, mediaListEntry: null });
        });
        return card;
      };
      recNodes.slice(0, REC_LIMIT).forEach(r => list.appendChild(buildRecCard(r)));
      detailRecommendations.appendChild(list);
      if (recNodes.length > REC_LIMIT) {
        const btn = document.createElement('button');
        btn.className = 'detail-show-more-btn';
        btn.textContent = `Show ${recNodes.length - REC_LIMIT} more`;
        btn.addEventListener('click', () => {
          recNodes.slice(REC_LIMIT).forEach(r => list.appendChild(buildRecCard(r)));
          btn.remove();
        });
        detailRecommendations.appendChild(btn);
      }
    } else {
      detailRecommendations.innerHTML = '<p style="font-size:13px;color:#a0a0a0;">No recommendations found.</p>';
    }
  }

  // Populate all external links
  if (detailExternalLinks) {
    detailExternalLinks.innerHTML = '';
    const allLinks = anime.externalLinks || [];
    const sorted = [...allLinks].sort((a, b) => (a.type === 'STREAMING' ? -1 : 1) - (b.type === 'STREAMING' ? -1 : 1));
    if (sorted.length > 0) {
      const h4 = document.createElement('h4');
      h4.textContent = 'External Links';
      detailExternalLinks.appendChild(h4);
      const grid = document.createElement('div');
      grid.className = 'external-links-grid';
      for (const link of sorted) {
        const btn = document.createElement('button');
        btn.className = 'external-link-btn';
        if (link.icon) {
          const img = document.createElement('img');
          img.src = link.icon;
          img.alt = link.site;
          img.className = 'ext-link-icon';
          btn.appendChild(img);
        }
        const nameEl = document.createElement('span');
        nameEl.className = 'ext-link-name';
        nameEl.textContent = link.site;
        btn.appendChild(nameEl);
        if (link.language) {
          const lang = document.createElement('span');
          lang.className = 'ext-link-lang';
          lang.textContent = link.language;
          btn.appendChild(lang);
        }
        btn.addEventListener('click', () => chrome.tabs.create({ url: link.url }));
        grid.appendChild(btn);
      }
      detailExternalLinks.appendChild(grid);
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

