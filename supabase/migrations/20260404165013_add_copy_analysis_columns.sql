/*
  # Add Copy Performance Analysis columns to audits table

  ## Summary
  Adds three new columns to the `audits` table to support the Copy Performance Analysis feature.
  This mirrors the existing SEO audit pattern (seo_status, seo_result_json, seo_error_message).

  ## New Columns
  - `copy_status` (text) — tracks processing state: pending | processing | completed | failed
  - `copy_result_json` (jsonb) — stores the full Copy Performance Analysis result JSON
  - `copy_error_message` (text) — stores error details if copy analysis fails

  ## Notes
  - All columns are nullable since copy analysis is an optional add-on
  - No RLS changes needed; existing audits table policies cover these columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audits' AND column_name = 'copy_status'
  ) THEN
    ALTER TABLE audits ADD COLUMN copy_status text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audits' AND column_name = 'copy_result_json'
  ) THEN
    ALTER TABLE audits ADD COLUMN copy_result_json jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audits' AND column_name = 'copy_error_message'
  ) THEN
    ALTER TABLE audits ADD COLUMN copy_error_message text;
  END IF;
END $$;
