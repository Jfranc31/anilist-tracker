// AniList API Service - PKCE OAuth Flow
// Uses Authorization Code flow with PKCE (secure for public clients)

const AniListAPI = {
  // API Configuration
  get API_URL() {
    return typeof CONFIG !== 'undefined' ? CONFIG.ANILIST_API_URL : 'https://graphql.anilist.co';
  },

  get AUTH_URL() {
    return typeof CONFIG !== 'undefined' ? CONFIG.ANILIST_AUTH_URL : 'https://anilist.co/api/v2/oauth/authorize';
  },

  get BACKEND_URL() {
    return typeof CONFIG !== 'undefined' ? CONFIG.BACKEND_URL : 'http://localhost:3001';
  },

  get CLIENT_ID() {
    if (typeof CONFIG !== 'undefined') {
      return CONFIG.ANILIST_CLIENT_ID;
    }
    console.error('CONFIG not loaded!');
    return 'YOUR_CLIENT_ID_HERE';
  },

  get REDIRECT_URI() {
    // Use backend URL as redirect - works for both Chrome and Firefox
    // (AniList only supports one redirect URI, so we can't use browser-specific ones)
    const backendUrl = typeof CONFIG !== 'undefined' ? CONFIG.BACKEND_URL : 'http://localhost:3001';
    return `${backendUrl}/api/auth/callback`;
  },


  /**
   * Authenticate user with AniList using Authorization Code flow (via backend)
   */
  async authenticate() {
    return new Promise(async (resolve, reject) => {
      try {
        // Build OAuth URL (no PKCE needed, backend handles token exchange)
        const authUrl = new URL(this.AUTH_URL);
        authUrl.searchParams.append('client_id', this.CLIENT_ID);
        authUrl.searchParams.append('redirect_uri', this.REDIRECT_URI);
        authUrl.searchParams.append('response_type', 'code');

        console.log('Starting OAuth flow...');
        console.log('Auth URL:', authUrl.toString());

        // Create a new tab for authentication
        chrome.tabs.create({ url: authUrl.toString() }, (tab) => {
          const authTabId = tab.id;

          // Listen for URL changes in the tab
          const listener = async (tabId, changeInfo, updatedTab) => {
            if (tabId !== authTabId) return;

            // Get the current URL (from changeInfo or tab object)
            const currentUrl = changeInfo.url || updatedTab.url;

            console.log('Tab updated:', { tabId, url: currentUrl, status: changeInfo.status });

            // Check if the URL is the redirect URL with a code
            if (currentUrl && currentUrl.startsWith(this.REDIRECT_URI)) {
              console.log('Redirect captured:', currentUrl);

              // Remove the listener
              chrome.tabs.onUpdated.removeListener(listener);
              chrome.tabs.onRemoved.removeListener(closeListener);

              // Close the auth tab
              chrome.tabs.remove(authTabId);

              // Extract the authorization code
              const code = this.extractCodeFromUrl(currentUrl);

              if (!code) {
                reject(new Error('No authorization code received from AniList'));
                return;
              }

              console.log('Authorization code received');

              try {
                // Exchange code for token via backend
                const token = await this.exchangeCodeForToken(code);
                console.log('Access token received');

                // Get user data
                const user = await this.getCurrentUser(token);
                console.log('User authenticated:', user.name);

                resolve({ token, user });
              } catch (error) {
                reject(new Error('Failed to exchange code for token: ' + error.message));
              }
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
   * Extract authorization code from OAuth redirect URL
   */
  extractCodeFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('code');
    } catch (error) {
      console.error('Error extracting code:', error);
      return null;
    }
  },

  /**
   * Exchange authorization code for access token via backend
   * Backend securely handles client_secret
   */
  async exchangeCodeForToken(code) {
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          code,
          redirect_uri: this.REDIRECT_URI // Send redirect URI to backend for cross-browser support
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Token exchange failed:', data);
        throw new Error(data.error || 'Failed to exchange code for token');
      }

      if (!data.access_token) {
        throw new Error('No access token in response');
      }

      return data.access_token;
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw error;
    }
  },

  /**
   * Format error for user display
   */
  formatError(error) {
    if (typeof error === 'object' && error.type) {
      return {
        type: error.type,
        message: error.message,
        requiresReauth: error.requiresReauth || false,
        retryAfter: error.retryAfter || null
      };
    }

    return {
      type: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred.',
      requiresReauth: false,
      retryAfter: null
    };
  },

  /**
   * Make a GraphQL query to AniList API with enhanced error handling and retry logic
   */
  async query(query, variables = {}, token = null, retryCount = 0) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second base delay

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

      // Handle rate limiting (429) — auto-retry once after the wait period
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
        if (retryCount < MAX_RETRIES) {
          const waitMs = (retryAfter + 1) * 1000; // wait the full period + 1s buffer
          console.log(`Auto-retrying rate-limited request in ${waitMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          return this.query(query, variables, token, retryCount + 1);
        }
        throw {
          type: 'RATE_LIMIT',
          message: `Rate limited. Please try again in ${retryAfter} seconds.`,
          retryAfter
        };
      }

      // Handle authentication errors (401)
      if (response.status === 401) {
        console.error('Authentication error: Token is invalid or expired');
        // Clear invalid token
        if (typeof Storage !== 'undefined') {
          await Storage.clearAuthData();
        }
        throw {
          type: 'AUTH_ERROR',
          message: 'Your session has expired. Please log in again.',
          requiresReauth: true
        };
      }

      // Handle server errors (500-599)
      if (response.status >= 500) {
        if (retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
          console.warn(`Server error. Retrying in ${delay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.query(query, variables, token, retryCount + 1);
        }
        throw {
          type: 'SERVER_ERROR',
          message: 'AniList servers are currently unavailable. Please try again later.'
        };
      }

      // Handle GraphQL errors
      if (data.errors) {
        console.error('GraphQL errors:', data.errors);
        const firstError = data.errors[0];

        // Check if it's an authentication error in GraphQL response
        if (firstError.message.includes('Invalid token') ||
            firstError.status === 401) {
          if (typeof Storage !== 'undefined') {
            await Storage.clearAuthData();
          }
          throw {
            type: 'AUTH_ERROR',
            message: 'Your session has expired. Please log in again.',
            requiresReauth: true
          };
        }

        throw {
          type: 'GRAPHQL_ERROR',
          message: firstError.message || 'An error occurred while fetching data.'
        };
      }

      return data.data;
    } catch (error) {
      // If it's already our custom error format, rethrow it
      if (error.type) {
        throw error;
      }

      // Handle network errors with retry
      if (error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('Network request failed')) {
        if (retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY * Math.pow(2, retryCount);
          console.warn(`Network error. Retrying in ${delay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.query(query, variables, token, retryCount + 1);
        }
        throw {
          type: 'NETWORK_ERROR',
          message: 'Unable to connect to AniList. Please check your internet connection.'
        };
      }

      // Unknown error
      console.error('GraphQL query error:', error);
      throw {
        type: 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred.'
      };
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
            titleLanguage
            profileColor
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
   * Search for multiple anime/manga (returns list)
   * Now includes user's list status if they have the media on their list
   */
  async searchAnimeList(title, page = 1, perPage = 10, type = 'ANIME', genres = null) {
    const hasGenres = genres && genres.length > 0;
    const genreVar = hasGenres ? ', $genres: [String]' : '';
    const genreFilter = hasGenres ? ', genre_in: $genres' : '';
    const query = `
      query ($search: String, $page: Int, $perPage: Int, $type: MediaType${genreVar}) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
          }
          media(search: $search, type: $type, sort: POPULARITY_DESC${genreFilter}) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
              color
            }
            bannerImage
            episodes
            chapters
            volumes
            status
            averageScore
            season
            seasonYear
            format
            genres
            description(asHtml: true)
            nextAiringEpisode {
              airingAt
              timeUntilAiring
              episode
            }
            mediaListEntry {
              id
              status
              progress
              progressVolumes
              score
              repeat
            }
            relations {
              edges {
                relationType
                node {
                  id
                  title {
                    romaji
                    english
                  }
                  coverImage {
                    medium
                  }
                  type
                  format
                  status
                  mediaListEntry {
                    status
                    progress
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables = { search: title, page, perPage, type };
    if (hasGenres) variables.genres = genres;
    const data = await this.query(query, variables);
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
   * Get user's anime/manga list by status
   */
  async getUserAnimeList(status = null, type = 'ANIME') {
    const query = `
      query ($userId: Int, $status: MediaListStatus, $type: MediaType) {
        MediaListCollection(userId: $userId, type: $type, status: $status) {
          lists {
            entries {
              id
              mediaId
              status
              progress
              progressVolumes
              score
              repeat
              updatedAt
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
                  color
                }
                bannerImage
                episodes
                chapters
                volumes
                status
                averageScore
                season
                seasonYear
                format
                genres
                nextAiringEpisode {
                  airingAt
                  timeUntilAiring
                  episode
                }
              }
            }
          }
        }
      }
    `;

    try {
      const user = await this.getCurrentUser();
      const data = await this.query(query, { userId: user.id, status, type });

      // Flatten the entries from all lists
      const entries = [];
      if (data.MediaListCollection && data.MediaListCollection.lists) {
        for (const list of data.MediaListCollection.lists) {
          entries.push(...list.entries);
        }
      }

      return entries;
    } catch (error) {
      console.error('Error fetching user media list:', error);
      return [];
    }
  },

  /**
   * Update episode/chapter progress, status, score, and volume progress
   */
  async updateProgress(mediaId, progress, status = 'CURRENT', score, progressVolumes, startedAt, completedAt) {
    const query = `
      mutation ($mediaId: Int, $progress: Int, $status: MediaListStatus, $score: Float, $progressVolumes: Int, $startedAt: FuzzyDateInput, $completedAt: FuzzyDateInput) {
        SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: $status, score: $score, progressVolumes: $progressVolumes, startedAt: $startedAt, completedAt: $completedAt) {
          id
          mediaId
          status
          progress
          progressVolumes
          score
        }
      }
    `;

    const variables = { mediaId, progress, status };
    if (score !== undefined) variables.score = score;
    if (progressVolumes !== undefined) variables.progressVolumes = progressVolumes;
    if (startedAt !== undefined) variables.startedAt = startedAt;
    if (completedAt !== undefined) variables.completedAt = completedAt;

    const data = await this.query(query, variables);
    return data.SaveMediaListEntry;
  },

  /**
   * Get trending media
   */
  async getTrending(type = 'ANIME', page = 1, perPage = 10, genres = null) {
    const hasGenres = genres && genres.length > 0;
    const genreVar = hasGenres ? ', $genres: [String]' : '';
    const genreFilter = hasGenres ? ', genre_in: $genres' : '';
    const query = `
      query ($type: MediaType, $page: Int, $perPage: Int${genreVar}) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { total currentPage lastPage hasNextPage }
          media(type: $type, sort: TRENDING_DESC${genreFilter}) {
            id
            title { romaji english native }
            coverImage { large medium color }
            bannerImage
            episodes chapters volumes
            status averageScore season seasonYear format genres
            description(asHtml: true)
            nextAiringEpisode { airingAt timeUntilAiring episode }
            mediaListEntry { id status progress progressVolumes score repeat }
            relations { edges { relationType node { id title { romaji english } coverImage { medium } type format status mediaListEntry { status progress } } } }
          }
        }
      }
    `;
    const variables = { type, page, perPage };
    if (hasGenres) variables.genres = genres;
    const data = await this.query(query, variables);
    return { media: data.Page.media, pageInfo: data.Page.pageInfo };
  },

  /**
   * Get media by season
   */
  async getSeasonMedia(season, seasonYear, type = 'ANIME', page = 1, perPage = 20, genres = null) {
    const hasGenres = genres && genres.length > 0;
    const genreVar = hasGenres ? ', $genres: [String]' : '';
    const genreFilter = hasGenres ? ', genre_in: $genres' : '';
    const query = `
      query ($season: MediaSeason, $seasonYear: Int, $type: MediaType, $page: Int, $perPage: Int${genreVar}) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { total currentPage lastPage hasNextPage }
          media(type: $type, season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC${genreFilter}) {
            id
            title { romaji english native }
            coverImage { large medium color }
            bannerImage
            episodes chapters volumes
            status averageScore season seasonYear format genres
            description(asHtml: true)
            nextAiringEpisode { airingAt timeUntilAiring episode }
            mediaListEntry { id status progress progressVolumes score repeat }
            relations { edges { relationType node { id title { romaji english } coverImage { medium } type format status mediaListEntry { status progress } } } }
          }
        }
      }
    `;
    const variables = { season, seasonYear, type, page, perPage };
    if (hasGenres) variables.genres = genres;
    const data = await this.query(query, variables);
    return data.Page;
  },

  /**
   * Get all-time popular media
   */
  async getPopularAllTime(type = 'ANIME', page = 1, perPage = 20, genres = null) {
    const hasGenres = genres && genres.length > 0;
    const genreVar = hasGenres ? ', $genres: [String]' : '';
    const genreFilter = hasGenres ? ', genre_in: $genres' : '';
    const query = `
      query ($type: MediaType, $page: Int, $perPage: Int${genreVar}) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { total currentPage lastPage hasNextPage }
          media(type: $type, sort: POPULARITY_DESC${genreFilter}) {
            id
            title { romaji english native }
            coverImage { large medium color }
            bannerImage
            episodes chapters volumes
            status averageScore season seasonYear format genres
            description(asHtml: true)
            nextAiringEpisode { airingAt timeUntilAiring episode }
            mediaListEntry { id status progress progressVolumes score repeat }
            relations { edges { relationType node { id title { romaji english } coverImage { medium } type format status mediaListEntry { status progress } } } }
          }
        }
      }
    `;
    const variables = { type, page, perPage };
    if (hasGenres) variables.genres = genres;
    const data = await this.query(query, variables);
    return { media: data.Page.media, pageInfo: data.Page.pageInfo };
  },

  /**
   * Get top-rated media (by score)
   */
  async getTopRated(type = 'ANIME', page = 1, perPage = 20, genres = null) {
    const hasGenres = genres && genres.length > 0;
    const genreVar = hasGenres ? ', $genres: [String]' : '';
    const genreFilter = hasGenres ? ', genre_in: $genres' : '';
    const query = `
      query ($type: MediaType, $page: Int, $perPage: Int${genreVar}) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { total currentPage lastPage hasNextPage }
          media(type: $type, sort: SCORE_DESC${genreFilter}) {
            id
            title { romaji english native }
            coverImage { large medium color }
            bannerImage
            episodes chapters volumes
            status averageScore season seasonYear format genres
            description(asHtml: true)
            nextAiringEpisode { airingAt timeUntilAiring episode }
            mediaListEntry { id status progress progressVolumes score repeat }
            relations { edges { relationType node { id title { romaji english } coverImage { medium } type format status mediaListEntry { status progress } } } }
          }
        }
      }
    `;
    const variables = { type, page, perPage };
    if (hasGenres) variables.genres = genres;
    const data = await this.query(query, variables);
    return { media: data.Page.media, pageInfo: data.Page.pageInfo };
  },

  /**
   * Get user statistics
   */
  async getUserStatistics(userId) {
    const query = `
      query ($id: Int) {
        User(id: $id) {
          statistics {
            anime { count meanScore minutesWatched episodesWatched }
            manga { count meanScore chaptersRead volumesRead }
          }
        }
      }
    `;
    const data = await this.query(query, { id: userId });
    return data.User.statistics;
  },

  /**
   * Delete a media list entry entirely
   */
  async deleteMediaEntry(entryId) {
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
