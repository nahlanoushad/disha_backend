import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server
const startServer = async () => {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`DISHA backend server running on port ${PORT}`);
  });
  return server;
};

const server = await startServer();

export default server;
