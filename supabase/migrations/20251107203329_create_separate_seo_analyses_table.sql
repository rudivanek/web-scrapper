/*
  # Create Separate SEO Analyses Table
  
  This migration creates a completely independent SEO analysis system separate from crawls.
  
  1. New Tables
    - `seo_analyses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `domain` (text) - Target domain for analysis
      - `name` (text) - Auto-generated or custom name (e.g., "SEO: dbxtra.com 2025-11-07 14:30")
      - `tags` (text array) - Optional tags for categorization
      - `tokens_used` (integer) - Total tokens consumed during analysis
      - `tokens_cost` (numeric) - Total cost in dollars
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `seo_analysis_results`
      - `id` (uuid, primary key)
      - `seo_analysis_id` (uuid, foreign key to seo_analyses)
      - `module` (text) - Module identifier (redirects, robots, canonical, etc.)
      - `data` (jsonb) - Structured results from analysis
      - `total_issues` (integer) - Quick count of issues found
      - `tokens_used` (integer) - Tokens used by this specific module
      - `tokens_cost` (numeric) - Cost for this specific module
      - `status` (text) - pending, running, completed, failed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own analyses
  
  3. Important Notes
    - This is completely independent from the crawls system
    - Each SEO analysis has its own token tracking
    - Names follow format: "SEO: domain timestamp"
*/

-- Create seo_analyses table
CREATE TABLE IF NOT EXISTS seo_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  domain text NOT NULL,
  name text,
  tags text[],
  tokens_used integer DEFAULT 0,
  tokens_cost numeric(10, 4) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create seo_analysis_results table
CREATE TABLE IF NOT EXISTS seo_analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seo_analysis_id uuid REFERENCES seo_analyses(id) ON DELETE CASCADE NOT NULL,
  module text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  total_issues integer DEFAULT 0,
  tokens_used integer DEFAULT 0,
  tokens_cost numeric(10, 4) DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(seo_analysis_id, module)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_seo_analyses_user_id ON seo_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_seo_analyses_created_at ON seo_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_analysis_results_analysis_id ON seo_analysis_results(seo_analysis_id);
CREATE INDEX IF NOT EXISTS idx_seo_analysis_results_module ON seo_analysis_results(module);

-- Enable RLS
ALTER TABLE seo_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_analysis_results ENABLE ROW LEVEL SECURITY;

-- Policies for seo_analyses
CREATE POLICY "Users can view own SEO analyses"
  ON seo_analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own SEO analyses"
  ON seo_analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own SEO analyses"
  ON seo_analyses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own SEO analyses"
  ON seo_analyses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for seo_analysis_results
CREATE POLICY "Users can view own SEO analysis results"
  ON seo_analysis_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seo_analyses
      WHERE seo_analyses.id = seo_analysis_results.seo_analysis_id
      AND seo_analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own SEO analysis results"
  ON seo_analysis_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seo_analyses
      WHERE seo_analyses.id = seo_analysis_results.seo_analysis_id
      AND seo_analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own SEO analysis results"
  ON seo_analysis_results FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seo_analyses
      WHERE seo_analyses.id = seo_analysis_results.seo_analysis_id
      AND seo_analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seo_analyses
      WHERE seo_analyses.id = seo_analysis_results.seo_analysis_id
      AND seo_analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own SEO analysis results"
  ON seo_analysis_results FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seo_analyses
      WHERE seo_analyses.id = seo_analysis_results.seo_analysis_id
      AND seo_analyses.user_id = auth.uid()
    )
  );