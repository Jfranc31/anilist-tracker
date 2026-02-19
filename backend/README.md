# AniList Tracker - Backend

Backend service for the AniList Tracker browser extension. Handles OAuth token exchange securely with AniList's client_secret.

## Why a Backend?

AniList's OAuth requires a `client_secret` for token exchange, which cannot be safely stored in a browser extension. This backend acts as a secure intermediary:

1. Extension captures authorization code from OAuth redirect
2. Extension sends code to this backend
3. Backend exchanges code for access token using client_secret
4. Backend returns token to extension

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Edit `.env` and add your AniList credentials:

```env
ANILIST_CLIENT_ID=35250
ANILIST_CLIENT_SECRET=your_actual_client_secret_here
ANILIST_REDIRECT_URI=https://jakligfjhpffidlhcejohgojjndjmool.chromiumapp.org/

PORT=3001
NODE_ENV=development
```

**Important:** Get your `ANILIST_CLIENT_SECRET` from your AniList developer settings at https://anilist.co/settings/developer

### 3. Start the Server

Development mode (auto-restart on changes):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:3001`

## API Endpoints

### POST /api/auth/token
Exchange authorization code for access token

**Request:**
```json
{
  "code": "authorization_code_from_oauth"
}
```

**Response:**
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 31536000
}
```

### GET /api/auth/user
Get current user data from AniList

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": 123456,
  "name": "Username",
  "avatar": {
    "large": "...",
    "medium": "..."
  }
}
```

### GET /health
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "message": "AniList Tracker Backend is running"
}
```

## Security Notes

- Never commit your `.env` file or expose your `client_secret`
- The backend should only be accessible from your extension
- CORS is configured to allow requests from the extension origin
- In production, consider additional security measures (rate limiting, authentication, etc.)

## Troubleshooting

### "Cannot find module" errors
Make sure you ran `npm install` and all dependencies are installed.

### "Invalid client_secret" from AniList
- Verify your `ANILIST_CLIENT_SECRET` in `.env` matches your AniList developer settings
- Check that your `ANILIST_CLIENT_ID` is correct
- Ensure the `ANILIST_REDIRECT_URI` matches exactly what's in your AniList app settings

### CORS errors from extension
- Check that the backend is running
- Verify `BACKEND_URL` in frontend `config.js` matches the backend port
- For production, update CORS configuration in `server.js`
