-- DDL-32 — Organization Identity phones / addresses / bank_accounts (expand-only).
-- Legacy scalar columns stay; collections are backfilled from them as first item.
-- legal_person_type is not dropped.

ALTER TABLE organization_identity
  ADD COLUMN IF NOT EXISTS phones JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bank_accounts JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE organization_identity
SET phones = jsonb_build_array(phone)
WHERE phones = '[]'::jsonb
  AND phone IS NOT NULL
  AND btrim(phone) <> '';

UPDATE organization_identity
SET addresses = jsonb_build_array(jsonb_build_object(
  'province', COALESCE(province, ''),
  'city', COALESCE(city, ''),
  'officialAddress', COALESCE(official_address, ''),
  'postalCode', COALESCE(postal_code, '')
))
WHERE addresses = '[]'::jsonb
  AND (
    (province IS NOT NULL AND btrim(province) <> '')
    OR (city IS NOT NULL AND btrim(city) <> '')
    OR (official_address IS NOT NULL AND btrim(official_address) <> '')
    OR (postal_code IS NOT NULL AND btrim(postal_code) <> '')
  );

UPDATE organization_identity
SET bank_accounts = jsonb_build_array(jsonb_build_object(
  'bankCode', CASE
    WHEN bank_name ILIKE '%اقتصاد نوین%' THEN '055'
    WHEN bank_name ILIKE '%پاسارگاد%' THEN '057'
    WHEN bank_name ILIKE '%ملی%' THEN '017'
    WHEN bank_name ILIKE '%ملت%' THEN '012'
    WHEN bank_name ILIKE '%صادرات%' THEN '019'
    WHEN bank_name ILIKE '%تجارت%' THEN '018'
    WHEN bank_name ILIKE '%سپه%' THEN '015'
    ELSE ''
  END,
  'bankName', COALESCE(bank_name, ''),
  'accountNumber', COALESCE(bank_account_number, ''),
  'iban', COALESCE(iban, '')
))
WHERE bank_accounts = '[]'::jsonb
  AND (
    (bank_name IS NOT NULL AND btrim(bank_name) <> '')
    OR (bank_account_number IS NOT NULL AND btrim(bank_account_number) <> '')
    OR (iban IS NOT NULL AND btrim(iban) <> '')
  );
