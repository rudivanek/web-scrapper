/*
  # Create SEO Intelligence Results Table

  1. New Tables
    - `seo_intelligence_results`
      - `id` (uuid, primary key)
      - `crawl_id` (uuid, foreign key to crawls)
      - `module` (text) - Module identifier (redirects, robots, canonical, duplicates, brokenlinks, performance)
      - `data` (jsonb) - Structured results from analysis
      - `total_issues` (integer) - Quick count of issues found
      - `status` (text) - running, completed, failed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `seo_intelligence_results` table
    - Add policies for authenticated users to manage their own analysis results

  3. Indexes
    - Index on crawl_id for fast lookups
    - Index on module for filtering by analysis type
*/

CREATE TABLE IF NOT EXISTS seo_intelligence_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crawl_id uuid REFERENCES crawls(id) ON DELETE CASCADE NOT NULL,
  module text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  total_issues integer DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_seo_intelligence_crawl_id ON seo_intelligence_results(crawl_id);
CREATE INDEX IF NOT EXISTS idx_seo_intelligence_module ON seo_intelligence_results(module);

-- Enable RLS
ALTER TABLE seo_intelligence_results ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Users can view own SEO intelligence results"
  ON seo_intelligence_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crawls
      WHERE crawls.id = seo_intelligence_results.crawl_id
      AND crawls.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own SEO intelligence results"
  ON seo_intelligence_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crawls
      WHERE crawls.id = seo_intelligence_results.crawl_id
      AND crawls.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own SEO intelligence results"
  ON seo_intelligence_results FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crawls
      WHERE crawls.id = seo_intelligence_results.crawl_id
      AND crawls.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crawls
      WHERE crawls.id = seo_intelligence_results.crawl_id
      AND crawls.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own SEO intelligence results"
  ON seo_intelligence_results FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crawls
      WHERE crawls.id = seo_intelligence_results.crawl_id
      AND crawls.user_id = auth.uid()
    )
  );