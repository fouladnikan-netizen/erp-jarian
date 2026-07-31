import express from 'express';
import aiRoutes from './api/aiRoutes.js';

const app = express();
const PORT = Number(process.env.PORT) || 3100;

app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'jarian-api' });
});

app.use('/api/ai', aiRoutes);

app.listen(PORT, () => {
  console.log(`[jarian-api] listening on http://localhost:${PORT}`);
});
