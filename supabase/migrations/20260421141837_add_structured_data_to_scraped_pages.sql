/*
  # Add structured_data column to scraped_pages

  ## Summary
  Adds a JSONB column to store structured extraction results (meta tags, headings, schema types)
  produced by the shared CRO/SEO extraction pipeline.

  ## Changes
  - `scraped_pages`: new `structured_data` column (jsonb, nullable)
    - Stores: { metaTags: ExtractedMetaTags, headings: ExtractedHeadings, imageCount: number }
    - Null for rows scraped before this migration

  ## Notes
  - Non-destructive additive change; existing rows retain all data, structured_data is null
  - No RLS changes required
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraped_pages' AND column_name = 'structured_data'
  ) THEN
    ALTER TABLE scraped_pages ADD COLUMN structured_data jsonb DEFAULT NULL;
  END IF;
END $$;
