-- DDL-33 — Organization Identity structured collections (expand-only, idempotent).
-- Wrap legacy string phones and name-only addresses; add id/sortOrder/accountHolderName.
-- Do not drop scalar columns. Do not rewrite historical document snapshots.

UPDATE organization_identity
SET phones = (
  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN jsonb_typeof(elem) = 'string' THEN jsonb_build_object(
        'id', 'orgph_' || (ordinality - 1),
        'sortOrder', ordinality - 1,
        'label', '',
        'type', 'landline',
        'number', elem #>> '{}'
      )
      WHEN jsonb_typeof(elem) = 'object' THEN elem || jsonb_build_object(
        'id', COALESCE(NULLIF(elem->>'id', ''), 'orgph_' || (ordinality - 1)),
        'sortOrder', COALESCE(NULLIF(elem->>'sortOrder', ''), (ordinality - 1)::text)::int,
        'label', COALESCE(elem->>'label', ''),
        'type', CASE
          WHEN elem->>'type' IN ('landline', 'mobile') THEN elem->>'type'
          ELSE 'landline'
        END,
        'number', COALESCE(elem->>'number', '')
      )
      ELSE elem
    END
    ORDER BY ordinality
  ), '[]'::jsonb)
  FROM jsonb_array_elements(phones) WITH ORDINALITY AS t(elem, ordinality)
)
WHERE jsonb_typeof(phones) = 'array'
  AND phones <> '[]'::jsonb
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(phones) AS e
    WHERE jsonb_typeof(e) = 'string'
       OR (jsonb_typeof(e) = 'object' AND (e->>'id' IS NULL OR e->>'number' IS NULL OR e->>'sortOrder' IS NULL))
  );

UPDATE organization_identity
SET addresses = (
  SELECT COALESCE(jsonb_agg(
    elem || jsonb_build_object(
      'id', COALESCE(NULLIF(elem->>'id', ''), 'orgad_' || (ordinality - 1)),
      'sortOrder', COALESCE(NULLIF(elem->>'sortOrder', ''), (ordinality - 1)::text)::int,
      'label', COALESCE(elem->>'label', ''),
      'address', COALESCE(NULLIF(elem->>'address', ''), elem->>'officialAddress', ''),
      'provinceName', COALESCE(NULLIF(elem->>'provinceName', ''), elem->>'province', ''),
      'cityName', COALESCE(NULLIF(elem->>'cityName', ''), elem->>'city', ''),
      'provinceCode', COALESCE(elem->>'provinceCode', ''),
      'cityCode', COALESCE(elem->>'cityCode', ''),
      'postalCode', COALESCE(elem->>'postalCode', '')
    )
    ORDER BY ordinality
  ), '[]'::jsonb)
  FROM jsonb_array_elements(addresses) WITH ORDINALITY AS t(elem, ordinality)
)
WHERE jsonb_typeof(addresses) = 'array'
  AND addresses <> '[]'::jsonb
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(addresses) AS e
    WHERE e->>'id' IS NULL
       OR e->>'sortOrder' IS NULL
       OR (e->>'address' IS NULL AND e->>'officialAddress' IS NOT NULL)
  );

UPDATE organization_identity
SET bank_accounts = (
  SELECT COALESCE(jsonb_agg(
    elem || jsonb_build_object(
      'id', COALESCE(NULLIF(elem->>'id', ''), 'orgba_' || (ordinality - 1)),
      'sortOrder', COALESCE(NULLIF(elem->>'sortOrder', ''), (ordinality - 1)::text)::int,
      'accountHolderName', COALESCE(NULLIF(elem->>'accountHolderName', ''), legal_name, ''),
      'bankCode', COALESCE(elem->>'bankCode', ''),
      'bankName', COALESCE(elem->>'bankName', ''),
      'accountNumber', COALESCE(elem->>'accountNumber', ''),
      'iban', COALESCE(elem->>'iban', '')
    )
    ORDER BY ordinality
  ), '[]'::jsonb)
  FROM jsonb_array_elements(bank_accounts) WITH ORDINALITY AS t(elem, ordinality)
)
WHERE jsonb_typeof(bank_accounts) = 'array'
  AND bank_accounts <> '[]'::jsonb
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(bank_accounts) AS e
    WHERE e->>'id' IS NULL
       OR e->>'sortOrder' IS NULL
       OR e->>'accountHolderName' IS NULL
  );
