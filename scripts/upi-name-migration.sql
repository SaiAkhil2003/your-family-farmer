-- ================================================================
-- UPI Payee Name Migration
-- Run in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ================================================================

-- Optional UPI display name for each farmer.
-- Keep nullable so existing farmer records continue to work.
ALTER TABLE farmers
  ADD COLUMN IF NOT EXISTS upi_name text;
