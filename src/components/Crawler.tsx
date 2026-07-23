import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Eye, FileText, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotification';
import AnalysisToggleBar, { loadActiveModules } from './AnalysisToggleBar';
import { CrawlResultsTable } from './CrawlResultsTable';
import { LoadingModal } from './LoadingModal';
import { extractSeoMetadata } from '../lib/htmlExtract';

interface SitemapEntry {
  url: string;
  title?: string;
  description?: string;
  status_code?: number;
  indexable?: boolean;
  canonical_url?: string;
  word_count?: number;
  h1_tags?: string[];
  h2_tags?: string[];
  h3_tags?: string[];
  h4_tags?: string[];
  h5_tags?: string[];
  h6_tags?: string[];
  images?: { src: string; alt: string }[];
  links?: { href: string; text: string }[];
  images_without_alt?: number;
  kw_1?: string;
  kw_2?: string;
  kw_3?: string;
  kw_4?: string;
  kw_5?: string;
  kw_6?: string;
  kw_7?: string;
  kw_8?: string;
  kw_9?: string;
  kw_10?: string;
  analyzed?: boolean;
}

interface CrawlerProps {
  onSaveSuccess?: () => void;
}

export function Crawler({ onSaveSuccess }: CrawlerProps) {
  const [domain, setDomain] = useState('');
  const [maxUrls, setMaxUrls] = useState(50);
  const [includeMeta, setIncludeMeta] = useState(true);
  const [pagesOnly, setPagesOnly] = useState(true);
  const [includeDocs, setIncludeDocs] = useState(false);
  const [jsSpa, setJsSpa] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SitemapEntry[]>([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [analyzingUrls, setAnalyzingUrls] = useState<Set<string>>(new Set());
  const [activeModules, setActiveModules] = useState<string[]>(() => loadActiveModules());
  const [tokensUsed, setTokensUsed] = useState<number>(0);
  const [tokensCost, setTokensCost] = useState<number>(0);
  const [currentCrawlId, setCurrentCrawlId] = useState<string | null>(null);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  const abortControllerRef = useRef<AbortController | null>(null);

  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    setTokensCost(tokensUsed * 0.001);
  }, [tokensUsed]);

  const updateTokensInDatabase = async (newTokens: number) => {
    if (!currentCrawlId || !user) return;

    try {
      const newCost = newTokens * 0.001;
      await supabase
        .from('crawls')
        .update({
          tokens_used: newTokens,
          tokens_cost: newCost,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentCrawlId);
    } catch (err) {
      console.error('Failed to update tokens:', err);
    }
  };

  const analyzeUrl = async (url: string) => {
    setAnalyzingUrls(prev => new Set(prev).add(url));

    try {
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Operation cancelled by user');
      }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/firecrawl-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          endpoint: '/v1/scrape',
          body: {
            url: url,
            formats: ['html', 'markdown', 'rawHtml'],
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to analyze page: ${response.status}`);
      }

      const data = await response.json();
      const html = data.data?.html || '';
      const rawHtml = data.data?.rawHtml || '';
      const metadata = data.data?.metadata || {};

      if (data.creditsUsed) {
        setTokensUsed(prev => {
          const newTotal = prev + data.creditsUsed;
          updateTokensInDatabase(newTotal);
          return newTotal;
        });
      } else if (data.success) {
        setTokensUsed(prev => {
          const newTotal = prev + 1;
          updateTokensInDatabase(newTotal);
          return newTotal;
        });
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const analysisData: Partial<SitemapEntry> = {
        analyzed: true,
      };

      if (activeModules.includes('keywords')) {
        // Try to get keywords from metadata first (Firecrawl provides this)
        let metaKeywords = metadata.keywords || '';

        // If not in metadata, try parsing from HTML
        if (!metaKeywords) {
          metaKeywords = doc.querySelector('meta[name="keywords"]')?.getAttribute('content') || '';
        }

        if (metaKeywords) {
          const keywordList = metaKeywords
            .split(',')
            .map((kw: string) => kw.trim())
            .filter((kw: string) => kw.length > 0)
            .slice(0, 10);

          keywordList.forEach((keyword: string, index: number) => {
            const kwKey = `kw_${index + 1}` as keyof SitemapEntry;
            (analysisData as any)[kwKey] = keyword;
          });
        }
      }

      if (activeModules.includes('status')) {
        analysisData.status_code = data.data?.statusCode || response.status;
      }

      if (activeModules.includes('metaTitle')) {
        // Use extractSeoMetadata for consistent, robust title extraction
        const seoMeta = (html || rawHtml) ? extractSeoMetadata(html, rawHtml) : null;
        const NOT_FOUND = 'NOT FOUND';

        let title = '';
        if (seoMeta?.metaTitle && seoMeta.metaTitle !== NOT_FOUND) {
          title = seoMeta.metaTitle;
        } else {
          const titleTag = doc.querySelector('title')?.textContent?.trim();
          const metaTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
          title = titleTag || metaTitle || metadata.title || '';
        }
        analysisData.title = title;
      }

      if (activeModules.includes('metaDescription')) {
        // Use extractSeoMetadata for consistent, robust description extraction
        const seoMeta = (html || rawHtml) ? extractSeoMetadata(html, rawHtml) : null;
        const NOT_FOUND = 'NOT FOUND';

        let description = '';
        if (seoMeta?.metaDescription && seoMeta.metaDescription !== NOT_FOUND) {
          description = seoMeta.metaDescription;
        } else {
          const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content');
          const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content');
          description = metaDesc || ogDesc || metadata.description || '';
        }
        analysisData.description = description;
      }

      if (activeModules.includes('indexable')) {
        const robotsMeta = doc.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
        const noindex = robotsMeta.toLowerCase().includes('noindex');
        analysisData.indexable = !noindex;
      }

      if (activeModules.includes('canonical')) {
        analysisData.canonical_url = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
      }

      if (activeModules.includes('wordCount')) {
        const bodyText = doc.body?.textContent || '';
        const words = bodyText.trim().split(/\s+/).filter(word => word.length > 0);
        analysisData.word_count = words.length;
      }

      if (activeModules.includes('h1')) {
        analysisData.h1_tags = Array.from(doc.querySelectorAll('h1')).map(el => el.textContent?.trim() || '');
      }

      if (activeModules.includes('h2')) {
        analysisData.h2_tags = Array.from(doc.querySelectorAll('h2')).map(el => el.textContent?.trim() || '');
      }

      if (activeModules.includes('h3')) {
        analysisData.h3_tags = Array.from(doc.querySelectorAll('h3')).map(el => el.textContent?.trim() || '');
      }

      if (activeModules.includes('h4')) {
        analysisData.h4_tags = Array.from(doc.querySelectorAll('h4')).map(el => el.textContent?.trim() || '');
      }

      if (activeModules.includes('h5')) {
        analysisData.h5_tags = Array.from(doc.querySelectorAll('h5')).map(el => el.textContent?.trim() || '');
      }

      if (activeModules.includes('h6')) {
        analysisData.h6_tags = Array.from(doc.querySelectorAll('h6')).map(el => el.textContent?.trim() || '');
      }

      if (activeModules.includes('images')) {
        analysisData.images = Array.from(doc.querySelectorAll('img')).map(el => ({
          src: el.getAttribute('src') || '',
          alt: el.getAttribute('alt') || '',
        })).slice(0, 20);
      }

      if (activeModules.includes('links')) {
        analysisData.links = Array.from(doc.querySelectorAll('a')).map(el => ({
          href: el.getAttribute('href') || '',
          text: el.textContent?.trim() || '',
        })).filter(link => link.href).slice(0, 50);
      }

      if (activeModules.includes('imageAlts')) {
        const allImages = Array.from(doc.querySelectorAll('img'));
        const imagesWithoutAlt = allImages.filter(img => !img.getAttribute('alt') || img.getAttribute('alt')?.trim() === '');
        analysisData.images_without_alt = imagesWithoutAlt.length;
      }

      setResults(prevResults =>
        prevResults.map(result => {
          if (result.url === url) {
            return {
              ...result,
              ...analysisData,
            };
          }
          return result;
        })
      );

      showSuccess('Analysis completed successfully!');
    } catch (err) {
      showError('Failed to analyze page');
    } finally {
      setAnalyzingUrls(prev => {
        const newSet = new Set(prev);
        newSet.delete(url);
        return newSet;
      });
    }
  };

  const pollJobStatus = async (jobId: string): Promise<any> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;

      const response = await fetch(`${supabaseUrl}/functions/v1/firecrawl-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          endpoint: `/v1/map/${jobId}`,
          method: 'GET',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to check job status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'completed') {
        return data;
      } else if (data.status === 'failed') {
        throw new Error(data.error || 'Crawl job failed');
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    throw new Error('Job timed out after 5 minutes');
  };

  // Polls a /v1/crawl async job until complete, accumulating partial results
  const pollCrawlJob = async (
    jobId: string,
    onProgress: (msg: string) => void
  ): Promise<string[]> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const urls: string[] = [];
    let nextUrl: string | null = null;
    const maxAttempts = 120;
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;

      const endpoint = nextUrl
        ? nextUrl.replace('https://api.firecrawl.dev', '')
        : `/v1/crawl/${jobId}`;

      const response = await fetch(`${supabaseUrl}/functions/v1/firecrawl-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({ endpoint, method: 'GET' }),
      });

      if (!response.ok) throw new Error(`Failed to check crawl status: ${response.status}`);

      const data = await response.json();

      // Collect URLs from partial data pages
      if (data.data && Array.isArray(data.data)) {
        for (const page of data.data) {
          const u = page.metadata?.sourceURL || page.url || page.metadata?.url;
          if (u && !urls.includes(u)) urls.push(u);
        }
      }

      onProgress(`JS crawl in progress — ${urls.length} pages found so far...`);

      if (data.status === 'completed') {
        // Follow pagination if present
        if (data.next) {
          nextUrl = data.next;
          continue;
        }
        return urls;
      } else if (data.status === 'failed') {
        throw new Error(data.error || 'Crawl job failed');
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Return whatever we collected even if timed out
    if (urls.length > 0) return urls;
    throw new Error('JS crawl timed out after 10 minutes');
  };

  const handleCancelCrawl = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setShowLoadingModal(false);
    setIsLoading(false);
    showError('Crawl cancelled by user');
  };

  const handleCrawl = async () => {
    if (!domain.trim()) {
      setError('Please provide a domain');
      return;
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setShowLoadingModal(true);
    setLoadingMessage('Starting crawl...');
    setError('');
    setResults([]);
    setTokensUsed(0);
    setTokensCost(0);
    setCurrentCrawlId(null);

    try {
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      // Separate root hostname from any path prefix (e.g. "example.com/blog" → host="example.com", pathPrefix="/blog")
      const slashIdx = cleanDomain.indexOf('/');
      const rootHost = slashIdx !== -1 ? cleanDomain.slice(0, slashIdx) : cleanDomain;
      const pathPrefix = slashIdx !== -1 ? cleanDomain.slice(slashIdx) : '';

      if (user) {
        const { data: crawl, error: crawlError } = await supabase
          .from('crawls')
          .insert({
            user_id: user.id,
            domain: cleanDomain,
            name: null,
            total_urls: 0,
            included_meta: includeMeta,
            tags: null,
            tokens_used: 0,
            tokens_cost: 0,
          })
          .select()
          .single();

        if (crawlError) {
          console.error('Failed to create crawl record:', crawlError);
        } else {
          setCurrentCrawlId(crawl.id);
        }
      }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      let rawDiscoveredLinks: string[] | null = null;

      if (jsSpa) {
        // JS/SPA mode: use /v1/crawl which renders JavaScript and follows client-side routes
        setLoadingMessage('Starting JS crawl (this may take a few minutes)...');

        const crawlResponse = await fetch(`${supabaseUrl}/functions/v1/firecrawl-proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
          body: JSON.stringify({
            endpoint: '/v1/crawl',
            body: {
              url: `https://${rootHost}`,
              limit: maxUrls * 2,
              scrapeOptions: { formats: ['links'] },
            },
          }),
        });

        if (!crawlResponse.ok) {
          const errorData = await crawlResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${crawlResponse.status}: ${crawlResponse.statusText}`);
        }

        const crawlJobData = await crawlResponse.json();

        if (!crawlJobData.id) {
          throw new Error('Firecrawl /v1/crawl did not return a job ID');
        }

        rawDiscoveredLinks = await pollCrawlJob(
          crawlJobData.id,
          (msg) => setLoadingMessage(msg)
        );
      } else {
        // Standard mode: /v1/map (fast, static HTML + sitemap)
        setLoadingMessage('Initiating crawl job...');

        const response = await fetch(`${supabaseUrl}/functions/v1/firecrawl-proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
          body: JSON.stringify({
            endpoint: '/v1/map',
            body: { url: `https://${rootHost}`, limit: maxUrls * 2 },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const jobData = await response.json();

        if (jobData.creditsUsed) {
          setTokensUsed(prev => { const n = prev + jobData.creditsUsed; updateTokensInDatabase(n); return n; });
        } else if (jobData.success) {
          setTokensUsed(prev => { const n = prev + 1; updateTokensInDatabase(n); return n; });
        }

        if (jobData.links && Array.isArray(jobData.links)) {
          rawDiscoveredLinks = jobData.links;
        } else if (jobData.id) {
          setLoadingMessage('Crawl job started. Waiting for results...');
          const completedData = await pollJobStatus(jobData.id);

          if (completedData.creditsUsed) {
            setTokensUsed(prev => { const n = prev + completedData.creditsUsed; updateTokensInDatabase(n); return n; });
          } else if (completedData.success && completedData.links) {
            setTokensUsed(prev => { const n = prev + Math.ceil(completedData.links.length / 10); updateTokensInDatabase(n); return n; });
          }

          if (completedData.links && Array.isArray(completedData.links)) {
            rawDiscoveredLinks = completedData.links;
          }
        }
      }

      if (rawDiscoveredLinks !== null) {
        const NON_PAGE_EXTENSIONS = /\.(xml|kml|json|csv|txt|rss|atom|xsl|xslt|gz|zip|tar|rar|7z|ico|png|jpg|jpeg|gif|svg|webp|mp4|mp3|avi|mov|wmv|js|css|ts|woff|woff2|ttf|eot)(\?.*)?$/i;
        const DOCUMENT_EXTENSIONS = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|odt|ods|odp)(\?.*)?$/i;

        let baseLinks: string[] = rawDiscoveredLinks.map((link: any) =>
          typeof link === 'string' ? link : String(link)
        );

        // Supplement with sitemap to catch pages Firecrawl map may miss (e.g. blog posts)
        setLoadingMessage('Supplementing with sitemap data...');
        try {
          const baseUrl = `https://${rootHost}`;
          const sitemapCandidates = [
            `${baseUrl}/sitemap.xml`,
            `${baseUrl}/sitemap_index.xml`,
            `${baseUrl}/sitemap-index.xml`,
            `${baseUrl}/blog-sitemap.xml`,
            `${baseUrl}/post-sitemap.xml`,
            `${baseUrl}/page-sitemap.xml`,
          ];

          // Check robots.txt for additional Sitemap: directives
          try {
            const robotsResp = await fetch(`${supabaseUrl}/functions/v1/firecrawl-proxy`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
              body: JSON.stringify({ endpoint: '/fetch-text', method: 'GET', url: `${baseUrl}/robots.txt` }),
            });
            if (robotsResp.ok) {
              const robotsData = await robotsResp.json();
              if (robotsData.content) {
                const robotsSitemaps = (robotsData.content.match(/^Sitemap:\s*(.+)$/gmi) || [])
                  .map((line: string) => line.replace(/^Sitemap:\s*/i, '').trim());
                for (const sm of robotsSitemaps) {
                  if (!sitemapCandidates.includes(sm)) sitemapCandidates.push(sm);
                }
              }
            }
          } catch (_e) { /* robots.txt fetch is best-effort */ }

          const seenSitemaps = new Set<string>();
          const collectedUrls: string[] = [];

          const processSitemap = async (sitemapUrl: string): Promise<void> => {
            if (seenSitemaps.has(sitemapUrl)) return;
            seenSitemaps.add(sitemapUrl);
            try {
              const sitemapResp = await fetch(`${supabaseUrl}/functions/v1/firecrawl-proxy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
                body: JSON.stringify({ endpoint: '/fetch-text', method: 'GET', url: sitemapUrl }),
              });
              if (!sitemapResp.ok) return;
              const sitemapData = await sitemapResp.json();
              if (!sitemapData.content) return;
              const locMatches: string[] = (sitemapData.content.match(/<loc>(.*?)<\/loc>/g) || [])
                .map((m: string) => m.replace(/<loc>|<\/loc>/g, '').trim());
              const isIndex = sitemapData.content.includes('<sitemapindex');
              if (isIndex) {
                for (const childUrl of locMatches) {
                  await processSitemap(childUrl);
                }
              } else {
                const pageUrls = locMatches.filter((u: string) => !NON_PAGE_EXTENSIONS.test(u));
                collectedUrls.push(...pageUrls);
              }
            } catch (_e) {
              // individual sitemap fetch failure — continue
            }
          };

          for (const url of sitemapCandidates) {
            await processSitemap(url);
          }

          if (collectedUrls.length > 0) {
            const merged = new Set([...baseLinks, ...collectedUrls]);
            baseLinks = Array.from(merged);
            console.log(`Sitemap supplement added ${collectedUrls.length} URLs, total: ${baseLinks.length}`);
          }
        } catch (_e) {
          // sitemap supplement is best-effort
        }

        // HTML link-harvest fallback: when map/sitemap produced too few URLs,
        // scrape the homepage and extract <a href> links directly from the HTML.
        // This catches sites with no published sitemap (e.g. Webflow with auto-sitemap off).
        try {
          const stripWww = (h: string) => h.replace(/^www\./, '');

          const harvestFromUrl = async (pageUrl: string): Promise<string[]> => {
            const scrapeResp = await fetch(`${supabaseUrl}/functions/v1/firecrawl-proxy`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
              body: JSON.stringify({
                endpoint: '/v1/scrape',
                body: { url: pageUrl, formats: ['html', 'rawHtml', 'links'] },
              }),
            });

            if (!scrapeResp.ok) return [];

            const scrapeData = await scrapeResp.json();

            // Token tracking
            const credits = scrapeData.creditsUsed ?? (scrapeData.success ? 1 : 0);
            if (credits) {
              setTokensUsed(prev => {
                const newTotal = prev + credits;
                updateTokensInDatabase(newTotal);
                return newTotal;
              });
            }

            const candidates: string[] = [];

            // (a) links array from Firecrawl
            const linksField = scrapeData.data?.links;
            if (Array.isArray(linksField)) {
              for (const link of linksField) {
                const href = typeof link === 'string' ? link : (link?.url ?? '');
                if (href) candidates.push(href);
              }
            }

            // (b) parse HTML for a[href]
            const htmlSource = scrapeData.data?.html || scrapeData.data?.rawHtml || '';
            if (htmlSource) {
              const parser = new DOMParser();
              const doc = parser.parseFromString(htmlSource, 'text/html');
              const anchors = Array.from(doc.querySelectorAll('a[href]'));
              for (const a of anchors) {
                const href = a.getAttribute('href') || '';
                if (href) candidates.push(href);
              }
            }

            const harvested: string[] = [];
            for (const href of candidates) {
              // Discard mailto:, tel:, javascript:, and pure-fragment hrefs
              const lower = href.toLowerCase();
              if (lower.startsWith('mailto:') || lower.startsWith('tel:') || lower.startsWith('javascript:')) continue;
              if (href === '#' || href.startsWith('#')) continue;

              let u: URL;
              try {
                u = new URL(href, `https://${rootHost}`);
              } catch {
                continue;
              }

              // Keep only same-host URLs (strip www. from both sides before comparing)
              if (stripWww(u.hostname) !== stripWww(rootHost)) continue;

              // Strip fragment, keep query string
              u.hash = '';
              harvested.push(u.href);
            }

            return harvested;
          };

          if (baseLinks.length <= 2) {
            if (abortControllerRef.current?.signal.aborted) {
              throw new Error('Operation cancelled by user');
            }

            setLoadingMessage('Extracting links from homepage HTML...');
            const harvested = await harvestFromUrl(`https://${rootHost}`);

            if (harvested.length > 0) {
              const beforeCount = baseLinks.length;
              baseLinks = Array.from(new Set([...baseLinks, ...harvested]));
              console.log(`HTML link harvest added ${harvested.length} URLs, total: ${baseLinks.length}`);

              // Second-level pass: if still few URLs, scrape newly discovered pages
              if (baseLinks.length <= 5) {
                if (abortControllerRef.current?.signal.aborted) {
                  throw new Error('Operation cancelled by user');
                }

                const newlyFound = baseLinks.slice(beforeCount).slice(0, 5);
                if (newlyFound.length > 0) {
                  setLoadingMessage('Extracting links from discovered pages (second pass)...');
                  const secondLevelResults = await Promise.all(
                    newlyFound.map((pageUrl) => harvestFromUrl(pageUrl))
                  );

                  const secondHarvested: string[] = [];
                  for (const links of secondLevelResults) {
                    secondHarvested.push(...links);
                  }

                  if (secondHarvested.length > 0) {
                    baseLinks = Array.from(new Set([...baseLinks, ...secondHarvested]));
                    console.log(`HTML link harvest (second pass) added ${secondHarvested.length} URLs, total: ${baseLinks.length}`);
                  }
                }
              }
            }
          }
        } catch (err: any) {
          if (err?.message === 'Operation cancelled by user') throw err;
          // best-effort supplement — log and continue silently
          console.error('HTML link harvest failed:', err);
        }

        // Filter to path prefix if user entered a sub-path (e.g. example.com/blog)
        if (pathPrefix) {
          const prefixFilter = `https://${rootHost}${pathPrefix}`;
          baseLinks = baseLinks.filter((u: string) => u.startsWith(prefixFilter));
        }

        // Supplement document files from sitemap when includeDocs is on
        if (includeDocs) {
          setLoadingMessage('Scanning sitemap for document files...');
          try {
            const baseUrl = `https://${rootHost}`;
            const sitemapUrls = [`${baseUrl}/sitemap.xml`, `${baseUrl}/sitemap_index.xml`];
            for (const sitemapUrl of sitemapUrls) {
              const sitemapResp = await fetch(`${supabaseUrl}/functions/v1/firecrawl-proxy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
                body: JSON.stringify({ endpoint: '/fetch-text', method: 'GET', url: sitemapUrl }),
              });
              if (sitemapResp.ok) {
                const sitemapData = await sitemapResp.json();
                if (sitemapData.content) {
                  const locMatches = sitemapData.content.match(/<loc>(.*?)<\/loc>/g) || [];
                  const sitemapDocUrls = locMatches
                    .map((m: string) => m.replace(/<loc>|<\/loc>/g, '').trim())
                    .filter((u: string) => DOCUMENT_EXTENSIONS.test(u));
                  if (sitemapDocUrls.length > 0) {
                    const merged = new Set([...baseLinks, ...sitemapDocUrls]);
                    baseLinks = Array.from(merged);
                  }
                }
              }
            }
          } catch (_e) {
            // silently continue — sitemap scan is best-effort
          }
        }

        const rawList = baseLinks;
        const urlList = pagesOnly
          ? rawList.filter((url: string) => {
              if (NON_PAGE_EXTENSIONS.test(url)) return false;
              if (DOCUMENT_EXTENSIONS.test(url)) return includeDocs;
              return true;
            })
          : includeDocs
            ? rawList
            : rawList.filter((url: string) => !DOCUMENT_EXTENSIONS.test(url));

        if (includeMeta) {
          const batchSize = 5;
          const detailedResults: SitemapEntry[] = [];

          for (let i = 0; i < Math.min(urlList.length, maxUrls); i += batchSize) {
            if (abortControllerRef.current?.signal.aborted) {
              throw new Error('Operation cancelled by user');
            }
            const batch = urlList.slice(i, Math.min(i + batchSize, maxUrls));
            setLoadingMessage(`Scraping pages ${i + 1}-${Math.min(i + batchSize, maxUrls)} of ${Math.min(urlList.length, maxUrls)}...`);

            const batchResults = await Promise.all(
              batch.map(async (url: string) => {
                try {
                  const scrapeResponse = await fetch(`${supabaseUrl}/functions/v1/firecrawl-proxy`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${supabaseKey}`,
                    },
                    body: JSON.stringify({
                      endpoint: '/v1/scrape',
                      body: {
                        url: url,
                        formats: ['markdown', 'html', 'rawHtml'],
                      },
                    }),
                  });

                  if (scrapeResponse.ok) {
                    const scrapeData = await scrapeResponse.json();
                    const html = scrapeData.data?.html || '';
                    const rawHtml = scrapeData.data?.rawHtml || '';
                    const metadata = scrapeData.data?.metadata || {};

                    const seoMeta = (html || rawHtml) ? extractSeoMetadata(html, rawHtml) : null;
                    const NOT_FOUND = 'NOT FOUND';

                    let title = '';
                    if (seoMeta?.metaTitle && seoMeta.metaTitle !== NOT_FOUND) {
                      title = seoMeta.metaTitle;
                    } else {
                      try {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html || rawHtml, 'text/html');
                        title = doc.querySelector('title')?.textContent?.trim() ||
                                (Array.isArray(metadata.title) ? metadata.title[0] : metadata.title) || '';
                      } catch {
                        title = (Array.isArray(metadata.title) ? metadata.title[0] : metadata.title) || '';
                      }
                    }

                    let description = '';
                    if (seoMeta?.metaDescription && seoMeta.metaDescription !== NOT_FOUND) {
                      description = seoMeta.metaDescription;
                    } else {
                      try {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html || rawHtml, 'text/html');
                        description = doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
                                     (Array.isArray(metadata.description) ? metadata.description[0] : metadata.description) || '';
                      } catch {
                        description = (Array.isArray(metadata.description) ? metadata.description[0] : metadata.description) || '';
                      }
                    }

                    if (scrapeData.creditsUsed) {
                      setTokensUsed(prev => {
                        const newTotal = prev + scrapeData.creditsUsed;
                        updateTokensInDatabase(newTotal);
                        return newTotal;
                      });
                    } else if (scrapeData.success) {
                      setTokensUsed(prev => {
                        const newTotal = prev + 1;
                        updateTokensInDatabase(newTotal);
                        return newTotal;
                      });
                    }

                    return { url, title, description };
                  }
                } catch (err) {
                  console.error(`Failed to scrape ${url}:`, err);
                }
                return { url };
              })
            );

            detailedResults.push(...batchResults);
          }

          setResults(detailedResults);
        } else {
          setResults(urlList.slice(0, maxUrls).map((url: string) => ({ url })));
        }

        showSuccess('Crawl completed successfully!');
      } else {
        throw new Error('Unexpected response format from Firecrawl API');
      }
    } catch (err: any) {
      if (err.message !== 'Operation cancelled by user') {
        setError(err.message || 'Failed to crawl website');
        showError(err.message || 'Failed to crawl website');
      }
    } finally {
      setIsLoading(false);
      setShowLoadingModal(false);
      abortControllerRef.current = null;
    }
  };

  const handleSave = async () => {
    if (!user) {
      return;
    }

    if (results.length === 0) {
      return;
    }

    setIsSaving(true);

    try {
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const timestamp = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+)/, '$3-$1-$2 $4:$5');

      const autoName = `Crawl: ${cleanDomain} ${timestamp}`;

      let crawlId = currentCrawlId;

      if (currentCrawlId) {
        const { error: updateError } = await supabase
          .from('crawls')
          .update({
            name: autoName,
            total_urls: results.length,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentCrawlId);

        if (updateError) throw updateError;
      } else {
        const { data: crawl, error: crawlError } = await supabase
          .from('crawls')
          .insert({
            user_id: user.id,
            domain: cleanDomain,
            name: autoName,
            total_urls: results.length,
            included_meta: includeMeta,
            tokens_used: tokensUsed || null,
            tokens_cost: tokensCost || null,
          })
          .select()
          .single();

        if (crawlError) throw crawlError;
        crawlId = crawl.id;
        setCurrentCrawlId(crawl.id);
      }

      const crawlResults = results.map(result => ({
        crawl_id: crawlId,
        url: result.url,
        title: result.title || null,
        description: result.description || null,
        status_code: result.status_code || null,
        indexable: result.indexable !== undefined ? result.indexable : null,
        canonical_url: result.canonical_url || null,
        word_count: result.word_count || null,
        h1_tags: result.h1_tags || null,
        h2_tags: result.h2_tags || null,
        h3_tags: result.h3_tags || null,
        h4_tags: result.h4_tags || null,
        h5_tags: result.h5_tags || null,
        h6_tags: result.h6_tags || null,
        images: result.images ? result.images.map(img => img.src) : null,
        links: result.links ? result.links.map(link => link.href) : null,
        images_without_alt: result.images_without_alt !== undefined ? result.images_without_alt : null,
        kw_1: result.kw_1 || null,
        kw_2: result.kw_2 || null,
        kw_3: result.kw_3 || null,
        kw_4: result.kw_4 || null,
        kw_5: result.kw_5 || null,
        kw_6: result.kw_6 || null,
        kw_7: result.kw_7 || null,
        kw_8: result.kw_8 || null,
        kw_9: result.kw_9 || null,
        kw_10: result.kw_10 || null,
        analyzed: result.analyzed || false,
      }));

      const { error: resultsError } = await supabase
        .from('crawl_results')
        .insert(crawlResults);

      if (resultsError) throw resultsError;

      showSuccess('Crawl saved successfully!');

      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (err: any) {
      showError(err.message || 'Failed to save crawl');
    } finally {
      setIsSaving(false);
    }
  };

  const exportToCSV = () => {
    if (results.length === 0) return;

    const hasAnalysisData = results.some(r => r.analyzed);

    const maxH1 = Math.max(0, ...results.map(r => r.h1_tags?.length || 0));
    const maxH2 = Math.max(0, ...results.map(r => r.h2_tags?.length || 0));
    const maxH3 = Math.max(0, ...results.map(r => r.h3_tags?.length || 0));
    const maxH4 = Math.max(0, ...results.map(r => r.h4_tags?.length || 0));
    const maxH5 = Math.max(0, ...results.map(r => r.h5_tags?.length || 0));
    const maxH6 = Math.max(0, ...results.map(r => r.h6_tags?.length || 0));

    const hasKeywords = results.some(r => r.analyzed && (r.kw_1 || r.kw_2 || r.kw_3 || r.kw_4 || r.kw_5 || r.kw_6 || r.kw_7 || r.kw_8 || r.kw_9 || r.kw_10));
    const keywordColumns: number[] = [];
    if (hasKeywords) {
      for (let i = 1; i <= 10; i++) {
        const kwKey = `kw_${i}` as keyof SitemapEntry;
        if (results.some(r => r[kwKey])) {
          keywordColumns.push(i);
        }
      }
    }

    const headers = [];
    headers.push('URL');
    if (includeMeta) {
      headers.push('Meta Title', 'Meta Description');
    }
    if (hasAnalysisData) {
      if (results.some(r => r.status_code)) headers.push('Status Code');
      if (results.some(r => r.indexable !== undefined && r.indexable !== null)) headers.push('Indexability');
      if (results.some(r => r.canonical_url)) headers.push('Canonical Link Element');
      if (results.some(r => r.word_count)) headers.push('Word Count');
      for (let i = 1; i <= maxH1; i++) headers.push(`H1-${i}`);
      for (let i = 1; i <= maxH2; i++) headers.push(`H2-${i}`);
      for (let i = 1; i <= maxH3; i++) headers.push(`H3-${i}`);
      for (let i = 1; i <= maxH4; i++) headers.push(`H4-${i}`);
      for (let i = 1; i <= maxH5; i++) headers.push(`H5-${i}`);
      for (let i = 1; i <= maxH6; i++) headers.push(`H6-${i}`);
      if (results.some(r => r.images && r.images.length > 0)) headers.push('Images');
      if (results.some(r => r.links && r.links.length > 0)) headers.push('Links');
      if (results.some(r => r.images_without_alt && r.images_without_alt > 0)) headers.push('Images Missing Alt Text');
      for (const kwNum of keywordColumns) {
        headers.push(`KW-${kwNum}`);
      }
    }

    const rows = results.map(entry => {
      const row = [entry.url];

      if (includeMeta) {
        row.push(entry.title || '', entry.description || '');
      }

      if (hasAnalysisData) {
        if (results.some(r => r.status_code)) row.push(entry.status_code?.toString() || '');
        if (results.some(r => r.indexable !== undefined && r.indexable !== null)) row.push(entry.indexable ? 'Indexable' : 'Non-Indexable');
        if (results.some(r => r.canonical_url)) row.push(entry.canonical_url || '');
        if (results.some(r => r.word_count)) row.push(entry.word_count?.toString() || '0');
        for (let i = 0; i < maxH1; i++) row.push(entry.h1_tags?.[i] || '');
        for (let i = 0; i < maxH2; i++) row.push(entry.h2_tags?.[i] || '');
        for (let i = 0; i < maxH3; i++) row.push(entry.h3_tags?.[i] || '');
        for (let i = 0; i < maxH4; i++) row.push(entry.h4_tags?.[i] || '');
        for (let i = 0; i < maxH5; i++) row.push(entry.h5_tags?.[i] || '');
        for (let i = 0; i < maxH6; i++) row.push(entry.h6_tags?.[i] || '');
        if (results.some(r => r.images && r.images.length > 0)) row.push(entry.images?.length?.toString() || '0');
        if (results.some(r => r.links && r.links.length > 0)) row.push(entry.links?.length?.toString() || '0');
        if (results.some(r => r.images_without_alt && r.images_without_alt > 0)) row.push(entry.images_without_alt?.toString() || '0');
        for (const kwNum of keywordColumns) {
          const kwKey = `kw_${kwNum}` as keyof SitemapEntry;
          row.push((entry[kwKey] as string) || '');
        }
      }

      return row;
    });

    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const fullUrl = `https://${cleanDomain}`;
    const sanitizedUrl = fullUrl.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('href', url);
    link.setAttribute('download', `crawl-${sanitizedUrl}-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess('CSV exported successfully!');
  };

  const toggleUrlSelection = (url: string) => {
    const newSelection = new Set(selectedUrls);
    if (newSelection.has(url)) {
      newSelection.delete(url);
    } else {
      newSelection.add(url);
    }
    setSelectedUrls(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedUrls.size === results.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(results.map(r => r.url)));
    }
  };

  const handleAnalyzeSelected = async () => {
    if (selectedUrls.size === 0) {
      showError('Please select at least one URL to analyze');
      return;
    }

    const urlsToAnalyze = Array.from(selectedUrls).filter(url => {
      const result = results.find(r => r.url === url);
      return !result?.analyzed;
    });

    if (urlsToAnalyze.length === 0) {
      showError('All selected URLs are already analyzed');
      return;
    }

    abortControllerRef.current = new AbortController();
    setShowLoadingModal(true);
    setLoadingMessage(`Analyzing ${urlsToAnalyze.length} URL${urlsToAnalyze.length > 1 ? 's' : ''}...`);

    try {
      let analyzed = 0;
      for (const url of urlsToAnalyze) {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Operation cancelled by user');
        }

        setLoadingMessage(`Analyzing ${analyzed + 1} of ${urlsToAnalyze.length} URLs...`);
        await analyzeUrl(url);
        analyzed++;
      }
      showSuccess(`Successfully analyzed ${analyzed} URL${analyzed > 1 ? 's' : ''}!`);
    } catch (err: any) {
      if (err.message !== 'Operation cancelled by user') {
        showError(err.message || 'Failed to analyze URLs');
      }
    } finally {
      setShowLoadingModal(false);
      abortControllerRef.current = null;
    }
  };


  return (
    <>
      <div className="w-full max-w-6xl mx-auto">
        <div className="p-8 mb-8">

          <div className="space-y-6">
            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-neutral-900 mb-2">
                Website Domain
              </label>
              <input
                id="domain"
                type="text"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3  border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent disabled:bg-neutral-50 disabled:text-neutral-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="maxUrls" className="block text-sm font-medium text-neutral-900 mb-2">
                Maximum URLs to Extract
              </label>
              <input
                id="maxUrls"
                type="number"
                min="1"
                max="500"
                value={maxUrls}
                onChange={(e) => setMaxUrls(Math.max(1, Math.min(500, parseInt(e.target.value) || 50)))}
                disabled={isLoading}
                className="w-full px-4 py-3  border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent disabled:bg-neutral-50 disabled:text-neutral-500 transition-colors"
              />
              <p className="mt-2 text-sm text-neutral-500">
                Extract detailed metadata for up to 500 pages (default: 50)
              </p>
            </div>

            <div className="flex border border-neutral-200 bg-neutral-50 divide-x divide-neutral-200">
              {([
                { id: 'includeMeta', label: 'Include Meta Data', checked: includeMeta, onChange: () => setIncludeMeta(!includeMeta) },
                { id: 'pagesOnly', label: 'Pages Only', checked: pagesOnly, onChange: () => setPagesOnly(!pagesOnly) },
                { id: 'includeDocs', label: 'Include Documents', checked: includeDocs, onChange: () => setIncludeDocs(!includeDocs) },
                { id: 'jsSpa', label: 'JS / SPA Site', checked: jsSpa, onChange: () => setJsSpa(!jsSpa) },
              ] as const).map(({ id, label, checked, onChange }) => (
                <div key={id} className="flex items-center justify-between gap-3 px-4 py-3 flex-1">
                  <label htmlFor={id} className="text-sm font-medium text-neutral-900 cursor-pointer select-none whitespace-nowrap">
                    {label}
                  </label>
                  <button
                    type="button"
                    role="switch"
                    id={id}
                    aria-checked={checked}
                    onClick={onChange}
                    disabled={isLoading}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      checked ? 'bg-neutral-900' : 'bg-neutral-300'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        checked ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            {error && (
              <div className="p-4  bg-gray-50 border border-gray-200">
                <p className="text-sm text-gray-800">{error}</p>
              </div>
            )}

            <button
              onClick={handleCrawl}
              disabled={isLoading || !domain.trim()}
              className="w-full bg-neutral-900 text-white px-6 py-3  font-medium hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Crawling...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Start Crawl</span>
                </>
              )}
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="bg-neutral-50  shadow-sm border border-neutral-200">
            <div className="px-8 py-6 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">
                  Found {results.length} {results.length === 1 ? 'page' : 'pages'}
                </h2>
                {tokensUsed > 0 && (
                  <p className="text-sm text-neutral-600 mt-1">
                    Tokens used: {tokensUsed.toLocaleString()} • Cost: ${tokensCost.toFixed(4)}
                  </p>
                )}
              </div>
              <div className="flex space-x-3">
                {selectedUrls.size > 0 && (
                  <button
                    onClick={handleAnalyzeSelected}
                    className="px-4 py-2 bg-gray-600 text-white  font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all flex items-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Analyze {selectedUrls.size} {selectedUrls.size === 1 ? 'URL' : 'URLs'}</span>
                  </button>
                )}
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-neutral-100 text-neutral-900  font-medium hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 transition-all flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
                {user && (
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-neutral-900 text-white  font-medium hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                  </button>
                )}
              </div>
            </div>

            <AnalysisToggleBar
              activeModules={activeModules}
              setActiveModules={setActiveModules}
            />

            <CrawlResultsTable
              results={results}
              includeMeta={includeMeta}
              selectedUrls={selectedUrls}
              analyzingUrls={analyzingUrls}
              onSelectAll={toggleSelectAll}
              onSelectUrl={toggleUrlSelection}
              onAnalyzeUrl={analyzeUrl}
            />
          </div>
        )}
      </div>


      <LoadingModal
        isOpen={showLoadingModal}
        onCancel={handleCancelCrawl}
        message={loadingMessage}
      />
    </>
  );
}
