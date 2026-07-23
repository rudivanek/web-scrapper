/*
  # Add Page Analysis Data Columns

  ## Overview
  This migration adds columns to the `crawl_results` table to store detailed page analysis data
  including heading tags (H1, H2, H3), images, and links extracted from each crawled page.

  ## Changes to Tables

  ### `crawl_results` table - Add analysis data columns
  
  **New Columns:**
  - `h1_tags` (text[], nullable) - Array of all H1 heading texts found on the page
  - `h2_tags` (text[], nullable) - Array of all H2 heading texts found on the page
  - `h3_tags` (text[], nullable) - Array of all H3 heading texts found on the page
  - `images` (jsonb, nullable) - Array of image objects with src and alt properties
  - `links` (jsonb, nullable) - Array of link objects with href and text properties
  - `analyzed` (boolean, not null, default false) - Flag indicating if detailed analysis was performed

  ## Why JSONB for images and links?
  - Images need to store both `src` and `alt` attributes
  - Links need to store both `href` and `text` content
  - JSONB provides flexible structure and efficient querying
  - Structure: images: [{"src": "url", "alt": "text"}], links: [{"href": "url", "text": "anchor"}]

  ## Security
  - No RLS changes needed - existing policies on crawl_results continue to work
  - All new columns are nullable and have safe defaults
  - Data validation happens at application level before insert

  ## Performance
  - No new indexes needed initially
  - JSONB columns are efficient for storage and querying
  - Can add GIN indexes later if needed for JSONB searching

  ## Notes
  - Existing crawl_results rows will have NULL for new columns (no analysis data)
  - New saves can optionally include analysis data
  - The `analyzed` flag helps distinguish between rows with/without analysis
*/

-- Add analysis columns to crawl_results table
DO $$
BEGIN
  -- Add h1_tags column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'h1_tags'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN h1_tags text[];
  END IF;

  -- Add h2_tags column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'h2_tags'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN h2_tags text[];
  END IF;

  -- Add h3_tags column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'h3_tags'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN h3_tags text[];
  END IF;

  -- Add images column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'images'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN images jsonb;
  END IF;

  -- Add links column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'links'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN links jsonb;
  END IF;

  -- Add analyzed flag column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'analyzed'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN analyzed boolean NOT NULL DEFAULT false;
  END IF;
END $$;
