import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { requestContext } from './middleware/requestContext.js';
import authRoutes from './routes/auth.js';
import companyRoutes from './routes/companies.js';
import orderRoutes from './routes/orders.js';
import leadRoutes from './routes/leads.js';
import leadPipelineRoutes from './routes/leadPipelines.js';
import activityRoutes from './routes/activities.js';
import activityTypeRoutes from './routes/activityTypes.js';
import taskRoutes from './routes/tasks.js';
import integrationRoutes from './routes/integrations.js';
import correspondenceRoutes from './routes/correspondence.js';
import correspondenceTypeRoutes from './routes/correspondenceTypes.js';
import productTaxonomyRoutes from './routes/productTaxonomy.js';
import attributeDefinitionRoutes from './routes/attributeDefinitions.js';
import uomRoutes from './routes/uom.js';
import brandRoutes from './routes/brands.js';
import productRoutes from './routes/products.js';
import identityRoutes from './routes/identity.js';
import contactRoutes from './routes/contacts.js';
import userRoutes from './routes/users.js';

// Keep existing AI rewrite endpoint (Liara) without duplication.
import aiRoutes from '../../src/server/api/aiRoutes.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  // 20mb: correspondence attachments are stored as base64 JSON payloads
  // (DDL-23b), up to correspondenceService.MAX_ATTACHMENT_BYTES (15MB raw).
  app.use(express.json({ limit: '20mb' }));
  app.use(requestContext);

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
  app.use('/api/v1/leads', leadRoutes);
  app.use('/api/v1/lead-pipelines', leadPipelineRoutes);
  app.use('/api/v1/activities', activityRoutes);
  app.use('/api/v1/activity-types', activityTypeRoutes);
  app.use('/api/v1/tasks', taskRoutes);
  app.use('/api/v1/integrations', integrationRoutes);
  app.use('/api/v1/correspondence', correspondenceRoutes);
  app.use('/api/v1/correspondence-types', correspondenceTypeRoutes);
  // Product Master (DDL-24) — Shirazeh taxonomy/attribute/UOM/Brand registries + Vitrin Product/SKU.
  app.use('/api/v1/product-taxonomy', productTaxonomyRoutes);
  app.use('/api/v1/attribute-definitions', attributeDefinitionRoutes);
  app.use('/api/v1/uom', uomRoutes);
  app.use('/api/v1/brands', brandRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/identity', identityRoutes);
  app.use('/api/v1/contacts', contactRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/ai', aiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export const app = createApp();

if (process.env.JARIAN_SKIP_LISTEN !== '1') {
  app.listen(config.port, () => {
    console.log(`[jarian-api] listening on http://localhost:${config.port}`);
    console.log(`[jarian-api] auth: POST /api/v1/auth/login`);
    console.log(`[jarian-api] companies: /api/v1/companies`);
    console.log(`[jarian-api] orders: /api/v1/orders`);
    console.log(`[jarian-api] leads: /api/v1/leads`);
    console.log(`[jarian-api] lead-pipelines: /api/v1/lead-pipelines`);
    console.log(`[jarian-api] activities: /api/v1/activities`);
    console.log(`[jarian-api] activity-types: /api/v1/activity-types`);
    console.log(`[jarian-api] tasks: /api/v1/tasks`);
    console.log(`[jarian-api] integrations: /api/v1/integrations`);
    console.log(`[jarian-api] correspondence: /api/v1/correspondence`);
    console.log(`[jarian-api] correspondence-types: /api/v1/correspondence-types`);
    console.log(`[jarian-api] users: /api/v1/users`);
  });
}
