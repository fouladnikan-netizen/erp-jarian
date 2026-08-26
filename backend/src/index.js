import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { errorHandler, notFound } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import companyRoutes from './routes/companies.js';
import orderRoutes from './routes/orders.js';

// Keep existing AI rewrite endpoint (Liara) without duplication.
import aiRoutes from '../../src/server/api/aiRoutes.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req, res) => {
  let db = 'down';
  try {
    await pool.query('SELECT 1');
    db = 'up';
  } catch {
    db = 'down';
  }
  res.json({
    ok: db === 'up',
    service: 'jarian-api',
    version: '0.1.0',
    db,
    time: new Date().toISOString(),
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/ai', aiRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[jarian-api] listening on http://localhost:${config.port}`);
  console.log(`[jarian-api] auth: POST /api/v1/auth/login`);
  console.log(`[jarian-api] companies: /api/v1/companies`);
  console.log(`[jarian-api] orders: /api/v1/orders`);
});
