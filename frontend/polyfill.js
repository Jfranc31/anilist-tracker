// Browser API Polyfill for cross-browser compatibility
// Ensures Chrome extension APIs work in Firefox and other browsers
// Uses 'self' instead of 'window' to work in both page and service worker contexts

(function() {
  'use strict';

  // 'self' works in both window (popup/content) and service worker (background) contexts
  const globalScope = typeof self !== 'undefined' ? self : this;

  // Firefox uses 'browser' namespace, Chrome uses 'chrome'
  // This polyfill makes them interchangeable
  if (typeof browser !== 'undefined' && typeof chrome === 'undefined') {
    // Firefox environment - create chrome alias
    globalScope.chrome = browser;
  } else if (typeof chrome !== 'undefined' && typeof browser === 'undefined') {
    // Chrome environment - create browser alias for consistency
    globalScope.browser = chrome;
  }

  // Ensure chrome.runtime exists (basic check)
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.error('Browser extension APIs not available');
  } else {
    console.log('Browser polyfill loaded - Extension APIs available');
  }
})();
