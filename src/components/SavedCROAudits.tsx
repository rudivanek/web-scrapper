import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle, ChevronRight, Trash2, Clock, CheckCircle, XCircle, BarChart3, Calendar, ExternalLink } from 'lucide-react';

interface SavedAudit {
  id: string;
  brand_name: string;
  page_type: string;
  target_url: string | null;
  status: string;
  weighted_score: number | null;
  detected_language: string | null;
  model_used: string | null;
  created_at: string;
  updated_at: string;
  structured_result_json: any;
  seo_result_json: any;
  copy_result_json: any;
  copyzap_result_json: any;
}

interface SavedCROAuditsProps {
  onLoadAudit: (audit: SavedAudit) => void;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle className="w-3 h-3" />
        Completed
      </span>
    );
  }
  if (status === 'processing' || status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3" />
        {status === 'processing' ? 'Processing' : 'Pending'}
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-3 h-3" />
        Failed
      </span>
    );
  }
  return null;
}

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 70 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
    score >= 45 ? 'text-amber-700 bg-amber-50 border-amber-200' :
    'text-red-700 bg-red-50 border-red-200';

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${color}`}>
      <BarChart3 className="w-3 h-3" />
      {score}/100
    </span>
  );
}

export function SavedCROAudits({ onLoadAudit }: SavedCROAuditsProps) {
  const [audits, setAudits] = useState<SavedAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAudits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('audits')
        .select('id, brand_name, page_type, target_url, status, weighted_score, detected_language, model_used, created_at, updated_at, structured_result_json, seo_result_json, copy_result_json, copyzap_result_json')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setAudits(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this audit? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const { error: delError } = await supabase.from('audits').delete().eq('id', id);
      if (delError) throw delError;
      setAudits(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete audit');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">Loading saved audits...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg flex gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-red-800 font-medium">Failed to load audits</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={fetchAudits}
            className="mt-3 text-sm px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded transition-colors font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (audits.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-lg">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">No saved audits yet</p>
        <p className="text-gray-400 text-sm mt-1">Run your first CRO audit to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">{audits.length} audit{audits.length !== 1 ? 's' : ''} saved</p>
        <button
          onClick={fetchAudits}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      {audits.map(audit => (
        <div
          key={audit.id}
          onClick={() => audit.status === 'completed' && onLoadAudit(audit)}
          className={`group bg-white border border-gray-200 rounded-lg p-4 transition-all ${
            audit.status === 'completed'
              ? 'hover:border-gray-400 hover:shadow-sm cursor-pointer'
              : 'opacity-75 cursor-default'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="font-semibold text-gray-900 text-sm truncate">{audit.brand_name}</span>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{audit.page_type}</span>
                <StatusBadge status={audit.status} />
                {audit.weighted_score !== null && audit.status === 'completed' && (
                  <ScorePill score={Math.round(audit.weighted_score)} />
                )}
              </div>

              {audit.target_url && (
                <div className="flex items-center gap-1 mb-2">
                  <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-400 truncate max-w-xs">{audit.target_url}</span>
                </div>
              )}

              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Calendar className="w-3 h-3" />
                <span>{new Date(audit.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={(e) => handleDelete(audit.id, e)}
                disabled={deletingId === audit.id}
                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                title="Delete audit"
              >
                {deletingId === audit.id
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />
                }
              </button>
              {audit.status === 'completed' && (
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
