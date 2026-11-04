// Detail view: small formatting helpers shared by rendering and saving

// AniList fuzzy date { year, month, day } -> "YYYY-MM-DD" for <input type="date">
export function formatDateInput(d) {
  if (!d?.year) return '';
  return `${d.year}-${String(d.month || 1).padStart(2, '0')}-${String(d.day || 1).padStart(2, '0')}`;
}

// "YYYY-MM-DD" -> AniList fuzzy date (undefined when empty)
export function parseDateInput(val) {
  if (!val) return undefined;
  const [y, m, d] = val.split('-').map(Number);
  return { year: y, month: m, day: d };
}

export function todayAsFuzzyDate() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

// Seconds until airing -> "2d 5h" / "5h 12m" / "12m"
export function formatTimeUntil(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Display name for a list status, e.g. CURRENT -> "Watching" / "Reading"
export function statusName(status, isManga) {
  const names = {
    'CURRENT': isManga ? 'Reading' : 'Watching',
    'PLANNING': isManga ? 'Plan to Read' : 'Plan to Watch',
    'COMPLETED': 'Completed', 'PAUSED': 'Paused',
    'DROPPED': 'Dropped',
    'REPEATING': isManga ? 'Rereading' : 'Rewatching'
  };
  return names[status];
}

// The status line under the title, e.g. "Watched 5/12" with its CSS class
export function listStatusText(status, progress, totalProgress, isManga) {
  const progressVerb = isManga ? 'Read' : 'Watched';
  const planVerb = isManga ? 'Plan to Read' : 'Plan to Watch';
  const repeatVerb = isManga ? 'Rereading' : 'Rewatching';

  switch (status) {
    case 'CURRENT':
      return { text: `${progressVerb} ${progress}/${totalProgress}`, cls: 'watching' };
    case 'COMPLETED':
      return { text: `Completed ${progress}/${totalProgress}`, cls: 'completed' };
    case 'PLANNING':
      return { text: planVerb, cls: 'planning' };
    case 'PAUSED':
      return { text: `Paused - ${progressVerb} ${progress}/${totalProgress}`, cls: 'paused' };
    case 'DROPPED':
      return { text: `Dropped - ${progressVerb} ${progress}/${totalProgress}`, cls: 'dropped' };
    case 'REPEATING':
      return { text: `${repeatVerb} ${progress}/${totalProgress}`, cls: 'rewatching' };
    default:
      return { text: 'Not on list', cls: 'not-on-list' };
  }
}
