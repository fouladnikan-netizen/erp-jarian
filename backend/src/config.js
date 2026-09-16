import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveJwtExpiresIn, resolveJwtSecret } from './modules/shared/http/jwtPolicy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: Number(process.env.PORT) || 3100,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl:
    process.env.DATABASE_URL ||
    `postgresql://${encodeURIComponent(process.env.USER || 'postgres')}@127.0.0.1:5432/jarian`,
  jwtSecret: resolveJwtSecret(process.env),
  jwtExpiresIn: resolveJwtExpiresIn(process.env),
  appPublicUrl: String(process.env.APP_PUBLIC_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  corsOrigins: process.env.CORS_ORIGINS || '',
  aiProvider: process.env.AI_PROVIDER || 'mock',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
};

export default config;
