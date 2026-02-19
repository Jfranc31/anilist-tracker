// AniList API Service - PIN Flow Version
// Uses PIN flow which is more reliable for browser extensions

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

  // PIN flow uses a special redirect URI
  PIN_REDIRECT_URI: 'https://anilist.co/api/v2/oauth/pin',

  /**
   * Start PIN authentication flow
   * Opens AniList in a new tab where user can get their access token
   */
  getPinAuthUrl() {
    const authUrl = new URL(this.AUTH_URL);
    authUrl.searchParams.append('client_id', this.CLIENT_ID);
    authUrl.searchParams.append('response_type', 'token');

    console.log('PIN Auth URL:', authUrl.toString());
    return authUrl.toString();
  },

  /**
   * Validate and save an access token provided by the user
   */
  async authenticateWithToken(accessToken) {
    try {
      if (!accessToken || accessToken.trim() === '') {
        throw new Error('Please provide an access token');
      }

      // Test the token by getting user data
      const user = await this.getCurrentUser(accessToken.trim());

      console.log('Token validated, user:', user.name);

      return { token: accessToken.trim(), user };
    } catch (error) {
      console.error('Token validation error:', error);
      throw new Error('Invalid access token. Please try again.');
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
