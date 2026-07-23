import { useState, useRef, useEffect } from 'react';
import { Play, Globe, Save, Download, FileCode, X, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../hooks/useNotification';
import { scrapeUrl, mapSite, fetchTextFile } from '../../lib/firecrawl';
import { downloadHtmlFiles, DownloadProgress } from '../../lib/htmlDownload';
import { ModuleCard } from './ModuleCard';
import { RedirectTrackerResult } from './RedirectTracker';
import { RobotsCheckerResult } from './RobotsChecker';
import { CanonicalValidatorResult } from './CanonicalValidator';
import { DuplicateMetaFinderResult } from './DuplicateMetaFinder';
import { BrokenLinkCheckerResult } from './BrokenLinkChecker';
import { SchemaValidator, SchemaValidatorRef } from './SchemaValidator';
import { SchemaOrphanDetector, SchemaOrphanDetectorRef } from './SchemaOrphanDetector';
import { ThinContentDetector, ThinContentDetectorRef, ThinContentResult } from './ThinContentDetector';
import SocialMetaChecker, { SocialMetaCheckerRef } from './SocialMetaChecker';
import PaginationHreflangValidator, { PaginationHreflangValidatorRef } from './PaginationHreflangValidator';
import { ImageAnalyzer, ImageAnalyzerRef } from './ImageAnalyzer';
import { ImageUsageMapper, ImageUsageMapperRef } from './ImageUsageMapper';
import { LoadingModal } from '../LoadingModal';
import { ModuleSelector, AVAILABLE_MODULES } from './ModuleSelector';
import { UrlFilter, FilterConfig } from './UrlFilter';

interface ModuleState {
  loading: boolean;
  result: any;
  totalIssues: number;
}

interface ModuleStates {
  redirects: ModuleState;
  robots: ModuleState;
  canonical: ModuleState;
  duplicates: ModuleState;
  brokenlinks: ModuleState;
  schema: ModuleState;
  socialmeta: ModuleState;
  paginationhreflang: ModuleState;
  imageanalyzer: ModuleState;
  imageusagemapper: ModuleState;
  schemacleanup: ModuleState;
  thincontent: ModuleState;
}

interface SEOIntelligenceProps {
  savedAnalysisId?: string;
}

export function SEOIntelligence({ savedAnalysisId }: SEOIntelligenceProps = {}) {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [domain, setDomain] = useState<string>('');
  const [isCrawling, setIsCrawling] = useState(false);
  const [runningAll, setRunningAll] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [tokensUsed, setTokensUsed] = useState<number>(0);
  const [tokensCost, setTokensCost] = useState<number>(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [_isSaving] = useState(false);
  const [crawledPages, setCrawledPages] = useState<any[]>([]);
  const [hasCrawled, setHasCrawled] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  const abortControllerRef = useRef<AbortController | null>(null);
  const schemaValidatorRef = useRef<SchemaValidatorRef>(null);
  const socialMetaCheckerRef = useRef<SocialMetaCheckerRef>(null);
  const paginationHreflangValidatorRef = useRef<PaginationHreflangValidatorRef>(null);
  const imageAnalyzerRef = useRef<ImageAnalyzerRef>(null);
  const imageUsageMapperRef = useRef<ImageUsageMapperRef>(null);
  const schemaOrphanDetectorRef = useRef<SchemaOrphanDetectorRef>(null);
  const thinContentDetectorRef = useRef<ThinContentDetectorRef>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingCrawlData, setPendingCrawlData] = useState<{
    analysisId: string;
    urls: string[];
    totalPages: number;
    estimatedCost: number;
  } | null>(null);

  // Crawled URL selection for HTML download
  const [selectedCrawledUrls, setSelectedCrawledUrls] = useState<Set<string>>(new Set());
  const [showUrlTable, setShowUrlTable] = useState(false);
  const [htmlProgress, setHtmlProgress] = useState<DownloadProgress | null>(null);
  const htmlDownloadCancelRef = useRef(false);
  const [excludeThinPages, setExcludeThinPages] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>(AVAILABLE_MODULES.map(m => m.id));
  const [urlFilter, setUrlFilter] = useState<FilterConfig>({ mode: 'all', patterns: [], manualUrls: [] });
  const [maxPages, setMaxPages] = useState<number>(5000);
  const [modules, setModules] = useState<ModuleStates>({
    redirects: { loading: false, result: null, totalIssues: 0 },
    robots: { loading: false, result: null, totalIssues: 0 },
    canonical: { loading: false, result: null, totalIssues: 0 },
    duplicates: { loading: false, result: null, totalIssues: 0 },
    brokenlinks: { loading: false, result: null, totalIssues: 0 },
    schema: { loading: false, result: null, totalIssues: 0 },
    socialmeta: { loading: false, result: null, totalIssues: 0 },
    paginationhreflang: { loading: false, result: null, totalIssues: 0 },
    imageanalyzer: { loading: false, result: null, totalIssues: 0 },
    imageusagemapper: { loading: false, result: null, totalIssues: 0 },
    schemacleanup: { loading: false, result: null, totalIssues: 0 },
    thincontent: { loading: false, result: null, totalIssues: 0 },
  });

  useEffect(() => {
    console.log('SEO Intelligence - State changed:', {
      showConfirmModal,
      hasPendingData: !!pendingCrawlData,
      hasCrawled,
      crawledPagesCount: crawledPages.length,
      currentAnalysisId
    });
  }, [showConfirmModal, pendingCrawlData, hasCrawled, crawledPages, currentAnalysisId]);

  useEffect(() => {
    if (savedAnalysisId && user) {
      loadSavedAnalysis(savedAnalysisId);
    }
  }, [savedAnalysisId, user]);

  const loadSavedAnalysis = async (analysisId: string) => {
    try {
      const { data: analysis, error: analysisError } = await supabase
        .from('seo_analyses')
        .select('*')
        .eq('id', analysisId)
        .maybeSingle();

      if (analysisError) throw analysisError;
      if (!analysis) throw new Error('Analysis not found');

      setDomain(analysis.domain);
      setCurrentAnalysisId(analysis.id);
      setTokensUsed(analysis.tokens_used || 0);
      setTokensCost(analysis.tokens_cost || 0);
      setHasCrawled(true);

      const { data: results, error: resultsError } = await supabase
        .from('seo_analysis_results')
        .select('*')
        .eq('seo_analysis_id', analysisId);

      if (resultsError) throw resultsError;

      if (results && results.length > 0) {
        setCrawledPages([{ url: analysis.domain }]);

        results.forEach((result: any) => {
          const moduleName = result.module as keyof ModuleStates;
          if (modules[moduleName]) {
            updateModuleState(moduleName, {
              result: result.data,
              totalIssues: result.total_issues || 0,
              loading: false
            });
          }
        });
      }

      showSuccess('Loaded saved SEO analysis');
    } catch (err: any) {
      showError(err.message || 'Failed to load saved analysis');
    }
  };

  const updateModuleState = (moduleName: keyof ModuleStates, updates: Partial<ModuleState>) => {
    setModules((prev) => ({
      ...prev,
      [moduleName]: { ...prev[moduleName], ...updates },
    }));
  };

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) => {
      if (prev.includes(moduleId)) {
        return prev.filter((id) => id !== moduleId);
      } else {
        return [...prev, moduleId];
      }
    });
  };

  const matchUrlPattern = (url: string, pattern: string): boolean => {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
      'i'
    );
    return regex.test(url);
  };

  const saveModuleResultWithId = async (analysisId: string, moduleName: string, data: any, totalIssues: number, tokensUsed: number = 0) => {
    if (!analysisId) return;

    const tokensCost = tokensUsed * 0.001;

    const { error } = await supabase
      .from('seo_analysis_results')
      .upsert({
        seo_analysis_id: analysisId,
        module: moduleName,
        data,
        total_issues: totalIssues,
        tokens_used: tokensUsed,
        tokens_cost: tokensCost,
        status: 'completed',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'seo_analysis_id,module',
      });

    if (error) {
      console.error('Error saving module result:', error);
    }

    const newTotal = tokensUsed;
    setTokensUsed(prev => {
      const updated = prev + newTotal;
      return updated;
    });
    setTokensCost(prev => prev + tokensCost);

    const { data: analysis } = await supabase
      .from('seo_analyses')
      .select('tokens_used, tokens_cost')
      .eq('id', analysisId)
      .maybeSingle();

    if (analysis) {
      const newTokensUsed = (analysis.tokens_used || 0) + tokensUsed;
      const newTokensCost = newTokensUsed * 0.001;

      await supabase
        .from('seo_analyses')
        .update({
          tokens_used: newTokensUsed,
          tokens_cost: newTokensCost,
          updated_at: new Date().toISOString(),
        })
        .eq('id', analysisId);
    }
  };

  const runRedirectTracker = async (analysisId?: string, pages?: any[], showModal: boolean = false) => {
    const id = analysisId || currentAnalysisId;
    if (!id) return;

    const pagesToAnalyze = pages || crawledPages;
    if (pagesToAnalyze.length === 0) {
      updateModuleState('redirects', { loading: false, result: [], totalIssues: 0 });
      return;
    }

    if (showModal) {
      abortControllerRef.current = new AbortController();
      setShowLoadingModal(true);
      setLoadingMessage('Analyzing redirects...');
    }

    updateModuleState('redirects', { loading: true });

    try {
      const redirectData = [];

      for (const page of pagesToAnalyze) {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Operation cancelled by user');
        }

        try {
          const response = await fetch(page.url, { redirect: 'manual' });

          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            redirectData.push({
              url: page.url,
              finalUrl: location || page.url,
              chain: [response.status.toString()],
              hops: 1,
              isLoop: location === page.url,
            });
          }
        } catch (err) {
          console.error(`Error checking ${page.url}:`, err);
        }
      }

      const totalIssues = redirectData.filter(d => d.isLoop || d.hops > 2).length;
      const tokensUsed = redirectData.length;

      updateModuleState('redirects', { loading: false, result: redirectData, totalIssues });
      await saveModuleResultWithId(id, 'redirects', redirectData, totalIssues, tokensUsed);

      if (showModal) {
        showSuccess('Redirect analysis completed!');
      }
    } catch (err: any) {
      if (err.message !== 'Operation cancelled by user') {
        showError(err.message || 'Failed to analyze redirects');
      }
      updateModuleState('redirects', { loading: false, result: [], totalIssues: 0 });
    } finally {
      if (showModal) {
        setShowLoadingModal(false);
        abortControllerRef.current = null;
      }
    }
  };

  const runRobotsChecker = async (analysisId?: string, pages?: any[], showModal: boolean = false) => {
    const id = analysisId || currentAnalysisId;
    if (!id) return;

    const pagesToAnalyze = pages || crawledPages;
    if (pagesToAnalyze.length === 0) {
      updateModuleState('robots', { loading: false, result: { pages: [], robotsTxt: null, llmsTxt: null }, totalIssues: 0 });
      return;
    }

    if (showModal) {
      abortControllerRef.current = new AbortController();
      setShowLoadingModal(true);
      setLoadingMessage('Checking robots.txt and llms.txt...');
    }

    updateModuleState('robots', { loading: true });

    try {
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Operation cancelled by user');
      }

      const domainUrl = new URL(pagesToAnalyze[0].url);
      const baseUrl = `${domainUrl.protocol}//${domainUrl.hostname}`;

      // Fetch robots.txt
      const robotsTxtContent = await fetchTextFile(`${baseUrl}/robots.txt`);
      const robotsTxtExists = robotsTxtContent !== null;

      // Fetch llms.txt
      const llmsTxtContent = await fetchTextFile(`${baseUrl}/llms.txt`);
      const llmsTxtExists = llmsTxtContent !== null;

      // Parse robots.txt
      const robotsParsed = robotsTxtContent ? parseRobotsTxt(robotsTxtContent) : null;

      // Parse llms.txt
      const llmsParsed = llmsTxtContent ? parseLlmsTxt(llmsTxtContent) : null;

      // Generate suggested llms.txt if missing
      let suggestedLlmsTxt = null;
      if (!llmsTxtExists) {
        suggestedLlmsTxt = generateLlmsTxtTemplate(baseUrl, robotsParsed);
      }

      // Analyze pages
      const robotsData = await Promise.all(
        pagesToAnalyze.map(async (page) => {
          const metadata = page.metadata || {};
          const metaRobots = metadata.robots || 'index, follow';
          const isNoIndex = metaRobots.includes('noindex');

          return {
            url: page.url,
            indexable: !isNoIndex,
            reason: isNoIndex ? 'Meta robots noindex' : 'No restrictions',
            metaRobots,
            robotsDisallowed: false,
          };
        })
      );

      const result = {
        pages: robotsData,
        robotsTxt: {
          exists: robotsTxtExists,
          content: robotsTxtContent,
          parsed: robotsParsed,
        },
        llmsTxt: {
          exists: llmsTxtExists,
          content: llmsTxtContent,
          parsed: llmsParsed,
          suggested: suggestedLlmsTxt,
        },
        comparison: compareTxtFiles(robotsParsed, llmsParsed),
      };

      const totalIssues = robotsData.filter(d => !d.indexable).length + (!llmsTxtExists ? 1 : 0);
      const tokensUsed = robotsData.length;

      updateModuleState('robots', { loading: false, result, totalIssues });
      await saveModuleResultWithId(id, 'robots', result, totalIssues, tokensUsed);

      if (showModal) {
        showSuccess('Robots.txt and llms.txt analysis completed!');
      }
    } catch (err: any) {
      if (err.message !== 'Operation cancelled by user') {
        showError(err.message || 'Failed to analyze robots');
      }
      updateModuleState('robots', { loading: false, result: { pages: [], robotsTxt: null, llmsTxt: null }, totalIssues: 0 });
    } finally {
      if (showModal) {
        setShowLoadingModal(false);
        abortControllerRef.current = null;
      }
    }
  };

  const parseRobotsTxt = (content: string) => {
    const lines = content.split('\n');
    const userAgents: string[] = [];
    const disallows: string[] = [];
    const allows: string[] = [];
    const sitemaps: string[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('User-agent:')) {
        userAgents.push(trimmed.substring(11).trim());
      } else if (trimmed.startsWith('Disallow:')) {
        disallows.push(trimmed.substring(9).trim());
      } else if (trimmed.startsWith('Allow:')) {
        allows.push(trimmed.substring(6).trim());
      } else if (trimmed.startsWith('Sitemap:')) {
        sitemaps.push(trimmed.substring(8).trim());
      }
    });

    return { userAgents, disallows, allows, sitemaps };
  };

  const parseLlmsTxt = (content: string) => {
    const lines = content.split('\n');
    const userAgents: string[] = [];
    const disallows: string[] = [];
    const allows: string[] = [];
    const policies: string[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('User-agent:')) {
        userAgents.push(trimmed.substring(11).trim());
      } else if (trimmed.startsWith('Disallow:')) {
        disallows.push(trimmed.substring(9).trim());
      } else if (trimmed.startsWith('Allow:')) {
        allows.push(trimmed.substring(6).trim());
      } else if (trimmed.startsWith('Policy:')) {
        policies.push(trimmed.substring(7).trim());
      }
    });

    return { userAgents, disallows, allows, policies };
  };

  const generateLlmsTxtTemplate = (baseUrl: string, robotsParsed: any) => {
    let template = `# llms.txt - LLM Crawling Policy\n`;
    template += `# Learn more at https://llmstxt.org\n\n`;

    if (robotsParsed && robotsParsed.disallows.length > 0) {
      template += `# Based on your robots.txt, consider these restrictions for AI crawlers:\n`;
      template += `User-agent: *\n`;
      robotsParsed.disallows.forEach((path: string) => {
        if (path) template += `Disallow: ${path}\n`;
      });
    } else {
      template += `# Example: Allow all AI crawlers\n`;
      template += `User-agent: *\n`;
      template += `Allow: /\n`;
    }

    template += `\n# Optional: Link to your AI/LLM usage policy\n`;
    template += `# Policy: ${baseUrl}/ai-policy`;

    return template;
  };

  const compareTxtFiles = (robotsParsed: any, llmsParsed: any) => {
    if (!robotsParsed || !llmsParsed) return null;

    const differences: string[] = [];

    // Compare disallow rules
    const robotsDisallows = new Set(robotsParsed.disallows);
    const llmsDisallows = new Set(llmsParsed.disallows);

    robotsDisallows.forEach(rule => {
      if (!llmsDisallows.has(rule)) {
        differences.push(`robots.txt blocks "${rule}" but llms.txt doesn't`);
      }
    });

    llmsDisallows.forEach(rule => {
      if (!robotsDisallows.has(rule)) {
        differences.push(`llms.txt blocks "${rule}" but robots.txt doesn't`);
      }
    });

    return {
      hasDifferences: differences.length > 0,
      differences,
      robotsRulesCount: robotsParsed.disallows.length + robotsParsed.allows.length,
      llmsRulesCount: llmsParsed.disallows.length + llmsParsed.allows.length,
    };
  };

  const runCanonicalValidator = async (analysisId?: string, pages?: any[], showModal: boolean = false) => {
    const id = analysisId || currentAnalysisId;
    if (!id) return;

    const pagesToAnalyze = pages || crawledPages;
    if (pagesToAnalyze.length === 0) {
      updateModuleState('canonical', { loading: false, result: [], totalIssues: 0 });
      return;
    }

    if (showModal) {
      abortControllerRef.current = new AbortController();
      setShowLoadingModal(true);
      setLoadingMessage('Validating canonical tags...');
    }

    updateModuleState('canonical', { loading: true });

    try {
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Operation cancelled by user');
      }

      const canonicalData = pagesToAnalyze.map((page) => {
        const metadata = page.metadata || {};
        const canonicalUrl = metadata.canonical || page.url;
        const hasMismatch = canonicalUrl !== page.url;

        return {
          url: page.url,
          canonicalUrl,
          hasMismatch,
          issue: hasMismatch ? 'Canonical points to different URL' : undefined,
        };
      });

      const totalIssues = canonicalData.filter(d => d.hasMismatch).length;
      const tokensUsed = canonicalData.length;

      updateModuleState('canonical', { loading: false, result: canonicalData, totalIssues });
      await saveModuleResultWithId(id, 'canonical', canonicalData, totalIssues, tokensUsed);

      if (showModal) {
        showSuccess('Canonical validation completed!');
      }
    } catch (err: any) {
      if (err.message !== 'Operation cancelled by user') {
        showError(err.message || 'Failed to analyze canonical tags');
      }
      updateModuleState('canonical', { loading: false, result: [], totalIssues: 0 });
    } finally {
      if (showModal) {
        setShowLoadingModal(false);
        abortControllerRef.current = null;
      }
    }
  };

  const runDuplicateMetaFinder = async (analysisId?: string, pages?: any[], showModal: boolean = false) => {
    const id = analysisId || currentAnalysisId;
    if (!id) return;

    const pagesToAnalyze = pages || crawledPages;
    if (pagesToAnalyze.length === 0) {
      updateModuleState('duplicates', { loading: false, result: [], totalIssues: 0 });
      return;
    }

    if (showModal) {
      abortControllerRef.current = new AbortController();
      setShowLoadingModal(true);
      setLoadingMessage('Finding duplicate meta tags...');
    }

    updateModuleState('duplicates', { loading: true });

    try {
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Operation cancelled by user');
      }

      const titleMap = new Map<string, string[]>();
      const descriptionMap = new Map<string, string[]>();

      pagesToAnalyze.forEach((page) => {
        const metadata = page.metadata || {};
        const title = metadata.title || '';
        const description = metadata.description || '';

        if (title) {
          if (!titleMap.has(title)) titleMap.set(title, []);
          titleMap.get(title)!.push(page.url);
        }

        if (description) {
          if (!descriptionMap.has(description)) descriptionMap.set(description, []);
          descriptionMap.get(description)!.push(page.url);
        }
      });

      const duplicates = [
        ...Array.from(titleMap.entries())
          .filter(([_, urls]) => urls.length > 1)
          .map(([value, urls]) => ({ value, type: 'title' as const, urls, count: urls.length })),
        ...Array.from(descriptionMap.entries())
          .filter(([_, urls]) => urls.length > 1)
          .map(([value, urls]) => ({ value, type: 'description' as const, urls, count: urls.length })),
      ];

      const totalIssues = duplicates.reduce((sum, d) => sum + d.count - 1, 0);
      const tokensUsed = pagesToAnalyze.length;

      updateModuleState('duplicates', { loading: false, result: duplicates, totalIssues });
      await saveModuleResultWithId(id, 'duplicates', duplicates, totalIssues, tokensUsed);

      if (showModal) {
        showSuccess('Duplicate meta analysis completed!');
      }
    } catch (err: any) {
      if (err.message !== 'Operation cancelled by user') {
        showError(err.message || 'Failed to analyze duplicate meta');
      }
      updateModuleState('duplicates', { loading: false, result: [], totalIssues: 0 });
    } finally {
      if (showModal) {
        setShowLoadingModal(false);
        abortControllerRef.current = null;
      }
    }
  };

  const runBrokenLinkChecker = async (analysisId?: string, pages?: any[], showModal: boolean = false) => {
    const id = analysisId || currentAnalysisId;
    if (!id) return;

    const pagesToAnalyze = pages || crawledPages;
    if (pagesToAnalyze.length === 0) {
      updateModuleState('brokenlinks', { loading: false, result: [], totalIssues: 0 });
      return;
    }

    if (showModal) {
      abortControllerRef.current = new AbortController();
      setShowLoadingModal(true);
      setLoadingMessage('Checking broken links...');
    }

    updateModuleState('brokenlinks', { loading: true });

    try {
      const brokenLinks = [];
      const checkedLinks = new Set<string>();

      // Create a map of crawled URLs (normalized, case-insensitive) and their status codes
      const urlStatusMap = new Map<string, number>();
      pagesToAnalyze.forEach(page => {
        try {
          const pageUrl = new URL(page.url);
          const normalized = pageUrl.href.toLowerCase().replace(/\/$/, '');
          urlStatusMap.set(normalized, page.metadata?.statusCode || 200);
          // Also add with trailing slash
          urlStatusMap.set(normalized + '/', page.metadata?.statusCode || 200);
        } catch (err) {
          // Invalid URL, skip
        }
      });


      for (const page of pagesToAnalyze) {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Operation cancelled by user');
        }

        const links = page.links || [];
        const pageUrlObj = new URL(page.url);
        const baseDomain = pageUrlObj.hostname.toLowerCase();


        for (const link of links) {
          try {
            // Links might be strings or objects with href property
            const linkStr = typeof link === 'string' ? link : link?.href || link?.url;
            if (!linkStr) continue;

            // Handle both absolute and relative URLs
            const linkUrl = new URL(linkStr, page.url);

            // Only check internal links (same domain)
            if (linkUrl.hostname.toLowerCase() !== baseDomain) continue;

            // Normalize for deduplication (case-insensitive)
            const normalizedForCheck = linkUrl.href.toLowerCase().replace(/\/$/, '');
            if (checkedLinks.has(normalizedForCheck)) continue;
            checkedLinks.add(normalizedForCheck);

            // Check if this link was in our crawl (try both with and without trailing slash)
            const status = urlStatusMap.get(normalizedForCheck) || urlStatusMap.get(normalizedForCheck + '/');

            // Only report links with actual error status codes (400+)
            // Skip links that weren't crawled (status is undefined)
            if (status && status >= 400) {
              brokenLinks.push({
                sourceUrl: page.url,
                link: linkUrl.href,
                statusCode: status,
                statusText: status === 404 ? 'Not Found' : `Error ${status}`,
              });
            }
          } catch (err) {
            // Invalid URL, skip it
            continue;
          }
        }
      }

      const totalIssues = brokenLinks.length;
      const tokensUsed = checkedLinks.size;

      updateModuleState('brokenlinks', { loading: false, result: brokenLinks, totalIssues });
      await saveModuleResultWithId(id, 'brokenlinks', brokenLinks, totalIssues, tokensUsed);

      if (showModal) {
        showSuccess('Broken link check completed!');
      }
    } catch (err: any) {
      if (err.message !== 'Operation cancelled by user') {
        showError(err.message || 'Failed to check broken links');
      }
      updateModuleState('brokenlinks', { loading: false, result: [], totalIssues: 0 });
    } finally {
      if (showModal) {
        setShowLoadingModal(false);
        abortControllerRef.current = null;
      }
    }
  };


  const handleCancelOperation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setShowLoadingModal(false);
    setIsCrawling(false);
    setRunningAll(false);
    showError('Operation cancelled by user');
  };

  const startCrawl = async () => {
    if (!domain.trim()) {
      showError('Please enter a domain first');
      return;
    }

    abortControllerRef.current = new AbortController();
    setIsCrawling(true);
    setShowLoadingModal(true);
    setLoadingMessage('Starting site crawl...');
    setHasCrawled(false);
    setCrawledPages([]);
    setModules({
      redirects: { loading: false, result: null, totalIssues: 0 },
      robots: { loading: false, result: null, totalIssues: 0 },
      canonical: { loading: false, result: null, totalIssues: 0 },
      duplicates: { loading: false, result: null, totalIssues: 0 },
      brokenlinks: { loading: false, result: null, totalIssues: 0 },
      schema: { loading: false, result: null, totalIssues: 0 },
      socialmeta: { loading: false, result: null, totalIssues: 0 },
      paginationhreflang: { loading: false, result: null, totalIssues: 0 },
      imageanalyzer: { loading: false, result: null, totalIssues: 0 },
      imageusagemapper: { loading: false, result: null, totalIssues: 0 },
      schemacleanup: { loading: false, result: null, totalIssues: 0 },
      thincontent: { loading: false, result: null, totalIssues: 0 },
    });

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+)/, '$3-$1-$2 $4:$5');

    const autoName = `SEO: ${cleanDomain} ${timestamp}`;

    try {
      console.log('SEO Intelligence - Starting crawl with user:', { userId: user?.id, domain: cleanDomain });

      if (!user || !user.id) {
        throw new Error('User not authenticated. Please refresh the page and try again.');
      }

      const { data: analysis, error: analysisError } = await supabase
        .from('seo_analyses')
        .insert({
          user_id: user.id,
          domain: cleanDomain,
          name: autoName,
          tokens_used: 0,
          tokens_cost: 0,
        })
        .select()
        .single();

      console.log('SEO Intelligence - Database insert result:', { analysis, analysisError });

      if (analysisError) throw analysisError;

      if (!analysis || !analysis.id) {
        throw new Error('Failed to create analysis record in database.');
      }

      const analysisId = analysis.id;
      setCurrentAnalysisId(analysisId);
      setTokensUsed(0);
      setTokensCost(0);

      setLoadingMessage('Mapping site with Web-Scrapper...');

      const fullDomain = cleanDomain.startsWith('http') ? cleanDomain : `https://${cleanDomain}`;

      const mapResult = await mapSite(fullDomain, maxPages);

      if (!mapResult || !mapResult.success || !mapResult.links || mapResult.links.length === 0) {
        throw new Error('No pages found on the domain. Make sure the domain is accessible.');
      }

      let discoveredUrls = mapResult.links;

      if (urlFilter.mode === 'manual') {
        discoveredUrls = urlFilter.manualUrls;
      } else if (urlFilter.mode === 'include') {
        discoveredUrls = discoveredUrls.filter((url: string) =>
          urlFilter.patterns.some(pattern => matchUrlPattern(url, pattern))
        );
      } else if (urlFilter.mode === 'exclude') {
        discoveredUrls = discoveredUrls.filter((url: string) =>
          !urlFilter.patterns.some(pattern => matchUrlPattern(url, pattern))
        );
      }

      // Limit to maxPages
      discoveredUrls = discoveredUrls.slice(0, maxPages);

      const totalPages = discoveredUrls.length;

      if (totalPages === 0) {
        throw new Error('No pages matched your filter criteria');
      }

      const needsFullScrape = selectedModules.some(moduleId => {
        const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
        return module?.requiresFullScrape;
      });

      const estimatedCost = needsFullScrape ? (totalPages * 0.001) : 0;

      console.log('SEO Intelligence - About to show confirm modal:', {
        totalPages,
        estimatedCost,
        analysisId,
        urlsCount: discoveredUrls.length
      });

      setShowLoadingModal(false);
      setIsCrawling(false);

      const crawlData = {
        analysisId,
        urls: discoveredUrls,
        totalPages,
        estimatedCost,
      };

      setPendingCrawlData(crawlData);

      console.log('SEO Intelligence - Setting showConfirmModal to true');
      setShowConfirmModal(true);

      console.log('SEO Intelligence - Confirm modal should now be visible');

      return;
    } catch (err: any) {
      if (err.message !== 'Operation cancelled by user') {
        showError(err.message || 'Failed to crawl site');
      }
      setCurrentAnalysisId(null);
    } finally {
      setIsCrawling(false);
      setShowLoadingModal(false);
      abortControllerRef.current = null;
    }
  };

  const runAllModules = async () => {
    if (!currentAnalysisId || crawledPages.length === 0) {
      showError('Please crawl the site first');
      return;
    }

    if (selectedModules.length === 0) {
      showError('Please select at least one module to run');
      return;
    }

    abortControllerRef.current = new AbortController();
    setRunningAll(true);
    setShowLoadingModal(true);
    setLoadingMessage(`Running ${selectedModules.length} selected module${selectedModules.length > 1 ? 's' : ''}...`);

    try {
      if (selectedModules.includes('redirects')) {
        setLoadingMessage('Analyzing redirects...');
        await runRedirectTracker(currentAnalysisId, crawledPages);
        if (abortControllerRef.current?.signal.aborted) throw new Error('Operation cancelled by user');
      }

      if (selectedModules.includes('robots')) {
        setLoadingMessage('Checking robots.txt...');
        await runRobotsChecker(currentAnalysisId, crawledPages);
        if (abortControllerRef.current?.signal.aborted) throw new Error('Operation cancelled by user');
      }

      if (selectedModules.includes('canonical')) {
        setLoadingMessage('Validating canonical tags...');
        await runCanonicalValidator(currentAnalysisId, crawledPages);
        if (abortControllerRef.current?.signal.aborted) throw new Error('Operation cancelled by user');
      }

      if (selectedModules.includes('duplicates')) {
        setLoadingMessage('Finding duplicate meta...');
        await runDuplicateMetaFinder(currentAnalysisId, crawledPages);
        if (abortControllerRef.current?.signal.aborted) throw new Error('Operation cancelled by user');
      }

      if (selectedModules.includes('brokenlinks')) {
        setLoadingMessage('Checking broken links...');
        await runBrokenLinkChecker(currentAnalysisId, crawledPages);
        if (abortControllerRef.current?.signal.aborted) throw new Error('Operation cancelled by user');
      }

      if (selectedModules.includes('schema')) {
        setLoadingMessage('Validating schema...');
        if (schemaValidatorRef.current) {
          await schemaValidatorRef.current.runAnalysis();
        }
        if (abortControllerRef.current?.signal.aborted) throw new Error('Operation cancelled by user');
      }

      if (selectedModules.includes('schemacleanup')) {
        setLoadingMessage('Detecting schema orphans...');
        if (schemaOrphanDetectorRef.current) {
          await schemaOrphanDetectorRef.current.runAnalysis();
        }
        if (abortControllerRef.current?.signal.aborted) throw new Error('Operation cancelled by user');
      }

      if (selectedModules.includes('thincontent')) {
        setLoadingMessage('Detecting thin content...');
        if (thinContentDetectorRef.current) {
          await thinContentDetectorRef.current.runAnalysis();
        }
        if (abortControllerRef.current?.signal.aborted) throw new Error('Operation cancelled by user');
      }

      if (selectedModules.includes('socialmeta')) {
        setLoadingMessage('Checking social meta tags...');
        if (socialMetaCheckerRef.current) {
          await socialMetaCheckerRef.current.runAnalysis();
        }
        if (abortControllerRef.current?.signal.aborted) throw new Error('Operation cancelled by user');
      }

      if (selectedModules.includes('paginationhreflang')) {
        setLoadingMessage('Validating pagination and hreflang...');
        console.log('SEOIntelligence: Running paginationhreflang module', {
          refExists: !!paginationHreflangValidatorRef.current,
          crawledPagesCount: crawledPages.length
        });
        if (paginationHreflangValidatorRef.current) {
          await paginationHreflangValidatorRef.current.runAnalysis();
        } else {
          console.error('SEOIntelligence: paginationHreflangValidatorRef.current is null');
        }
        if (abortControllerRef.current?.signal.aborted) throw new Error('Operation cancelled by user');
      }

      showSuccess(`All ${selectedModules.length} selected module${selectedModules.length > 1 ? 's' : ''} completed!`);
    } catch (err: any) {
      if (err.message !== 'Operation cancelled by user') {
        showError(err.message || 'Failed to run analysis');
      }
    } finally {
      setRunningAll(false);
      setShowLoadingModal(false);
      abortControllerRef.current = null;
    }
  };

  const confirmAndProceedCrawl = async () => {
    console.log('SEO Intelligence - confirmAndProceedCrawl called', { pendingCrawlData });

    if (!pendingCrawlData) {
      console.error('SEO Intelligence - No pending crawl data!');
      return;
    }

    console.log('SEO Intelligence - Proceeding with crawl');

    setShowConfirmModal(false);
    setIsCrawling(true);
    setShowLoadingModal(true);
    setLoadingMessage('Starting to scrape pages...');
    abortControllerRef.current = new AbortController();

    const { analysisId, urls } = pendingCrawlData;

    const needsFullScrape = selectedModules.some(moduleId => {
      const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
      return module?.requiresFullScrape;
    });

    if (needsFullScrape) {
      setLoadingMessage('Starting full page scraping...');
    } else {
      setLoadingMessage('Starting basic page checks...');
    }

    const pages: any[] = [];

    try {
      const crawledUrls = new Set<string>();
      const urlQueue = [...urls];

      let scrapedCount = 0;

      while (urlQueue.length > 0) {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Operation cancelled by user');
        }

        const url = urlQueue.shift()!;

        const normalizedUrl = url.toLowerCase().replace(/\/$/, '');
        if (crawledUrls.has(normalizedUrl)) continue;
        crawledUrls.add(normalizedUrl);

        try {
          if (needsFullScrape) {
            try {
              const scrapeData = await scrapeUrl(url);
              if (scrapeData && scrapeData.success && scrapeData.data) {
                const pageData = {
                  url: url,
                  metadata: scrapeData.data.metadata || {},
                  links: scrapeData.data.links || [],
                };
                pages.push(pageData);
                scrapedCount++;

                if (scrapedCount % 5 === 0 || urlQueue.length > 0) {
                  setLoadingMessage(`Scraped ${scrapedCount} of ${urls.length} pages...`);
                }
              }
            } catch (scrapeErr) {
              console.error(`Failed to scrape ${url}, adding with basic data:`, scrapeErr);
              const pageData = {
                url: url,
                metadata: {},
                links: [],
              };
              pages.push(pageData);
              scrapedCount++;
            }
          } else {
            const pageData = {
              url: url,
              metadata: {},
              links: [],
            };
            pages.push(pageData);
            scrapedCount++;

            if (scrapedCount % 10 === 0 || urlQueue.length > 0) {
              setLoadingMessage(`Checked ${scrapedCount} of ${urls.length} URLs...`);
            }
          }
        } catch (err) {
          console.error(`Failed to process ${url}:`, err);
        }
      }

      if (pages.length === 0) {
        throw new Error('No pages could be scraped. The site may be blocking requests.');
      }

      console.log('SEO Intelligence - Crawl successful, setting state:', {
        pagesCount: pages.length,
        analysisId
      });

      setCrawledPages(pages);
      setHasCrawled(true);
      setCurrentAnalysisId(analysisId);

      console.log('SEO Intelligence - State updated, hasCrawled should be true');

      showSuccess(`Crawl complete! Found ${pages.length} pages. Click "Run X Selected Modules" below to analyze.`);
    } catch (err: any) {
      if (err.message !== 'Operation cancelled by user') {
        showError(err.message || 'Failed to crawl site');
      }
      // If we have partial results, still allow analysis
      if (pages.length > 0) {
        setCrawledPages(pages);
        setHasCrawled(true);
        setCurrentAnalysisId(analysisId);
        showError(`Crawl incomplete but found ${pages.length} pages. You can still run analysis on these.`);
      } else {
        setCurrentAnalysisId(null);
      }
    } finally {
      setIsCrawling(false);
      setShowLoadingModal(false);
      abortControllerRef.current = null;
      setPendingCrawlData(null);
    }
  };

  const cancelCrawl = () => {
    setShowConfirmModal(false);
    setPendingCrawlData(null);
    setCurrentAnalysisId(null);
    showError('Crawl cancelled');
  };

  const toggleCrawledUrl = (url: string) => {
    setSelectedCrawledUrls(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const toggleSelectAllCrawled = () => {
    if (selectedCrawledUrls.size === crawledPages.length) {
      setSelectedCrawledUrls(new Set());
    } else {
      setSelectedCrawledUrls(new Set(crawledPages.map(p => p.url)));
    }
  };

  const exportCrawledUrlsCSV = () => {
    const urls = selectedCrawledUrls.size > 0
      ? crawledPages.filter(p => selectedCrawledUrls.has(p.url)).map(p => p.url)
      : crawledPages.map(p => p.url);
    if (urls.length === 0) return;
    const csv = 'URL\n' + urls.map(u => `"${u}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    const ts = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    a.download = `${domain}-crawled-urls-${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  };

  const normalizeUrl = (u: string) => {
    try {
      const url = new URL(u);
      const path = url.pathname.replace(/\/+$/, '');
      return (url.origin + path).toLowerCase();
    } catch {
      return u.replace(/\/+$/, '').toLowerCase();
    }
  };

  const startHtmlDownload = async () => {
    let urls = Array.from(selectedCrawledUrls);
    if (urls.length === 0) return;

    if (excludeThinPages && modules.thincontent.result) {
      const thinResults = modules.thincontent.result as ThinContentResult[];
      const thinOrEmptyUrls = new Set(
        thinResults
          .filter(r => r.verdict === 'THIN' || r.verdict === 'EMPTY')
          .map(r => normalizeUrl(r.url))
      );
      urls = urls.filter(u => !thinOrEmptyUrls.has(normalizeUrl(u)));
      if (urls.length === 0) {
        alert('All selected URLs were filtered out as thin/empty pages.');
        return;
      }
    }

    htmlDownloadCancelRef.current = false;
    setHtmlProgress({ current: 0, total: urls.length, succeeded: 0, failed: 0, retrying: 0, done: false });
    await downloadHtmlFiles(urls, domain || 'site', setHtmlProgress, htmlDownloadCancelRef);
  };

  const convertDataToCSV = (moduleName: string, data: any[], includeHeader: boolean = true): string | null => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    // Filter out any null/undefined entries
    const validData = data.filter(item => item && typeof item === 'object');

    if (validData.length === 0) {
      return null;
    }

    let csv = '';

    if (includeHeader) {
      csv = `\n"=== ${moduleName.toUpperCase()} ==="\n\n`;
    }

    const headers = Object.keys(validData[0]);
    csv += headers.join(',') + '\n';

    validData.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return '""';
        if (Array.isArray(value)) return `"${value.join('; ')}"`;
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csv += values.join(',') + '\n';
    });

    return csv;
  };

  const exportAll = async () => {
    console.log('=== EXPORT ALL CALLED ===');
    console.log('Current analysisId:', currentAnalysisId);

    if (!currentAnalysisId) {
      showError('No analysis loaded');
      return;
    }

    // Load results from BOTH tables
    const [analysisResults, intelligenceResults] = await Promise.all([
      supabase
        .from('seo_analysis_results')
        .select('*')
        .eq('seo_analysis_id', currentAnalysisId),
      supabase
        .from('seo_intelligence_results')
        .select('*')
        .eq('crawl_id', currentAnalysisId)
    ]);

    console.log('Results from seo_analysis_results:', analysisResults.data);
    console.log('Results from seo_intelligence_results:', intelligenceResults.data);

    const allResults = [
      ...(analysisResults.data || []),
      ...(intelligenceResults.data || []).map((r: any) => ({
        module: r.module,
        data: r.data?.results || r.data
      }))
    ];

    console.log('Combined results:', allResults);

    if (allResults.length === 0) {
      showError('No results to export');
      return;
    }

    let combinedCSV = `"SEO Intelligence Analysis Report"\n"Domain: ${domain || 'N/A'}"\n"Generated: ${new Date().toISOString()}"\n`;
    let sectionCount = 0;

    // Module name mapping for better labels
    const moduleNames: Record<string, string> = {
      redirects: 'Redirects',
      robots: 'Robots',
      canonical: 'Canonical',
      duplicates: 'Duplicates',
      brokenlinks: 'Broken Links',
      schema: 'Schema Validation',
      schema_validator: 'Schema Validation',
      socialmeta: 'Social Meta',
      social_meta: 'Social Meta',
      paginationhreflang: 'Pagination & Hreflang',
      pagination_hreflang: 'Pagination & Hreflang',
      imageanalyzer: 'Image Analysis',
      image_analyzer: 'Image Analysis',
      imageusagemapper: 'Image Usage',
      image_usage: 'Image Usage',
      schemacleanup: 'Schema Cleanup',
      schema_cleanup: 'Schema Cleanup',
      thincontent: 'Thin Content',
      thin_content: 'Thin Content',
    };

    // Loop through all results from both tables
    allResults.forEach((result: any) => {
      const moduleName = moduleNames[result.module] || result.module;
      let data = result.data;

      console.log(`Processing module ${result.module}:`, {
        hasData: !!data,
        type: typeof data,
        isArray: Array.isArray(data),
        isObject: typeof data === 'object',
        length: Array.isArray(data) ? data.length : 'not array'
      });

      // Handle different data formats
      if (data) {
        // If it's an object but not an array, convert to array with single item
        if (typeof data === 'object' && !Array.isArray(data)) {
          console.log(`Converting object to array for ${result.module}`);
          data = [data];
        }

        if (Array.isArray(data)) {
          if (data.length > 0) {
            const csv = convertDataToCSV(moduleName, data, true);
            console.log(`Generated CSV for ${result.module}:`, csv ? 'success' : 'failed');
            if (csv) {
              combinedCSV += csv;
              sectionCount++;
            }
          } else {
            // Empty array - no issues found
            combinedCSV += `\n"=== ${moduleName.toUpperCase()} ==="\n\nNo issues found.\n`;
            sectionCount++;
          }
        }
      }
    });

    console.log('Total sections exported:', sectionCount);

    if (sectionCount === 0) {
      showError('No results available to export');
      return;
    }

    // Download the combined CSV
    const blob = new Blob([combinedCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    a.download = `${domain}-seo-analysis-${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showSuccess(`Exported combined analysis with ${sectionCount} section(s)!`);
  };

  const totalIssues = Object.values(modules).reduce((sum, m) => sum + m.totalIssues, 0);
  const completedModules = Object.values(modules).filter(m => m.result !== null).length;

  if (!user) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <div className="bg-white  shadow-sm border border-neutral-200 p-8">
          <p className="text-neutral-600">Please log in to access SEO Intelligence.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="p-8 mb-8">

        <div className="space-y-6">
          <div>
            <label htmlFor="seo-domain" className="block text-sm font-medium text-neutral-900 mb-2">
              Website Domain
            </label>
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="seo-domain"
                  type="text"
                  placeholder="example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  disabled={isCrawling || hasCrawled}
                  className="w-full pl-10 pr-4 py-3  border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent disabled:bg-neutral-50 disabled:text-neutral-500 transition-colors"
                />
              </div>
              <button
                onClick={startCrawl}
                disabled={isCrawling || hasCrawled || !domain.trim()}
                className="px-6 py-3 bg-neutral-900 text-white  font-medium hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
              >
                {isCrawling ? (
                  <>
                    <Globe className="w-4 h-4 animate-spin" />
                    <span>Crawling...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>Start Crawl</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {domain.trim() && !hasCrawled && (
            <div className="p-6 bg-white border border-neutral-200">
              <div className="space-y-3">
                <label htmlFor="maxPages" className="block text-sm font-medium text-neutral-900">
                  Maximum Pages to Discover
                </label>
                <p className="text-xs text-neutral-600">
                  Limit how many URLs Firecrawl will discover during the initial site mapping
                </p>
                <input
                  id="maxPages"
                  type="number"
                  min="1"
                  max="10000"
                  value={maxPages}
                  onChange={(e) => setMaxPages(parseInt(e.target.value) || 5000)}
                  disabled={isCrawling}
                  className="w-full px-4 py-2 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 disabled:bg-neutral-50"
                />
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Recommended: 50-500 for most sites</span>
                  <span>Max: 10,000</span>
                </div>
              </div>
            </div>
          )}

          {domain.trim() && (
            <div className="space-y-6">
              <div className="p-6 bg-white border border-neutral-200">
                <ModuleSelector
                  selectedModules={selectedModules}
                  onToggleModule={toggleModule}
                  onSelectAll={() => setSelectedModules(AVAILABLE_MODULES.map(m => m.id))}
                  onUnselectAll={() => setSelectedModules([])}
                  disabled={isCrawling || runningAll}
                />
              </div>

              {!hasCrawled && (
                <div className="p-6 bg-white border border-neutral-200">
                  <UrlFilter
                    onApplyFilter={setUrlFilter}
                    disabled={isCrawling}
                  />
                </div>
              )}
            </div>
          )}

          {hasCrawled && crawledPages.length > 0 && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border-2 border-green-600 ">
                <p className="text-sm font-bold text-green-900">
                  ✓ Crawl Complete: Found {crawledPages.length} pages
                </p>
                <p className="text-xs text-green-800 mt-1">
                  Ready for analysis! Click the button below to run {selectedModules.length} selected module{selectedModules.length !== 1 ? 's' : ''}, or run modules individually.
                </p>
              </div>

              {/* Crawled URLs table */}
              <div className="border border-neutral-200 bg-white">
                <button
                  onClick={() => setShowUrlTable(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <span>Crawled URLs ({crawledPages.length})</span>
                  {showUrlTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showUrlTable && (
                  <>
                    {/* Table toolbar */}
                    <div className="flex items-center justify-between px-4 py-2 border-t border-neutral-100 bg-neutral-50">
                      <div className="flex items-center gap-2">
                        <button onClick={toggleSelectAllCrawled} className="text-neutral-500 hover:text-neutral-800">
                          {selectedCrawledUrls.size === crawledPages.length
                            ? <CheckSquare className="w-4 h-4" />
                            : <Square className="w-4 h-4" />}
                        </button>
                        <span className="text-xs text-neutral-600">
                          {selectedCrawledUrls.size > 0
                            ? `${selectedCrawledUrls.size} selected`
                            : 'Select all'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={exportCrawledUrlsCSV}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export CSV
                        </button>
                        <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 cursor-pointer select-none transition-colors rounded">
                          <input
                            type="checkbox"
                            checked={excludeThinPages}
                            onChange={e => setExcludeThinPages(e.target.checked)}
                            className="w-3.5 h-3.5 accent-neutral-900"
                          />
                          Exclude empty/thin
                        </label>
                        {excludeThinPages && !modules.thincontent.result && (
                          <span className="text-xs text-amber-600 font-medium">Run Thin Content Detector first</span>
                        )}
                        <button
                          onClick={startHtmlDownload}
                          disabled={selectedCrawledUrls.size === 0 || (!!htmlProgress && !htmlProgress.done)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 border border-neutral-900 hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <FileCode className="w-3.5 h-3.5" />
                          Download HTML
                        </button>
                      </div>
                    </div>

                    {/* Progress panel */}
                    {htmlProgress && (
                      <div className="px-4 py-3 border-t border-neutral-100 bg-blue-50">
                        {htmlProgress.done ? (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-neutral-700">{htmlProgress.summary}</span>
                            <button
                              onClick={() => setHtmlProgress(null)}
                              className="p-1 text-neutral-400 hover:text-neutral-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm text-neutral-700">
                                  Downloading {htmlProgress.current} of {htmlProgress.total}…
                                </span>
                                {htmlProgress.retrying > 0 && (
                                  <span className="ml-2 text-xs text-amber-600 font-medium">
                                    retrying {htmlProgress.retrying}…
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-neutral-500">
                                <span>{htmlProgress.succeeded} ok</span>
                                {htmlProgress.failed > 0 && <span className="text-red-600">{htmlProgress.failed} failed</span>}
                                <button
                                  onClick={() => { htmlDownloadCancelRef.current = true; }}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 transition-colors"
                                >
                                  <X className="w-3 h-3" /> Cancel
                                </button>
                              </div>
                            </div>
                            <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-neutral-900 transition-all duration-300"
                                style={{ width: `${htmlProgress.total > 0 ? Math.round((htmlProgress.current / htmlProgress.total) * 100) : 0}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* URL rows */}
                    <div className="max-h-64 overflow-y-auto divide-y divide-neutral-100">
                      {crawledPages.map((page, idx) => (
                        <label
                          key={idx}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCrawledUrls.has(page.url)}
                            onChange={() => toggleCrawledUrl(page.url)}
                            className="w-4 h-4 border-neutral-300 rounded accent-neutral-900"
                          />
                          <span className="text-xs text-neutral-700 truncate">{page.url}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={runAllModules}
                  disabled={runningAll || selectedModules.length === 0}
                  className="flex-1 mr-3 flex items-center justify-center space-x-2 px-6 py-3 bg-neutral-900 text-white  hover:bg-neutral-800 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  <Play className="w-4 h-4" />
                  <span>{runningAll ? `Running ${selectedModules.length} Module${selectedModules.length !== 1 ? 's' : ''}...` : `Run ${selectedModules.length} Selected Module${selectedModules.length !== 1 ? 's' : ''}`}</span>
                </button>
                {currentAnalysisId && (
                  <button
                    onClick={() => setShowSaveModal(true)}
                    className="px-4 py-3 bg-neutral-100 text-neutral-900  font-medium hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 transition-all flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save</span>
                  </button>
                )}
              </div>

              {(completedModules > 0 || tokensUsed > 0) && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-neutral-50 ">
                  <div>
                    <p className="text-sm text-neutral-600">Modules Completed</p>
                    <p className="text-2xl font-bold text-neutral-900">{completedModules}/{AVAILABLE_MODULES.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600">Total Issues Found</p>
                    <p className="text-2xl font-bold text-gray-600">{totalIssues}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600">Token Usage</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {tokensUsed} <span className="text-sm text-neutral-500">(${tokensCost.toFixed(4)})</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {hasCrawled && currentAnalysisId && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={exportAll}
              disabled={completedModules === 0}
              className="px-4 py-2 bg-neutral-900 text-white font-medium hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Export All Results ({completedModules})</span>
            </button>
          </div>
          <div className="space-y-4">
          {selectedModules.includes('redirects') && (
            <ModuleCard
              title="HTTP Redirect & Final URL Tracking"
              description="Tracks redirect chains, identifies redirect loops, and maps final destination URLs."
              runModule={() => runRedirectTracker(undefined, undefined, true)}
              loading={modules.redirects.loading}
              result={modules.redirects.result && <RedirectTrackerResult data={modules.redirects.result} />}
              totalIssues={modules.redirects.totalIssues}
            />
          )}

          {selectedModules.includes('robots') && (
            <ModuleCard
              title="Robots.txt, llms.txt & Meta Robots"
              description="Analyzes robots.txt, llms.txt rules and meta robots tags to determine page indexability and AI crawler policies."
              runModule={() => runRobotsChecker(undefined, undefined, true)}
              loading={modules.robots.loading}
              result={modules.robots.result && <RobotsCheckerResult data={modules.robots.result} />}
              totalIssues={modules.robots.totalIssues}
            />
          )}

          {selectedModules.includes('canonical') && (
            <ModuleCard
              title="Canonical Validation"
              description="Compares canonical tags against actual URLs to detect mismatches and consolidation issues."
              runModule={() => runCanonicalValidator(undefined, undefined, true)}
              loading={modules.canonical.loading}
              result={modules.canonical.result && <CanonicalValidatorResult data={modules.canonical.result} />}
              totalIssues={modules.canonical.totalIssues}
            />
          )}

          {selectedModules.includes('duplicates') && (
            <ModuleCard
              title="Duplicate Title / Description Detection"
              description="Identifies pages with duplicate meta titles and descriptions across the site."
              runModule={() => runDuplicateMetaFinder(undefined, undefined, true)}
              loading={modules.duplicates.loading}
              result={modules.duplicates.result && <DuplicateMetaFinderResult data={modules.duplicates.result} />}
              totalIssues={modules.duplicates.totalIssues}
            />
          )}

          {selectedModules.includes('brokenlinks') && (
            <ModuleCard
              title="Broken Link Checker (Internal)"
              description="Crawls internal links and reports broken or inaccessible pages."
              runModule={() => runBrokenLinkChecker(undefined, undefined, true)}
              loading={modules.brokenlinks.loading}
              result={modules.brokenlinks.result && <BrokenLinkCheckerResult data={modules.brokenlinks.result} />}
              totalIssues={modules.brokenlinks.totalIssues}
            />
          )}

          {selectedModules.includes('schema') && (
            <ModuleCard
              title="Schema.org Detection / Validator"
              description="Detect and validate JSON-LD structured data (Organization, FAQPage, Product, Article, etc.)"
              runModule={async () => {
                if (schemaValidatorRef.current) {
                  await schemaValidatorRef.current.runAnalysis();
                }
              }}
              loading={modules.schema.loading}
              result={<SchemaValidator ref={schemaValidatorRef} crawlId={currentAnalysisId || ''} filteredUrls={crawledPages.map(p => p.url)} domain={domain} onLoadingChange={(loading) => updateModuleState('schema', { loading })} onResultsChange={(results) => updateModuleState('schema', { result: results })} />}
              totalIssues={modules.schema.totalIssues}
            />
          )}

          {selectedModules.includes('socialmeta') && (
            <ModuleCard
              title="Open Graph / Twitter Card Checker"
              description="Validate social media preview tags for better sharing on Facebook, Twitter, LinkedIn, etc."
              runModule={async () => {
                if (socialMetaCheckerRef.current) {
                  await socialMetaCheckerRef.current.runAnalysis();
                }
              }}
              loading={modules.socialmeta.loading}
              result={<SocialMetaChecker ref={socialMetaCheckerRef} crawlId={currentAnalysisId || ''} urls={crawledPages.map(p => p.url)} domain={domain} />}
              totalIssues={modules.socialmeta.totalIssues}
            />
          )}

          {selectedModules.includes('paginationhreflang') && (
            <ModuleCard
              title="Pagination & hreflang Validator"
              description="Validate pagination links (rel=next/prev) and international hreflang tags for proper SEO."
              runModule={async () => {
                if (paginationHreflangValidatorRef.current) {
                  await paginationHreflangValidatorRef.current.runAnalysis();
                }
              }}
              loading={modules.paginationhreflang.loading}
              result={<PaginationHreflangValidator ref={paginationHreflangValidatorRef} crawlId={currentAnalysisId || ''} urls={crawledPages.map(p => p.url)} domain={domain} />}
              totalIssues={modules.paginationhreflang.totalIssues}
            />
          )}

          {selectedModules.includes('imageanalyzer') && (
            <ModuleCard
              title="Image Analyzer"
              description="Evaluate image SEO quality, alt text, filenames, and performance metrics."
              runModule={async () => {
                if (imageAnalyzerRef.current) {
                  await imageAnalyzerRef.current.runAnalysis();
                }
              }}
              loading={modules.imageanalyzer.loading}
              result={<ImageAnalyzer ref={imageAnalyzerRef} crawlId={currentAnalysisId || ''} urls={crawledPages.map(p => p.url)} domain={domain} />}
              totalIssues={modules.imageanalyzer.totalIssues}
            />
          )}

          {selectedModules.includes('imageusagemapper') && (
            <ModuleCard
              title="Image Usage Mapper"
              description="Map all images and show where each one is used across the website."
              runModule={async () => {
                if (imageUsageMapperRef.current) {
                  await imageUsageMapperRef.current.runAnalysis();
                }
              }}
              loading={modules.imageusagemapper.loading}
              result={<ImageUsageMapper ref={imageUsageMapperRef} crawlId={currentAnalysisId || ''} urls={crawledPages.map(p => p.url)} domain={domain} />}
              totalIssues={modules.imageusagemapper.totalIssues}
            />
          )}

          {selectedModules.includes('schemacleanup') && (
            <ModuleCard
              title="Schema Cleanup / Orphan Detector"
              description="Detect duplicate and orphan JSON-LD blocks across the site"
              runModule={async () => {
                if (schemaOrphanDetectorRef.current) {
                  await schemaOrphanDetectorRef.current.runAnalysis();
                }
              }}
              loading={modules.schemacleanup.loading}
              result={<SchemaOrphanDetector ref={schemaOrphanDetectorRef} crawlId={currentAnalysisId || ''} filteredUrls={crawledPages.map(p => p.url)} domain={domain} onLoadingChange={(loading) => updateModuleState('schemacleanup', { loading })} onResultsChange={(results) => updateModuleState('schemacleanup', { result: results })} />}
              totalIssues={modules.schemacleanup.totalIssues}
            />
          )}

          {selectedModules.includes('thincontent') && (
            <ModuleCard
              title="Thin Content Detector"
              description="Flag pages with little or no real content (empty CPT/archive pages)"
              runModule={async () => {
                if (thinContentDetectorRef.current) {
                  await thinContentDetectorRef.current.runAnalysis();
                }
              }}
              loading={modules.thincontent.loading}
              result={<ThinContentDetector ref={thinContentDetectorRef} crawlId={currentAnalysisId || ''} filteredUrls={crawledPages.map(p => p.url)} domain={domain} onLoadingChange={(loading) => updateModuleState('thincontent', { loading })} onResultsChange={(results: ThinContentResult[]) => { const issues = results.filter(r => r.verdict !== 'CONTENT').length; updateModuleState('thincontent', { result: results, totalIssues: issues }); }} />}
              totalIssues={modules.thincontent.totalIssues}
            />
          )}

          </div>
        </>
      )}

      {showConfirmModal && pendingCrawlData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-neutral-900 mb-4">Confirm Crawl</h3>
            <div className="space-y-4 mb-6">
              <div className="p-4 bg-gray-50 border border-gray-200">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-neutral-700">Total Pages Found:</span>
                    <span className="text-sm font-bold text-neutral-900">{pendingCrawlData.totalPages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-neutral-700">API Calls Required:</span>
                    <span className="text-sm font-bold text-neutral-900">{pendingCrawlData.totalPages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-neutral-700">Estimated Cost:</span>
                    <span className="text-sm font-bold text-red-600">${pendingCrawlData.estimatedCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-neutral-600">
                This will scrape all {pendingCrawlData.totalPages} pages from the domain. This may take several minutes and will consume Firecrawl API credits.
              </p>
              <p className="text-xs text-neutral-500">
                Note: The actual cost may vary based on your Firecrawl plan and rate limits.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={cancelCrawl}
                className="flex-1 px-4 py-3 bg-neutral-200 text-neutral-900 font-medium hover:bg-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndProceedCrawl}
                className="flex-1 px-4 py-3 bg-neutral-900 text-white font-medium hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 transition-all"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white  shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-neutral-900 mb-4">Analysis Saved</h3>
            <p className="text-neutral-600 mb-6">
              Your SEO analysis has been automatically saved and can be accessed from the Saved Analyses section.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-3 bg-neutral-900 text-white  font-medium hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <LoadingModal
        isOpen={showLoadingModal}
        onCancel={handleCancelOperation}
        message={loadingMessage}
      />
    </div>
  );
}
