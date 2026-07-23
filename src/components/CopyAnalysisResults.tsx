import { useState, useEffect, useRef, createContext, useContext } from 'react';
import {
  ChevronDown, ChevronUp, Download, FileText, Printer, Hash, CheckCircle,
  PenLine, TrendingUp, AlertTriangle, Target, BookOpen, Zap, ArrowRight, Loader2, RefreshCw, FileDown
} from 'lucide-react';
import type { CopyAnalysisResult, CopyDetailedBlock, CopyHeatmapBlock } from '../types/copyAnalysis';
import { exportToPdf } from '../lib/exportPdf';
import { getScoreExplanation, getScoreBenchmark, getScoreLabel, getScoreLabelColor, SECTION_EXPLANATIONS, COLOR_LABELS } from '../lib/clientExplanations';
import { COPY_GLOSSARY, glossaryToMarkdown } from '../lib/glossaries';
import { getLabels } from '../lib/i18n';
import type { Labels } from '../lib/i18n';

interface CopyAnalysisResultsProps {
  result: CopyAnalysisResult;
  onExportMarkdown?: () => void;
  onExportWord?: () => void;
  onExportHtml?: () => void;
  exportFilename?: string;
  rewritesLoading?: boolean;
  rewritesError?: string | null;
  onRetryRewrites?: () => void;
  auditMetadata?: {
    targetUrl?: string;
    brandName: string;
    pageType: string;
  };
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

const CopyPrintContext = createContext(false);

function colorClass(color: 'green' | 'yellow' | 'red') {
  if (color === 'green') return { border: '#22c55e', bg: '#f0fdf4', text: '#15803d', badge: 'bg-emerald-100 text-emerald-800' };
  if (color === 'yellow') return { border: '#eab308', bg: '#fefce8', text: '#854d0e', badge: 'bg-amber-100 text-amber-800' };
  return { border: '#ef4444', bg: '#fef2f2', text: '#b91c1c', badge: 'bg-red-100 text-red-800' };
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

function colorEmoji(color: 'green' | 'yellow' | 'red') {
  if (color === 'green') return '🟢';
  if (color === 'yellow') return '🟡';
  return '🔴';
}

function getSectionName(block: { sectionName?: string; blockNumber: number; blockTextPreview: string }): string {
  if (block.sectionName) return block.sectionName;
  const words = block.blockTextPreview.trim().split(/\s+/).filter(w => w.length > 2).slice(0, 4).join(' ');
  return words.length > 0 ? words + '…' : `#${block.blockNumber}`;
}

function DimDot({ score }: { score: number }) {
  const cls = score >= 7 ? 'bg-emerald-400' : score >= 4 ? 'bg-amber-400' : 'bg-red-400';
  return <span className={`inline-block w-2 h-2 rounded-full ${cls} flex-shrink-0`} title={`${score}/10`} />;
}

function useActiveCopySection(ids: string[]) {
  const [active, setActive] = useState('');
  useEffect(() => {
    const handleScroll = () => {
      let current = '';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) current = id;
      }
      setActive(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [ids]);
  return active;
}

function SectionAnchor({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}${window.location.search}#${id}`).catch(() => {});
    window.history.replaceState(null, '', `#${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleClick} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-1 rounded hover:bg-gray-200 print:hidden flex-shrink-0" title="Copy link to section">
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Hash className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />}
    </button>
  );
}

function CollapsibleCopySection({ id, label, icon, defaultOpen = true, children }: { id: string; label: string; icon?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const isPrinting = useContext(CopyPrintContext);
  const isOpen = open || isPrinting;
  return (
    <div id={id} className="bg-white border border-gray-200 rounded-lg overflow-hidden group">
      <div className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-3 flex-1 text-left min-w-0">
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

function RadarChart({ dimensions }: { dimensions: { label: string; value: number }[] }) {
  const cx = 120, cy = 120, r = 90;
  const n = dimensions.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  const getPoint = (index: number, radius: number) => {
    const angle = startAngle + index * angleStep;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  };

  const gridLevels = [2, 4, 6, 8, 10];
  const axisPoints = dimensions.map((_, i) => getPoint(i, r));
  const dataPoints = dimensions.map((d, i) => getPoint(i, (d.value / 10) * r));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-xs mx-auto">
      {gridLevels.map(level => {
        const pts = dimensions.map((_, i) => getPoint(i, (level / 10) * r));
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
        return <path key={level} d={path} fill="none" stroke="#e5e7eb" strokeWidth="1" />;
      })}
      {axisPoints.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth="1" />
      ))}
      <path d={dataPath} fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="2" />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#3b82f6" />
      ))}
      {dimensions.map((d, i) => {
        const labelPt = getPoint(i, r + 18);
        const anchor = labelPt.x < cx - 10 ? 'end' : labelPt.x > cx + 10 ? 'start' : 'middle';
        return (
          <text key={i} x={labelPt.x} y={labelPt.y} textAnchor={anchor} dominantBaseline="middle" fontSize="8.5" fill="#4b5563" fontFamily="system-ui">
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

function HeatmapBlock({ block, detailedBlock, L }: { block: CopyHeatmapBlock; detailedBlock?: CopyDetailedBlock; L: Labels }) {
  const [expanded, setExpanded] = useState(false);
  const colors = colorClass(block.color);
  const dims = [
    { key: 'clarity' as const },
    { key: 'persuasion' as const },
    { key: 'emotionalTone' as const },
    { key: 'benefitFeatureRatio' as const },
    { key: 'powerWords' as const },
    { key: 'activeVoice' as const },
    { key: 'conversionRelevance' as const },
  ];

  return (
    <div
      className="rounded-lg overflow-hidden transition-shadow hover:shadow-md cursor-pointer"
      style={{ borderLeft: `4px solid ${colors.border}`, background: expanded ? 'white' : colors.bg }}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{getSectionName(block)}</p>
            <span className="text-xs text-gray-400 flex-shrink-0">· #{block.blockNumber}</span>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{block.blockText || block.blockTextPreview}</p>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {dims.map(d => <DimDot key={d.key} score={block.scores[d.key]} />)}
            <span className="text-xs text-gray-400 ml-1">{L.dimensions}</span>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <span className={`text-2xl font-bold ${scoreColor(block.compositeScore)}`}>{block.compositeScore.toFixed(1)}</span>
          <p className="text-xs text-gray-400">/10</p>
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded mt-1 inline-block ${colors.badge}`}>
            {block.color.toUpperCase()}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 bg-white" onClick={e => e.stopPropagation()}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {dims.map(d => (
              <div key={d.key} className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-500 mb-1">{L.heatmapDimLabels[d.key] ?? d.key}</p>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${scoreBarColor(block.scores[d.key])}`} style={{ width: `${block.scores[d.key] * 10}%` }} />
                  </div>
                  <span className={`text-xs font-bold ${scoreColor(block.scores[d.key])}`}>{block.scores[d.key]}</span>
                </div>
              </div>
            ))}
          </div>

