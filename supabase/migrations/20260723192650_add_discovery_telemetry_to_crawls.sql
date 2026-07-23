/*
# Add Discovery Telemetry to Crawls

## Summary
This migration adds three nullable columns to the `crawls` table to persist
discovery telemetry from the four-tier page discovery system. This allows
tier usage to be reviewed over time and the JS/SPA toggle's value to be
evaluated with real data.

## Changes

### Modified Tables
- `crawls` table:
  - `discovery_method` (text, nullable) — which discovery tier produced the final URL list.
    Values: 'map' | 'html-harvest' | 'deep-crawl'. NULL for crawls that predate the feature.
  - `jsspa_manual` (boolean, nullable) — true when the user manually flipped the JS/SPA toggle on.
    NULL for crawls that predate the feature.
  - `sitemap_gap` (jsonb, nullable) — JSON object { claimed: number, found: number, missing: string[] }
    capturing pages found on the site but not in the sitemap. NULL when no gap was detected
    or for crawls that predate the feature.

## Notes
1. All three columns are nullable with no default. Existing rows stay NULL — that is correct,
   they predate the feature.
2. No RLS policies are added or modified. The existing crawls policies already scope by user_id
   and cover these columns.
3. Idempotent: each column addition is guarded with an IF NOT EXISTS check in a DO block.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawls' AND column_name = 'discovery_method'
  ) THEN
    ALTER TABLE crawls ADD COLUMN discovery_method text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawls' AND column_name = 'jsspa_manual'
  ) THEN
    ALTER TABLE crawls ADD COLUMN jsspa_manual boolean;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crawls' AND column_name = 'sitemap_gap'
  ) THEN
    ALTER TABLE crawls ADD COLUMN sitemap_gap jsonb;
  END IF;
END $$;
