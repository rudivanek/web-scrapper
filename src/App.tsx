import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useNotification } from './hooks/useNotification';
import { Auth } from './components/Auth';
import { Crawler } from './components/Crawler';
import { SavedCrawls } from './components/SavedCrawls';
import { CrawlDetails } from './components/CrawlDetails';
import { TokenUsage } from './components/TokenUsage';
import { Notification } from './components/Notification';
import { SEOIntelligence } from './components/seo-intelligence/SEOIntelligence';
import { FullPageScraper } from './components/FullPageScraper';
import { CROAudit } from './components/CROAudit';
import { BrandingExtractor } from './components/BrandingExtractor';
import { PageInteractor } from './components/PageInteractor';
import { DesignExtractor } from './components/DesignExtractor';
import { ApiKeyModal } from './components/ApiKeyModal';
import { LogOut, Home, Archive, DollarSign, Loader2, Activity, Globe, Shell, FileCode, TrendingUp, Paintbrush, MousePointer2, Wand2 } from 'lucide-react';

type View = 'crawl' | 'saved' | 'details' | 'seo-details' | 'tokens' | 'cro-audit';
type CrawlTab = 'crawler' | 'seo' | 'fullpage' | 'branding' | 'interact' | 'design';

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const { notification, clearNotification } = useNotification();
  const [anthropicKey, setAnthropicKey] = useState(() => {
    const saved = sessionStorage.getItem('anthropic_api_key');
    return saved || '';
  });
  const [currentView, setCurrentView] = useState<View>(() => {
    const saved = sessionStorage.getItem('app_view');
    return (saved as View) || 'crawl';
  });
  const [activeCrawlTab, setActiveCrawlTab] = useState<CrawlTab>(() => {
    const saved = sessionStorage.getItem('app_crawl_tab');
    return (saved as CrawlTab) || 'crawler';
  });

  useEffect(() => {
    sessionStorage.setItem('app_view', currentView);
  }, [currentView]);

  useEffect(() => {
    sessionStorage.setItem('app_crawl_tab', activeCrawlTab);
  }, [activeCrawlTab]);

  useEffect(() => {
    if (currentView !== 'cro-audit') {
      document.title = 'Sharpen.Studio';
    }
  }, [currentView]);

  useEffect(() => {
    if (anthropicKey) {
      sessionStorage.setItem('anthropic_api_key', anthropicKey);
    }
  }, [anthropicKey]);

  const [selectedCrawlId, setSelectedCrawlId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const handleViewCrawl = (crawlId: string, itemType: 'crawler' | 'seo') => {
    setSelectedCrawlId(crawlId);
    setCurrentView(itemType === 'crawler' ? 'details' : 'seo-details');
  };

  const handleBackToSaved = () => {
    setSelectedCrawlId(null);
    setCurrentView('saved');
  };

  const handleSaveSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSignOut = async () => {
    await signOut();
    sessionStorage.removeItem('app_view');
    sessionStorage.removeItem('app_crawl_tab');
    sessionStorage.removeItem('anthropic_api_key');
    sessionStorage.removeItem('cro_audit_tab');
    sessionStorage.removeItem('cro_show_history');
    sessionStorage.removeItem('cro_url_input');
    sessionStorage.removeItem('cro_scraped_data');
    sessionStorage.removeItem('cro_brand_name');
    sessionStorage.removeItem('cro_page_type');
    sessionStorage.removeItem('cro_audit_id');
    sessionStorage.removeItem('cro_result');
    sessionStorage.removeItem('cro_seo_result');
    sessionStorage.removeItem('cro_copy_result');
    sessionStorage.removeItem('cro_copyzap_result');
    setCurrentView('crawl');
    setActiveCrawlTab('crawler');
    setAnthropicKey('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Auth />
        {notification && (
          <Notification
            type={notification.type}
            message={notification.message}
            onClose={clearNotification}
          />
        )}
      </>
    );
  }

  const handleSkipApiKey = () => {
    setShowApiKeyModal(false);
  };

  const handleKeyConfirmed = (key: string) => {
    setAnthropicKey(key);
    setShowApiKeyModal(false);
  };

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white text-black border-b border-gray-300 sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between pt-8 pb-8">
            <div className="flex items-baseline">
              <h1 className="text-3xl font-bold tracking-tight flex items-center">
                <Shell className="w-8 h-8 text-orange-500 mr-3" />
                Web-Scraper
              </h1>
              <span className="ml-3 text-sm text-gray-500 translate-y-[-3px]">V8</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-neutral-600">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      <nav className="bg-white border-b border-gray-300 sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('crawl')}
                className={`flex items-center space-x-2 px-4 py-2 font-medium transition-colors ${
                  currentView === 'crawl'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Scrape</span>
              </button>
              <button
                onClick={() => setCurrentView('saved')}
                className={`flex items-center space-x-2 px-4 py-2 font-medium transition-colors ${
                  currentView === 'saved' || currentView === 'details'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Archive className="w-4 h-4" />
                <span>Saved Crawls</span>
              </button>
              <button
                onClick={() => setCurrentView('tokens')}
                className={`flex items-center space-x-2 px-4 py-2 font-medium transition-colors ${
                  currentView === 'tokens'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Token Usage</span>
              </button>
              <button
                onClick={() => setCurrentView('cro-audit')}
                className={`flex items-center space-x-2 px-4 py-2 font-medium transition-colors ${
                  currentView === 'cro-audit'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>CRO Audit</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-8 px-4 sm:px-6 lg:px-8">
        {currentView === 'crawl' && (
          <div className="w-full max-w-7xl mx-auto">
            <div className="bg-white shadow-sm border border-gray-300 border-b-0">
              <div className="flex border-b border-gray-300">
                <button
                  onClick={() => setActiveCrawlTab('crawler')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeCrawlTab === 'crawler'
                      ? 'bg-white text-gray-900 border-b-2 border-gray-900'
                      : 'bg-gray-50 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Globe className="w-4 h-4" />
                    <span>Website Crawler</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveCrawlTab('fullpage')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeCrawlTab === 'fullpage'
                      ? 'bg-white text-gray-900 border-b-2 border-gray-900'
                      : 'bg-gray-50 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <FileCode className="w-4 h-4" />
                    <span>Scrape full Page</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveCrawlTab('seo')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeCrawlTab === 'seo'
                      ? 'bg-white text-gray-900 border-b-2 border-gray-900'
                      : 'bg-gray-50 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Activity className="w-4 h-4" />
                    <span>SEO Intelligence</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveCrawlTab('branding')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeCrawlTab === 'branding'
                      ? 'bg-white text-gray-900 border-b-2 border-gray-900'
                      : 'bg-gray-50 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Paintbrush className="w-4 h-4" />
                    <span>Branding</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveCrawlTab('interact')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeCrawlTab === 'interact'
                      ? 'bg-white text-gray-900 border-b-2 border-gray-900'
                      : 'bg-gray-50 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <MousePointer2 className="w-4 h-4" />
                    <span>Interact</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveCrawlTab('design')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeCrawlTab === 'design'
                      ? 'bg-white text-gray-900 border-b-2 border-gray-900'
                      : 'bg-gray-50 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Wand2 className="w-4 h-4" />
                    <span>Design Extract</span>
                  </div>
                </button>
              </div>
            </div>
            <div className="bg-white shadow-sm border border-gray-300 border-t-0">
              {activeCrawlTab === 'crawler' && <Crawler onSaveSuccess={handleSaveSuccess} />}
              {activeCrawlTab === 'fullpage' && <FullPageScraper />}
              {activeCrawlTab === 'seo' && <SEOIntelligence />}
              {activeCrawlTab === 'branding' && <BrandingExtractor anthropicKey={anthropicKey || undefined} />}
              {activeCrawlTab === 'interact' && <PageInteractor />}
              {activeCrawlTab === 'design' && <DesignExtractor anthropicKey={anthropicKey || undefined} />}
            </div>
          </div>
        )}
        {currentView === 'saved' && (
          <SavedCrawls onViewCrawl={handleViewCrawl} refreshTrigger={refreshTrigger} />
        )}
        {currentView === 'details' && selectedCrawlId && (
          <CrawlDetails crawlId={selectedCrawlId} onBack={handleBackToSaved} />
        )}
        {currentView === 'seo-details' && selectedCrawlId && (
          <div className="w-full max-w-7xl mx-auto">
            <div className="mb-4">
              <button
                onClick={handleBackToSaved}
                className="px-4 py-2 bg-neutral-100 text-neutral-900 hover:bg-neutral-200 font-medium transition-colors"
              >
                ← Back to Saved Crawls
              </button>
            </div>
            <div className="bg-white shadow-sm border border-gray-300">
              <SEOIntelligence savedAnalysisId={selectedCrawlId} />
            </div>
          </div>
        )}
        {currentView === 'tokens' && <TokenUsage />}
        {currentView === 'cro-audit' && (
          <div className="w-full max-w-7xl mx-auto">
            {!anthropicKey ? (
              <div className="bg-white shadow-sm border border-gray-300 p-8 text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-4">API Key Required</h2>
                <p className="text-gray-600 mb-6">
                  The CRO Audit feature requires an Anthropic API key to analyze your pages.
                </p>
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="px-6 py-3 bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors"
                >
                  Enter API Key
                </button>
              </div>
            ) : (
              <CROAudit anthropicKey={anthropicKey} />
            )}
          </div>
        )}
      </main>

      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={clearNotification}
        />
      )}
    </div>

    {showApiKeyModal && (
      <ApiKeyModal onKeyConfirmed={handleKeyConfirmed} onSkip={handleSkipApiKey} />
    )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
