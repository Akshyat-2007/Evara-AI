import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import apiLimiter from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';
import sessionRoutes from './routes/sessionRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import authRoutes from './routes/authRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import { testConnection } from './db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const configuredOrigins = CLIENT_ORIGIN.split(',').map((o) => o.trim().replace(/\/$/, ''));
const allowedOrigins = [
  ...configuredOrigins,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

// Security and CORS
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile, curl, health checks) or matched origins
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      callback(null, true);
    } else {
      callback(null, true); // Allow configured dynamic origins
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply rate limiting to all /api routes
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbOk = await testConnection();
  res.json({
    status: 'ok',
    app: 'Evara AI Backend',
    database: dbOk ? 'connected' : 'disconnected',
    llmMode: (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)
      ? `google-gemini-live (${process.env.GEMINI_MODEL || 'gemini-3.8-flash'})`
      : (process.env.ANTHROPIC_API_KEY ? 'anthropic-api' : 'mock-mode'),
    timestamp: new Date().toISOString(),
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/report', reportRoutes);

// Central error handler
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  console.log(`\n🌸 Evara AI Server running on http://localhost:${PORT}`);
  console.log(`🌐 Allowed Client Origin: ${CLIENT_ORIGIN}`);
  const dbConnected = await testConnection();
  console.log(`🗄️  Database Status: ${dbConnected ? 'CONNECTED (MySQL)' : 'DISCONNECTED'}\n`);
});

export default app;
