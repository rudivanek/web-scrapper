/*
  # Create scraped_pages table

  1. New Tables
    - `scraped_pages`
      - `id` (uuid, primary key) - Unique identifier for each scraped page
      - `user_id` (uuid, foreign key) - References auth.users, tracks who scraped the page
      - `url` (text) - The URL of the scraped page
      - `title` (text, nullable) - Page title from metadata
      - `description` (text, nullable) - Page description from metadata
      - `markdown_content` (text) - Full page content in markdown format
      - `html_content` (text) - Full page content in HTML format
      - `metadata` (jsonb, nullable) - Additional metadata (status code, etc.)
      - `status_code` (integer, nullable) - HTTP status code of the scraped page
      - `created_at` (timestamp) - When the page was scraped
      - `updated_at` (timestamp) - Last update timestamp
  
  2. Security
    - Enable RLS on `scraped_pages` table
    - Add policy for users to read their own scraped pages
    - Add policy for users to insert their own scraped pages
    - Add policy for users to update their own scraped pages
    - Add policy for users to delete their own scraped pages
  
  3. Important Notes
    - Users can only access their own scraped pages
    - Markdown and HTML content stored for versatility
    - Metadata stored as JSONB for flexibility
*/

CREATE TABLE IF NOT EXISTS scraped_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text,
  description text,
  markdown_content text NOT NULL DEFAULT '',
  html_content text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  status_code integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scraped_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scraped pages"
  ON scraped_pages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scraped pages"
  ON scraped_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scraped pages"
  ON scraped_pages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scraped pages"
  ON scraped_pages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS scraped_pages_user_id_idx ON scraped_pages(user_id);
CREATE INDEX IF NOT EXISTS scraped_pages_created_at_idx ON scraped_pages(created_at DESC);
CREATE INDEX IF NOT EXISTS scraped_pages_url_idx ON scraped_pages(url);
