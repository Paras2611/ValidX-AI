import app from './app';
import { config } from './config';
import { seedDatabase } from './database/seed';
import { db } from './database';

// Automatically seed default organizations, application types, rules, and seed accounts if empty
if (db.count('users') === 0) {
  console.log('Database empty; running initial seed bootstrap...');
  seedDatabase();
}

const server = app.listen(config.port, () => {
  console.log('========================================================');
  console.log(`   VALIDATEX Backend API Server Running`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Environment: ${config.env}`);
  console.log(`   API Endpoint: http://localhost:${config.port}/api/v1`);
  console.log(`   Health Check: http://localhost:${config.port}/health`);
  console.log('========================================================');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});
