/*
  # Create audits table for CRO Audit feature

  1. New Tables
    - `audits`
      - `id` (uuid, primary key) - Unique identifier for each audit
      - `user_id` (uuid, foreign key) - References auth.users, tracks who created the audit
      - `created_at` (timestamp) - When the audit was created
      - `updated_at` (timestamp) - Last update timestamp
      - `brand_name` (text) - Name of the brand being audited
      - `page_type` (text) - Type of page (Homepage, Landing Page, etc.)
      - `target_url` (text, nullable) - Optional URL of the page being audited
      - `source_markdown` (text) - Primary Firecrawl markdown content
      - `competitor_1_markdown` (text, nullable) - Optional competitor 1 markdown
      - `competitor_2_markdown` (text, nullable) - Optional competitor 2 markdown
      - `competitor_3_markdown` (text, nullable) - Optional competitor 3 markdown
      - `additional_notes` (text, nullable) - Optional additional notes from user
      - `detected_language` (text, nullable) - Language detected from content
      - `model_used` (text, nullable) - LLM model used for the audit
      - `structured_result_json` (jsonb) - Complete audit results in structured JSON format
      - `weighted_score` (numeric, nullable) - Overall weighted CRO score
      - `status` (text) - Status: pending, processing, completed, failed
      - `error_message` (text, nullable) - Error message if audit failed
  
  2. Security
    - Enable RLS on `audits` table
    - Add policy for users to read their own audits
    - Add policy for users to insert their own audits
    - Add policy for users to update their own audits
    - Add policy for users to delete their own audits
  
  3. Important Notes
    - Users can only access their own audits
    - All audit data and results stored securely
    - JSONB format allows flexible structured data storage
    - Status field enables tracking audit progress
*/

CREATE TABLE IF NOT EXISTS audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  brand_name text NOT NULL,
  page_type text NOT NULL,
  target_url text,
  source_markdown text NOT NULL,
  competitor_1_markdown text,
  competitor_2_markdown text,
  competitor_3_markdown text,
  additional_notes text,
  detected_language text,
  model_used text,
  structured_result_json jsonb DEFAULT '{}'::jsonb,
  weighted_score numeric,
  status text DEFAULT 'pending',
  error_message text
);

ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audits"
  ON audits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audits"
  ON audits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own audits"
  ON audits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own audits"
  ON audits
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS audits_user_id_idx ON audits(user_id);
CREATE INDEX IF NOT EXISTS audits_created_at_idx ON audits(created_at DESC);
CREATE INDEX IF NOT EXISTS audits_status_idx ON audits(status);
