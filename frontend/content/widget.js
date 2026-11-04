// AniList Tracker — Floating Manga Widget
// Injected into all pages as a content script.
// Shows +1 chapter button for a pinned manga without needing to open the popup.

(function () {
  'use strict';

  let pinned = null;
  let widget = null;
  let toastTimer = null;
  let dismissedThisPage = false;

  // ─── Init ────────────────────────────────────────────────────────────────────

  function init() {
    // Register the storage listener FIRST to avoid race conditions
    // (a pin action from the popup could fire before the async get resolves)
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !('pinnedManga' in changes)) return;
      const newVal = changes.pinnedManga.newValue;
      if (!newVal) {
        pinned = null;
        removeWidget();
      } else {
        // Only pinning a different manga brings back a widget closed on this page;
        // progress updates (from the popup or another tab) must not.
        if (newVal.id !== pinned?.id) dismissedThisPage = false;
        pinned = newVal;
        if (dismissedThisPage) return;
        if (widget) {
          populateWidget(); // updates title, cover, AND progress
        } else {
          injectWidget();
        }
      }
    });

    // Then read the current value
    chrome.storage.local.get('pinnedManga').then(result => {
      pinned = result.pinnedManga || null;
      if (pinned && !dismissedThisPage) injectWidget();
      watchForWidgetRemoval();
    });
  }

  // ─── SPA / Dynamic-page persistence ─────────────────────────────────────────
  // Many sites use client-side routing: clicking a link replaces body content
  // without a full page reload, which removes the widget from the DOM.
  // A MutationObserver re-injects it whenever it disappears (unless dismissed).

  let reinjectionTimer = null;

  function watchForWidgetRemoval() {
    const observer = new MutationObserver(() => {
      if (!pinned || dismissedThisPage) return;
      if (document.getElementById('anilist-tracker-widget')) return; // still there

      // Widget is gone. Wait one frame for the SPA to finish updating the DOM,
      // then re-inject.
      widget = null;
      clearTimeout(reinjectionTimer);
      reinjectionTimer = setTimeout(() => {
        if (pinned && !dismissedThisPage && !document.getElementById('anilist-tracker-widget')) {
          injectWidget();
        }
      }, 150);
    });

    observer.observe(document.body, { childList: true });
  }

  // ─── DOM ─────────────────────────────────────────────────────────────────────

  function injectWidget() {
    if (widget) return;

    widget = document.createElement('div');
    widget.id = 'anilist-tracker-widget';
    widget.innerHTML = `
      <div class="atw-header">
        <img class="atw-cover" src="" alt="cover">
        <div class="atw-info">
          <div class="atw-title"></div>
          <div class="atw-progress"></div>
        </div>
        <button class="atw-close" title="Hide on this page">✕</button>
      </div>
      <button class="atw-plus-btn">+1 Ch.</button>
      <div class="atw-toast"></div>
    `;

    populateWidget();

    widget.querySelector('.atw-close').addEventListener('click', dismissForPage);
    widget.querySelector('.atw-plus-btn').addEventListener('click', incrementChapter);

    document.body.appendChild(widget);
  }

  function populateWidget() {
    if (!widget || !pinned) return;
    const cover = widget.querySelector('.atw-cover');
    cover.src = pinned.coverImage || '';
    cover.style.display = pinned.coverImage ? '' : 'none';
    widget.querySelector('.atw-title').textContent = pinned.title || 'Unknown Manga';
    updateProgressDisplay();
  }

  function updateProgressDisplay() {
    if (!widget || !pinned) return;
    const total = pinned.chapters ? `/ ${pinned.chapters}` : '';
    widget.querySelector('.atw-progress').textContent = `Ch. ${pinned.progress} ${total}`.trim();

    const plusBtn = widget.querySelector('.atw-plus-btn');
    const atMax = pinned.chapters && pinned.progress >= pinned.chapters;
    plusBtn.disabled = atMax;
    plusBtn.title = atMax ? 'Already at final chapter' : '';
  }

  function removeWidget() {
    if (widget) {
      widget.remove();
      widget = null;
    }
  }

  // ✕ hides the widget for the current page only.
  // pinnedManga stays in storage — widget reappears on next navigation/refresh.
  // Use "Unpin from Widget" in the popup to fully remove.
  function dismissForPage() {
    dismissedThisPage = true;
    removeWidget();
  }

  function showToast(message, isError = false) {
    if (!widget) return;
    const toast = widget.querySelector('.atw-toast');
    toast.textContent = message;
    toast.className = 'atw-toast' + (isError ? ' atw-toast--error' : ' atw-toast--success');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.className = 'atw-toast';
      toast.textContent = '';
    }, 2500);
  }

  // ─── +1 Chapter ──────────────────────────────────────────────────────────────

  async function incrementChapter() {
    if (!pinned) return;

    const plusBtn = widget.querySelector('.atw-plus-btn');
    plusBtn.disabled = true;
    plusBtn.textContent = '...';

    try {
      // The background script adds one to AniList's *current* progress, so this
      // can't roll back progress that was changed elsewhere since the pin.
      const response = await chrome.runtime.sendMessage({
        type: 'INCREMENT_CHAPTER',
        data: { mediaId: pinned.id }
      });

      if (response && response.notOnList) {
        // Removed from the list (in the popup or on AniList): unpin instead of re-adding it
        showToast('Not on your list anymore — unpinned', true);
        setTimeout(() => chrome.storage.local.remove('pinnedManga'), 2500);
        return;
      }

      if (response && response.atMax) {
        pinned.progress = response.entry.progress;
        await chrome.storage.local.set({ pinnedManga: pinned });
        showToast('Already at the final chapter', true);
        return;
      }

      if (response && response.success) {
        const next = response.entry.progress;
        const targetStatus = response.entry.status;
        pinned.progress = next;
        pinned.status = targetStatus;
        if (response.chapters) pinned.chapters = response.chapters;

        // Update both pinnedManga and selectedAnime so the popup reflects
        // the new count when it next opens
        const updates = { pinnedManga: pinned };
        const { selectedAnime } = await chrome.storage.local.get('selectedAnime');
        if (selectedAnime?.id === pinned.id) {
          if (!selectedAnime.mediaListEntry) selectedAnime.mediaListEntry = {};
          selectedAnime.mediaListEntry.progress = next;
          selectedAnime.mediaListEntry.status = targetStatus;
          updates.selectedAnime = selectedAnime;
        }
        await chrome.storage.local.set(updates);

        updateProgressDisplay();
        showToast(`Ch. ${next} saved!`);
      } else {
        showToast('Failed to save', true);
      }
    } catch (e) {
      showToast('Failed to save', true);
    } finally {
      plusBtn.disabled = false;
      plusBtn.textContent = '+1 Ch.';
      updateProgressDisplay();
    }
  }

  // ─── Start ───────────────────────────────────────────────────────────────────

  init();
})();
