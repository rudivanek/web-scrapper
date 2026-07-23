/*
  # Add SEO Audit columns to audits table

  ## Summary
  Extends the existing `audits` table to support a second analysis type: SEO Content Audit.
  The SEO audit runs as an optional add-on after a CRO audit and reuses the same scraped content.

  ## Changes to Existing Tables

  ### audits
  - `seo_result_json` (jsonb) — stores the full structured SEO audit result
  - `seo_status` (text) — tracks SEO audit lifecycle: none | pending | processing | completed | failed
  - `seo_error_message` (text) — stores error details if SEO audit fails

  ## Notes
  - No data loss — only new nullable columns are added
  - Default seo_status is 'none' so existing rows are unaffected
  - RLS policies already cover the table; no new policies needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audits' AND column_name = 'seo_result_json'
  ) THEN
    ALTER TABLE audits ADD COLUMN seo_result_json jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audits' AND column_name = 'seo_status'
  ) THEN
    ALTER TABLE audits ADD COLUMN seo_status text DEFAULT 'none';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audits' AND column_name = 'seo_error_message'
  ) THEN
    ALTER TABLE audits ADD COLUMN seo_error_message text;
  END IF;
END $$;
