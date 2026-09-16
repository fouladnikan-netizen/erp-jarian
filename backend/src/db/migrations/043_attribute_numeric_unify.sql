-- DDL-24(o) — one numeric attribute type. INTEGER rows become DECIMAL.
-- CHECK is rewritten so INTEGER is no longer a stored value.

UPDATE attribute_definitions
SET data_type = 'DECIMAL'
WHERE data_type = 'INTEGER';

DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'attribute_definitions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%data_type%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE attribute_definitions DROP CONSTRAINT %I', cname);
  END IF;
  ALTER TABLE attribute_definitions
    ADD CONSTRAINT attribute_definitions_data_type_check
    CHECK (data_type IN ('STRING', 'DECIMAL', 'BOOLEAN', 'ENUM', 'DATE', 'REFERENCE'));
END $$;
