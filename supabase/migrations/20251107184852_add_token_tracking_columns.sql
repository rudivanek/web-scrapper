/*
  # Add Token Tracking to Crawls

  ## Summary
  This migration adds token usage tracking to the crawls table to monitor Firecrawl API costs.

  ## Changes
  
  ### Modified Tables
  - `crawls` table:
    - `tokens_used` (integer, nullable) - Total number of tokens consumed by Firecrawl API for this crawl
    - `tokens_cost` (decimal, nullable) - Total cost in USD for this crawl based on tokens used
  
  ## Notes
  - Tokens are tracked per crawl session to provide cost visibility
  - Cost is stored in USD with 6 decimal places for precision
  - Both fields are nullable to support existing crawls without token data
*/

-- Add token tracking columns to crawls table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawls' AND column_name = 'tokens_used'
  ) THEN
    ALTER TABLE crawls ADD COLUMN tokens_used integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawls' AND column_name = 'tokens_cost'
  ) THEN
    ALTER TABLE crawls ADD COLUMN tokens_cost decimal(10, 6);
  END IF;
END $$;