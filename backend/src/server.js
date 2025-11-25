require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const recipeRoutes = require('./routes/recipeRoutes');
const authRoutes = require('./routes/authRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { getCsrfToken } = require('./middleware/csrf');

const app = express();
const PORT = process.env.PORT || 3001;

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = ['FRONTEND_URL', 'JWT_SECRET', 'CSRF_SECRET', 'DB_PASSWORD'];
  const missing = requiredEnvVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// Middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// CSRF token endpoint - must be called before state-changing requests
app.get('/api/csrf-token', getCsrfToken);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', pdfRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api', recipeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Recipe API is running' });
});

// 404 handler (must come before error handler)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Centralized error handling middleware (must be last)
app.use(errorHandler);

// Only start server if not being required for tests
if (require.main === module) {
  // Wait for database initialization before starting server
  const db = require('./config/database');
  const initPromise = db.ensureInitialized ? db.ensureInitialized() : Promise.resolve();

  initPromise
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
      });
    })
    .catch((error) => {
      console.error('Failed to initialize database:', error);
      process.exit(1);
    });
}

module.exports = app;
