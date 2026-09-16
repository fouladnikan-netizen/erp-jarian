-- Customer Lifecycle engagement + normalize Persian lifecycle_stage keys (expand-only)

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS engagement_status TEXT NOT NULL DEFAULT 'normal';

UPDATE companies SET lifecycle_stage = 'cold_lead'
  WHERE lifecycle_stage IN ('نوپدید', 'NOPODID');

UPDATE companies SET lifecycle_stage = 'pitched'
  WHERE lifecycle_stage IN ('دیدار', 'DIDAR');

UPDATE companies SET lifecycle_stage = 'nurturing'
  WHERE lifecycle_stage IN ('رویش', 'ROYESH');

UPDATE companies SET lifecycle_stage = 'sales_qualified'
  WHERE lifecycle_stage IN ('آستانه', 'ASTANE');

UPDATE companies SET lifecycle_stage = 'first_time_buyer'
  WHERE lifecycle_stage IN ('نوپیمان', 'NOPAYMAN');

UPDATE companies SET lifecycle_stage = 'loyal'
  WHERE lifecycle_stage IN ('هم‌پیمان', 'همپیمان', 'HAMPAYMAN');

-- Legacy "سایه" was stored as lifecycle; move to engagement (shadow) and place at آستانه floor
UPDATE companies
  SET engagement_status = 'shadow'
  WHERE lifecycle_stage IN ('سایه', 'SAYEH', 'archived');

UPDATE companies
  SET lifecycle_stage = 'sales_qualified'
  WHERE lifecycle_stage IN ('سایه', 'SAYEH', 'archived');

CREATE INDEX IF NOT EXISTS idx_companies_engagement_status
  ON companies (engagement_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_companies_lifecycle_stage
  ON companies (lifecycle_stage)
  WHERE deleted_at IS NULL;
