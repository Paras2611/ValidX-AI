import app from './app';
import { config } from './config';
import { seedDatabase } from './database/seed';
import { db } from './database';

// Automatically seed default organizations, application types, rules, and seed accounts if empty
if (db.count('users') === 0) {
  console.log('Database empty; running initial seed bootstrap...');
  seedDatabase();
}

import { getLocalIpAddress } from './utils/network';

const localIp = getLocalIpAddress();

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log('========================================================');
  console.log(`   VALIDATEX Backend API Server Running (Network Enabled)`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Environment: ${config.env}`);
  console.log(`   Local URL:    http://localhost:${config.port}/api/v1`);
  console.log(`   Network URL:  http://${localIp}:${config.port}/api/v1`);
  console.log(`   Health Check: http://localhost:${config.port}/health`);
  console.log('========================================================');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});
