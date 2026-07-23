/*
  # Add New Analysis Module Columns

  ## Overview
  This migration extends the `crawl_results` table to support additional SEO and content analysis
  modules including status codes, indexability, canonical URLs, word counts, and extended heading
  hierarchy (H4, H5, H6).

  ## Changes to Tables

  ### `crawl_results` table - Add new analysis columns

  **New Columns:**
  - `status_code` (integer, nullable) - HTTP response status code (e.g., 200, 404, 500)
  - `indexable` (boolean, nullable) - Whether the page is indexable (no noindex meta/robots.txt)
  - `canonical_url` (text, nullable) - The canonical URL extracted from link rel="canonical" tag
  - `word_count` (integer, nullable) - Count of visible text words on the page
  - `h4_tags` (text[], nullable) - Array of all H4 heading texts found on the page
  - `h5_tags` (text[], nullable) - Array of all H5 heading texts found on the page
  - `h6_tags` (text[], nullable) - Array of all H6 heading texts found on the page
  - `images_without_alt` (integer, nullable) - Count of images missing alt attributes

  ## Use Cases
  - **status_code**: Track broken links, redirects, and server errors
  - **indexable**: Identify pages blocked from search engines
  - **canonical_url**: Detect duplicate content issues and canonicalization
  - **word_count**: Analyze content depth and thin content issues
  - **h4_tags, h5_tags, h6_tags**: Complete heading hierarchy analysis
  - **images_without_alt**: Accessibility and SEO compliance checking

  ## Security
  - No RLS changes needed - existing policies continue to work
  - All new columns are nullable for backward compatibility
  - Data validation happens at application level

  ## Performance
  - All columns use efficient data types
  - No indexes needed initially (can be added later based on query patterns)
  - Nullable columns don't impact existing rows

  ## Notes
  - Existing crawl_results rows will have NULL for new columns
  - Application layer will populate these based on activeModules configuration
  - Columns are only populated when their respective module is enabled
*/

-- Add new analysis module columns to crawl_results table
DO $$
BEGIN
  -- Add status_code column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'status_code'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN status_code integer;
  END IF;

  -- Add indexable column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'indexable'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN indexable boolean;
  END IF;

  -- Add canonical_url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'canonical_url'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN canonical_url text;
  END IF;

  -- Add word_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'word_count'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN word_count integer;
  END IF;

  -- Add h4_tags column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'h4_tags'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN h4_tags text[];
  END IF;

  -- Add h5_tags column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'h5_tags'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN h5_tags text[];
  END IF;

  -- Add h6_tags column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'h6_tags'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN h6_tags text[];
  END IF;

  -- Add images_without_alt column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'images_without_alt'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN images_without_alt integer;
  END IF;
END $$;
