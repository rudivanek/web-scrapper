/*
  # Add metadata column to crawl_results

  ## Changes
  1. Add `metadata` column to `crawl_results` table
     - Type: jsonb
     - Nullable: true
     - Default: null
     - Purpose: Store additional flexible data like discovered images
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawl_results' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE crawl_results ADD COLUMN metadata jsonb;
  END IF;
END $$;