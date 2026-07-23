import { useState, useEffect } from 'react';
import { supabase, Crawl, CrawlResult } from '../lib/supabase';
import { useNotification } from '../hooks/useNotification';
import { CrawlResultsTable } from './CrawlResultsTable';
import {
  Loader2,
  ArrowLeft,
  Calendar,
  Link as LinkIcon,
  Download,
  Tag,
} from 'lucide-react';

interface CrawlDetailsProps {
  crawlId: string;
  onBack: () => void;
}

type TabView = 'crawl' | 'seo';

export function CrawlDetails({ crawlId, onBack }: CrawlDetailsProps) {
  const [crawl, setCrawl] = useState<Crawl | null>(null);
  const [results, setResults] = useState<CrawlResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<TabView>('crawl');

  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    loadCrawlDetails();
  }, [crawlId]);

  const loadCrawlDetails = async () => {
    setLoading(true);
    try {
      const { data: crawlData, error: crawlError } = await supabase
        .from('crawls')
        .select('*')
        .eq('id', crawlId)
        .maybeSingle();

      if (crawlError) throw crawlError;
      if (!crawlData) throw new Error('Crawl not found');

      setCrawl(crawlData);

      const { data: resultsData, error: resultsError } = await supabase
        .from('crawl_results')
        .select('*')
        .eq('crawl_id', crawlId)
        .order('created_at', { ascending: true });

      if (resultsError) throw resultsError;

      setResults(resultsData || []);
    } catch (err: any) {
      showError(err.message || 'Failed to load crawl details');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!crawl || results.length === 0) return;

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
        const kwKey = `kw_${i}` as keyof CrawlResult;
        if (results.some(r => r[kwKey])) {
          keywordColumns.push(i);
        }
      }
    }

    const headers = [];
    headers.push('URL');
    if (crawl.included_meta) {
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
      keywordColumns.forEach(i => headers.push(`KW-${i}`));
    }

    const rows = results.map(entry => {
      const row = [entry.url];

      if (crawl.included_meta) {
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
        keywordColumns.forEach(i => {
          const kwKey = `kw_${i}` as keyof CrawlResult;
          row.push((entry[kwKey] as string) || '');
        });
      }

      return row;
    });

    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `crawl-${crawl.domain}-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess('CSV exported successfully!');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!crawl) {
    return (
      <div className="bg-white  shadow-sm border border-neutral-200 p-12 text-center">
        <p className="text-neutral-600">Crawl not found</p>
        <button
          onClick={onBack}
          className="mt-4 text-neutral-900 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-white  shadow-sm border border-neutral-200 p-8 mb-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-neutral-600 hover:text-neutral-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to saved crawls</span>
        </button>

        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              {crawl.name || `Crawl: ${crawl.domain}`}
            </h1>
            <p className="text-lg text-neutral-600 mb-4">{crawl.domain}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600 mb-4">
              <div className="flex items-center space-x-1">
                <LinkIcon className="w-4 h-4" />
                <span>{crawl.total_urls} URLs</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Saved {formatDate(crawl.created_at)}</span>
              </div>
              {crawl.included_meta && (
                <span className="px-3 py-1 bg-gray-100 text-gray-700  text-xs font-medium">
                  With Metadata
                </span>
              )}
            </div>

            {crawl.tags && crawl.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {crawl.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-neutral-100 text-neutral-700  text-xs font-medium flex items-center space-x-1"
                  >
                    <Tag className="w-3 h-3" />
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={exportToCSV}
            className="ml-4 px-4 py-2 bg-neutral-900 text-white  font-medium hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 transition-all flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="border-b border-neutral-200 bg-white -xl">
          <nav className="flex space-x-1 px-6" aria-label="Tabs">
            <button
              onClick={() => setCurrentTab('crawl')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                currentTab === 'crawl'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              Crawl Results
            </button>
            <button
              onClick={() => setCurrentTab('seo')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                currentTab === 'seo'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              SEO Intelligence
            </button>
          </nav>
        </div>
      </div>

      {currentTab === 'crawl' && (
        <div className="bg-white  shadow-sm border border-neutral-200 p-8 overflow-x-auto">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">
            {results.length} {results.length === 1 ? 'Result' : 'Results'}
          </h2>

          <CrawlResultsTable
            results={results.map(r => ({
              url: r.url,
              title: r.title || undefined,
              description: r.description || undefined,
              status_code: r.status_code || undefined,
              indexable: r.indexable !== null ? r.indexable : undefined,
              canonical_url: r.canonical_url || undefined,
              word_count: r.word_count || undefined,
              h1_tags: r.h1_tags || undefined,
              h2_tags: r.h2_tags || undefined,
              h3_tags: r.h3_tags || undefined,
              h4_tags: r.h4_tags || undefined,
              h5_tags: r.h5_tags || undefined,
              h6_tags: r.h6_tags || undefined,
              images: r.images ? r.images.map(img => ({ src: img, alt: '' })) : undefined,
              links: r.links ? r.links.map(link => ({ href: link, text: '' })) : undefined,
              images_without_alt: r.images_without_alt || undefined,
              kw_1: r.kw_1 || undefined,
              kw_2: r.kw_2 || undefined,
              kw_3: r.kw_3 || undefined,
              kw_4: r.kw_4 || undefined,
              kw_5: r.kw_5 || undefined,
              kw_6: r.kw_6 || undefined,
              kw_7: r.kw_7 || undefined,
              kw_8: r.kw_8 || undefined,
              kw_9: r.kw_9 || undefined,
              kw_10: r.kw_10 || undefined,
              analyzed: r.analyzed,
            }))}
            includeMeta={crawl.included_meta}
            selectedUrls={new Set()}
            analyzingUrls={new Set()}
            onSelectAll={() => {}}
            onSelectUrl={() => {}}
            onAnalyzeUrl={() => {}}
          />
        </div>
      )}

      {currentTab === 'seo' && (
        <div className="bg-white  shadow-sm border border-neutral-200 p-8">
          <p className="text-neutral-600 text-sm">SEO Intelligence is now available as a top-level tab. Please use the main navigation to access it.</p>
        </div>
      )}
    </div>
  );
}
