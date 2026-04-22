-- ============================================================
-- RLS: allow deletes on produce_listings
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================
-- The farmer dashboard needs to delete a farmer's own produce.
-- Matches the public-write model used elsewhere in the MVP
-- (anon INSERT is already allowed). Tighten with auth.uid() once
-- farmer auth is wired up.

DROP POLICY IF EXISTS "produce_listings public delete" ON produce_listings;
CREATE POLICY "produce_listings public delete"
  ON produce_listings FOR DELETE
  USING (true);
