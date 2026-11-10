import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import app from './app.js';
import connectDB from './config/db.js';
import seedAdmin from './utils/seedAdmin.js';

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server
const startServer = async () => {
  await connectDB();
  await seedAdmin();
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`DISHA backend server running on http://127.0.0.1:${PORT}`);
  });
  return server;
};

const server = await startServer();

export default server;
