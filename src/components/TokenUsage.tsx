import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotification';
import { Loader2, DollarSign, Coins, Calendar, Globe, Activity } from 'lucide-react';

interface TokenActivity {
  id: string;
  name: string;
  type: 'crawl' | 'seo';
  tokens_used: number;
  tokens_cost: number;
  created_at: string;
}

export function TokenUsage() {
  const [activities, setActivities] = useState<TokenActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalCost, setTotalCost] = useState(0);

  const { user } = useAuth();
  const { showError } = useNotification();

  const loadTokenUsage = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: crawlData, error: crawlError } = await supabase
        .from('crawls')
        .select('*')
        .eq('user_id', user.id)
        .not('tokens_used', 'is', null)
        .order('created_at', { ascending: false });

      if (crawlError) throw crawlError;

      const { data: seoData, error: seoError } = await supabase
        .from('seo_analyses')
        .select('*')
        .eq('user_id', user.id)
        .not('tokens_used', 'is', null)
        .order('created_at', { ascending: false });

      if (seoError) throw seoError;

      const crawlActivities: TokenActivity[] = (crawlData || []).map(crawl => ({
        id: crawl.id,
        name: crawl.name || `Crawl: ${crawl.domain}`,
        type: 'crawl' as const,
        tokens_used: crawl.tokens_used || 0,
        tokens_cost: crawl.tokens_cost || 0,
        created_at: crawl.created_at
      }));

      const seoActivities: TokenActivity[] = (seoData || []).map(analysis => ({
        id: analysis.id,
        name: analysis.name || `SEO: ${analysis.domain}`,
        type: 'seo' as const,
        tokens_used: analysis.tokens_used || 0,
        tokens_cost: analysis.tokens_cost || 0,
        created_at: analysis.created_at
      }));

      const allActivities = [...crawlActivities, ...seoActivities].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setActivities(allActivities);

      const tokens = allActivities.reduce((sum, activity) => sum + activity.tokens_used, 0);
      const cost = allActivities.reduce((sum, activity) => sum + activity.tokens_cost, 0);

      setTotalTokens(tokens);
      setTotalCost(cost);
    } catch (err: any) {
      showError(err.message || 'Failed to load token usage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokenUsage();
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadTokenUsage();
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <div className="bg-white  shadow-sm border border-neutral-200 p-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Token Usage & Costs</h1>
        <p className="text-sm text-neutral-600 mb-6">
          Track your API usage across all activities
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100  p-6 border border-gray-200">
            <div className="flex items-center space-x-3 mb-2">
              <Coins className="w-6 h-6 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Total Tokens Used</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalTokens.toLocaleString()}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100  p-6 border border-gray-200">
            <div className="flex items-center space-x-3 mb-2">
              <DollarSign className="w-6 h-6 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Total Cost</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white  shadow-sm border border-neutral-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-neutral-200">
          <h2 className="text-2xl font-bold text-neutral-900">Activity History</h2>
        </div>

        {activities.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-neutral-600">No token usage data yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">
                    Activity
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-700">
                    Date & Time
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-neutral-700">
                    Tokens Used
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-neutral-700">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {activities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {activity.type === 'crawl' ? (
                          <Globe className="w-4 h-4 text-neutral-400" />
                        ) : (
                          <Activity className="w-4 h-4 text-neutral-400" />
                        )}
                        <div className="font-medium text-neutral-900">
                          {activity.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5  text-xs font-medium ${
                        activity.type === 'crawl'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {activity.type === 'crawl' ? 'Crawler' : 'SEO'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-sm text-neutral-600">
                        <Calendar className="w-4 h-4 text-neutral-400" />
                        <span>{formatDate(activity.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Coins className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-neutral-900">
                          {activity.tokens_used.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-neutral-900">
                          {formatCurrency(activity.tokens_cost)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
