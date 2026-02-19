import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - allow requests from Chrome/Firefox extensions and localhost
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow Chrome extensions (chrome-extension://)
    if (origin.startsWith('chrome-extension://')) return callback(null, true);
    // Allow Firefox extensions (moz-extension://)
    if (origin.startsWith('moz-extension://')) return callback(null, true);
    // Allow localhost
    if (origin === 'http://localhost:3000' || origin === 'http://localhost:3001') return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AniList Tracker Backend is running' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`AniList Tracker Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
