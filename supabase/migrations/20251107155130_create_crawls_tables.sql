/*
  # Create Crawls and Crawl Results Tables

  ## Overview
  This migration creates the database schema for storing website crawl data with user authentication support.

  ## New Tables

  ### 1. `crawls` - Main crawl sessions table
  Stores metadata about each crawl operation performed by users.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for the crawl session
  - `user_id` (uuid, not null) - References auth.users, the user who performed the crawl
  - `domain` (text, not null) - The domain that was crawled (e.g., "example.com")
  - `name` (text, nullable) - Optional user-provided name for the crawl session
  - `total_urls` (integer, not null, default 0) - Total number of URLs found in this crawl
  - `included_meta` (boolean, not null, default true) - Whether metadata (title/description) was scraped
  - `tags` (text[], nullable) - Array of tags for organizing/categorizing crawls
  - `created_at` (timestamptz, not null) - When the crawl was saved
  - `updated_at` (timestamptz, not null) - Last modification timestamp

  ### 2. `crawl_results` - Individual URL results
  Stores each URL discovered during a crawl session with its metadata.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for this result entry
  - `crawl_id` (uuid, not null) - References crawls table
  - `url` (text, not null) - The full URL found
  - `title` (text, nullable) - Page meta title (if metadata was included)
  - `description` (text, nullable) - Page meta description (if metadata was included)
  - `created_at` (timestamptz, not null) - When this result was saved

  ## Security

  ### Row Level Security (RLS)
  - **ENABLED** on both tables to ensure data isolation between users
  
  ### RLS Policies

  #### `crawls` table policies:
  1. **"Users can view own crawls"** - SELECT policy
     - Authenticated users can only view their own crawl sessions
     - Uses `auth.uid() = user_id` check
  
  2. **"Users can insert own crawls"** - INSERT policy
     - Authenticated users can create new crawl sessions
     - Ensures `user_id` matches authenticated user
  
  3. **"Users can update own crawls"** - UPDATE policy
     - Authenticated users can modify their own crawl sessions (e.g., update name, tags)
     - Prevents modification of `user_id`
  
  4. **"Users can delete own crawls"** - DELETE policy
     - Authenticated users can remove their own crawl sessions
     - Cascade deletes associated crawl_results automatically

  #### `crawl_results` table policies:
  1. **"Users can view own crawl results"** - SELECT policy
     - Users can view results from their own crawls
     - Checks ownership through JOIN with crawls table
  
  2. **"Users can insert own crawl results"** - INSERT policy
     - Users can add results to their own crawls
     - Validates ownership through crawls table
  
  3. **"Users can delete own crawl results"** - DELETE policy
     - Users can remove results from their own crawls
     - Validates ownership through crawls table

  ## Indexes
  - `crawls.user_id` - Fast lookup of user's crawls
  - `crawls.created_at` - Efficient sorting by date
  - `crawl_results.crawl_id` - Fast JOIN operations
  - `crawl_results.created_at` - Efficient sorting

  ## Foreign Key Constraints
  - `crawls.user_id` references `auth.users(id)` with CASCADE delete
  - `crawl_results.crawl_id` references `crawls(id)` with CASCADE delete
    (Deleting a crawl automatically deletes all its results)

  ## Automatic Timestamps
  - Both tables use triggers to automatically update `updated_at` timestamp on the crawls table
*/

-- Create crawls table
CREATE TABLE IF NOT EXISTS crawls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain text NOT NULL,
  name text,
  total_urls integer NOT NULL DEFAULT 0,
  included_meta boolean NOT NULL DEFAULT true,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create crawl_results table
CREATE TABLE IF NOT EXISTS crawl_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crawl_id uuid NOT NULL REFERENCES crawls(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_crawls_user_id ON crawls(user_id);
CREATE INDEX IF NOT EXISTS idx_crawls_created_at ON crawls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_results_crawl_id ON crawl_results(crawl_id);
CREATE INDEX IF NOT EXISTS idx_crawl_results_created_at ON crawl_results(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for crawls table
DROP TRIGGER IF EXISTS update_crawls_updated_at ON crawls;
CREATE TRIGGER update_crawls_updated_at
  BEFORE UPDATE ON crawls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE crawls ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crawls table
CREATE POLICY "Users can view own crawls"
  ON crawls
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crawls"
  ON crawls
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crawls"
  ON crawls
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own crawls"
  ON crawls
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for crawl_results table
CREATE POLICY "Users can view own crawl results"
  ON crawl_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crawls
      WHERE crawls.id = crawl_results.crawl_id
      AND crawls.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own crawl results"
  ON crawl_results
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crawls
      WHERE crawls.id = crawl_results.crawl_id
      AND crawls.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own crawl results"
  ON crawl_results
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crawls
      WHERE crawls.id = crawl_results.crawl_id
      AND crawls.user_id = auth.uid()
    )
  );