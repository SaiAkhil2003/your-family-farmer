-- ================================================================
-- Payment QR Code Migration
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ================================================================

-- 1. UPI QR code image URL for each farmer
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS upi_qr_code_url text;

-- 2. Optional transaction reference / UTR number on orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS utr_number text;
