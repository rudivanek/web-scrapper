/*
  # Add Keywords Tracking Columns

  ## Overview
  This migration adds columns to track keywords for each crawled page. Keywords can be specified
  before crawling, and the system will check for their presence on each page.

  ## Changes to Tables

  ### `crawl_results` table - Add keyword tracking columns

  **New Columns:**
  - `kw_1` (text, nullable) - First keyword to track on each page
  - `kw_2` (text, nullable) - Second keyword to track on each page
  - `kw_3` (text, nullable) - Third keyword to track on each page
  - `kw_4` (text, nullable) - Fourth keyword to track on each page
  - `kw_5` (text, nullable) - Fifth keyword to track on each page
  - `kw_6` (text, nullable) - Sixth keyword to track on each page
  - `kw_7` (text, nullable) - Seventh keyword to track on each page
  - `kw_8` (text, nullable) - Eighth keyword to track on each page
  - `kw_9` (text, nullable) - Ninth keyword to track on each page
  - `kw_10` (text, nullable) - Tenth keyword to track on each page

  ## Security
  - No RLS changes needed - existing policies on crawl_results continue to work
  - All new columns are nullable and have safe defaults
  - Keywords are stored as plain text for easy querying and display

  ## Notes
  - Each column stores the actual keyword value found on the page
  - If a keyword is not found, the column will be NULL
  - Keywords are extracted during page analysis
  - Maximum of 10 keywords can be tracked per crawl
*/

-- Add keyword tracking columns to crawl_results table
DO $$
BEGIN
  -- Add kw_1 column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'kw_1'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN kw_1 text;
  END IF;

  -- Add kw_2 column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'kw_2'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN kw_2 text;
  END IF;

  -- Add kw_3 column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'kw_3'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN kw_3 text;
  END IF;

  -- Add kw_4 column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'kw_4'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN kw_4 text;
  END IF;

  -- Add kw_5 column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'kw_5'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN kw_5 text;
  END IF;

  -- Add kw_6 column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'kw_6'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN kw_6 text;
  END IF;

  -- Add kw_7 column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'kw_7'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN kw_7 text;
  END IF;

  -- Add kw_8 column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'kw_8'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN kw_8 text;
  END IF;

  -- Add kw_9 column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'kw_9'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN kw_9 text;
  END IF;

  -- Add kw_10 column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'kw_10'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN kw_10 text;
  END IF;
END $$;
