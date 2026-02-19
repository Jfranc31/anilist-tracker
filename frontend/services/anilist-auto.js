// AniList API Service - Automatic OAuth Flow
// Uses a tab-based approach for more reliable OAuth

const AniListAPI = {
  // API Configuration
  get API_URL() {
    return typeof CONFIG !== 'undefined' ? CONFIG.ANILIST_API_URL : 'https://graphql.anilist.co';
  },

  get AUTH_URL() {
    return typeof CONFIG !== 'undefined' ? CONFIG.ANILIST_AUTH_URL : 'https://anilist.co/api/v2/oauth/authorize';
  },

  get CLIENT_ID() {
    if (typeof CONFIG !== 'undefined') {
      return CONFIG.ANILIST_CLIENT_ID;
    }
    console.error('CONFIG not loaded!');
    return 'YOUR_CLIENT_ID_HERE';
  },

  get REDIRECT_URI() {
    return chrome.identity.getRedirectURL();
  },

  /**
   * Authenticate user with AniList - Opens in a new tab and captures the redirect
   */
  async authenticate() {
    return new Promise((resolve, reject) => {
      try {
        // Build OAuth URL
        const authUrl = new URL(this.AUTH_URL);
        authUrl.searchParams.append('client_id', this.CLIENT_ID);
        authUrl.searchParams.append('redirect_uri', this.REDIRECT_URI);
        authUrl.searchParams.append('response_type', 'token');

        console.log('Starting OAuth flow...');
        console.log('Auth URL:', authUrl.toString());

        // Create a new tab for authentication
        chrome.tabs.create({ url: authUrl.toString() }, (tab) => {
          const authTabId = tab.id;

          // Listen for URL changes in the tab
          const listener = (tabId, changeInfo, updatedTab) => {
            if (tabId !== authTabId) return;

            // Check if the URL is the redirect URL with a token
            if (updatedTab.url && updatedTab.url.startsWith(this.REDIRECT_URI)) {
              console.log('Redirect captured:', updatedTab.url);

              // Remove the listener
              chrome.tabs.onUpdated.removeListener(listener);

              // Close the auth tab
              chrome.tabs.remove(authTabId);

              // Extract the token
              const token = this.extractTokenFromUrl(updatedTab.url);

              if (!token) {
                reject(new Error('No access token received from AniList'));
                return;
              }

              console.log('Access token received');

              // Get user data
              this.getCurrentUser(token)
                .then(user => {
                  console.log('User authenticated:', user.name);
                  resolve({ token, user });
                })
                .catch(error => {
                  reject(new Error('Failed to get user data: ' + error.message));
                });
            }
          };

          // Start listening for tab updates
          chrome.tabs.onUpdated.addListener(listener);

          // Handle tab closure (user cancelled)
          const closeListener = (closedTabId) => {
            if (closedTabId === authTabId) {
              chrome.tabs.onUpdated.removeListener(listener);
              chrome.tabs.onRemoved.removeListener(closeListener);
              reject(new Error('Authentication cancelled'));
            }
          };

          chrome.tabs.onRemoved.addListener(closeListener);
        });
      } catch (error) {
        console.error('Authentication error:', error);
        reject(error);
      }
    });
  },

  /**
   * Extract access token from OAuth redirect URL
   */
  extractTokenFromUrl(url) {
    try {
      const hashParams = new URLSearchParams(url.split('#')[1]);
      return hashParams.get('access_token');
    } catch (error) {
      console.error('Error extracting token:', error);
      return null;
    }
  },

  /**
   * Make a GraphQL query to AniList API
   */
  async query(query, variables = {}, token = null) {
    try {
      if (!token && typeof Storage !== 'undefined') {
        token = await Storage.getAccessToken();
      }

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          variables
        })
      });

      const data = await response.json();

      if (data.errors) {
        console.error('GraphQL errors:', data.errors);
        throw new Error(data.errors[0].message);
      }

      return data.data;
    } catch (error) {
      console.error('GraphQL query error:', error);
      throw error;
    }
  },

  /**
   * Get current authenticated user's data
   */
  async getCurrentUser(token = null) {
    const query = `
      query {
        Viewer {
          id
          name
          avatar {
            large
            medium
          }
          bannerImage
          options {
            displayAdultContent
          }
          mediaListOptions {
            scoreFormat
          }
        }
      }
    `;

    const data = await this.query(query, {}, token);
    return data.Viewer;
  },

  /**
   * Search for anime by title
   */
  async searchAnime(title) {
    const query = `
      query ($search: String) {
        Media(search: $search, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            medium
          }
          episodes
          status
          description
          averageScore
          season
          seasonYear
          format
        }
      }
    `;

    const data = await this.query(query, { search: title });
    return data.Media;
  },

  /**
   * Search for multiple anime (returns list)
   */
  async searchAnimeList(title, page = 1, perPage = 10) {
    const query = `
      query ($search: String, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
          }
          media(search: $search, type: ANIME) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
            }
            episodes
            status
            averageScore
            season
            seasonYear
            format
          }
        }
      }
    `;

    const data = await this.query(query, { search: title, page, perPage });
    return data.Page;
  },

  /**
   * Get user's anime list entry for a specific anime
   */
  async getMediaListEntry(mediaId) {
    const query = `
      query ($mediaId: Int) {
        MediaList(mediaId: $mediaId) {
          id
          mediaId
          status
          progress
          progressVolumes
          score
          notes
          repeat
          media {
            id
            title {
              romaji
              english
              native
            }
            episodes
            coverImage {
              large
              medium
            }
          }
        }
      }
    `;

    try {
      const data = await this.query(query, { mediaId });
      return data.MediaList;
    } catch (error) {
      return null;
    }
  },

  /**
   * Update episode progress for an anime
   */
  async updateProgress(mediaId, progress, status = 'CURRENT') {
    const query = `
      mutation ($mediaId: Int, $progress: Int, $status: MediaListStatus) {
        SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: $status) {
          id
          mediaId
          status
          progress
          media {
            id
            title {
              romaji
              english
            }
            episodes
          }
        }
      }
    `;

    const data = await this.query(query, { mediaId, progress, status });
    return data.SaveMediaListEntry;
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AniListAPI;
}
