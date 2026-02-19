// View management - switching between different views
import { setCurrentTab } from './state.js';

// DOM elements (will be set by main popup.js)
let loginView, mainView, loadingView, searchView, listView, detailView, settingsView;
let tabSearch, tabWatching, tabPlanning, tabCompleted, tabPaused, tabDropped, tabRepeating;
let searchInput, settingsBtn;

export function setDOMElements(elements) {
  loginView = elements.loginView;
  mainView = elements.mainView;
  loadingView = elements.loadingView;
  searchView = elements.searchView;
  listView = elements.listView;
  detailView = elements.detailView;
  settingsView = elements.settingsView;
  tabSearch = elements.tabSearch;
  tabWatching = elements.tabWatching;
  tabPlanning = elements.tabPlanning;
  tabCompleted = elements.tabCompleted;
  tabPaused = elements.tabPaused;
  tabDropped = elements.tabDropped;
  tabRepeating = elements.tabRepeating;
  searchInput = elements.searchInput;
  settingsBtn = elements.settingsBtn;
}

export function showView(viewName) {
  if (!loginView || !mainView || !loadingView) return;

  loginView.classList.add('hidden');
  mainView.classList.add('hidden');
  loadingView.classList.add('hidden');

  switch(viewName) {
    case 'login':
      loginView.classList.remove('hidden');
      break;
    case 'main':
      mainView.classList.remove('hidden');
      break;
    case 'loading':
      loadingView.classList.remove('hidden');
      break;
  }
}

export function showSettingsView() {
  if (!settingsView) return;

  searchView.classList.add('hidden');
  listView.classList.add('hidden');
  detailView.classList.add('hidden');
  settingsView.classList.remove('hidden');

  if (settingsBtn) settingsBtn.classList.add('active');
}

export function showSearchView() {
  if (!searchView || !listView || !detailView) return;

  if (settingsView) settingsView.classList.add('hidden');
  if (settingsBtn) settingsBtn.classList.remove('active');

  setCurrentTab('search');
  searchView.classList.remove('hidden');
  listView.classList.add('hidden');
  detailView.classList.add('hidden');
  setActiveTab(tabSearch);

  // Focus search input
  if (searchInput) {
    setTimeout(() => searchInput.focus(), 100);
  }
}

export async function showListView(status) {
  if (!searchView || !listView || !detailView) return;

  if (settingsView) settingsView.classList.add('hidden');
  if (settingsBtn) settingsBtn.classList.remove('active');

  setCurrentTab(status.toLowerCase());
  searchView.classList.add('hidden');
  listView.classList.remove('hidden');
  detailView.classList.add('hidden');

  // Set active tab
  switch(status) {
    case 'CURRENT':
      setActiveTab(tabWatching);
      break;
    case 'PLANNING':
      setActiveTab(tabPlanning);
      break;
    case 'COMPLETED':
      setActiveTab(tabCompleted);
      break;
    case 'PAUSED':
      setActiveTab(tabPaused);
      break;
    case 'DROPPED':
      setActiveTab(tabDropped);
      break;
    case 'REPEATING':
      setActiveTab(tabRepeating);
      break;
  }

  // Load list data (import dynamically to avoid circular dependency)
  const { loadList } = await import('./list-view.js');
  await loadList(status);
}

export function setActiveTab(activeTab) {
  if (!tabSearch || !tabWatching || !tabPlanning || !tabCompleted) return;

  [tabSearch, tabWatching, tabPlanning, tabCompleted, tabPaused, tabDropped, tabRepeating]
    .filter(Boolean)
    .forEach(tab => tab.classList.remove('active'));
  activeTab.classList.add('active');
}

export function showDetailViewUI() {
  if (!searchView || !listView || !detailView) return;

  if (settingsView) settingsView.classList.add('hidden');
  if (settingsBtn) settingsBtn.classList.remove('active');

  searchView.classList.add('hidden');
  listView.classList.add('hidden');
  detailView.classList.remove('hidden');
}
