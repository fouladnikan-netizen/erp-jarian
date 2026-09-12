-- DDL-34 — Organization Identity explicit isPrimary (expand-only, idempotent).
-- If a collection is non-empty and no item is already primary, first item becomes primary.
-- Do not rewrite historical document snapshots. Do not duplicate rows. Do not drop type.

UPDATE organization_identity
SET phones = (
  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN ordinality = 1 THEN elem || jsonb_build_object('isPrimary', true)
      ELSE elem || jsonb_build_object('isPrimary', false)
    END
    ORDER BY ordinality
  ), '[]'::jsonb)
  FROM jsonb_array_elements(phones) WITH ORDINALITY AS t(elem, ordinality)
)
WHERE jsonb_typeof(phones) = 'array'
  AND jsonb_array_length(phones) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(phones) AS e
    WHERE e->>'isPrimary' IN ('true', 't')
       OR e->'isPrimary' = 'true'::jsonb
  );

UPDATE organization_identity
SET addresses = (
  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN ordinality = 1 THEN elem || jsonb_build_object('isPrimary', true)
      ELSE elem || jsonb_build_object('isPrimary', false)
    END
    ORDER BY ordinality
  ), '[]'::jsonb)
  FROM jsonb_array_elements(addresses) WITH ORDINALITY AS t(elem, ordinality)
)
WHERE jsonb_typeof(addresses) = 'array'
  AND jsonb_array_length(addresses) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(addresses) AS e
    WHERE e->>'isPrimary' IN ('true', 't')
       OR e->'isPrimary' = 'true'::jsonb
  );

UPDATE organization_identity
SET bank_accounts = (
  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN ordinality = 1 THEN elem || jsonb_build_object('isPrimary', true)
      ELSE elem || jsonb_build_object('isPrimary', false)
    END
    ORDER BY ordinality
  ), '[]'::jsonb)
  FROM jsonb_array_elements(bank_accounts) WITH ORDINALITY AS t(elem, ordinality)
)
WHERE jsonb_typeof(bank_accounts) = 'array'
  AND jsonb_array_length(bank_accounts) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(bank_accounts) AS e
    WHERE e->>'isPrimary' IN ('true', 't')
       OR e->'isPrimary' = 'true'::jsonb
  );
