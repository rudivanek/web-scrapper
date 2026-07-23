import { useState, useRef, createContext, useContext, useEffect } from 'react';
import { ChevronDown, ChevronUp, Download, FileText, Printer, AlertTriangle, CheckCircle, MinusCircle, XCircle, Users, Zap, Target, Smartphone, Bot, DollarSign, Copy, ClipboardList, MapPin, Sparkles, Loader2, Hash, Search, PenLine, FileDown, Info } from 'lucide-react';
import type { AuditResult, PriorityItem, EmotionalTrigger, ReadyToUseContentBlock, WireframeZoneStatus } from '../types/audit';
import { exportToPdf } from '../lib/exportPdf';
import { getScoreExplanation, getScoreBenchmark, getScoreLabel, getScoreLabelColor, SECTION_EXPLANATIONS, COLUMN_EXPLANATIONS, STATUS_EXPLANATIONS } from '../lib/clientExplanations';
import { CRO_GLOSSARY } from '../lib/glossaries';
import { getLabels } from '../lib/i18n';
import type { Labels } from '../lib/i18n';

interface CROAuditResultsProps {
  result: AuditResult;
  onExportMarkdown: () => void;
  onExportWord: () => void;
  onExportHtml?: () => void;
  exportFilename?: string;
  targetUrl?: string;
  brandName?: string;
  pageType?: string;
  onGenerateContentSuggestions?: () => void;
  contentSuggestionsLoading?: boolean;
  contentSuggestionsError?: string | null;
  onRunSEOAudit?: () => void;
  seoLoading?: boolean;
  seoError?: string | null;
  hasSEOResult?: boolean;
  onSwitchToSEO?: () => void;
  onRunCopyAnalysis?: () => void;
  copyLoading?: boolean;
  copyError?: string | null;
  hasCopyResult?: boolean;
  onSwitchToCopy?: () => void;
}

function formatExportDate(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const HH = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${dd}-${mm}-${yy}_${HH}-${min}`;
}

const PrintContext = createContext(false);

function ContentCard({ block, copyLabel, copiedLabel }: { block: ReadyToUseContentBlock; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(block.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-gray-900">{block.sectionTitle}</h4>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin className="w-3 h-3 text-blue-500 flex-shrink-0" />
            <span className="text-xs text-blue-600 font-medium">{block.placement}</span>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded border transition-colors"
          style={copied ? { background: '#f0fdf4', borderColor: '#86efac', color: '#15803d' } : { background: 'white', borderColor: '#e5e7eb', color: '#374151' }}
        >
          <Copy className="w-3 h-3" />
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <div className="px-4 py-3">
        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{block.content}</pre>
      </div>
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500 italic">{block.rationale}</p>
      </div>
    </div>
  );
}

function impactColor(val: string) {
  if (val === 'High') return 'bg-red-100 text-red-800 border border-red-200';
  if (val === 'Medium') return 'bg-amber-100 text-amber-800 border border-amber-200';
  return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
}

function effortColor(val: string) {
  if (val === 'High') return 'bg-red-100 text-red-800 border border-red-200';
  if (val === 'Medium') return 'bg-amber-100 text-amber-800 border border-amber-200';
  return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
}

function scoreColor(score: number) {
  if (score >= 7.5) return 'text-emerald-600';
  if (score >= 6.0) return 'text-amber-600';
  return 'text-red-600';
}

function scoreBarColor(score: number) {
  if (score >= 7.5) return 'bg-emerald-500';
  if (score >= 6.0) return 'bg-amber-500';
  return 'bg-red-500';
}

function wireframeBorderColor(status: WireframeZoneStatus): string {
  if (status === 'exists_correct') return 'border-l-emerald-400';
  if (status === 'move_up' || status === 'move_down') return 'border-l-blue-400';
  if (status === 'missing') return 'border-l-red-400';
  return 'border-l-gray-300';
}

function wireframeBadgeStyle(status: WireframeZoneStatus): string {
  if (status === 'exists_correct') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (status === 'move_up' || status === 'move_down') return 'bg-blue-50 text-blue-700 border border-blue-200';
  if (status === 'missing') return 'bg-red-50 text-red-700 border border-red-200';
  return 'bg-gray-100 text-gray-600 border border-gray-200';
}

function TriggerStatus({ present, presentLabel, partialLabel, absentLabel }: {
  present: EmotionalTrigger['present'];
  presentLabel: string;
  partialLabel: string;
  absentLabel: string;
}) {
  if (present === 'yes') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full" title={STATUS_EXPLANATIONS.present}>
      <CheckCircle className="w-3 h-3" /> {presentLabel}
    </span>
  );
  if (present === 'partial') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full" title={STATUS_EXPLANATIONS.partial}>
      <MinusCircle className="w-3 h-3" /> {partialLabel}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full" title={STATUS_EXPLANATIONS.missing}>
      <XCircle className="w-3 h-3" /> {absentLabel}
    </span>
  );
}

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState('');
  useEffect(() => {
    const handleScroll = () => {
      let current = '';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120) current = id;
        }
      }
      setActive(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return active;
}

function SectionAnchor({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    window.history.replaceState(null, '', `#${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleClick}
      className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-1 rounded hover:bg-gray-200 print:hidden flex-shrink-0"
      title="Copy link to section"
    >
      {copied
        ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
        : <Hash className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
      }
    </button>
  );
}

