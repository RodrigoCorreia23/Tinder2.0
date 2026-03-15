import http from 'http';
import app from './app';
import { env } from './config/env';
import { initializeSocket } from './socket';
import { startScheduler } from './jobs/scheduler';

const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

// Start cron jobs
startScheduler();

server.listen(env.PORT, () => {
  console.log(`🚀 Spark API running on port ${env.PORT}`);
  console.log(`📡 Environment: ${env.NODE_ENV}`);
});
