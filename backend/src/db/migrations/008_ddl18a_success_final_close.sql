-- DDL-18(A): Order.status=success is final Successful Purchase only.
-- Mid-flight Phase-2 rows previously stored as status=success → current + phase2EnteredAt.

UPDATE orders
SET
  status = 'current',
  payload = jsonb_set(
    COALESCE(payload, '{}'::jsonb),
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
  AND lower(status) = 'success'
  AND NOT (
    COALESCE(payload #>> '{saranjam,archivedAt}', '') <> ''
    OR lower(COALESCE(payload #>> '{saranjam,locked}', 'false')) IN ('true', 't', '1')
    OR COALESCE(payload->>'archivedAt', '') <> ''
  );
