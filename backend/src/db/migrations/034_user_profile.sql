-- DDL-39 — User profile (mobile, email, account_status) + generated usernames.
-- Additive only. No table/column drops. Existing username / password_hash / user_roles preserved.
-- Invitation SMS / tokens are Task 5 — not this migration.

ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT;

-- Existing accounts with a password remain ACTIVE / INACTIVE from is_active.
UPDATE users
SET account_status = CASE WHEN is_active THEN 'ACTIVE' ELSE 'INACTIVE' END
WHERE account_status IS NULL;

ALTER TABLE users ALTER COLUMN account_status SET DEFAULT 'ACTIVE';
ALTER TABLE users ALTER COLUMN account_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_account_status_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_account_status_check
      CHECK (account_status IN ('INVITED', 'ACTIVE', 'INACTIVE'));
  END IF;
END
$$;

-- INVITED users have no password until Task 5 (or admin reset).
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Audit before unique indexes: mobile/email are new columns; existing rows are NULL.
DO $$
DECLARE
  mobile_dups INTEGER;
  email_dups INTEGER;
BEGIN
  SELECT COUNT(*)::int INTO mobile_dups
  FROM (
    SELECT mobile FROM users
    WHERE mobile IS NOT NULL
    GROUP BY mobile
    HAVING COUNT(*) > 1
  ) d;
  SELECT COUNT(*)::int INTO email_dups
  FROM (
    SELECT email FROM users
    WHERE email IS NOT NULL AND btrim(email) <> ''
    GROUP BY email
    HAVING COUNT(*) > 1
  ) d;
  RAISE NOTICE '034 user profile audit: mobile duplicate groups=%, email duplicate groups=%', mobile_dups, email_dups;
  IF mobile_dups > 0 THEN
    RAISE EXCEPTION '034 aborted: conflicting mobile values exist. Do not merge/delete users.';
  END IF;
  IF email_dups > 0 THEN
    RAISE EXCEPTION '034 aborted: conflicting email values exist. Do not merge/delete users.';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS users_mobile_uidx
  ON users (mobile)
  WHERE mobile IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_uidx
  ON users (email)
  WHERE email IS NOT NULL AND btrim(email) <> '';

-- Optional product units for placement UX. No people are created or mapped from mocks.
INSERT INTO organization_units (id, parent_id, code, name, sort_order, is_active)
SELECT 'ou_sales', 'ou_root', 'SALES', 'فروش', 10, TRUE
WHERE EXISTS (SELECT 1 FROM organization_units WHERE id = 'ou_root')
  AND NOT EXISTS (SELECT 1 FROM organization_units WHERE id = 'ou_sales' OR code = 'SALES');

INSERT INTO organization_positions (id, unit_id, code, title, sort_order, is_active)
SELECT 'op_sales_expert', u.id, 'SALES_EXPERT', 'کارشناس فروش', 10, TRUE
FROM organization_units u
WHERE u.code = 'SALES'
  AND NOT EXISTS (SELECT 1 FROM organization_positions WHERE id = 'op_sales_expert')
  AND NOT EXISTS (
    SELECT 1 FROM organization_positions p
    WHERE p.unit_id = u.id AND p.title = 'کارشناس فروش' AND p.is_active = TRUE
  );

INSERT INTO organization_positions (id, unit_id, code, title, sort_order, is_active)
SELECT 'op_sales_manager', u.id, 'SALES_MANAGER_POS', 'مدیر فروش', 20, TRUE
FROM organization_units u
WHERE u.code = 'SALES'
  AND NOT EXISTS (SELECT 1 FROM organization_positions WHERE id = 'op_sales_manager')
  AND NOT EXISTS (
    SELECT 1 FROM organization_positions p
    WHERE p.unit_id = u.id AND p.title = 'مدیر فروش' AND p.is_active = TRUE
  );
