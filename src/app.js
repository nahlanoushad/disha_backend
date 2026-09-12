import express from 'express';

const app = express();

// Basic middleware
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

export default app;
