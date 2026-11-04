// Result card rendering
import { state, getPreferredTitle } from './state.js';
import { handleAPIError, showSuccess } from './error-handler.js';

function formatTimeUntilAiring(seconds) {
  if (seconds <= 0) return 'now';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// The status line on a card, e.g. "Watched 5/12" or "Paused (3/12)"
function cardStatus(listEntry, totalProgress, isManga) {
  if (!listEntry) return { text: 'Not on list', cls: 'not-on-list', progress: 0 };
  const progress = listEntry.progress || 0;

  // Action verbs based on media type
  const progressVerb = isManga ? 'Read' : 'Watched';
  const planVerb = isManga ? 'Plan to Read' : 'Plan to Watch';
  const repeatVerb = isManga ? 'Rereading' : 'Rewatching';

  switch (listEntry.status) {
    case 'CURRENT':   return { text: `${progressVerb} ${progress}/${totalProgress}`, cls: 'watching', progress };
    case 'COMPLETED': return { text: `Completed (${progress}/${totalProgress})`, cls: 'completed', progress };
    case 'PLANNING':  return { text: planVerb, cls: 'planning', progress };
    case 'PAUSED':    return { text: `Paused (${progress}/${totalProgress})`, cls: 'paused', progress };
    case 'DROPPED':   return { text: `Dropped (${progress}/${totalProgress})`, cls: 'dropped', progress };
    case 'REPEATING': return { text: `${repeatVerb} (${progress}/${totalProgress})`, cls: 'rewatching', progress };
    default:          return { text: 'Not on list', cls: 'not-on-list', progress };
  }
}

export async function createResultCard(anime, index = 0, options = {}) {
  const card = document.createElement('div');
  card.className = 'result-card';
  card.style.animationDelay = `${Math.min(index, 10) * 30}ms`;

  // Use the mediaListEntry that comes with search results (more accurate)
  const listEntry = anime.mediaListEntry;

  const cover = anime.coverImage.large || anime.coverImage.medium || '';
  const seriesColor = anime.coverImage.color;
  const title = getPreferredTitle(anime.title);

  if (seriesColor) card.style.setProperty('--series-color', seriesColor);
  const isManga = state.currentMediaType === 'MANGA';

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
  const { text: userStatus, cls: statusClass, progress } = cardStatus(listEntry, totalProgress, isManga);

  const nextEp = !isManga && anime.nextAiringEpisode;
  const airingBadge = nextEp
    ? `<div class="result-airing">Ep ${nextEp.episode}<span class="result-airing-time">in ${formatTimeUntilAiring(nextEp.timeUntilAiring)}</span></div>`
    : '';

  // Show episodes behind for CURRENT anime that is airing
  let behindBadge = '';
  if (!isManga && nextEp && listEntry?.status === 'CURRENT') {
    const lastAired = nextEp.episode - 1;
    const behind = lastAired - progress;
    if (behind > 0) {
      behindBadge = `<span class="episodes-behind">${behind} ep behind</span>`;
    }
  }

  const genres = (anime.genres || []).slice(0, 7);
  const genreHTML = genres.length
    ? `<div class="genre-chips">${genres.map(g => `<span class="genre-chip">${g}</span>`).join('')}</div>`
    : '';

  const rankBadge = options.rank ? `<div class="rank-badge">#${options.rank}</div>` : '';

  card.innerHTML = `
    ${rankBadge}
    <img src="${cover}" alt="${title}" class="result-cover">
    <div class="result-info">
      <h4 class="result-title">${title}</h4>
      <p class="result-meta">${totalProgress} ${progressLabel} • <span class="status-badge ${statusBadgeClass}">${statusText}</span>${anime.averageScore ? ` • ${anime.averageScore}%` : ''}</p>
      <p class="result-status ${statusClass}">${userStatus}${behindBadge}</p>
      ${genreHTML}
    </div>
    ${airingBadge}
  `;

  // Quick-add button for items not on user's list
  if (!listEntry) {
    const quickAddBtn = document.createElement('button');
    quickAddBtn.className = 'quick-add-btn';
    quickAddBtn.title = isManga ? 'Add to Plan to Read' : 'Add to Plan to Watch';
    quickAddBtn.textContent = '+';
    quickAddBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      quickAddBtn.disabled = true;
      quickAddBtn.textContent = '...';

      try {
        // This card may come from a cache that is up to an hour old. Check AniList
        // first: saving Planning/0 over an existing entry would wipe its progress.
        const { entry: liveEntry } = await AniListAPI.getListEntry(anime.id);
        const statusEl = card.querySelector('.result-status');

        if (liveEntry) {
          anime.mediaListEntry = liveEntry;
          const live = cardStatus(liveEntry, totalProgress, isManga);
          if (statusEl) {
            statusEl.textContent = live.text;
            statusEl.className = `result-status ${live.cls}`;
          }
          quickAddBtn.remove();
          showSuccess('Already on your list', 2000);
          await Storage.clearMediaCaches(); // the cached card was out of date
          return;
        }

        const saved = await AniListAPI.updateProgress(anime.id, 0, 'PLANNING');
        anime.mediaListEntry = saved;
        await Storage.clearMediaCaches();

        showSuccess(`Added to ${isManga ? 'Plan to Read' : 'Plan to Watch'}`, 2000);

        const planVerb = isManga ? 'Plan to Read' : 'Plan to Watch';
        if (statusEl) {
          statusEl.textContent = planVerb;
          statusEl.className = 'result-status planning';
        }
        quickAddBtn.remove();
      } catch (error) {
        console.error('Quick add failed:', error);
        handleAPIError(error, 'Failed to add to list');
        quickAddBtn.disabled = false;
        quickAddBtn.textContent = '+';
      }
    });
    card.appendChild(quickAddBtn);
  }

  // Make card clickable to select media
  card.addEventListener('click', async () => {
    try {
      const { selectAnime } = await import('./detail-view.js');
      await selectAnime(anime);
    } catch (error) {
      console.error('Failed to load detail view:', error);
      const { showError } = await import('./error-handler.js').catch(() => ({
        showError: (msg) => console.error(msg)
      }));
      showError('Failed to open details. Please try again.', 'error', 3000);
    }
  });

  return card;
}
