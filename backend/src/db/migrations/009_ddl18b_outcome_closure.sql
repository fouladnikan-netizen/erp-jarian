-- DDL-18(B) supersedes DDL-18(A):
-- Outcome (status): current | success | failed
-- Closure (payload.closure): open | closed
-- Successful Purchase Event = becoming SUCCESS (not CLOSED).
-- Restore Phase-2 open orders that 008 demoted success→current.

-- 1) Explicit closure on payload (expand-only). Default open when missing.
UPDATE orders
SET payload = jsonb_set(
  COALESCE(payload, '{}'::jsonb),
  '{closure}',
  '"open"',
  true
)
WHERE deleted_at IS NULL
  AND COALESCE(payload->>'closure', '') = '';

-- 2) Saranjam finally closed ⇒ SUCCESS + CLOSED (keep success; mark closed)
UPDATE orders
SET
  status = 'success',
  payload = jsonb_set(
    jsonb_set(COALESCE(payload, '{}'::jsonb), '{closure}', '"closed"', true),
    '{phase2EnteredAt}',
    to_jsonb(
      COALESCE(
        NULLIF(payload->>'phase2EnteredAt', ''),
        to_char(COALESCE(updated_at, created_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
    ),
    true
  ),
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    COALESCE(payload #>> '{saranjam,archivedAt}', '') <> ''
    OR lower(COALESCE(payload #>> '{saranjam,locked}', 'false')) IN ('true', 't', '1')
    OR COALESCE(payload->>'archivedAt', '') <> ''
  );

-- 3) Phase-2 committed / mid-flight (was demoted by 008 or still current) ⇒ SUCCESS + OPEN
UPDATE orders
SET
  status = 'success',
  payload = jsonb_set(
    jsonb_set(COALESCE(payload, '{}'::jsonb), '{closure}', '"open"', true),
    '{phase2EnteredAt}',
    to_jsonb(
      COALESCE(
        NULLIF(payload->>'phase2EnteredAt', ''),
        to_char(COALESCE(updated_at, created_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
    ),
    true
  ),
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND lower(status) = 'current'
  AND lower(COALESCE(payload->>'closure', 'open')) <> 'closed'
  AND NOT (
    COALESCE(payload #>> '{saranjam,archivedAt}', '') <> ''
    OR lower(COALESCE(payload #>> '{saranjam,locked}', 'false')) IN ('true', 't', '1')
    OR COALESCE(payload->>'archivedAt', '') <> ''
  )
  AND (
    COALESCE(payload->>'phase2EnteredAt', '') <> ''
    OR lower(COALESCE(payload #>> '{gatewayDecision,outcome}', '')) = 'success'
    OR stage_id IN ('4', '5', '6', '7', '8', 'parvane', 'tadarok', 'tajhiz', 'rahespar', 'saranjam', 'complete')
  );

-- 4) Remaining success rows without saranjam close stay OPEN
UPDATE orders
SET payload = jsonb_set(
  COALESCE(payload, '{}'::jsonb),
  '{closure}',
  '"open"',
  true
)
WHERE deleted_at IS NULL
  AND lower(status) = 'success'
  AND lower(COALESCE(payload->>'closure', '')) NOT IN ('open', 'closed')
  AND NOT (
    COALESCE(payload #>> '{saranjam,archivedAt}', '') <> ''
    OR lower(COALESCE(payload #>> '{saranjam,locked}', 'false')) IN ('true', 't', '1')
    OR COALESCE(payload->>'archivedAt', '') <> ''
  );
