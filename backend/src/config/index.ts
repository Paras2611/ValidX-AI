import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const baseDataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
const storageDir = process.env.STORAGE_DIR || path.join(baseDataDir, 'vault');
const reportsDir = process.env.REPORTS_DIR || path.join(baseDataDir, 'reports');

// Ensure necessary directories exist
[baseDataDir, storageDir, reportsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'validx-super-secure-jwt-secret-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  baseDataDir,
  storageDir,
  reportsDir,
  dbFile: process.env.DB_FILE || path.join(baseDataDir, 'validx_database.json'),
  databaseUrl: process.env.DATABASE_URL || '',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '15', 10),
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ],
  ai: {
    provider: process.env.AI_PROVIDER || 'local_heuristic', // 'gemini' | 'openai' | 'local_heuristic'
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    modelName: process.env.AI_MODEL_NAME || 'gemini-1.5-flash',
  }
};
