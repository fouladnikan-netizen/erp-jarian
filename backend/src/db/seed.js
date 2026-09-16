import bcrypt from 'bcryptjs';
import { pool, query, withTransaction } from './pool.js';
import { PERMISSION_CATALOG } from '../domain/rbac/permissionCatalog.js';
import { seedInitialPersonas } from './seedPersonas.js';
import { seedSteelBrands } from './seedSteelBrands.js';
import { seedSteelOfferUnits } from './seedSteelOfferUnits.js';
import { seedWellCasingSlotType } from './seedWellCasingSlotType.js';
import { seedSeamlessPipeGrades } from './seedSeamlessPipeGrades.js';
import { healSeamlessSchEnum } from './healSeamlessSchEnum.js';
import { seedSheetMillLength } from './seedSheetMillLength.js';
import { seedEnumOverrideHeal } from './seedEnumOverrideHeal.js';
import { restoreProductMasterCatalog } from './productMasterCatalog.js';

const ROLES = [
  { code: 'admin', label_fa: 'مدیر سیستم', description: 'مدیریت کامل سامانه، کاربران و پیکربندی' },
  { code: 'sales_manager', label_fa: 'مدیر فروش', description: 'مدیریت فروش و پیگیری تیم' },
  { code: 'sales', label_fa: 'کارشناس فروش', description: 'کارشناس فروش — ثبت و پیگیری سفارش و مشتری' },
  { code: 'purchase', label_fa: 'تدارکات', description: 'تدارکات و تأمین کالا' },
  { code: 'accounting', label_fa: 'حسابداری', description: 'حسابداری — مشاهده سفارش، شرکت و مکاتبات' },
];

const PERMISSIONS = PERMISSION_CATALOG.map((row) => ({
  code: row.code,
  label_fa: row.labelFa,
  resource: row.resource,
  action: row.action,
  category: row.category,
  is_sensitive: row.isSensitive,
}));

