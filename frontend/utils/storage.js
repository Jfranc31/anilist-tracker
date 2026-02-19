// Storage utility for managing extension data
// Uses chrome.storage.local for persistent storage

const Storage = {
  // Keys
  KEYS: {
    ACCESS_TOKEN: 'accessToken',
    USER: 'user',
    IS_AUTHENTICATED: 'isAuthenticated',
    CURRENT_ANIME: 'currentAnime',
    SETTINGS: 'settings',
    APPEARANCE: 'appearanceSettings'
  },

  // Get a value from storage
  async get(key) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error(`Error getting ${key} from storage:`, error);
      return null;
    }
  },

  // Get multiple values from storage
  async getMultiple(keys) {
    try {
      const result = await chrome.storage.local.get(keys);
      return result;
    } catch (error) {
      console.error('Error getting multiple values from storage:', error);
      return {};
    }
  },

  // Set a value in storage
  async set(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      console.error(`Error setting ${key} in storage:`, error);
      return false;
    }
  },

  // Set multiple values in storage
  async setMultiple(items) {
    try {
      await chrome.storage.local.set(items);
      return true;
    } catch (error) {
      console.error('Error setting multiple values in storage:', error);
      return false;
    }
  },

  // Remove a value from storage
  async remove(key) {
    try {
      await chrome.storage.local.remove(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key} from storage:`, error);
      return false;
    }
  },

  // Clear all storage
  async clear() {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  },

  // Specific getters
  async getAccessToken() {
    return await this.get(this.KEYS.ACCESS_TOKEN);
  },

  async getUser() {
    return await this.get(this.KEYS.USER);
  },

  async isAuthenticated() {
    const token = await this.getAccessToken();
    return !!token;
  },

  async getCurrentAnime() {
    return await this.get(this.KEYS.CURRENT_ANIME);
  },

  async getSettings() {
    const settings = await this.get(this.KEYS.SETTINGS);
    return settings || {
      autoUpdate: true,
      notifications: true
    };
  },

  // Specific setters
  async setAccessToken(token) {
    return await this.set(this.KEYS.ACCESS_TOKEN, token);
  },

  async setUser(user) {
    return await this.set(this.KEYS.USER, user);
  },

  async setAuthenticated(isAuth) {
    return await this.set(this.KEYS.IS_AUTHENTICATED, isAuth);
  },

  async setCurrentAnime(anime) {
    return await this.set(this.KEYS.CURRENT_ANIME, anime);
  },

  async setSettings(settings) {
    return await this.set(this.KEYS.SETTINGS, settings);
  },

  async getAppearance() {
    const a = await this.get(this.KEYS.APPEARANCE);
    return a || { theme: 'dark', cardLayout: 'list', showCovers: true };
  },

  async setAppearance(settings) {
    return await this.set(this.KEYS.APPEARANCE, settings);
  },

  // ─── TTL Cache ────────────────────────────────────────────────────────────
  // Generic cache with expiry. Data is stored as { data, cachedAt } under the key.
  // TTL is in milliseconds.

  async getCache(key, ttlMs) {
    const entry = await this.get(key);
    if (!entry || !entry.cachedAt) return null;
    if (Date.now() - entry.cachedAt > ttlMs) return null; // expired
    return entry.data;
  },

  async setCache(key, data) {
    return await this.set(key, { data, cachedAt: Date.now() });
  },

  // Authentication helpers
  async saveAuthData(token, user) {
    return await this.setMultiple({
      [this.KEYS.ACCESS_TOKEN]: token,
      [this.KEYS.USER]: user,
      [this.KEYS.IS_AUTHENTICATED]: true
    });
  },

  async clearAuthData() {
    return await chrome.storage.local.remove([
      this.KEYS.ACCESS_TOKEN,
      this.KEYS.USER,
      this.KEYS.IS_AUTHENTICATED
    ]);
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
}
