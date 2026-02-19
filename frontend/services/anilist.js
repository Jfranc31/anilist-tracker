// AniList API Service
// Handles authentication and GraphQL queries/mutations

const AniListAPI = {
  // API Configuration - Uses CONFIG if available, falls back to defaults
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
    // Fallback - will cause error if not set, prompting user to configure
    console.error('CONFIG not loaded! Make sure config.js is included before this file.');
    return 'YOUR_CLIENT_ID_HERE';
  },

  get REDIRECT_URI() {
    return chrome.identity.getRedirectURL();
  },

  /**
   * Authenticate user with AniList using OAuth2 Implicit Grant
   */
  async authenticate() {
    try {
      // Build OAuth URL
      const authUrl = new URL(this.AUTH_URL);
      authUrl.searchParams.append('client_id', this.CLIENT_ID);
      authUrl.searchParams.append('redirect_uri', this.REDIRECT_URI);
      authUrl.searchParams.append('response_type', 'token');

      console.log('Starting OAuth flow...');
      console.log('Client ID:', this.CLIENT_ID);
      console.log('Redirect URI:', this.REDIRECT_URI);
      console.log('Auth URL:', authUrl.toString());

      // Launch OAuth flow
      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl.toString(),
        interactive: true
      });

      console.log('OAuth response URL:', responseUrl);

      // Extract access token from redirect URL
      const token = this.extractTokenFromUrl(responseUrl);

      if (!token) {
        throw new Error('No access token received from AniList');
      }

      console.log('Access token received');

      // Get user data
      const user = await this.getCurrentUser(token);

      console.log('User authenticated:', user.name);

      return { token, user };
    } catch (error) {
      console.error('Authentication error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  },

  /**
   * Extract access token from OAuth redirect URL
   */
  extractTokenFromUrl(url) {
    const hashParams = new URLSearchParams(url.split('#')[1]);
    return hashParams.get('access_token');
  },

  /**
   * Make a GraphQL query to AniList API
   */
  async query(query, variables = {}, token = null) {
    try {
      // Get token from storage if not provided
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
      // Entry might not exist yet
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
  },

  /**
   * Get user's anime list
   */
  async getUserAnimeList(userId, status = null) {
    const query = `
      query ($userId: Int, $status: MediaListStatus) {
        MediaListCollection(userId: $userId, type: ANIME, status: $status) {
          lists {
            name
            status
            entries {
              id
              mediaId
              status
              progress
              score
              media {
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
                averageScore
              }
            }
          }
        }
      }
    `;

    const data = await this.query(query, { userId, status });
    return data.MediaListCollection;
  },

  /**
   * Delete a media list entry
   */
  async deleteMediaListEntry(entryId) {
    const query = `
      mutation ($id: Int) {
        DeleteMediaListEntry(id: $id) {
          deleted
        }
      }
    `;

    const data = await this.query(query, { id: entryId });
    return data.DeleteMediaListEntry;
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AniListAPI;
}