const ROLE_PERMS = {
  admin: PERMISSIONS.map((p) => p.code),
  sales_manager: [
    'companies:read', 'companies:write',
    'orders:read', 'orders:write',
    'leads:read', 'leads:write', 'leads:convert',
    'activities:read', 'activities:write',
    'tasks:read', 'tasks:write',
    'correspondence:read', 'correspondence:write', 'correspondence:finalize',
    'products:read', 'products:write', 'products:lifecycle', 'products:bulk-import',
  ],
  sales: [
    'companies:read', 'companies:write',
    'orders:read', 'orders:write',
    'leads:read', 'leads:write', 'leads:convert',
    'activities:read', 'activities:write',
    'tasks:read', 'tasks:write',
    'correspondence:read', 'correspondence:write', 'correspondence:finalize',
    'products:read', 'products:write',
  ],
  purchase: [
    'companies:read', 'orders:read', 'orders:write', 'activities:read', 'tasks:read',
    'correspondence:read',
    'products:read', 'products:manage-brands',
  ],
  accounting: ['companies:read', 'orders:read', 'correspondence:read', 'products:read'],
};

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    console.error('[seed] BLOCKED: refuse to seed when NODE_ENV=production');
    process.exit(1);
  }

  for (const role of ROLES) {
    await query(
      `INSERT INTO roles (code, label_fa, description, is_active)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (code) DO UPDATE SET
         label_fa = EXCLUDED.label_fa,
         description = CASE
           WHEN roles.description IS NULL OR roles.description = '' THEN EXCLUDED.description
           ELSE roles.description
         END`,
      [role.code, role.label_fa, role.description],
    );
  }

  for (const perm of PERMISSIONS) {
    await query(
      `INSERT INTO permissions (code, label_fa, resource, action, category, is_sensitive, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       ON CONFLICT (code) DO UPDATE SET
         label_fa = EXCLUDED.label_fa,
         resource = EXCLUDED.resource,
         action = EXCLUDED.action,
         category = EXCLUDED.category,
         is_sensitive = EXCLUDED.is_sensitive`,
      [perm.code, perm.label_fa, perm.resource, perm.action, perm.category, perm.is_sensitive],
    );
  }

  for (const [roleCode, perms] of Object.entries(ROLE_PERMS)) {
    for (const perm of perms) {
      await query(
        `INSERT INTO role_permissions (role_code, permission_code)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [roleCode, perm],
      );
    }
  }

  const existing = await query(`SELECT id FROM users WHERE username = $1`, ['admin']);
  let adminId = existing.rows[0]?.id;
  if (!adminId) {
    adminId = newId('u');
    const passwordHash = await bcrypt.hash('Admin123!', 10);
    await query(
      `INSERT INTO users (id, username, display_name, password_hash)
       VALUES ($1, $2, $3, $4)`,
      [adminId, 'admin', 'مدیر جریان', passwordHash],
    );
    console.log('[seed] created user admin / Admin123!');
  } else {
    console.log('[seed] admin user already exists');
  }

  await query(
    `INSERT INTO user_roles (user_id, role_code) VALUES ($1, 'admin')
     ON CONFLICT DO NOTHING`,
    [adminId],
  );

  // Second sales user for Personal Pipeline isolation E2E (non-production seed only)
  const salesBExisting = await query(`SELECT id FROM users WHERE username = $1`, ['sales_b']);
  let salesBId = salesBExisting.rows[0]?.id;
  if (!salesBId) {
    salesBId = newId('u');
    const passwordHash = await bcrypt.hash('SalesB123!', 10);
    await query(
      `INSERT INTO users (id, username, display_name, password_hash)
       VALUES ($1, $2, $3, $4)`,
      [salesBId, 'sales_b', 'کارشناس فروش ب', passwordHash],
    );
    console.log('[seed] created user sales_b / SalesB123!');
  }
  await query(
    `INSERT INTO user_roles (user_id, role_code) VALUES ($1, 'sales')
     ON CONFLICT DO NOTHING`,
    [salesBId],
  );

  // Third sales user — unauthorized-actor fixture for Activity/Task ownership
  // RBAC E2E (Gap 4 / Journey 011, non-production seed only).
  const salesCExisting = await query(`SELECT id FROM users WHERE username = $1`, ['sales_c']);
  let salesCId = salesCExisting.rows[0]?.id;
  if (!salesCId) {
    salesCId = newId('u');
    const passwordHash = await bcrypt.hash('SalesC123!', 10);
    await query(
      `INSERT INTO users (id, username, display_name, password_hash)
       VALUES ($1, $2, $3, $4)`,
      [salesCId, 'sales_c', 'کارشناس فروش ج', passwordHash],
    );
    console.log('[seed] created user sales_c / SalesC123!');
  }
  await query(
    `INSERT INTO user_roles (user_id, role_code) VALUES ($1, 'sales')
     ON CONFLICT DO NOTHING`,
    [salesCId],
  );

  await seedInitialPersonas(query);
  console.log('[seed] personas upserted (insert-missing only)');

  const catalogSeed = await restoreProductMasterCatalog(query, withTransaction, adminId, {
    onlyIfEmpty: true,
  });
  if (catalogSeed.restored) {
    console.log(
      `[seed] product master catalog restored (${catalogSeed.counts?.products || 0} products)`,
    );
  } else {
    console.log(`[seed] product master catalog skipped (${catalogSeed.reason})`);
  }

  const brandSeed = await seedSteelBrands(adminId);
  console.log(
    `[seed] steel brands created ${brandSeed.created}, reused ${brandSeed.reused}, types bound ${brandSeed.boundTypes.length}`,
  );

  const offerSeed = await seedSteelOfferUnits(adminId);
  console.log(
    `[seed] steel offer units updated ${offerSeed.updated}${offerSeed.ringCreated ? ', created حلقه' : ''}`,
  );

  const slotSeed = await seedWellCasingSlotType(adminId);
  console.log(
    `[seed] well-casing slot type ${slotSeed.created ? 'created' : 'reused'}, bound ${slotSeed.bound}`,
  );

  const seamlessGradeSeed = await seedSeamlessPipeGrades(adminId);
  console.log(
    `[seed] seamless pipe grades added ${seamlessGradeSeed.added}, bound ${seamlessGradeSeed.bound}`,
  );

  const schEnumSeed = await healSeamlessSchEnum(adminId);
  console.log(
    `[seed] seamless sch ENUM migrated ${schEnumSeed.migrated}, alreadyOk ${Boolean(schEnumSeed.alreadyOk)}`,
  );

  const sheetLengthSeed = await seedSheetMillLength(adminId);
  console.log(
    `[seed] sheet mill length ${sheetLengthSeed.created ? 'created' : 'reused'}, bound ${sheetLengthSeed.bound} types`,
  );

  const enumHeal = await seedEnumOverrideHeal(adminId);
  console.log(
    `[seed] enum override heal bindings ${enumHeal.healed}, products ${enumHeal.remappedProducts}`,
  );

  const companyCount = await query(`SELECT COUNT(*)::int AS n FROM companies`);
  if (companyCount.rows[0].n === 0) {
    const companyId = newId('co');
    await query(
      `INSERT INTO companies (id, name, entity_type, province, activity_domain, lifecycle_stage, created_by)
       VALUES ($1, $2, 'CUSTOMER', $3, $4, $5, $6)`,
      [companyId, 'ساختمان و نصب فراب', 'تهران', 'نصب صنعتی', 'cold_lead', adminId],
    );

    const orderId = newId('ord');
    await query(
      `INSERT INTO orders (id, code, company_id, title, stage_id, status, payload, created_by)
       VALUES ($1, $2, $3, $4, 'inquiry', 'open', $5::jsonb, $6)`,
      [
        orderId,
        'JR-SEED-001',
        companyId,
        'سفارش نمونه — میلگرد',
        JSON.stringify({
          lines: [{ name: 'میلگرد آجدار ۱۶', qty: 24, unit: 'تن', unload: 'سیرجان' }],
        }),
        adminId,
      ],
    );
    console.log('[seed] sample company + order created');
  }

  console.log('[seed] done');
  await pool.end();
}

seed().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
