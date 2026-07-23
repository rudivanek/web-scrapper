import { useState, useEffect } from 'react';
import { supabase, Crawl, SEOAnalysis, SavedItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotification';
import { Loader2, Trash2, Eye, Calendar, Link as LinkIcon, Search, Tag, Globe, Activity } from 'lucide-react';

interface SavedCrawlsProps {
  onViewCrawl: (crawlId: string, itemType: 'crawler' | 'seo') => void;
  refreshTrigger?: number;
}

export function SavedCrawls({ onViewCrawl, refreshTrigger }: SavedCrawlsProps) {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'all' | 'crawler' | 'seo'>('all');
  const [allTags, setAllTags] = useState<string[]>([]);

  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const loadCrawls = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [crawlsResult, seoResult] = await Promise.all([
        supabase
          .from('crawls')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('seo_analyses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (crawlsResult.error) throw crawlsResult.error;
      if (seoResult.error) throw seoResult.error;

      const crawlItems: SavedItem[] = (crawlsResult.data || []).map((crawl: Crawl) => ({
        id: crawl.id,
        type: 'crawler' as const,
        domain: crawl.domain,
        name: crawl.name,
        total_urls: crawl.total_urls,
        tags: crawl.tags,
        tokens_used: crawl.tokens_used,
        tokens_cost: crawl.tokens_cost,
        created_at: crawl.created_at,
      }));

      const seoItems: SavedItem[] = (seoResult.data || []).map((seo: SEOAnalysis) => ({
        id: seo.id,
        type: 'seo' as const,
        domain: seo.domain,
        name: seo.name,
        tags: seo.tags,
        tokens_used: seo.tokens_used,
        tokens_cost: seo.tokens_cost,
        created_at: seo.created_at,
      }));

      const combined = [...crawlItems, ...seoItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setItems(combined);
      setFilteredItems(combined);

      const tags = new Set<string>();
      combined.forEach(item => {
        if (item.tags) {
          item.tags.forEach((tag: string) => tags.add(tag));
        }
      });
      setAllTags(Array.from(tags).sort());
    } catch (err: any) {
      showError(err.message || 'Failed to load saved crawls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCrawls();
  }, [user, refreshTrigger]);

  useEffect(() => {
    let filtered = items;

    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedTag) {
      filtered = filtered.filter(item =>
        item.tags?.includes(selectedTag)
      );
    }

    setFilteredItems(filtered);
  }, [searchQuery, selectedTag, selectedType, items]);

  const handleDelete = async (itemId: string, itemName: string, itemType: 'crawler' | 'seo') => {
    if (!confirm(`Are you sure you want to delete "${itemName || 'this item'}"?`)) {
      return;
    }

    try {
      const tableName = itemType === 'crawler' ? 'crawls' : 'seo_analyses';
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      showSuccess(`${itemType === 'crawler' ? 'Crawl' : 'SEO Analysis'} deleted successfully`);
      loadCrawls();
    } catch (err: any) {
      showError(err.message || 'Failed to delete item');
    }
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

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-white  shadow-sm border border-neutral-200 p-8 mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-6">Saved Crawls</h1>

        <div className="space-y-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center space-x-2 ${
                selectedType === 'all'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <span>All</span>
            </button>
            <button
              onClick={() => setSelectedType('crawler')}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center space-x-2 ${
                selectedType === 'crawler'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Website Crawler</span>
            </button>
            <button
              onClick={() => setSelectedType('seo')}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center space-x-2 ${
                selectedType === 'seo'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>SEO Intelligence</span>
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by domain or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3  border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-colors"
            />
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1.5  text-sm font-medium transition-colors ${
                  selectedTag === null
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                All
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  className={`px-3 py-1.5  text-sm font-medium transition-colors flex items-center space-x-1 ${
                    selectedTag === tag
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  <span>{tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="bg-white  shadow-sm border border-neutral-200 p-12 text-center">
          <p className="text-neutral-600">
            {searchQuery || selectedTag
              ? 'No crawls match your filters'
              : 'No saved crawls yet. Start crawling to save your results!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white  shadow-sm border border-neutral-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    {item.type === 'crawler' ? (
                      <Globe className="w-5 h-5 text-neutral-600" />
                    ) : (
                      <Activity className="w-5 h-5 text-neutral-600" />
                    )}
                    <h3 className="text-xl font-bold text-neutral-900 truncate">
                      {item.name || `${item.type === 'crawler' ? 'Crawl' : 'SEO Analysis'}: ${item.domain}`}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600 mb-3">
                    {item.type === 'crawler' && item.total_urls !== undefined && (
                      <div className="flex items-center space-x-1">
                        <LinkIcon className="w-4 h-4" />
                        <span>{item.total_urls} URLs</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium ${
                      item.type === 'crawler'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {item.type === 'crawler' ? 'Website Crawler' : 'SEO Intelligence'}
                    </span>
                  </div>

                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-neutral-100 text-neutral-700  text-xs font-medium flex items-center space-x-1"
                        >
                          <Tag className="w-3 h-3" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => onViewCrawl(item.id, item.type)}
                    className="p-2 bg-neutral-100 text-neutral-900  hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 transition-all"
                    title="View details"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.name || item.domain, item.type)}
                    className="p-2 bg-gray-50 text-gray-600  hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all"
                    title={`Delete ${item.type === 'crawler' ? 'crawl' : 'SEO analysis'}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
