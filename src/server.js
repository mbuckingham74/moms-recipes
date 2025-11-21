require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const recipeRoutes = require('./routes/recipeRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Validate FRONTEND_URL in production
if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  console.error('ERROR: FRONTEND_URL must be set in production environment');
  console.error('Please set FRONTEND_URL in your .env file or environment variables');
  process.exit(1);
}

// Middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
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
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

module.exports = app;
