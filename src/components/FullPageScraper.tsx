import { useState, useEffect } from 'react';
import { scrapeFullPage } from '../lib/firecrawl';
import {
  extractSeoMetadata,
  buildSeoMetadataBlock,
  extractMetaTags,
  extractHeadings,
  extractImages,
  ExtractedMetaTags,
  ExtractedHeadings,
  ExtractedImage,
} from '../lib/htmlExtract';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileCode, Copy, Check, Loader2, Save, Trash2, ExternalLink } from 'lucide-react';

type ResultTab = 'markdown' | 'html' | 'structured';

interface ScrapeResult {
  markdown?: string;
  html?: string;
  metadata?: {
    title?: string;
    description?: string;
    statusCode?: number;
  };
  metaTags?: ExtractedMetaTags;
  headings?: ExtractedHeadings;
  images?: ExtractedImage[];
}

interface SavedPage {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  markdown_content: string;
  html_content: string;
  status_code: number | null;
  created_at: string;
  structured_data: {
    metaTags?: ExtractedMetaTags;
    headings?: ExtractedHeadings;
    imageCount?: number;
  } | null;
}

const NOT_FOUND = 'NOT FOUND';

export function FullPageScraper() {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>('markdown');
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedPages, setSavedPages] = useState<SavedPage[]>([]);
  const [loadingSavedPages, setLoadingSavedPages] = useState(true);
  const [selectedSavedPage, setSelectedSavedPage] = useState<SavedPage | null>(null);

  const handleScrape = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      console.log('[Scrape] Using Firecrawl-based extraction pipeline (same as CRO/SEO)');
      const data = await scrapeFullPage(fullUrl);

      if (data.success && data.data) {
        const html = data.data.html || '';
        const rawHtml = data.data.rawHtml || '';
        const htmlForContent = html || rawHtml;

        // Mirror exact CRO/SEO extraction pipeline
        const seoMeta = (html || rawHtml) ? extractSeoMetadata(html, rawHtml) : null;
        const seoBlock = seoMeta ? buildSeoMetadataBlock(seoMeta) : '';
        const enrichedMarkdown = seoBlock + (data.data.markdown || '');

        const domExtracted = htmlForContent ? extractMetaTags(htmlForContent) : null;
        const metaTags: ExtractedMetaTags | undefined = (seoMeta || domExtracted) ? {
          title: (seoMeta?.metaTitle !== NOT_FOUND ? seoMeta?.metaTitle : '') || domExtracted?.title || '',
          metaDescription: (seoMeta?.metaDescription !== NOT_FOUND ? seoMeta?.metaDescription : '') || domExtracted?.metaDescription || '',
          metaKeywords: domExtracted?.metaKeywords || '',
          ogTitle: (seoMeta?.ogTitle !== NOT_FOUND ? seoMeta?.ogTitle : '') || domExtracted?.ogTitle || '',
          ogDescription: (seoMeta?.ogDescription !== NOT_FOUND ? seoMeta?.ogDescription : '') || domExtracted?.ogDescription || '',
          ogImage: domExtracted?.ogImage || '',
          canonical: (seoMeta?.canonicalUrl !== NOT_FOUND ? seoMeta?.canonicalUrl : '') || domExtracted?.canonical || '',
          robots: domExtracted?.robots || '',
          viewport: domExtracted?.viewport || '',
          charset: domExtracted?.charset || '',
          schemaTypes: domExtracted?.schemaTypes || [],
        } : undefined;

        const headings: ExtractedHeadings | undefined = seoMeta ? {
          h1: seoMeta.h1Tags,
          h2: seoMeta.h2Tags,
          h3: seoMeta.h3Tags,
        } : htmlForContent ? extractHeadings(htmlForContent) : undefined;

        const images = htmlForContent ? extractImages(htmlForContent) : undefined;

        console.log('[Scrape] Extraction complete:', {
          title: metaTags?.title || '(none)',
          h1Count: headings?.h1?.length ?? 0,
          h2Count: headings?.h2?.length ?? 0,
          h3Count: headings?.h3?.length ?? 0,
          canonical: metaTags?.canonical || '(none)',
          schemaTypes: metaTags?.schemaTypes ?? [],
          imageCount: images?.length ?? 0,
        });

        setResult({
          markdown: enrichedMarkdown,
          html: data.data.html || '',
          metadata: data.data.metadata || {},
          metaTags,
          headings,
          images,
        });
      } else {
        setError(data.error || 'Failed to scrape page');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while scraping');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (content: string, type: 'markdown' | 'html') => {
    try {
      await navigator.clipboard.writeText(content);
      if (type === 'markdown') {
        setCopiedMarkdown(true);
        setTimeout(() => setCopiedMarkdown(false), 2000);
      } else {
        setCopiedHtml(true);
        setTimeout(() => setCopiedHtml(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleScrape();
    }
  };

  const loadSavedPages = async () => {
    if (!user) return;

    try {
      setLoadingSavedPages(true);
      const { data, error } = await supabase
        .from('scraped_pages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedPages(data || []);
    } catch (err) {
      console.error('Error loading saved pages:', err);
    } finally {
      setLoadingSavedPages(false);
    }
  };

  useEffect(() => {
    loadSavedPages();
  }, [user]);

  const handleSave = async () => {
    if (!user || !result) return;

    try {
      setSaving(true);
      const { error } = await supabase.from('scraped_pages').insert({
        user_id: user.id,
        url: url,
        title: result.metaTags?.title || result.metadata?.title || null,
        description: result.metaTags?.metaDescription || result.metadata?.description || null,
        markdown_content: result.markdown || '',
        html_content: result.html || '',
        status_code: result.metadata?.statusCode || null,
        metadata: result.metadata || {},
        structured_data: (result.metaTags || result.headings) ? {
          metaTags: result.metaTags,
          headings: result.headings,
          imageCount: result.images?.length ?? 0,
        } : null,
      });

      if (error) throw error;

      await loadSavedPages();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('scraped_pages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (selectedSavedPage?.id === id) {
        setSelectedSavedPage(null);
        setResult(null);
      }

      await loadSavedPages();
    } catch (err) {
      console.error('Error deleting page:', err);
    }
  };

  const handleViewSavedPage = (page: SavedPage) => {
    setSelectedSavedPage(page);
    setUrl(page.url);
    setResult({
      markdown: page.markdown_content,
      html: page.html_content,
      metadata: {
        title: page.title || undefined,
        description: page.description || undefined,
        statusCode: page.status_code || undefined,
      },
      metaTags: page.structured_data?.metaTags,
      headings: page.structured_data?.headings,
    });
  };

  const displayTitle = result?.metaTags?.title || result?.metadata?.title;
  const displayDescription = result?.metaTags?.metaDescription || result?.metadata?.description;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <FileCode className="w-6 h-6 mr-2 text-orange-500" />
          Scrape Full Page
        </h2>
        <p className="text-gray-600">
          Enter a URL to scrape the complete page content in both Markdown and HTML formats
        </p>
      </div>

      <div className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter URL (e.g., example.com or https://example.com)"
            className="flex-1 px-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
            disabled={loading}
          />
          <button
            onClick={handleScrape}
            disabled={loading || !url.trim()}
            className="px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scraping...
              </>
            ) : (
              'Scrape page now'
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="border border-gray-300">
          {(displayTitle || result.metadata?.statusCode) && (
            <div className="p-4 bg-gray-50 border-b border-gray-300">
              {displayTitle && <h3 className="font-semibold text-gray-900">{displayTitle}</h3>}
              {displayDescription && (
                <p className="text-sm text-gray-600 mt-1">{displayDescription}</p>
              )}
              {result.metadata?.statusCode && (
                <p className="text-xs text-gray-500 mt-2">Status Code: {result.metadata.statusCode}</p>
              )}
            </div>
          )}

          <div className="flex border-b border-gray-300">
            <button
              onClick={() => setActiveTab('markdown')}
              className={`flex-1 px-6 py-3 font-medium transition-colors ${
                activeTab === 'markdown'
                  ? 'bg-white text-gray-900 border-b-2 border-gray-900'
                  : 'bg-gray-50 text-gray-600 hover:text-gray-900'
              }`}
            >
              Markdown
            </button>
            <button
              onClick={() => setActiveTab('html')}
              className={`flex-1 px-6 py-3 font-medium transition-colors ${
                activeTab === 'html'
                  ? 'bg-white text-gray-900 border-b-2 border-gray-900'
                  : 'bg-gray-50 text-gray-600 hover:text-gray-900'
              }`}
            >
              HTML
            </button>
            <button
              onClick={() => setActiveTab('structured')}
              className={`flex-1 px-6 py-3 font-medium transition-colors ${
                activeTab === 'structured'
                  ? 'bg-white text-gray-900 border-b-2 border-gray-900'
                  : 'bg-gray-50 text-gray-600 hover:text-gray-900'
              }`}
            >
              Structured
            </button>
          </div>

          <div className="relative">
            {activeTab !== 'structured' && (
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !user}
                  className="px-3 py-2 bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
                {activeTab === 'markdown' ? (
                  <button
                    onClick={() => handleCopy(result.markdown || '', 'markdown')}
                    className="px-3 py-2 bg-gray-900 text-white hover:bg-gray-800 font-medium transition-colors flex items-center gap-2"
                  >
                    {copiedMarkdown ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handleCopy(result.html || '', 'html')}
                    className="px-3 py-2 bg-gray-900 text-white hover:bg-gray-800 font-medium transition-colors flex items-center gap-2"
                  >
                    {copiedHtml ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {activeTab === 'structured' && (
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={handleSave}
                  disabled={saving || !user}
                  className="px-3 py-2 bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="p-6 bg-white">
              {activeTab === 'markdown' && (
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto max-h-[600px] overflow-y-auto">
                  {result.markdown || 'No markdown content available'}
                </pre>
              )}
              {activeTab === 'html' && (
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto max-h-[600px] overflow-y-auto">
                  {result.html || 'No HTML content available'}
                </pre>
              )}
              {activeTab === 'structured' && (
                <StructuredView metaTags={result.metaTags} headings={result.headings} images={result.images} />
              )}
            </div>
          </div>

          {activeTab !== 'structured' && (
            <div className="p-4 bg-gray-50 border-t border-gray-300 flex justify-between items-center text-sm text-gray-600">
              <div>
                {activeTab === 'markdown'
                  ? `Markdown: ${(result.markdown || '').length.toLocaleString()} characters`
                  : `HTML: ${(result.html || '').length.toLocaleString()} characters`
                }
              </div>
            </div>
          )}
        </div>
      )}

      {savedPages.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Saved Pages</h3>

          {loadingSavedPages ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="grid gap-4">
              {savedPages.map((page) => (
                <div
                  key={page.id}
                  className={`border border-gray-300 p-4 transition-all ${
                    selectedSavedPage?.id === page.id ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {page.title || 'Untitled Page'}
                      </h4>
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-2"
                      >
                        {page.url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {page.description && (
                        <p className="text-sm text-gray-600 mb-2">{page.description}</p>
                      )}
                      <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                        <span>Scraped: {new Date(page.created_at).toLocaleDateString()}</span>
                        {page.status_code && <span>Status: {page.status_code}</span>}
                        <span>MD: {page.markdown_content.length.toLocaleString()} chars</span>
                        <span>HTML: {page.html_content.length.toLocaleString()} chars</span>
                        {page.structured_data?.headings?.h1?.length ? (
                          <span className="text-emerald-600">H1: {page.structured_data.headings.h1[0]?.slice(0, 40) || '—'}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleViewSavedPage(page)}
                        className="px-3 py-1 bg-gray-900 text-white hover:bg-gray-800 font-medium transition-colors text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(page.id)}
                        className="px-3 py-1 bg-red-600 text-white hover:bg-red-700 font-medium transition-colors text-sm flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface StructuredViewProps {
  metaTags?: ExtractedMetaTags;
  headings?: ExtractedHeadings;
  images?: ExtractedImage[];
}

function StructuredView({ metaTags, headings, images }: StructuredViewProps) {
  if (!metaTags && !headings) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        No structured data extracted. Scrape a page to see structured fields.
      </p>
    );
  }

  return (
    <div className="space-y-6 text-sm max-h-[600px] overflow-y-auto pr-2">
      {metaTags && (
        <section>
          <h4 className="font-bold text-gray-700 uppercase tracking-wide text-xs mb-3">Meta Tags</h4>
          <table className="w-full border-collapse">
            <tbody>
              {([
                ['Title', metaTags.title],
                ['Meta Description', metaTags.metaDescription],
                ['OG Title', metaTags.ogTitle],
                ['OG Description', metaTags.ogDescription],
                ['OG Image', metaTags.ogImage],
                ['Canonical', metaTags.canonical],
                ['Robots', metaTags.robots],
                ['Keywords', metaTags.metaKeywords],
              ] as [string, string][]).filter(([, v]) => v).map(([label, value]) => (
                <tr key={label} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-medium text-gray-500 w-36 align-top">{label}</td>
                  <td className="py-2 text-gray-800 break-all">{value}</td>
                </tr>
              ))}
              {metaTags.schemaTypes.length > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-medium text-gray-500 w-36 align-top">Schema Types</td>
                  <td className="py-2 text-gray-800">{metaTags.schemaTypes.join(', ')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {headings && (headings.h1.length > 0 || headings.h2.length > 0 || headings.h3.length > 0) && (
        <section>
          <h4 className="font-bold text-gray-700 uppercase tracking-wide text-xs mb-3">Heading Structure</h4>
          <div className="space-y-2">
            {headings.h1.map((h, i) => (
              <div key={`h1-${i}`} className="flex gap-2">
                <span className="shrink-0 font-bold text-gray-900 w-6">H1</span>
                <span className="text-gray-800">{h}</span>
              </div>
            ))}
            {headings.h2.map((h, i) => (
              <div key={`h2-${i}`} className="flex gap-2 pl-4">
                <span className="shrink-0 font-semibold text-gray-600 w-6">H2</span>
                <span className="text-gray-700">{h}</span>
              </div>
            ))}
            {headings.h3.map((h, i) => (
              <div key={`h3-${i}`} className="flex gap-2 pl-8">
                <span className="shrink-0 font-medium text-gray-500 w-6">H3</span>
                <span className="text-gray-600">{h}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {images && images.length > 0 && (
        <section>
          <h4 className="font-bold text-gray-700 uppercase tracking-wide text-xs mb-3">
            Images ({images.length} total — {images.filter(i => i.hasAlt).length} with alt text)
          </h4>
          <div className="space-y-1">
            {images.slice(0, 20).map((img, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className={`shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded ${img.hasAlt ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {img.hasAlt ? 'ALT' : 'NO ALT'}
                </span>
                <span className="text-gray-600 break-all text-xs">{img.src || '(no src)'}</span>
              </div>
            ))}
            {images.length > 20 && (
              <p className="text-xs text-gray-400 mt-1">…and {images.length - 20} more images</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
