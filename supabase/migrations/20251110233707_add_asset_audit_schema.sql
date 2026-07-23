/*
  # Add Asset Audit Schema

  1. Changes
    - Ensure metadata column exists on crawl_results table
    - Create asset_audit_results table for detailed per-image tracking
    - Add indexes for performance on domain and status columns
    - Create trigger to ensure default metadata structure

  2. New Tables
    - `asset_audit_results`
      - `id` (uuid, primary key)
      - `crawl_id` (uuid, foreign key to crawl_results)
      - `user_id` (uuid, foreign key to auth.users)
      - `domain` (text)
      - `image_url` (text)
      - `status` (text, 'used' or 'unused')
      - `content_length` (integer)
      - `content_type` (text)
      - `last_checked` (timestamptz)

  3. Security
    - Enable RLS on asset_audit_results table
    - Add policies for authenticated users to manage their own audit results
*/

-- Ensure metadata column exists
ALTER TABLE crawl_results
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create asset audit results table
CREATE TABLE IF NOT EXISTS asset_audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crawl_id UUID REFERENCES crawl_results (id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  image_url TEXT NOT NULL,
  status TEXT CHECK (status IN ('used', 'unused')) NOT NULL,
  content_length INTEGER,
  content_type TEXT,
  last_checked TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_asset_audit_domain ON asset_audit_results(domain);
CREATE INDEX IF NOT EXISTS idx_asset_audit_status ON asset_audit_results(status);
CREATE INDEX IF NOT EXISTS idx_asset_audit_crawl_id ON asset_audit_results(crawl_id);
CREATE INDEX IF NOT EXISTS idx_asset_audit_user_id ON asset_audit_results(user_id);

-- Enable RLS
ALTER TABLE asset_audit_results ENABLE ROW LEVEL SECURITY;

-- Policies for asset_audit_results
CREATE POLICY "Users can view their own asset audits"
  ON asset_audit_results FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own asset audits"
  ON asset_audit_results FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own asset audits"
  ON asset_audit_results FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own asset audits"
  ON asset_audit_results FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create function to ensure default metadata structure
CREATE OR REPLACE FUNCTION ensure_metadata_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.metadata IS NULL OR NEW.metadata = '{}'::jsonb THEN
    NEW.metadata := jsonb_build_object(
      'discovered_images', '[]'::jsonb,
      'used_images', '[]'::jsonb,
      'unused_images', '[]'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop if exists first)
DROP TRIGGER IF EXISTS crawl_results_metadata_default ON crawl_results;

CREATE TRIGGER crawl_results_metadata_default
BEFORE INSERT ON crawl_results
FOR EACH ROW
EXECUTE FUNCTION ensure_metadata_defaults();