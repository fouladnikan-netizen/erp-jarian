-- Shirazeh-driven Activity Type Registry (Gap 1) — expand-only.
-- `activities.activity_type` stays a free TEXT column (no destructive change,
-- no hard FK) so historical rows with a since-deactivated type remain valid
-- and readable. Going forward the service layer validates new/changed
-- `activityType` values against this table's active keys.

CREATE TABLE IF NOT EXISTS activity_type_registry (
  key TEXT PRIMARY KEY,
  label_fa TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_activity_type_registry_active_order
  ON activity_type_registry (is_active, sort_order);

-- Canonical seed — audited from live `activities.activity_type` distinct
-- values (call, catalog, note) plus the hardcoded FE pickers already shipped
-- in Pooyesh/Ofogh (message, meeting). Nabz's order-CRM "payment" activity is
-- NOT a canonical Pooyesh Activity type (it never persists via
-- activityService.createActivity — see orderActivityBridge.js) and is
-- intentionally excluded from this registry.
INSERT INTO activity_type_registry (key, label_fa, sort_order, is_active) VALUES
  ('call', 'تماس', 10, true),
  ('message', 'پیام/ایمیل', 20, true),
  ('meeting', 'جلسه حضوری', 30, true),
  ('catalog', 'ارسال کاتالوگ', 40, true),
  ('note', 'یادداشت داخلی', 50, true)
ON CONFLICT (key) DO NOTHING;
