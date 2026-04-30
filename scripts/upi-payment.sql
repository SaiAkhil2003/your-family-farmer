-- ================================================================
-- UPI Direct Payment Migration
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ================================================================

-- 1. UPI ID for each farmer (used for direct buyer-to-farmer payment)
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS upi_id text;

-- 2. Screenshot proof URL on orders (optional buyer upload)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_screenshot_url text;

-- 3. Index for faster payment status queries on orders
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);
