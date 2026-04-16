-- ============================================================
-- Update farmer: Yadagiri → Kapil Korlepara
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Step 1: Update the farmer record
UPDATE farmers
SET
  name        = 'Kapil Korlepara',
  slug        = 'kapil-korlepara'
WHERE slug = 'yadagiri';

-- Step 2: Remove any existing produce listings for this farmer
DELETE FROM produce_listings
WHERE farmer_id = (SELECT id FROM farmers WHERE slug = 'kapil-korlepara');

-- Step 3: Insert the 4 products
INSERT INTO produce_listings (farmer_id, name, emoji, method, status)
SELECT
  id AS farmer_id,
  unnest(ARRAY['Papaya',        'Bananas',       'Tomatoes',       'Ladies Finger']) AS name,
  unnest(ARRAY['🥭',            '🍌',             '🍅',              '🫑'])           AS emoji,
  'Natural'    AS method,
  'available'  AS status
FROM farmers
WHERE slug = 'kapil-korlepara';
