// Error handling utilities

const MAX_TOASTS = 3;
let toastContainer = null;

export function setToastContainer(element) {
  toastContainer = element;
}

export function handleAPIError(error, defaultMessage = 'An error occurred') {
  const formattedError = AniListAPI.formatError(error);

  // Handle authentication errors - persistent toast with re-login button
  if (formattedError.requiresReauth) {
    showPersistentToast(formattedError.message, 'error');
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

  // Handle storage errors
  if (formattedError.type === 'STORAGE_ERROR' || formattedError.type === 'QUOTA_EXCEEDED') {
    showError(formattedError.message, 'error', 5000);
    return formattedError;
  }

  // Default error handling
  showError(formattedError.message || defaultMessage, 'error', 5000);
  return formattedError;
}

export function showError(message, type = 'error', duration = 5000) {
  showStatus(message, type, duration);
}

export function showSuccess(message, duration = 3000) {
  showStatus(message, 'success', duration);
}

export function showStatus(message, type = 'info', duration = 3000) {
  if (!toastContainer) return;

  // Enforce max toasts — remove oldest if at limit
  while (toastContainer.children.length >= MAX_TOASTS) {
    toastContainer.firstElementChild.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Trigger slide-in on next frame
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  // Auto-dismiss
  setTimeout(() => dismissToast(toast), duration);
}

function showPersistentToast(message, type) {
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} toast-persistent`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="btn-relogin">Log in again</button>
    <button class="toast-close">&times;</button>
  `;
  toastContainer.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  toast.querySelector('.btn-relogin').addEventListener('click', () => {
    import('./views.js').then(({ showView }) => showView('login'));
    dismissToast(toast);
  });
  toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(toast));
}

function dismissToast(toast) {
  if (!toast.parentNode) return;
  toast.classList.remove('toast-visible');
  toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  // Fallback removal if transitionend doesn't fire
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 400);
}

export function hideStatus() {
  // Remove all toasts
  if (!toastContainer) return;
  while (toastContainer.firstChild) {
    toastContainer.firstChild.remove();
  }
}

// Loading state utilities
export function setLoading(container, message = 'Loading...') {
  if (container) {
    container.innerHTML = `<div class="loading-state"><div class="loader"></div><p>${message}</p></div>`;
  }
}

export function setSkeletonLoading(container, count = 3) {
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    container.innerHTML += `
      <div class="result-card skeleton-card">
        <div class="skeleton skeleton-cover"></div>
        <div class="result-info">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-meta"></div>
          <div class="skeleton skeleton-status"></div>
        </div>
      </div>`;
  }
}

// Empty state SVG icons
export const ICON_SEARCH = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';

export const ICON_NO_RESULTS = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="8" x2="14" y2="14"></line><line x1="14" y1="8" x2="8" y2="14"></line></svg>';

export const ICON_EMPTY_LIST = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><line x1="9" y1="12" x2="15" y2="12"></line></svg>';

export function emptyStateHTML(icon, message) {
  return `<div class="empty-state">${icon}<p class="hint">${message}</p></div>`;
}
