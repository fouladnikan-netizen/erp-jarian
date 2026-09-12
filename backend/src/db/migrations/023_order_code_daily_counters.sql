-- DDL-27 — daily Jalali order-code counter (expand-only).
-- Does not alter existing orders.code values.
-- One row per Jalali calendar day (YYYY-MM-DD); atomic INSERT..ON CONFLICT
-- matches correspondence_number_counters (DDL-23a).

CREATE TABLE IF NOT EXISTS order_code_daily_counters (
  jalali_date TEXT NOT NULL PRIMARY KEY,
  next_seq INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
