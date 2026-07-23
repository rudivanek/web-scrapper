import { useState } from 'react';
import { FileText, AlertCircle, Loader2, Download } from 'lucide-react';
import { scrapeFullPage } from '../lib/firecrawl';

export interface CROAuditFormData {
  brandName: string;
  pageType: string;
  targetUrl: string;
  pageMarkdown: string;
  competitor1: string;
  competitor2: string;
  competitor3: string;
  notes: string;
}

interface CROAuditFormProps {
  onSubmit: (data: CROAuditFormData) => void;
  loading: boolean;
}

const PAGE_TYPES = [
  'Homepage',
  'Landing Page',
  'Services',
  'Pricing',
  'About',
  'Product',
  'Blog',
  'E-commerce',
  'Other',
];

export function CROAuditForm({ onSubmit, loading }: CROAuditFormProps) {
  const [formData, setFormData] = useState<CROAuditFormData>({
    brandName: '',
    pageType: 'Landing Page',
    targetUrl: '',
    pageMarkdown: '',
    competitor1: '',
    competitor2: '',
    competitor3: '',
    notes: '',
  });

  const [primaryUrl, setPrimaryUrl] = useState('');
  const [competitor1Url, setCompetitor1Url] = useState('');
  const [competitor2Url, setCompetitor2Url] = useState('');
  const [competitor3Url, setCompetitor3Url] = useState('');

  const [scraping, setScraping] = useState(false);
  const [scrapingStatus, setScrapingStatus] = useState('');
  const [scrapingError, setScrapingError] = useState<string | null>(null);
  const [scraped, setScraped] = useState(false);

  const [warnings, setWarnings] = useState<string[]>([]);

  const handleScrapePages = async () => {
    if (!primaryUrl.trim()) {
      setScrapingError('Please enter a primary page URL');
      return;
    }

    setScraping(true);
    setScrapingError(null);
    setScraped(false);

    try {
      setScrapingStatus('Scraping primary page...');
      const fullPrimaryUrl = primaryUrl.startsWith('http') ? primaryUrl : `https://${primaryUrl}`;
      const primaryResult = await scrapeFullPage(fullPrimaryUrl);

      if (!primaryResult.success || !primaryResult.data?.markdown) {
        throw new Error('Failed to scrape primary page');
      }

      setFormData(prev => ({
        ...prev,
        targetUrl: fullPrimaryUrl,
        pageMarkdown: primaryResult.data.markdown,
      }));

      if (competitor1Url.trim()) {
        setScrapingStatus('Scraping competitor 1...');
        const fullComp1Url = competitor1Url.startsWith('http') ? competitor1Url : `https://${competitor1Url}`;
        const comp1Result = await scrapeFullPage(fullComp1Url);
        if (comp1Result.success && comp1Result.data?.markdown) {
          setFormData(prev => ({ ...prev, competitor1: comp1Result.data.markdown }));
        }
      }

      if (competitor2Url.trim()) {
        setScrapingStatus('Scraping competitor 2...');
        const fullComp2Url = competitor2Url.startsWith('http') ? competitor2Url : `https://${competitor2Url}`;
        const comp2Result = await scrapeFullPage(fullComp2Url);
        if (comp2Result.success && comp2Result.data?.markdown) {
          setFormData(prev => ({ ...prev, competitor2: comp2Result.data.markdown }));
        }
      }

      if (competitor3Url.trim()) {
        setScrapingStatus('Scraping competitor 3...');
        const fullComp3Url = competitor3Url.startsWith('http') ? competitor3Url : `https://${competitor3Url}`;
        const comp3Result = await scrapeFullPage(fullComp3Url);
        if (comp3Result.success && comp3Result.data?.markdown) {
          setFormData(prev => ({ ...prev, competitor3: comp3Result.data.markdown }));
        }
      }

      setScrapingStatus('Pages scraped successfully!');
      setScraped(true);
    } catch (err) {
      setScrapingError(err instanceof Error ? err.message : 'Failed to scrape pages');
    } finally {
      setScraping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newWarnings: string[] = [];

    if (formData.pageMarkdown.length < 1000) {
      newWarnings.push('Primary markdown seems short (< 1000 chars). Results may be limited.');
    }

    setWarnings(newWarnings);

    onSubmit(formData);
  };

  const isValid =
    formData.brandName.trim() !== '' &&
    formData.pageType !== '' &&
    formData.pageMarkdown.trim() !== '';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white border border-gray-300 p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-gray-900" />
          <h2 className="text-2xl font-bold text-gray-900">CRO Audit Input</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="brandName" className="block text-sm font-semibold text-gray-900 mb-2">
              Brand Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="brandName"
              required
              value={formData.brandName}
              onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Enter brand name"
            />
          </div>

          <div>
            <label htmlFor="pageType" className="block text-sm font-semibold text-gray-900 mb-2">
              Page Type <span className="text-red-600">*</span>
            </label>
            <select
              id="pageType"
              required
              value={formData.pageType}
              onChange={(e) => setFormData({ ...formData, pageType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              {PAGE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="border border-gray-300 p-4 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-gray-900" />
              Scrape Pages
            </h3>

            <div className="space-y-3">
              <div>
                <label htmlFor="primaryUrl" className="block text-sm font-semibold text-gray-900 mb-2">
                  Primary Page URL <span className="text-red-600">*</span>
                </label>
                <input
                  type="url"
                  id="primaryUrl"
                  value={primaryUrl}
                  onChange={(e) => setPrimaryUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="https://example.com"
                  disabled={scraping}
                />
              </div>

              <div className="border-t border-gray-200 pt-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Competitor URLs <span className="text-gray-500 text-xs font-normal">(Optional)</span>
                </h4>
                <div className="space-y-2">
                  <input
                    type="url"
                    value={competitor1Url}
                    onChange={(e) => setCompetitor1Url(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="Competitor 1 URL"
                    disabled={scraping}
                  />
                  <input
                    type="url"
                    value={competitor2Url}
                    onChange={(e) => setCompetitor2Url(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="Competitor 2 URL"
                    disabled={scraping}
                  />
                  <input
                    type="url"
                    value={competitor3Url}
                    onChange={(e) => setCompetitor3Url(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="Competitor 3 URL"
                    disabled={scraping}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleScrapePages}
                disabled={scraping || !primaryUrl.trim()}
                className="w-full px-4 py-3 bg-orange-600 text-white font-bold hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {scraping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {scrapingStatus}
                  </>
                ) : scraped ? (
                  <>
                    <Download className="w-4 h-4" />
                    Pages Scraped - Scrape Again
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Scrape All Pages
                  </>
                )}
              </button>

              {scrapingError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
                  {scrapingError}
                </div>
              )}

              {scraped && !scraping && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-sm">
                  <div className="font-semibold mb-1">Pages scraped successfully!</div>
                  <div className="text-xs">
                    Primary: {formData.pageMarkdown.length.toLocaleString()} characters
                    {formData.competitor1 && ` | Competitor 1: ${formData.competitor1.length.toLocaleString()} chars`}
                    {formData.competitor2 && ` | Competitor 2: ${formData.competitor2.length.toLocaleString()} chars`}
                    {formData.competitor3 && ` | Competitor 3: ${formData.competitor3.length.toLocaleString()} chars`}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-semibold text-gray-900 mb-2">
              Additional Notes <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Any specific aspects you'd like us to focus on?"
              rows={4}
            />
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-yellow-900 text-sm mb-1">Warnings</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  {warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <button
            type="submit"
            disabled={!isValid || loading}
            className="w-full px-6 py-3 bg-gray-900 text-white font-bold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Running CRO Audit...' : 'Run CRO Audit'}
          </button>
        </div>
      </div>
    </form>
  );
}
