/*
  # Add Token Tracking to SEO Intelligence Results

  1. Changes
    - Add `tokens_used` column to track API credits consumed by each module
    - Add `tokens_cost` column to track the cost in dollars

  2. Notes
    - Columns are nullable to support existing records
    - Default values are 0 for new records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seo_intelligence_results' AND column_name = 'tokens_used'
  ) THEN
    ALTER TABLE seo_intelligence_results ADD COLUMN tokens_used integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seo_intelligence_results' AND column_name = 'tokens_cost'
  ) THEN
    ALTER TABLE seo_intelligence_results ADD COLUMN tokens_cost numeric(10, 6) DEFAULT 0;
  END IF;
END $$;
