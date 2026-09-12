-- DDL-30: freeze Organization Identity on finalized official letters.
-- Expand-only. NULL on existing FINAL rows (legacy LETTER_ORG_LINE fallback).
-- Do not backfill. Do not rewrite historical documents.

ALTER TABLE correspondence
  ADD COLUMN IF NOT EXISTS organization_snapshot JSONB;
