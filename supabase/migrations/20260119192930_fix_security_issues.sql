/*
  # Fix Security and Performance Issues

  1. Performance Optimization
    - Drop unused indexes that consume space and slow down writes:
      - `idx_crawl_cache_user_domain`
      - `idx_crawl_cache_url`
      - `idx_crawl_cache_scraped_at`
      - `idx_asset_audit_domain`
      - `idx_asset_audit_status`
      - `idx_asset_audit_crawl_id`
      - `idx_asset_audit_user_id`
      - `idx_crawls_created_at`
      - `idx_crawl_results_crawl_id`
      - `idx_crawl_results_created_at`
      - `idx_crawl_jobs_user_id`
      - `idx_crawl_jobs_crawl_id`
      - `idx_crawl_jobs_firecrawl_job_id`
      - `idx_crawl_jobs_status`
      - `idx_seo_intelligence_crawl_id`
      - `idx_seo_intelligence_module`
      - `idx_seo_analyses_created_at`
      - `idx_seo_analysis_results_analysis_id`
      - `idx_seo_analysis_results_module`

  2. Security Fixes
    - Fix function search path mutability for:
      - `update_updated_at_column`
      - `ensure_metadata_defaults`
    - Set explicit immutable search_path to prevent schema poisoning attacks

  3. Important Notes
    - The following require manual Supabase dashboard configuration:
      a) Auth DB Connection Strategy: Change from fixed (10) to percentage-based
      b) Leaked Password Protection: Enable HaveIBeenPwned integration in Auth settings
*/

-- Drop unused indexes
DROP INDEX IF EXISTS idx_crawl_cache_user_domain;
DROP INDEX IF EXISTS idx_crawl_cache_url;
DROP INDEX IF EXISTS idx_crawl_cache_scraped_at;
DROP INDEX IF EXISTS idx_asset_audit_domain;
DROP INDEX IF EXISTS idx_asset_audit_status;
DROP INDEX IF EXISTS idx_asset_audit_crawl_id;
DROP INDEX IF EXISTS idx_asset_audit_user_id;
DROP INDEX IF EXISTS idx_crawls_created_at;
DROP INDEX IF EXISTS idx_crawl_results_crawl_id;
DROP INDEX IF EXISTS idx_crawl_results_created_at;
DROP INDEX IF EXISTS idx_crawl_jobs_user_id;
DROP INDEX IF EXISTS idx_crawl_jobs_crawl_id;
DROP INDEX IF EXISTS idx_crawl_jobs_firecrawl_job_id;
DROP INDEX IF EXISTS idx_crawl_jobs_status;
DROP INDEX IF EXISTS idx_seo_intelligence_crawl_id;
DROP INDEX IF EXISTS idx_seo_intelligence_module;
DROP INDEX IF EXISTS idx_seo_analyses_created_at;
DROP INDEX IF EXISTS idx_seo_analysis_results_analysis_id;
DROP INDEX IF EXISTS idx_seo_analysis_results_module;

-- Recreate functions with immutable search_path for security
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION ensure_metadata_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;