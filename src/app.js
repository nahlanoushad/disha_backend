import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import userAuthRoutes from './routes/userAuthRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();

// Enable CORS
app.use(cors());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base health route to verify server status
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'DISHA backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Authentication routes
app.use('/api/auth', authRoutes); // Admin auth routes
app.use('/api/auth/user', userAuthRoutes); // User auth routes
app.use('/api/users', userRoutes); // User profile routes

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Cannot find ${req.originalUrl} on this server`
  });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

export default app;
