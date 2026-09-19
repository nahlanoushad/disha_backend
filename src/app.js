import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import entranceExamRoutes from './routes/entranceExamRoutes.js';
import studentAdminRoutes from './routes/studentRoutes.js';
import studentAuthRoutes from './routes/studentAuthRoutes.js';
import studentNotificationRoutes from './routes/studentNotificationRoutes.js';

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
app.use('/api/auth', authRoutes);

// Category routes
app.use('/api/categories', categoryRoutes);

// Course routes
app.use('/api/courses', courseRoutes);

// Entrance exam routes
app.use('/api/entrance-exams', entranceExamRoutes);

// Student routes
app.use('/api/admin/students', studentAdminRoutes);
app.use('/api/student/notifications', studentNotificationRoutes);
app.use('/api/student', studentAuthRoutes);

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
  const statusCode = err.statusCode || 500;
  const status = err.status || (statusCode < 500 ? 'fail' : 'error');
  
  res.status(statusCode).json({
    status: status,
    message: err.message || 'Internal Server Error'
  });
});

export default app;
