import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ANILIST_TOKEN_URL = 'https://anilist.co/api/v2/oauth/token';
const ANILIST_API_URL = 'https://graphql.anilist.co';

/**
 * Exchange authorization code for access token
 * This requires client_secret which is stored securely on the backend
 * @param {string} code - Authorization code from OAuth flow
 * @param {string} redirectUri - Redirect URI used in the auth request (browser-specific)
 */
export async function exchangeCodeForToken(code, redirectUri) {
  try {
    const response = await axios.post(ANILIST_TOKEN_URL, {
      grant_type: 'authorization_code',
      client_id: process.env.ANILIST_CLIENT_ID,
      client_secret: process.env.ANILIST_CLIENT_SECRET,
      redirect_uri: redirectUri,
      code: code
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    return {
      access_token: response.data.access_token,
      token_type: response.data.token_type,
      expires_in: response.data.expires_in
    };
  } catch (error) {
    console.error('AniList token exchange error:', error.response?.data);
    throw error;
  }
}

/**
 * Get current authenticated user's data from AniList
 */
export async function getCurrentUser(accessToken) {
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

  try {
    const response = await axios.post(ANILIST_API_URL, {
      query
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    return response.data.data.Viewer;
  } catch (error) {
    console.error('AniList get user error:', error.response?.data);
    throw error;
  }
}
