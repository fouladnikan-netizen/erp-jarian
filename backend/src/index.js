import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { requestContext } from './middleware/requestContext.js';
import { createCorsOptions } from './modules/shared/http/corsOptions.js';
import { mountLegacyAiGateway } from './modules/shared/ai/legacyAiGateway.js';
import authRoutes from './routes/auth.js';
import { default as companyRoutes } from './modules/crm/presentation/companies.js';
import { default as orderRoutes } from './modules/sales/presentation/orders.js';
import { default as leadRoutes } from './modules/crm/presentation/leads.js';
import { default as leadPipelineRoutes } from './modules/crm/presentation/leadPipelines.js';
import { default as activityRoutes } from './modules/tasks/presentation/activities.js';
import { default as activityTypeRoutes } from './modules/tasks/presentation/activityTypes.js';
import { default as taskRoutes } from './modules/tasks/presentation/tasks.js';
import integrationRoutes from './routes/integrations.js';
import correspondenceRoutes from './routes/correspondence.js';
import correspondenceTypeRoutes from './routes/correspondenceTypes.js';
import { default as productTaxonomyRoutes } from './modules/catalog/presentation/productTaxonomy.js';
import { default as attributeDefinitionRoutes } from './modules/catalog/presentation/attributeDefinitions.js';
import { default as uomRoutes } from './modules/catalog/presentation/uom.js';
import { default as brandRoutes } from './modules/catalog/presentation/brands.js';
import { default as productRoutes } from './modules/catalog/presentation/products.js';
import { default as identityRoutes } from './modules/crm/presentation/identity.js';
import { default as contactRoutes } from './modules/crm/presentation/contacts.js';
import userRoutes from './routes/users.js';
import rbacRoutes from './routes/rbac.js';
import organizationIdentityRoutes from './routes/organizationIdentity.js';
import organizationRoutes from './routes/organization.js';
import personaRoutes from './routes/personas.js';
import { default as settingsReasonsRoutes } from './modules/settings/presentation/reasons.js';

export function createApp() {
  const app = express();

  app.use(cors(createCorsOptions({
    nodeEnv: config.nodeEnv,
    appPublicUrl: config.appPublicUrl,
    corsOrigins: config.corsOrigins,
  })));
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
  app.use('/api/v1/product-taxonomy', productTaxonomyRoutes);
  app.use('/api/v1/attribute-definitions', attributeDefinitionRoutes);
  app.use('/api/v1/uom', uomRoutes);
  app.use('/api/v1/brands', brandRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/identity', identityRoutes);
  app.use('/api/v1/contacts', contactRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/rbac', rbacRoutes);
  app.use('/api/v1/organization-identity', organizationIdentityRoutes);
  app.use('/api/v1/organization', organizationRoutes);
  app.use('/api/v1/personas', personaRoutes);
  app.use('/api/v1/settings', settingsReasonsRoutes);

  // Quarantined glue — not part of the modular graph. See modules/shared/ai.
  mountLegacyAiGateway(app);

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
    console.log(`[jarian-api] catalog: /api/v1/products`);
    console.log(`[jarian-api] settings: /api/v1/settings`);
  });
}