function CollapsibleSection({ id, label, icon, defaultOpen = true, children }: { id: string; label: string; icon?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const isPrinting = useContext(PrintContext);
  const isOpen = open || isPrinting;
  return (
    <div id={id} className="bg-white border border-gray-200 rounded-lg overflow-hidden group">
      <div className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-3 flex-1 text-left min-w-0"
        >
          {icon && <span className="text-gray-500 flex-shrink-0">{icon}</span>}
          <h2 className="text-lg font-bold text-gray-900">{label}</h2>
        </button>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <SectionAnchor id={id} />
          <button onClick={() => setOpen(o => !o)} className="p-1 print:hidden">
            {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
        </div>
      </div>
      {isOpen && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

function PriorityBadge({ item, L }: { item: PriorityItem; L: Labels }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors border-b border-gray-100">
      <td className="px-4 py-3">
        <span className="w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">{item.priority}</span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-800 font-medium">{item.recommendation}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{item.category}</td>
      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${impactColor(item.impact)}`}>{L.impactLabels[item.impact] ?? item.impact}</span></td>
      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${effortColor(item.effort)}`}>{L.impactLabels[item.effort] ?? item.effort}</span></td>
      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{item.timeframe}</td>
    </tr>
  );
}

export function CROAuditResults({ result, onExportMarkdown, onExportWord, onExportHtml, exportFilename, targetUrl, brandName, pageType, onGenerateContentSuggestions, contentSuggestionsLoading, contentSuggestionsError, onRunSEOAudit, seoLoading, seoError, hasSEOResult, onSwitchToSEO, onRunCopyAnalysis, copyLoading, copyError, hasCopyResult, onSwitchToCopy }: CROAuditResultsProps) {
  const L = getLabels(result.language);
  const tocRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [stickyTop, setStickyTop] = useState(100);
  const [exportingPdf, setExportingPdf] = useState(false);
  const activeSection = useActiveSection(L.croToc.map(s => s.id));

  useEffect(() => {
    const measure = () => {
      const header = document.querySelector('header');
      setStickyTop(header ? header.offsetHeight : 100);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const hasContentSuggestions = !!(result.readyToUseContent && result.readyToUseContent.length > 0);

  const tocSections = hasContentSuggestions
    ? [
        ...L.croToc.slice(0, 5),
        { id: 'e2content', label: 'E2. Content' },
        ...L.croToc.slice(5),
      ]
    : L.croToc;

  const groupedContent = hasContentSuggestions
    ? result.readyToUseContent!.reduce((acc, block) => {
        const cat = block.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(block);
        return acc;
      }, {} as Record<string, ReadyToUseContentBlock[]>)
    : {};

  const handleCopyAll = () => {
    if (!result.readyToUseContent) return;
    const text = result.readyToUseContent.map(block =>
      `## ${block.sectionTitle}\nPlacement: ${block.placement}\n\n${block.content}\n\nRationale: ${block.rationale}`
    ).join('\n\n---\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    });
  };

  const displayScore = (result.scoredAssessment.weightedTotal / 10).toFixed(1);
  const rawScore = result.scoredAssessment.weightedTotal;

  const handlePrintPDF = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setIsPrinting(true);
    const prevTitle = document.title;
    const scrollY = window.scrollY;
    if (exportFilename) document.title = `${exportFilename}-${formatExportDate()}`;
    const restore = () => {
      document.title = prevTitle;
      setIsPrinting(false);
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    };
    window.addEventListener('afterprint', restore, { once: true });
    setTimeout(() => window.print(), 150);
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await exportToPdf('cro-audit-results', exportFilename || 'cro-audit');
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 128;
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const scoreRowKeys = [
    { key: 'valueProposition', weight: '20%' },
    { key: 'headline', weight: '15%' },
    { key: 'cta', weight: '15%' },
    { key: 'aboveTheFold', weight: '10%' },
    { key: 'narrativeFlow', weight: '10%' },
    { key: 'trustSignals', weight: '10%' },
    { key: 'objectionHandling', weight: '10%' },
    { key: 'microCopy', weight: '5%' },
    { key: 'accessibility', weight: '5%' },
  ] as const;

  return (
    <PrintContext.Provider value={isPrinting}>
    <div id="cro-audit-results" className="space-y-4">
      {(brandName || targetUrl) && (
        <div className="hidden print:block mb-6">
          <img src="https://sharpen.studio/wp-content/uploads/2023/02/sharpen.svg" alt="Sharpen Studio" className="h-9 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-900">{L.croPrintTitle}</h1>
          {targetUrl && (
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-md px-4 py-3 mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{L.urlAnalyzed}</p>
              <a href={targetUrl} className="text-blue-700 font-semibold text-sm break-all">{targetUrl}</a>
            </div>
          )}
          {brandName && (
            <div className="text-sm text-gray-600 mb-6">
              <p><strong>{L.brand}:</strong> {brandName}</p>
              {pageType && <p><strong>{L.pageType}:</strong> {pageType}</p>}
              <p><strong>{L.generated}:</strong> {new Date().toLocaleString()}</p>
            </div>
          )}
        </div>
      )}
      {result.truncated && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-900 font-semibold text-sm">{L.truncatedWarningTitle}</p>
            <p className="text-amber-700 text-sm mt-0.5">{L.truncatedWarningBody}</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {(targetUrl || brandName) && (
          <div className="mb-5 pb-5 border-b border-gray-100">
            {brandName && (
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{L.brand}</span>
                <span className="text-sm font-semibold text-gray-800">{brandName}</span>
                {pageType && <><span className="text-gray-200">·</span><span className="text-xs text-gray-500">{pageType}</span></>}
              </div>
            )}
            {targetUrl && (
              <div className="flex items-start gap-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex-shrink-0 mt-0.5">{L.urlAnalyzed}</span>
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all font-medium"
                >
                  {targetUrl}
                </a>
              </div>
            )}
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">{L.conversionScore}</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-6xl font-bold ${scoreColor(parseFloat(displayScore))}`}>{displayScore}</span>
              <span className="text-2xl text-gray-400 font-medium">/10</span>
            </div>
            <div className="mt-2 h-2 w-48 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${scoreBarColor(parseFloat(displayScore))}`} style={{ width: `${rawScore}%` }} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full ${getScoreLabelColor(parseFloat(displayScore))}`}>{getScoreLabel(parseFloat(displayScore))}</span>
            </div>
            <p className="text-xs text-gray-500 italic mt-1 max-w-md">{getScoreExplanation(parseFloat(displayScore))}</p>
            <p className="text-xs text-gray-400 italic mt-1 max-w-md">{getScoreBenchmark(parseFloat(displayScore))}</p>
          </div>
          <div className="print:hidden">
            <p className="text-xs text-gray-400 mb-2">{L.printHint}</p>
            <div className="flex gap-2">
            <button type="button" onClick={onExportMarkdown} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors">
              <Download className="w-4 h-4" />
              .md
            </button>
            <button type="button" onClick={onExportWord} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 text-sm font-medium rounded hover:bg-gray-200 transition-colors border border-gray-200">
              <FileText className="w-4 h-4" />
              .docx
            </button>
            {onExportHtml && (
              <button type="button" onClick={onExportHtml} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 text-sm font-medium rounded hover:bg-gray-200 transition-colors border border-gray-200">
                <FileDown className="w-4 h-4" />
                .html
              </button>
            )}
            <button type="button" onClick={handlePrintPDF} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 text-sm font-medium rounded hover:bg-gray-200 transition-colors border border-gray-200">
              <Printer className="w-4 h-4" />
              PDF
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown className="w-4 h-4" />
              {exportingPdf ? L.generatingPdf : L.exportPdf}
            </button>
            </div>
          </div>
        </div>
      </div>

      <div className="h-12 print:hidden" />
      <div ref={tocRef} className="fixed left-0 right-0 z-30 px-4 sm:px-6 lg:px-8 print:hidden pointer-events-none" style={{ top: `${stickyTop}px` }}>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-lg overflow-x-auto shadow-md pointer-events-auto">
            <div className="flex gap-0.5 p-1.5 items-center">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider px-2 flex-shrink-0 select-none">{L.jumpTo}</span>
              <div className="w-px h-4 bg-gray-200 flex-shrink-0 mx-1" />
              {tocSections.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded transition-all whitespace-nowrap ${
                    activeSection === s.id
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div id="executive" className="bg-white border border-gray-200 rounded-lg p-6 group">
        <div className="flex items-center gap-1 mb-1">
          <h2 className="text-lg font-bold text-gray-900">{L.executiveSummarySection}</h2>
          <SectionAnchor id="executive" />
        </div>
        <p className="text-xs text-gray-400 italic mb-3">{SECTION_EXPLANATIONS.executive}</p>
        <p className="text-gray-700 leading-relaxed">{result.executiveSummary}</p>

        {result.contextIdentification && (
          <div className="mt-5 pt-5 border-t border-gray-100 grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{L.conversionGoal}</p>
              <p className="text-sm text-gray-800">{result.contextIdentification.primaryConversionGoal}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{L.trafficContext}</p>
              <p className="text-sm text-gray-800">{result.contextIdentification.trafficContext}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{L.targetAudience}</p>
              <p className="text-sm text-gray-800">{result.contextIdentification.targetAudience}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{L.marketIndustry}</p>
              <p className="text-sm text-gray-800">{result.contextIdentification.marketIndustry}</p>
            </div>
          </div>
        )}
      </div>

      <div id="priority" className="bg-white border border-gray-200 rounded-lg overflow-hidden group">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-1 mb-1">
            <h2 className="text-lg font-bold text-gray-900">{L.priorityRecommendations}</h2>
            <SectionAnchor id="priority" />
          </div>
          <p className="text-xs text-gray-400 italic">{SECTION_EXPLANATIONS.priority}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{L.tableHash}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{L.tableRecommendation}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{L.tableCategory}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase group relative">
                  <span className="inline-flex items-center gap-1">
                    {L.tableImpact}
                    <Info className="w-3 h-3 text-gray-400" title={COLUMN_EXPLANATIONS.impact} />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  <span className="inline-flex items-center gap-1">
                    {L.tableEffort}
                    <Info className="w-3 h-3 text-gray-400" title={COLUMN_EXPLANATIONS.effort} />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  <span className="inline-flex items-center gap-1">
                    {L.tableTimeframe}
                    <Info className="w-3 h-3 text-gray-400" title={COLUMN_EXPLANATIONS.timeframe} />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(result.priorityTable ?? []).map((item, i) => <PriorityBadge key={i} item={item} L={L} />)}
            </tbody>
          </table>
        </div>
      </div>

      <div id="scores" className="bg-white border border-gray-200 rounded-lg overflow-hidden group">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-1 mb-1">
            <h2 className="text-lg font-bold text-gray-900">{L.scoredAssessment}</h2>
            <SectionAnchor id="scores" />
          </div>
          <p className="text-xs text-gray-400 italic">{SECTION_EXPLANATIONS.scores}</p>
        </div>
        <div className="px-6 py-4 space-y-3">
          {scoreRowKeys.map(({ key, weight }) => {
            const rawVal = result.scoredAssessment[key] as number;
            const score = rawVal > 10 ? rawVal / 10 : rawVal;
            const label = L.croScoreRowLabels[key] ?? key;
            return (
              <div key={key}>
                <div className="flex items-center gap-4">
                  <div className="w-40 flex-shrink-0">
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400">{weight}</p>
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${scoreBarColor(score)}`} style={{ width: `${score * 10}%` }} />
                  </div>
                  <span className={`w-12 text-right text-sm font-bold ${scoreColor(score)}`}>{score.toFixed(1)}/10</span>
                  <span className={`hidden sm:inline-block px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${getScoreLabelColor(score)}`}>{getScoreLabel(score)}</span>
                </div>
                <p className="text-xs text-gray-400 italic mt-0.5 ml-44">{getScoreExplanation(score)}</p>
              </div>
            );
          })}
          <div className="pt-3 mt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="font-bold text-gray-900">{L.weightedTotal}</span>
            <span className={`text-2xl font-bold ${scoreColor(parseFloat(displayScore))}`}>{displayScore}/10</span>
          </div>
        </div>
      </div>

      <CollapsibleSection id="detailed" label={L.detailedAnalysisSection} defaultOpen={true}>
        <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.detailed}</p>
        <div className="space-y-6 pt-2">
          {(result.detailedFindings ?? []).map((finding, i) => (
            <div key={i} className={i > 0 ? 'border-t border-gray-100 pt-6' : ''}>
              <h3 className="text-base font-bold text-gray-900 mb-2">{finding.category}</h3>
              {finding.analysis && (
                <p className="text-sm text-gray-700 leading-relaxed mb-3 bg-gray-50 p-3 rounded-lg">{finding.analysis}</p>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">{L.issuesFound}</h4>
                  <ul className="space-y-1.5">
                    {(finding.issues ?? []).map((issue, j) => (
                      <li key={j} className="flex gap-2 text-sm text-gray-700">
                        <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">{L.recommendations}</h4>
                  <ul className="space-y-1.5">
                    {(finding.recommendations ?? []).map((rec, j) => (
                      <li key={j} className="flex gap-2 text-sm text-gray-700">
                        <span className="text-emerald-500 mt-0.5 flex-shrink-0">→</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="copy" label={L.copyTeardown} defaultOpen={true}>
        <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.copy}</p>
        <div className="space-y-5 pt-2">
          {(result.copyRewrites ?? []).map((rewrite, i) => (
            <div key={i} className={i > 0 ? 'border-t border-gray-100 pt-5' : ''}>
              <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wide rounded mb-3">{rewrite.element}</span>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs font-bold text-red-600 uppercase mb-1.5">{L.current}</p>
                  <div className="text-sm text-gray-800 bg-red-50 border-l-4 border-red-400 p-3 rounded-r-lg leading-relaxed">{rewrite.current}</div>
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-700 uppercase mb-1.5">{L.rewritten}</p>
                  <div className="text-sm text-gray-800 bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-r-lg leading-relaxed font-medium">{rewrite.improved}</div>
                </div>
              </div>
              <p className="text-xs text-gray-500 italic">{L.rationale}: {rewrite.rationale}</p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {hasContentSuggestions ? (
        <CollapsibleSection id="e2content" label={L.contentSuggestionsSection} icon={<ClipboardList className="w-5 h-5" />} defaultOpen={true}>
          <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.e2content}</p>
          <div className="pt-2">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{L.contentSuggestionsDesc}</p>
              <button
                onClick={handleCopyAll}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded border transition-colors print:hidden"
                style={copiedAll ? { background: '#f0fdf4', borderColor: '#86efac', color: '#15803d' } : { background: '#f9fafb', borderColor: '#e5e7eb', color: '#374151' }}
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedAll ? L.allCopied : L.copyAll}
              </button>
            </div>
            <div className="space-y-6">
              {Object.entries(groupedContent).map(([cat, blocks]) => (
                <div key={cat}>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <span className="flex-1 border-t border-gray-200" />
                    <span>{L.categoryLabels[cat] || cat}</span>
                    <span className="flex-1 border-t border-gray-200" />
                  </h3>
                  <div className="space-y-3">
                    {blocks.map((block, i) => (
                      <ContentCard key={i} block={block} copyLabel={L.copy} copiedLabel={L.copied} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleSection>
      ) : onGenerateContentSuggestions ? (
        <div id="e2content" className="bg-white border border-gray-200 rounded-lg overflow-hidden print:hidden">
          <div className="px-6 py-8 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <ClipboardList className="w-6 h-6 text-gray-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">{L.contentSuggestionsSection}</h2>
            <p className="text-sm text-gray-500 max-w-md mb-5">{L.contentSuggestionsDesc}</p>
            {contentSuggestionsError && (
              <div className="w-full max-w-md mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-left">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{contentSuggestionsError}</p>
              </div>
            )}
            {contentSuggestionsLoading ? (
              <>
                <div className="flex items-center gap-3 px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {L.generatingContentSuggestions}
                </div>
                <p className="text-xs text-gray-400 mt-3">{L.thisTypically1to2Min}</p>
              </>
            ) : contentSuggestionsError ? (
              <button
                onClick={onGenerateContentSuggestions}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                {L.generateContentSuggestions}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <CollapsibleSection id="competitor" label={L.competitorComparison} defaultOpen={true}>
        <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.competitor}</p>
        {result.competitorComparison && result.competitorComparison.length > 0 ? (
          <div className="pt-2 space-y-6">
            {result.competitorComparison.map((comp, i) => (
              <div key={i} className={i > 0 ? 'border-t border-gray-100 pt-6' : ''}>
                <h3 className="text-base font-bold text-gray-900 mb-3">{comp.competitor}</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-1.5">{L.theirStrengths}</h4>
                    <ul className="space-y-1">{(comp.strengths ?? []).map((s, j) => <li key={j} className="text-sm text-gray-700 flex gap-2"><span className="text-gray-400">•</span>{s}</li>)}</ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-1.5">{L.theirWeaknesses}</h4>
                    <ul className="space-y-1">{(comp.weaknesses ?? []).map((s, j) => <li key={j} className="text-sm text-gray-700 flex gap-2"><span className="text-gray-400">•</span>{s}</li>)}</ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-red-600 uppercase mb-1.5">{L.whatTheyDoBetter}</h4>
                    <ul className="space-y-1">{(comp.whatTheyDoBetter ?? []).map((s, j) => <li key={j} className="text-sm text-gray-700 flex gap-2"><span className="text-red-400">•</span>{s}</li>)}</ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-700 uppercase mb-1.5">{L.whatYouDoBetter}</h4>
                    <ul className="space-y-1">{(comp.whatYouDoBetter ?? []).map((s, j) => <li key={j} className="text-sm text-gray-700 flex gap-2"><span className="text-emerald-500">•</span>{s}</li>)}</ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="pt-2">
            <p className="text-sm text-gray-500 italic">{L.noCompetitorData}</p>
          </div>
        )}
      </CollapsibleSection>

      {result.buyerJourneyAnalysis && (
        <CollapsibleSection id="buyer" label={L.buyerJourneySection} icon={<Users className="w-5 h-5" />} defaultOpen={true}>
          <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.buyer}</p>
          <div className="pt-2 grid sm:grid-cols-3 gap-4">
            {[
              { key: 'coldVisitor' as const, label: L.coldVisitorLabel, subtitle: L.coldVisitorSub, color: 'border-blue-300 bg-blue-50' },
              { key: 'warmVisitor' as const, label: L.warmVisitorLabel, subtitle: L.warmVisitorSub, color: 'border-amber-300 bg-amber-50' },
              { key: 'hotVisitor' as const, label: L.hotVisitorLabel, subtitle: L.hotVisitorSub, color: 'border-emerald-300 bg-emerald-50' },
            ].map(({ key, label, subtitle, color }) => {
              const data = result.buyerJourneyAnalysis![key];
              return (
                <div key={key} className={`border-l-4 ${color} p-4 rounded-r-lg`}>
                  <p className="font-bold text-gray-900 text-sm">{label}</p>
                  <p className="text-xs text-gray-500 mb-3">{subtitle}</p>
                  <p className="text-xs text-gray-700 leading-relaxed mb-3">{data.analysis}</p>
                  {(data.gaps ?? []).length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-bold text-red-700 uppercase mb-1">{L.gaps}</p>
                      <ul className="space-y-0.5">
                        {(data.gaps ?? []).map((g, i) => <li key={i} className="text-xs text-gray-700 flex gap-1.5"><span className="text-red-400">•</span>{g}</li>)}
                      </ul>
                    </div>
                  )}
                  {(data.recommendations ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-emerald-700 uppercase mb-1">{L.fix}</p>
                      <ul className="space-y-0.5">
                        {(data.recommendations ?? []).map((r, i) => <li key={i} className="text-xs text-gray-700 flex gap-1.5"><span className="text-emerald-500">→</span>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {result.emotionalTriggers && result.emotionalTriggers.length > 0 && (
        <CollapsibleSection id="triggers" label={L.emotionalTriggersSection} icon={<Zap className="w-5 h-5" />} defaultOpen={true}>
          <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.triggers}</p>
          <div className="pt-2 space-y-2">
            {result.emotionalTriggers.map((trigger, i) => (
              <div key={i} className="flex items-start gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="w-36 flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{trigger.trigger}</p>
                </div>
                <div className="flex-shrink-0">
                  <TriggerStatus
                    present={trigger.present}
                    presentLabel={L.triggerPresent}
                    partialLabel={L.triggerPartial}
                    absentLabel={L.triggerAbsent}
                  />
                </div>
                {trigger.present !== 'yes' && (
                  <p className="text-sm text-gray-600 flex-1">{trigger.implementation}</p>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection id="pricing" label={L.pricingPsychologySection} icon={<DollarSign className="w-5 h-5" />} defaultOpen={true}>
        <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.pricing}</p>
        {result.pricingPsychology ? (
          <div className="pt-2">
            <p className="text-sm text-gray-700 leading-relaxed mb-4 bg-gray-50 p-3 rounded-lg">{result.pricingPsychology.analysis}</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {(result.pricingPsychology.findings ?? []).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-red-700 uppercase mb-2">{L.findings}</h4>
                  <ul className="space-y-1.5">
                    {(result.pricingPsychology.findings ?? []).map((f, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-red-400">•</span>{f}</li>)}
                  </ul>
                </div>
              )}
              {(result.pricingPsychology.recommendations ?? []).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 uppercase mb-2">{L.recommendations}</h4>
                  <ul className="space-y-1.5">
                    {(result.pricingPsychology.recommendations ?? []).map((r, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-emerald-500">→</span>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="pt-2">
            <p className="text-sm text-gray-500 italic">{L.noPricingData}</p>
          </div>
        )}
      </CollapsibleSection>

      {result.geoAIReadiness && (
        <CollapsibleSection id="geo" label={L.geoAIReadinessSection} icon={<Bot className="w-5 h-5" />} defaultOpen={true}>
          <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.geo}</p>
          <div className="pt-2">
            <p className="text-sm text-gray-700 leading-relaxed mb-4 bg-gray-50 p-3 rounded-lg">{result.geoAIReadiness.analysis}</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {(result.geoAIReadiness.findings ?? []).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-red-700 uppercase mb-2">{L.findings}</h4>
                  <ul className="space-y-1.5">
                    {(result.geoAIReadiness.findings ?? []).map((f, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-red-400">•</span>{f}</li>)}
                  </ul>
                </div>
              )}
              {(result.geoAIReadiness.recommendations ?? []).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 uppercase mb-2">{L.recommendations}</h4>
                  <ul className="space-y-1.5">
                    {(result.geoAIReadiness.recommendations ?? []).map((r, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-emerald-500">→</span>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </CollapsibleSection>
      )}

      {result.mobileAnalysis && (
        <CollapsibleSection id="mobile" label={L.mobileAnalysisSection} icon={<Smartphone className="w-5 h-5" />} defaultOpen={true}>
          <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.mobile}</p>
          <div className="pt-2">
            <p className="text-sm text-gray-700 leading-relaxed mb-4 bg-gray-50 p-3 rounded-lg">{result.mobileAnalysis.analysis}</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {(result.mobileAnalysis.findings ?? []).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-red-700 uppercase mb-2">{L.findings}</h4>
                  <ul className="space-y-1.5">
                    {(result.mobileAnalysis.findings ?? []).map((f, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-red-400">•</span>{f}</li>)}
                  </ul>
                </div>
              )}
              {(result.mobileAnalysis.recommendations ?? []).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 uppercase mb-2">{L.recommendations}</h4>
                  <ul className="space-y-1.5">
                    {(result.mobileAnalysis.recommendations ?? []).map((r, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-emerald-500">→</span>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </CollapsibleSection>
      )}

      <div id="wins" className="group">
        <div className="flex items-center gap-1 mb-1 px-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{L.quickWinsAndHighImpact}</span>
          <SectionAnchor id="wins" />
        </div>
        <p className="text-xs text-gray-400 italic mb-3 px-1">{SECTION_EXPLANATIONS.wins}</p>
        <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">L</span>
            {L.quickWins}
          </h2>
          <ul className="space-y-2">
            {(result.quickWins ?? []).map((win, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-gray-700">
                <span className="text-emerald-500 font-bold flex-shrink-0 mt-0.5">✓</span>
                <span>{win}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center">M</span>
            {L.highImpactChanges}
          </h2>
          <ul className="space-y-2">
            {(result.highImpactChanges ?? []).map((change, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-gray-700">
                <span className="text-red-500 font-bold flex-shrink-0 mt-0.5">★</span>
                <span>{change}</span>
              </li>
            ))}
          </ul>
        </div>
        </div>
      </div>

      {result.pageWireframe && (
        <div id="wireframe" className="group">
          <div className="flex items-center gap-1 mb-1 px-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{L.wireframeSection}</span>
            <SectionAnchor id="wireframe" />
          </div>
          <p className="text-xs text-gray-400 italic mb-3 px-1">{SECTION_EXPLANATIONS.wireframe}</p>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {result.pageWireframe.currentStructure && result.pageWireframe.currentStructure.length > 0 && (
              <div className="border-b border-gray-100 px-5 py-4">
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-gray-400" />
                  {L.wireframeCurrentStructure}
                </h3>
                <ol className="flex flex-wrap gap-2">
                  {result.pageWireframe.currentStructure.map((item, i) => (
                    <li key={i} className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-2.5 py-1">{item}</li>
                  ))}
                </ol>
              </div>
            )}
            {result.pageWireframe.structuralProblems && result.pageWireframe.structuralProblems.length > 0 && (
              <div className="border-b border-gray-100 px-5 py-4">
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  {L.wireframeStructuralProblems}
                </h3>
                <ul className="space-y-1.5">
                  {result.pageWireframe.structuralProblems.map((p, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-amber-400 flex-shrink-0 mt-0.5">•</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="px-5 py-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                {L.wireframeRecommendedLayout}
              </h3>
              <div className="space-y-3">
                {(result.pageWireframe.recommendedZones ?? []).map((zone) => (
                  <div
                    key={zone.zone}
                    className={`border-l-4 ${wireframeBorderColor(zone.status as WireframeZoneStatus)} bg-gray-50 border border-gray-200 rounded-r-lg p-4 flex gap-4`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 text-gray-700 text-xs font-bold flex items-center justify-center">
                      {zone.zone}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-sm font-bold text-gray-900">{zone.name}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${wireframeBadgeStyle(zone.status as WireframeZoneStatus)}`}>
                          {L.wireframeStatusLabels[zone.status as WireframeZoneStatus] ?? zone.status}
                        </span>
                        {zone.currentPosition != null && (
                          <span className="text-xs text-gray-400">({L.wireframeCurrentlyAt} {zone.currentPosition})</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{zone.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <CollapsibleSection id="abtests" label={L.abTestsSection} icon={<Target className="w-5 h-5" />} defaultOpen={true}>
        <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.abtests}</p>
        <div className="pt-2 space-y-4">
          {(result.abTests ?? []).map((test, i) => (
            <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <h3 className="text-sm font-bold text-gray-900">{test.element}</h3>
                </div>
                <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-semibold ${impactColor(test.expectedImpact)}`}>{L.impactLabels[test.expectedImpact] ?? test.expectedImpact}</span>
              </div>
              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                <div className="p-4">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1.5">{L.abControlLabel}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{test.controlVariant}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1.5">{L.abVariantBLabel}</p>
                  <p className="text-sm text-gray-700 leading-relaxed font-medium">{test.variantB}</p>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-1">
                <p className="text-xs text-gray-600"><span className="font-semibold text-gray-700">{L.abPrimaryMetric}</span> {test.primaryMetric}</p>
                <p className="text-xs text-gray-600"><span className="font-semibold text-gray-700">{L.abSuggestedDuration}</span> {test.suggestedDuration}</p>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <div id="plan" className="bg-white border border-gray-200 rounded-lg p-6 group">
        <div className="flex items-center gap-1 mb-1">
          <h2 className="text-lg font-bold text-gray-900">{L.actionPlanSection}</h2>
          <SectionAnchor id="plan" />
        </div>
        <p className="text-xs text-gray-400 italic mb-5">{SECTION_EXPLANATIONS.plan}</p>
        <div className="space-y-5">
          {[
            { key: '30days' as const, label: L.days1to30, color: 'bg-emerald-600', light: 'bg-emerald-50 border-emerald-200' },
            { key: '60days' as const, label: L.days31to60, color: 'bg-amber-600', light: 'bg-amber-50 border-amber-200' },
            { key: '90days' as const, label: L.days61to90, color: 'bg-red-600', light: 'bg-red-50 border-red-200' },
          ].map(({ key, label, color, light }) => (
            <div key={key} className={`border ${light} rounded-lg p-4`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 ${color} text-white rounded-full flex items-center justify-center text-xs font-bold`}>{key.replace('days', '')}</div>
                <h3 className="font-bold text-gray-900">{label}</h3>
              </div>
              <ul className="space-y-1.5">
                {((result.actionPlan ?? {})[key] ?? []).map((item, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-gray-400 flex-shrink-0">→</span>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div id="summary" className="bg-gray-900 text-white rounded-lg p-6 group">
        <div className="flex items-center gap-1 mb-1">
          <h2 className="text-lg font-bold">{L.finalSummarySection}</h2>
          <SectionAnchor id="summary" />
        </div>
        <p className="text-xs text-gray-400 italic mb-3">{SECTION_EXPLANATIONS.summary}</p>
        <p className="text-gray-300 leading-relaxed">{result.finalSummary}</p>
        <div className="mt-4 pt-4 border-t border-gray-700 flex items-center gap-3">
          <span className="text-gray-400 text-sm">{L.overallCroScore}</span>
          <span className={`text-2xl font-bold ${scoreColor(parseFloat(displayScore))}`}>{displayScore}/10</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{L.glossaryTitle}</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
          {CRO_GLOSSARY.map(entry => (
            <p key={entry.term} className="text-sm text-gray-700">
              <span className="font-semibold">{entry.term}:</span> {entry.definition}
            </p>
          ))}
        </div>
      </div>

      {onRunSEOAudit && !hasSEOResult && (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-lg overflow-hidden print:hidden hover:border-gray-300 transition-colors">
          <div className="px-8 py-8 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
              <Search className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-base font-bold text-gray-900 mb-0.5">{L.runSeoAuditTitle}</h3>
              <p className="text-sm text-gray-500">{L.runSeoAuditDesc}</p>
              {seoError && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3 flex-shrink-0" />{seoError}</p>
              )}
            </div>
            {seoLoading ? (
              <div className="flex items-center gap-2.5 px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-semibold flex-shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
                {L.runningSeoAudit}
              </div>
            ) : (
              <button
                onClick={onRunSEOAudit}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-semibold transition-colors flex-shrink-0"
              >
                <Search className="w-4 h-4" />
                {L.runSeoAudit}
              </button>
            )}
          </div>
        </div>
      )}

      {hasSEOResult && onSwitchToSEO && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">{L.seoAuditComplete}</p>
              <p className="text-xs text-emerald-700">{L.switchToSeoTab}</p>
            </div>
          </div>
          <button
            onClick={onSwitchToSEO}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-sm font-semibold transition-colors"
          >
            {L.viewSeoResults}
          </button>
        </div>
      )}

      {onRunCopyAnalysis && !hasCopyResult && (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-lg overflow-hidden print:hidden hover:border-gray-300 transition-colors">
          <div className="px-8 py-8 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
              <PenLine className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-base font-bold text-gray-900 mb-0.5">{L.runCopyAnalysisTitle}</h3>
              <p className="text-sm text-gray-500">{L.runCopyAnalysisDesc}</p>
              {copyError && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3 flex-shrink-0" />{copyError}</p>
              )}
            </div>
            {copyLoading ? (
              <div className="flex items-center gap-2.5 px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-semibold flex-shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
                {L.analyzingCopy}
              </div>
            ) : (
              <button
                onClick={onRunCopyAnalysis}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-semibold transition-colors flex-shrink-0"
              >
                <PenLine className="w-4 h-4" />
                {L.runCopyAnalysis}
              </button>
            )}
          </div>
          {copyLoading && <p className="text-xs text-gray-400 text-center pb-4">{L.thisTypically1to3Min}</p>}
        </div>
      )}

      {hasCopyResult && onSwitchToCopy && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">{L.copyAnalysisComplete}</p>
              <p className="text-xs text-amber-700">{L.switchToCopyTab}</p>
            </div>
          </div>
          <button
            onClick={onSwitchToCopy}
            className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded text-sm font-semibold transition-colors"
          >
            {L.viewCopyResults}
          </button>
        </div>
      )}
    </div>
    </PrintContext.Provider>
  );
}
