// Result card rendering
import { state, getPreferredTitle } from './state.js';

function formatTimeUntilAiring(seconds) {
  if (seconds <= 0) return 'now';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export async function createResultCard(anime, index = 0, options = {}) {
  const card = document.createElement('div');
  card.className = 'result-card';
  card.style.animationDelay = `${Math.min(index, 10) * 30}ms`;

  // Use the mediaListEntry that comes with search results (more accurate)
  const listEntry = anime.mediaListEntry;

  const cover = anime.coverImage.medium || '';
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

  const nextEp = !isManga && anime.nextAiringEpisode;
  const airingBadge = nextEp
    ? `<div class="result-airing">Ep ${nextEp.episode}<span class="result-airing-time">in ${formatTimeUntilAiring(nextEp.timeUntilAiring)}</span></div>`
    : '';

  const genres = (anime.genres || []).slice(0, 5);
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
      <p class="result-status ${statusClass}">${userStatus}</p>
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
        await AniListAPI.updateProgress(anime.id, 0, 'PLANNING');
        const statusEl = card.querySelector('.result-status');
        const planVerb = isManga ? 'Plan to Read' : 'Plan to Watch';
        if (statusEl) {
          statusEl.textContent = planVerb;
          statusEl.className = 'result-status planning';
        }
        quickAddBtn.remove();
      } catch (error) {
        console.error('Quick add failed:', error);
        quickAddBtn.disabled = false;
        quickAddBtn.textContent = '+';
      }
    });
    card.appendChild(quickAddBtn);
  }

  // Make card clickable to select media
  card.addEventListener('click', async () => {
    const { selectAnime } = await import('./detail-view.js');
    selectAnime(anime);
  });

  return card;
}
