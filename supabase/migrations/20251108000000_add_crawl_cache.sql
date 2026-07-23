/*
  # Add Crawl Cache Table

  1. New Tables
    - `crawl_cache`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `domain` (text)
      - `url` (text)
      - `metadata` (jsonb) - stores metadata from scraping
      - `links` (jsonb) - stores extracted links
      - `scraped_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Indexes
    - Index on `user_id` and `domain` for fast lookups
    - Index on `url` for quick URL checks
    - Index on `scraped_at` for cache invalidation

  3. Security
    - Enable RLS on `crawl_cache` table
    - Add policy for users to read/write their own cached data
*/

CREATE TABLE IF NOT EXISTS crawl_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  domain text NOT NULL,
  url text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  links jsonb DEFAULT '[]'::jsonb,
  scraped_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crawl_cache_user_domain ON crawl_cache(user_id, domain);
CREATE INDEX IF NOT EXISTS idx_crawl_cache_url ON crawl_cache(url);
CREATE INDEX IF NOT EXISTS idx_crawl_cache_scraped_at ON crawl_cache(scraped_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crawl_cache_user_url ON crawl_cache(user_id, url);

ALTER TABLE crawl_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own cached data"
  ON crawl_cache
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cached data"
  ON crawl_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cached data"
  ON crawl_cache
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cached data"
  ON crawl_cache
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
