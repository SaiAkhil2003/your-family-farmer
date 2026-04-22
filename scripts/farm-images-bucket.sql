-- ============================================================
-- Supabase Storage setup: farm-images bucket
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Step 1: Create a public bucket for farm/produce photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('farm-images', 'farm-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Step 2: Allow anyone to read objects in this bucket (public viewing)
DROP POLICY IF EXISTS "farm-images public read" ON storage.objects;
CREATE POLICY "farm-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'farm-images');

-- Step 3: Allow anyone (including anon) to upload to this bucket.
-- This matches the public-write model used elsewhere in the MVP.
-- Tighten with auth.uid() once farmer auth is wired up.
DROP POLICY IF EXISTS "farm-images public upload" ON storage.objects;
CREATE POLICY "farm-images public upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'farm-images');

-- Step 4: Allow public update/delete so farmers can replace photos
DROP POLICY IF EXISTS "farm-images public update" ON storage.objects;
CREATE POLICY "farm-images public update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'farm-images');

DROP POLICY IF EXISTS "farm-images public delete" ON storage.objects;
CREATE POLICY "farm-images public delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'farm-images');

-- Step 5: Add image_url column to produce_listings (idempotent)
ALTER TABLE produce_listings
  ADD COLUMN IF NOT EXISTS image_url text;
