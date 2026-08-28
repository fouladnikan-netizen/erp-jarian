import bcrypt from 'bcryptjs';
import { pool, query } from './pool.js';

const ROLES = [
  { code: 'admin', label_fa: 'مدیر سیستم' },
  { code: 'sales_manager', label_fa: 'مدیر فروش' },
  { code: 'sales', label_fa: 'کارشناس فروش' },
  { code: 'purchase', label_fa: 'تدارکات' },
  { code: 'accounting', label_fa: 'حسابداری' },
];

const PERMISSIONS = [
  { code: 'companies:read', label_fa: 'مشاهده شرکت‌ها' },
  { code: 'companies:write', label_fa: 'ثبت/ویرایش شرکت' },
  { code: 'orders:read', label_fa: 'مشاهده سفارش‌ها' },
  { code: 'orders:write', label_fa: 'ثبت/ویرایش سفارش' },
  { code: 'leads:read', label_fa: 'مشاهده سرنخ‌های خام' },
  { code: 'leads:write', label_fa: 'ثبت/ویرایش سرنخ خام' },
  { code: 'leads:convert', label_fa: 'تبدیل سرنخ به شرکت' },
  { code: 'activities:read', label_fa: 'مشاهده فعالیت‌های پویش' },
  { code: 'activities:write', label_fa: 'ثبت/ویرایش فعالیت پویش' },
  { code: 'tasks:read', label_fa: 'مشاهده وظایف پویش' },
  { code: 'tasks:write', label_fa: 'ثبت/ویرایش وظایف پویش' },
  { code: 'correspondence:read', label_fa: 'مشاهده مکاتبات (گاه‌شمار)' },
  { code: 'correspondence:write', label_fa: 'ثبت/ویرایش پیش‌نویس مکاتبه' },
  { code: 'correspondence:finalize', label_fa: 'نهایی‌سازی و صدور شماره مکاتبه' },
  { code: 'users:admin', label_fa: 'مدیریت کاربران' },
  // Product Master (DDL-24) — Shirazeh taxonomy/attribute/UOM/Brand registries + Vitrin Product/SKU.
  { code: 'products:read', label_fa: 'مشاهده کالاها (ویترین)' },
  { code: 'products:write', label_fa: 'ثبت/ویرایش کالا (ویترین)' },
  { code: 'products:lifecycle', label_fa: 'فعال/غیرفعال‌سازی کالا' },
  { code: 'products:manage-relationships', label_fa: 'مدیریت روابط کالا' },
  { code: 'products:manage-taxonomy', label_fa: 'مدیریت طبقه‌بندی/ویژگی/واحد کالا (شیرازه)' },
  { code: 'products:manage-brands', label_fa: 'مدیریت رجیستری برند' },
  { code: 'products:bulk-import', label_fa: 'ورود دسته‌ای کالا' },
];

const ROLE_PERMS = {
  admin: PERMISSIONS.map((p) => p.code),
  sales_manager: [
    'companies:read', 'companies:write',
    'orders:read', 'orders:write',
    'leads:read', 'leads:write', 'leads:convert',
    'activities:read', 'activities:write',
    'tasks:read', 'tasks:write',
    'correspondence:read', 'correspondence:write', 'correspondence:finalize',
    'products:read', 'products:write', 'products:lifecycle', 'products:manage-relationships', 'products:bulk-import',
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
      `INSERT INTO roles (code, label_fa) VALUES ($1, $2)
       ON CONFLICT (code) DO UPDATE SET label_fa = EXCLUDED.label_fa`,
      [role.code, role.label_fa],
    );
  }

  for (const perm of PERMISSIONS) {
    await query(
      `INSERT INTO permissions (code, label_fa) VALUES ($1, $2)
       ON CONFLICT (code) DO UPDATE SET label_fa = EXCLUDED.label_fa`,
      [perm.code, perm.label_fa],
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
