import 'dotenv/config';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);
import app from './app.js';
import connectDB from './config/db.js';
import seedAdmin from './utils/seedAdmin.js';
import seedCategories from './utils/seedCategories.js';

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server
const startServer = async () => {
  await connectDB();
  await seedAdmin();
  await seedCategories();
  const server = app.listen(PORT, () => {
    console.log(`DISHA backend server running on port ${PORT}`);
  });
  return server;
};

const server = await startServer();

export default server;
