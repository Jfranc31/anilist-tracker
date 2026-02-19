import express from 'express';
import { exchangeCodeForToken, getCurrentUser } from '../services/anilistService.js';

const router = express.Router();

/**
 * POST /api/auth/token
 * Exchange authorization code for access token
 *
 * Body: { code: string, redirect_uri: string }
 * Returns: { access_token: string, token_type: string, expires_in: number }
 */
router.post('/token', async (req, res) => {
  try {
    const { code, redirect_uri } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    if (!redirect_uri) {
      return res.status(400).json({ error: 'Redirect URI is required' });
    }

    console.log('Exchanging code for token...');
    console.log('Redirect URI:', redirect_uri);
    const tokenData = await exchangeCodeForToken(code, redirect_uri);

    console.log('Token exchange successful');
    res.json(tokenData);
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message || 'Token exchange failed'
    });
  }
});

/**
 * GET /api/auth/user
 * Get current user data from AniList
 *
 * Headers: Authorization: Bearer <token>
 * Returns: { id, name, avatar, ... }
 */
router.get('/user', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.substring(7);
    console.log('Fetching user data...');

    const user = await getCurrentUser(token);
    console.log('User data retrieved:', user.name);

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message || 'Failed to get user data'
    });
  }
});

/**
 * GET /api/auth/callback
 * OAuth redirect handler - AniList sends the auth code here
 * The extension intercepts this URL to capture the code before it loads
 */
router.get('/callback', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>AniList Authentication</title></head>
      <body style="background:#1a1a2e;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="text-align:center">
          <h2>Authentication Successful!</h2>
          <p>You can close this tab and return to the extension.</p>
        </div>
      </body>
    </html>
  `);
});

export default router;
