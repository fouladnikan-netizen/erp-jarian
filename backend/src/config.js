import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT) || 3100,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl:
    process.env.DATABASE_URL ||
    `postgresql://${encodeURIComponent(process.env.USER || 'postgres')}@127.0.0.1:5432/jarian`,
  jwtSecret: required('JWT_SECRET', 'jarian-dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  appPublicUrl: String(process.env.APP_PUBLIC_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  aiProvider: process.env.AI_PROVIDER || 'mock',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
};

export default config;
