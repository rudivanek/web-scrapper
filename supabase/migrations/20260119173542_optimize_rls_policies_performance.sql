/*
  # Optimize RLS Policies Performance

  1. Changes
    - Replace all `auth.uid()` with `(select auth.uid())` in RLS policies
    - This prevents function re-evaluation for each row, improving query performance at scale
    
  2. Security
    - All existing security rules remain the same
    - Only optimization for performance, no changes to access control logic
*/

-- Drop and recreate all policies with optimized auth.uid() calls

-- ============================================================================
-- CRAWLS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own crawls" ON crawls;
DROP POLICY IF EXISTS "Users can insert own crawls" ON crawls;
DROP POLICY IF EXISTS "Users can update own crawls" ON crawls;
DROP POLICY IF EXISTS "Users can delete own crawls" ON crawls;

CREATE POLICY "Users can view own crawls"
  ON crawls FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own crawls"
  ON crawls FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own crawls"
  ON crawls FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own crawls"
  ON crawls FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- CRAWL_RESULTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own crawl results" ON crawl_results;
DROP POLICY IF EXISTS "Users can insert own crawl results" ON crawl_results;
DROP POLICY IF EXISTS "Users can delete own crawl results" ON crawl_results;

CREATE POLICY "Users can view own crawl results"
  ON crawl_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crawls
      WHERE crawls.id = crawl_results.crawl_id
      AND crawls.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own crawl results"
  ON crawl_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crawls
      WHERE crawls.id = crawl_results.crawl_id
      AND crawls.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own crawl results"
  ON crawl_results FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crawls
      WHERE crawls.id = crawl_results.crawl_id
      AND crawls.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- CRAWL_JOBS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own crawl jobs" ON crawl_jobs;
DROP POLICY IF EXISTS "Users can insert own crawl jobs" ON crawl_jobs;
DROP POLICY IF EXISTS "Users can update own crawl jobs" ON crawl_jobs;

CREATE POLICY "Users can view own crawl jobs"
  ON crawl_jobs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own crawl jobs"
  ON crawl_jobs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own crawl jobs"
  ON crawl_jobs FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- SEO_INTELLIGENCE_RESULTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own SEO intelligence results" ON seo_intelligence_results;
DROP POLICY IF EXISTS "Users can insert own SEO intelligence results" ON seo_intelligence_results;
DROP POLICY IF EXISTS "Users can update own SEO intelligence results" ON seo_intelligence_results;
DROP POLICY IF EXISTS "Users can delete own SEO intelligence results" ON seo_intelligence_results;

CREATE POLICY "Users can view own SEO intelligence results"
  ON seo_intelligence_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crawls
      WHERE crawls.id = seo_intelligence_results.crawl_id
      AND crawls.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own SEO intelligence results"
  ON seo_intelligence_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crawls
      WHERE crawls.id = seo_intelligence_results.crawl_id
      AND crawls.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own SEO intelligence results"
  ON seo_intelligence_results FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crawls
      WHERE crawls.id = seo_intelligence_results.crawl_id
      AND crawls.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crawls
      WHERE crawls.id = seo_intelligence_results.crawl_id
      AND crawls.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own SEO intelligence results"
  ON seo_intelligence_results FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crawls
      WHERE crawls.id = seo_intelligence_results.crawl_id
      AND crawls.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- SEO_ANALYSES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own SEO analyses" ON seo_analyses;
DROP POLICY IF EXISTS "Users can insert own SEO analyses" ON seo_analyses;
DROP POLICY IF EXISTS "Users can update own SEO analyses" ON seo_analyses;
DROP POLICY IF EXISTS "Users can delete own SEO analyses" ON seo_analyses;

CREATE POLICY "Users can view own SEO analyses"
  ON seo_analyses FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own SEO analyses"
  ON seo_analyses FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own SEO analyses"
  ON seo_analyses FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own SEO analyses"
  ON seo_analyses FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- SEO_ANALYSIS_RESULTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own SEO analysis results" ON seo_analysis_results;
DROP POLICY IF EXISTS "Users can insert own SEO analysis results" ON seo_analysis_results;
DROP POLICY IF EXISTS "Users can update own SEO analysis results" ON seo_analysis_results;
DROP POLICY IF EXISTS "Users can delete own SEO analysis results" ON seo_analysis_results;

CREATE POLICY "Users can view own SEO analysis results"
  ON seo_analysis_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seo_analyses
      WHERE seo_analyses.id = seo_analysis_results.seo_analysis_id
      AND seo_analyses.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own SEO analysis results"
  ON seo_analysis_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seo_analyses
      WHERE seo_analyses.id = seo_analysis_results.seo_analysis_id
      AND seo_analyses.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own SEO analysis results"
  ON seo_analysis_results FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seo_analyses
      WHERE seo_analyses.id = seo_analysis_results.seo_analysis_id
      AND seo_analyses.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seo_analyses
      WHERE seo_analyses.id = seo_analysis_results.seo_analysis_id
      AND seo_analyses.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own SEO analysis results"
  ON seo_analysis_results FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seo_analyses
      WHERE seo_analyses.id = seo_analysis_results.seo_analysis_id
      AND seo_analyses.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- CRAWL_CACHE TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can read own cached data" ON crawl_cache;
DROP POLICY IF EXISTS "Users can insert own cached data" ON crawl_cache;
DROP POLICY IF EXISTS "Users can update own cached data" ON crawl_cache;
DROP POLICY IF EXISTS "Users can delete own cached data" ON crawl_cache;

CREATE POLICY "Users can read own cached data"
  ON crawl_cache FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own cached data"
  ON crawl_cache FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own cached data"
  ON crawl_cache FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own cached data"
  ON crawl_cache FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- ASSET_AUDIT_RESULTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own asset audits" ON asset_audit_results;
DROP POLICY IF EXISTS "Users can insert their own asset audits" ON asset_audit_results;
DROP POLICY IF EXISTS "Users can update their own asset audits" ON asset_audit_results;
DROP POLICY IF EXISTS "Users can delete their own asset audits" ON asset_audit_results;

CREATE POLICY "Users can view their own asset audits"
  ON asset_audit_results FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own asset audits"
  ON asset_audit_results FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own asset audits"
  ON asset_audit_results FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own asset audits"
  ON asset_audit_results FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));
