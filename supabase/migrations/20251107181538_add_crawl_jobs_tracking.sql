/*
  # Add Crawl Jobs Tracking

  1. New Tables
    - `crawl_jobs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `crawl_id` (uuid, references crawls)
      - `firecrawl_job_id` (text) - The job ID from Firecrawl API
      - `status` (text) - Job status: pending, processing, completed, failed
      - `error_message` (text, nullable) - Error message if failed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `completed_at` (timestamptz, nullable)

  2. Security
    - Enable RLS on `crawl_jobs` table
    - Add policies for authenticated users to manage their own jobs
*/

CREATE TABLE IF NOT EXISTS crawl_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  crawl_id uuid REFERENCES crawls(id) ON DELETE CASCADE NOT NULL,
  firecrawl_job_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz
);

ALTER TABLE crawl_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own crawl jobs"
  ON crawl_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crawl jobs"
  ON crawl_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crawl jobs"
  ON crawl_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_user_id ON crawl_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_crawl_id ON crawl_jobs(crawl_id);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_firecrawl_job_id ON crawl_jobs(firecrawl_job_id);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status ON crawl_jobs(status);