          {detailedBlock && detailedBlock.issues.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{L.issues}</p>
              <ul className="space-y-1">
                {detailedBlock.issues.map((issue, i) => (
                  <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {detailedBlock?.rewrite && (
            <div className="mt-3">
              <div className="flex flex-col gap-2">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{L.current}</p>
                  <div className="bg-gray-50 border-l-4 border-gray-300 p-3 rounded-r text-xs text-gray-600 leading-relaxed">
                    {detailedBlock.originalText || block.blockTextPreview}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">{L.rewritten}</p>
                  <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-r text-xs text-gray-700 leading-relaxed font-medium">
                    {detailedBlock.rewrite}
                  </div>
                </div>
              </div>
              {detailedBlock.rewriteRationale && (
                <p className="text-xs text-gray-500 italic mt-2">{L.rationale}: {detailedBlock.rewriteRationale}</p>
              )}
              {detailedBlock.projectedScore && (
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-xs font-bold ${scoreColor(detailedBlock.compositeScore)}`}>{detailedBlock.compositeScore.toFixed(1)}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                  <span className={`text-xs font-bold ${scoreColor(detailedBlock.projectedScore)}`}>{detailedBlock.projectedScore.toFixed(1)}</span>
                  <span className="text-xs text-emerald-600 font-semibold">(+{(detailedBlock.projectedScore - detailedBlock.compositeScore).toFixed(1)})</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CopyAnalysisResults({ result, onExportMarkdown, onExportWord, onExportHtml, exportFilename, rewritesLoading, rewritesError, onRetryRewrites, auditMetadata }: CopyAnalysisResultsProps) {
  const L = getLabels(result.language);
  const [isPrinting, setIsPrinting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [stickyTop, setStickyTop] = useState(100);
  const [filterColor, setFilterColor] = useState<'all' | 'green' | 'yellow' | 'red'>('all');
  const activeSection = useActiveCopySection(L.copyToc.map(s => s.id));
  const _tocRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measure = () => {
      const header = document.querySelector('header');
      setStickyTop(header ? header.offsetHeight : 100);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const handlePrintPDF = () => {
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
      await exportToPdf('copy-audit-results', exportFilename || 'copy-audit');
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 128;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const { pageScore, copyHeatmap, detailedBlocks, dimensionAverages, topPriorityRewrites, patternAnalysis, actionPlan } = result;

  const filteredHeatmap = filterColor === 'all' ? copyHeatmap : copyHeatmap.filter(b => b.color === filterColor);
  const detailedMap = new Map(detailedBlocks.map(b => [b.blockNumber, b]));

  const radarDimensions = dimensionAverages.map(d => ({
    label: d.dimension,
    value: d.average,
  }));

  return (
    <CopyPrintContext.Provider value={isPrinting}>
    <div id="copy-audit-results" className="space-y-4">
      {auditMetadata && (
        <div className="hidden print:block mb-6">
          <img src="https://sharpen.studio/wp-content/uploads/2023/02/sharpen.svg" alt="Sharpen Studio" className="h-9 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-900">{L.copyPrintTitle}</h1>
          {auditMetadata.targetUrl && (
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-md px-4 py-3 mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{L.urlAnalyzed}</p>
              <a href={auditMetadata.targetUrl} className="text-blue-700 font-semibold text-sm break-all">{auditMetadata.targetUrl}</a>
            </div>
          )}
          <div className="text-sm text-gray-600 mb-6">
            <p><strong>{L.brand}:</strong> {auditMetadata.brandName}</p>
            <p><strong>{L.pageType}:</strong> {auditMetadata.pageType}</p>
            <p><strong>{L.generated}:</strong> {new Date().toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">{L.copyScoreLabel}</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-6xl font-bold ${scoreColor(pageScore.overallScore)}`}>{pageScore.overallScore.toFixed(1)}</span>
              <span className="text-2xl text-gray-400 font-medium">/10</span>
            </div>
            <div className="mt-2 h-2 w-48 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${scoreBarColor(pageScore.overallScore)}`} style={{ width: `${pageScore.overallScore * 10}%` }} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full ${getScoreLabelColor(pageScore.overallScore)}`}>{getScoreLabel(pageScore.overallScore)}</span>
            </div>
            <p className="text-xs text-gray-500 italic mt-1 max-w-md">{getScoreExplanation(pageScore.overallScore)}</p>
            <p className="text-xs text-gray-400 italic mt-1 max-w-md">{getScoreBenchmark(pageScore.overallScore)}</p>
          </div>
          <div className="print:hidden">
            <p className="text-xs text-gray-400 mb-2">{L.printHint}</p>
            <div className="flex gap-2 flex-wrap">
            {onExportMarkdown && (
              <button onClick={onExportMarkdown} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors">
                <Download className="w-4 h-4" />.md
              </button>
            )}
            {onExportWord && (
              <button onClick={onExportWord} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 text-sm font-medium rounded hover:bg-gray-200 transition-colors border border-gray-200">
                <FileText className="w-4 h-4" />.docx
              </button>
            )}
            {onExportHtml && (
              <button onClick={onExportHtml} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 text-sm font-medium rounded hover:bg-gray-200 transition-colors border border-gray-200">
                <FileDown className="w-4 h-4" />.html
              </button>
            )}
            <button onClick={handlePrintPDF} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 text-sm font-medium rounded hover:bg-gray-200 transition-colors border border-gray-200">
              <Printer className="w-4 h-4" />PDF
            </button>
            <button
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

      {(rewritesLoading || rewritesError) && (
        <div className={`rounded-lg px-5 py-3.5 flex items-center gap-3 print:hidden ${rewritesError ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'}`}>
          {rewritesLoading ? (
            <>
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
              <p className="text-sm text-blue-800 font-medium">{L.generatingRewrites}</p>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-800 flex-1">{rewritesError}</p>
              {onRetryRewrites && (
                <button onClick={onRetryRewrites} className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors flex-shrink-0">
                  <RefreshCw className="w-3.5 h-3.5" />{L.retry}
                </button>
              )}
            </>
          )}
        </div>
      )}

      <div className="h-12 print:hidden" />
      <div ref={_tocRef} className="fixed left-0 right-0 z-30 px-4 sm:px-6 lg:px-8 print:hidden pointer-events-none" style={{ top: `${stickyTop}px` }}>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-lg overflow-x-auto shadow-md pointer-events-auto">
            <div className="flex gap-0.5 p-1.5 items-center">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider px-2 flex-shrink-0 select-none">{L.jumpTo}</span>
              <div className="w-px h-4 bg-gray-200 flex-shrink-0 mx-1" />
              {L.copyToc.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded transition-all whitespace-nowrap ${
                    activeSection === s.id ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div id="copy-summary" className="bg-white border border-gray-200 rounded-lg p-6 group">
        <div className="flex items-center gap-1 mb-1">
          <h2 className="text-lg font-bold text-gray-900">{L.copySummarySection}</h2>
          <SectionAnchor id="copy-summary" />
        </div>
        <p className="text-xs text-gray-400 italic mb-3">{SECTION_EXPLANATIONS.copySummary}</p>
        <p className="text-gray-700 leading-relaxed mb-5">{result.copySummary}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: L.totalBlocks, value: pageScore.totalBlocks.toString() },
            { label: L.readingLevel, value: pageScore.readingLevel },
            { label: L.readTime, value: pageScore.estimatedReadingTime },
            { label: L.tone, value: pageScore.toneConsistency.split(' ')[0] },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 grid sm:grid-cols-2 gap-3">
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-0.5">{L.weakestDimension}</p>
            <p className="text-sm font-semibold text-gray-800">{pageScore.weakestDimension}</p>
            <p className="text-xs text-red-600 font-bold">avg {pageScore.weakestDimensionAvg.toFixed(1)}/10</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-0.5">{L.strongestDimension}</p>
            <p className="text-sm font-semibold text-gray-800">{pageScore.strongestDimension}</p>
            <p className="text-xs text-emerald-600 font-bold">avg {pageScore.strongestDimensionAvg.toFixed(1)}/10</p>
          </div>
        </div>
      </div>

      <div id="copy-distribution" className="bg-white border border-gray-200 rounded-lg p-6 group">
        <div className="flex items-center gap-1 mb-1">
          <h2 className="text-lg font-bold text-gray-900">{L.scoreDistributionSection}</h2>
          <SectionAnchor id="copy-distribution" />
        </div>
        <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.copyDistribution}</p>
        <div className="flex rounded-lg overflow-hidden h-10 w-full mb-3">
          {pageScore.greenPercent > 0 && (
            <div className="flex items-center justify-center bg-emerald-500 text-white text-xs font-bold transition-all" style={{ width: `${pageScore.greenPercent}%` }}>
              {pageScore.greenPercent >= 8 && `${Math.round(pageScore.greenPercent)}%`}
            </div>
          )}
          {pageScore.yellowPercent > 0 && (
            <div className="flex items-center justify-center bg-amber-400 text-white text-xs font-bold transition-all" style={{ width: `${pageScore.yellowPercent}%` }}>
              {pageScore.yellowPercent >= 8 && `${Math.round(pageScore.yellowPercent)}%`}
            </div>
          )}
          {pageScore.redPercent > 0 && (
            <div className="flex items-center justify-center bg-red-500 text-white text-xs font-bold transition-all" style={{ width: `${pageScore.redPercent}%` }}>
              {pageScore.redPercent >= 8 && `${Math.round(pageScore.redPercent)}%`}
            </div>
          )}
        </div>
        <div className="flex gap-4 flex-wrap">
          {[
            { color: 'green' as const, label: L.strong, count: pageScore.greenBlocks, pct: pageScore.greenPercent, bg: 'bg-emerald-500' },
            { color: 'yellow' as const, label: L.mediocre, count: pageScore.yellowBlocks, pct: pageScore.yellowPercent, bg: 'bg-amber-400' },
            { color: 'red' as const, label: L.weak, count: pageScore.redBlocks, pct: pageScore.redPercent, bg: 'bg-red-500' },
          ].map(({ label, count, pct, bg }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-sm ${bg}`} />
              <span className="text-sm text-gray-700 font-medium">{label}</span>
              <span className="text-sm font-bold text-gray-900">{count} {L.blocks}</span>
              <span className="text-xs text-gray-400">({Math.round(pct)}%)</span>
            </div>
          ))}
        </div>
      </div>

      <CollapsibleCopySection id="copy-heatmap" label={L.copyHeatmapSection} icon={<PenLine className="w-5 h-5" />}>
        <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.copyHeatmap}</p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{L.colorLegend}</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-xs text-gray-700"><strong>{L.strong}:</strong> {COLOR_LABELS.green}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-amber-400" />
              <span className="text-xs text-gray-700"><strong>{L.mediocre}:</strong> {COLOR_LABELS.yellow}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-red-500" />
              <span className="text-xs text-gray-700"><strong>{L.weak}:</strong> {COLOR_LABELS.red}</span>
            </div>
          </div>
        </div>
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-4 print:hidden flex-wrap">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{L.filter}:</span>
            {(['all', 'green', 'yellow', 'red'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterColor(f)}
                className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                  filterColor === f
                    ? f === 'all' ? 'bg-gray-900 text-white border-gray-900'
                      : f === 'green' ? 'bg-emerald-500 text-white border-emerald-500'
                      : f === 'yellow' ? 'bg-amber-400 text-white border-amber-400'
                      : 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {f === 'all' ? L.filterAll(copyHeatmap.length) : f === 'green' ? L.filterGreen(pageScore.greenBlocks) : f === 'yellow' ? L.filterYellow(pageScore.yellowBlocks) : L.filterRed(pageScore.redBlocks)}
              </button>
            ))}
            <span className="text-xs text-gray-400 ml-auto hidden sm:block">{L.clickToExpand}</span>
          </div>
          <div className="space-y-2">
            {filteredHeatmap.map(block => (
              <HeatmapBlock key={block.blockNumber} block={block} detailedBlock={detailedMap.get(block.blockNumber)} L={L} />
            ))}
          </div>
        </div>
      </CollapsibleCopySection>

      <CollapsibleCopySection id="copy-dimensions" label={L.dimensionAnalysisSection} icon={<TrendingUp className="w-5 h-5" />}>
        <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.copyDimensions}</p>
        <div className="pt-2 grid sm:grid-cols-2 gap-6">
          <div>
            <div className="space-y-3">
              {dimensionAverages.map(d => (
                <div key={d.dimension}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{d.dimension}</span>
                    <span className={`text-sm font-bold ${scoreColor(d.average)}`}>{d.average.toFixed(1)}/10</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${scoreBarColor(d.average)}`} style={{ width: `${d.average * 10}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 italic">{d.assessment}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{L.dimensionRadar}</p>
            <RadarChart dimensions={radarDimensions} />
          </div>
        </div>
      </CollapsibleCopySection>

      <CollapsibleCopySection id="copy-rewrites" label={L.topPriorityRewritesSection} icon={<Target className="w-5 h-5" />}>
        <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.copyRewrites}</p>
        <div className="pt-2 space-y-4">
          {rewritesLoading && topPriorityRewrites.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              <p className="text-sm">{L.generatingHighImpactRewrites}</p>
            </div>
          )}
          {!rewritesLoading && rewritesError && topPriorityRewrites.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
              <p className="text-sm text-gray-600 text-center max-w-md">{L.rewritesFailed(rewritesError)}</p>
              {onRetryRewrites && (
                <button
                  onClick={onRetryRewrites}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {L.retryRewrites}
                </button>
              )}
            </div>
          )}
          {topPriorityRewrites.map(r => (
            <div key={r.priority} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">{r.priority}</span>
                  {r.sectionName ? (
                    <span className="text-xs font-semibold text-gray-600">
                      {r.sectionName}
                      <span className="font-normal text-gray-400 ml-1">· #{r.blockNumber}</span>
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-gray-600">{L.blockSection(r.blockNumber)}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${scoreColor(r.currentScore)}`}>{r.currentScore.toFixed(1)}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                  <span className={`text-sm font-bold ${scoreColor(r.projectedScore)}`}>{r.projectedScore.toFixed(1)}</span>
                  <span className="text-xs font-semibold text-emerald-600">(+{(r.projectedScore - r.currentScore).toFixed(1)})</span>
                </div>
              </div>
              <div className="grid sm:grid-cols-2">
                <div className="p-4 bg-red-50 border-r border-gray-100">
                  <p className="text-xs font-bold text-red-600 uppercase mb-2">{L.currentCopy}</p>
                  <p className="text-sm text-gray-800 leading-relaxed">{r.issue}</p>
                </div>
                <div className="p-4 bg-emerald-50">
                  <p className="text-xs font-bold text-emerald-700 uppercase mb-2">{L.rewrittenCopy}</p>
                  <p className="text-sm text-gray-800 leading-relaxed font-medium">{r.rewrite}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleCopySection>

      <CollapsibleCopySection id="copy-patterns" label={L.patternAnalysisSection} icon={<BookOpen className="w-5 h-5" />}>
        <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.copyPatterns}</p>
        <div className="pt-2 space-y-4">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{L.recurringPatterns}</p>
            <ul className="space-y-2">
              {patternAnalysis.recurringPatterns.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-amber-500 font-bold flex-shrink-0">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">{L.dominantWeakness}</p>
              <p className="text-sm text-gray-800">{patternAnalysis.dominantWeakness}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">{L.worstWritingHabit}</p>
              <p className="text-sm text-gray-800">{patternAnalysis.worstHabit}</p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Zap className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1.5">{L.coachingAdvice}</p>
                <p className="text-sm text-gray-800 leading-relaxed">{patternAnalysis.coachingAdvice}</p>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleCopySection>

      <CollapsibleCopySection id="copy-plan" label={L.copyActionPlanSection} icon={<Target className="w-5 h-5" />}>
        <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.copyPlan}</p>
        <div className="pt-2">
          {rewritesLoading && actionPlan.length === 0 && (
            <div className="flex items-center justify-center gap-3 py-8 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <p className="text-sm">{L.generatingActionPlan}</p>
            </div>
          )}
          {!rewritesLoading && rewritesError && actionPlan.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <p className="text-sm text-gray-500">{L.actionPlanUnavailable}</p>
              {onRetryRewrites && (
                <button
                  onClick={onRetryRewrites}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  {L.retryRewrites}
                </button>
              )}
            </div>
          )}
          {actionPlan.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{L.tableHash}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{L.actionColumn}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{L.blocksColumn}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{L.impactColumn}</th>
                  </tr>
                </thead>
                <tbody>
                  {actionPlan.map(item => (
                    <tr key={item.priority} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">{item.priority}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">{item.action}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{item.blocksAffected}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{item.impact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CollapsibleCopySection>

      <div className="bg-gray-900 text-white rounded-lg p-6">
        <h2 className="text-lg font-bold mb-3">{L.finalCopyAssessment}</h2>
        <p className="text-gray-300 leading-relaxed">{result.finalSummary}</p>
        <div className="mt-4 pt-4 border-t border-gray-700 flex items-center gap-3">
          <span className="text-gray-400 text-sm">{L.overallCopyScore}</span>
          <span className={`text-2xl font-bold ${scoreColor(pageScore.overallScore)}`}>{pageScore.overallScore.toFixed(1)}/10</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{L.glossaryTitle}</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
          {COPY_GLOSSARY.map(entry => (
            <p key={entry.term} className="text-sm text-gray-700">
              <span className="font-semibold">{entry.term}:</span> {entry.definition}
            </p>
          ))}
        </div>
      </div>
    </div>
    </CopyPrintContext.Provider>
  );
}

export function buildCopyMarkdownSection(copy: CopyAnalysisResult): string {
  const ps = copy.pageScore;
  let md = '\n\n---\n\n# Part 3: Copy Performance Analysis\n\n';
  md += `## A. Summary\n\n${copy.copySummary}\n\n`;
  md += `**Overall Copy Score:** ${ps.overallScore.toFixed(1)}/10\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Total Blocks | ${ps.totalBlocks} |\n`;
  md += `| ${colorEmoji('green')} Green (Strong) | ${ps.greenBlocks} (${Math.round(ps.greenPercent)}%) |\n`;
  md += `| ${colorEmoji('yellow')} Yellow (Mediocre) | ${ps.yellowBlocks} (${Math.round(ps.yellowPercent)}%) |\n`;
  md += `| ${colorEmoji('red')} Red (Weak) | ${ps.redBlocks} (${Math.round(ps.redPercent)}%) |\n`;
  md += `| Reading Level | ${ps.readingLevel} |\n`;
  md += `| Estimated Read Time | ${ps.estimatedReadingTime} |\n`;
  md += `| Tone Consistency | ${ps.toneConsistency} |\n\n`;
  md += `## B. Copy Heatmap\n\n`;
  copy.copyHeatmap.forEach(b => {
    const em = colorEmoji(b.color);
    const name = b.sectionName || getSectionName(b);
    md += `${em} **${name}** · #${b.blockNumber} (${b.compositeScore.toFixed(1)}/10)\n\n`;
    md += `> ${b.blockText || b.blockTextPreview}\n\n`;
  });
  md += `## C. Dimension Averages\n\n`;
  md += `| Dimension | Average | Assessment |\n|-----------|---------|------------|\n`;
  copy.dimensionAverages.forEach(d => {
    md += `| ${d.dimension} | ${d.average.toFixed(1)}/10 | ${d.assessment} |\n`;
  });
  md += `\n## D. Top Priority Rewrites\n\n`;
  copy.topPriorityRewrites.forEach(r => {
    const rName = r.sectionName || `#${r.blockNumber}`;
    md += `### Priority ${r.priority} — ${rName}\n\n`;
    md += `**Score improvement:** ${r.currentScore.toFixed(1)} → ${r.projectedScore.toFixed(1)}\n\n`;
    md += `**Issue:** ${r.issue}\n\n**Rewrite:** ${r.rewrite}\n\n`;
  });
  md += `## E. Pattern Analysis\n\n`;
  md += `**Dominant Weakness:** ${copy.patternAnalysis.dominantWeakness}\n\n`;
  md += `**Worst Habit:** ${copy.patternAnalysis.worstHabit}\n\n`;
  md += `**Coaching Advice:** ${copy.patternAnalysis.coachingAdvice}\n\n`;
  md += `## F. Final Summary\n\n${copy.finalSummary}\n`;
  md += glossaryToMarkdown(COPY_GLOSSARY);
  return md;
}
