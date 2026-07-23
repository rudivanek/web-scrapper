import { useState, useContext, createContext, useEffect, useRef } from 'react';
import {
  ChevronDown, ChevronUp, Copy, CheckCircle, XCircle, AlertCircle,
  Search, FileText, Hash, Code, List, TrendingUp, Zap, Target, AlertTriangle,
  Download, Printer, FileDown
} from 'lucide-react';
import type { SEOAuditResult, SEOKeywordMapItem } from '../types/audit';
import { exportToPdf } from '../lib/exportPdf';
import { getScoreExplanation, getScoreBenchmark, getScoreLabel, getScoreLabelColor, SECTION_EXPLANATIONS } from '../lib/clientExplanations';
import { SEO_GLOSSARY } from '../lib/glossaries';
import { getLabels } from '../lib/i18n';

interface SEOAuditResultsProps {
  result: SEOAuditResult;
  onExportMarkdown?: () => void;
  onExportWord?: () => void;
  onExportHtml?: () => void;
  exportFilename?: string;
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

const SEOPrintContext = createContext(false);

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

function KeywordStatusBadge({ status, goodLabel, needsWorkLabel, missingLabel }: {
  status: SEOKeywordMapItem['status'];
  goodLabel: string;
  needsWorkLabel: string;
  missingLabel: string;
}) {
  if (status === 'good') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3 h-3" />{goodLabel}</span>;
  }
  if (status === 'needs work') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200"><AlertCircle className="w-3 h-3" />{needsWorkLabel}</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200"><XCircle className="w-3 h-3" />{missingLabel}</span>;
}

function BoolCell({ value }: { value: boolean }) {
  return value
    ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
    : <XCircle className="w-4 h-4 text-red-400 mx-auto" />;
}

function CodeBlock({ code, schemaType, copyLabel, copiedLabel }: { code: string; schemaType: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 text-gray-100">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-mono font-semibold">{schemaType}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors"
          style={copied ? { background: '#064e3b', color: '#6ee7b7' } : { background: '#374151', color: '#d1d5db' }}
        >
          {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <pre className="bg-gray-950 text-gray-200 text-xs font-mono p-4 overflow-x-auto leading-relaxed max-h-72 overflow-y-auto">
        {code}
      </pre>
    </div>
  );
}

function CollapsibleSEOSection({ id, label, icon, defaultOpen = true, children }: {
  id: string; label: string; icon?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isPrinting = useContext(SEOPrintContext);
  const isOpen = open || isPrinting;
  return (
    <div id={id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-gray-500 flex-shrink-0">{icon}</span>}
          <h2 className="text-lg font-bold text-gray-900">{label}</h2>
        </div>
        <span className="print:hidden">
          {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </span>
      </button>
      {isOpen && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

function useActiveSEOSection(ids: string[]) {
  const [active, setActive] = useState('');
  useEffect(() => {
    const handle = () => {
      let current = '';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) current = id;
      }
      setActive(current);
    };
    window.addEventListener('scroll', handle, { passive: true });
    handle();
    return () => window.removeEventListener('scroll', handle);
  }, []);
  return active;
}

function HeadingStructureMap({ mapText }: { mapText: string }) {
  const lines = mapText.split('\n').filter(l => l.trim());
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 font-mono text-sm space-y-1.5">
      {lines.map((line, i) => {
        const isH1 = line.match(/^-?\s*H1:/i);
        const isH2 = line.match(/^\s+-?\s*H2:/i);
        const isH3 = line.match(/^\s{2,}-?\s*H3:/i);
        const hasIssue = line.includes('[ISSUE');
        const indent = isH3 ? 'ml-8' : isH2 ? 'ml-4' : '';
        const color = hasIssue
          ? 'text-red-700'
          : isH1
          ? 'text-gray-900 font-bold'
          : isH2
          ? 'text-gray-700 font-semibold'
          : 'text-gray-600';
        return (
          <div key={i} className={`flex items-start gap-2 ${indent}`}>
            {hasIssue
              ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
              : isH1
              ? <span className="text-blue-500 font-bold text-xs flex-shrink-0 mt-0.5">H1</span>
              : isH2
              ? <span className="text-emerald-600 font-bold text-xs flex-shrink-0 mt-0.5">H2</span>
              : <span className="text-amber-600 font-bold text-xs flex-shrink-0 mt-0.5">H3</span>
            }
            <span className={color}>{line.replace(/^\s*-?\s*(H[1-6]:)?/i, '').trim()}</span>
          </div>
        );
      })}
    </div>
  );
}

export function SEOAuditResults({ result, onExportMarkdown, onExportWord, onExportHtml, exportFilename, auditMetadata }: SEOAuditResultsProps) {
  const L = getLabels(result.language);
  const [isPrinting, setIsPrinting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [stickyTop, setStickyTop] = useState(100);
  const tocIds = L.seoToc.map(s => s.id);
  const activeSection = useActiveSEOSection(tocIds);
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

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 128;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

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
      await exportToPdf('seo-audit-results', exportFilename || 'seo-audit');
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  const rawSeoScore = result.seoScoreCard.weightedTotal;
  const seoScore = rawSeoScore > 10 ? rawSeoScore / 10 : rawSeoScore;

  const scoreRows = [
    { key: 'titleMeta' as const, weight: '15%' },
    { key: 'headingStructure' as const, weight: '15%' },
    { key: 'contentQuality' as const, weight: '20%' },
    { key: 'keywordOptimization' as const, weight: '15%' },
    { key: 'links' as const, weight: '10%' },
    { key: 'imageMedia' as const, weight: '10%' },
    { key: 'schemaStructuredData' as const, weight: '10%' },
    { key: 'contentArchitecture' as const, weight: '5%' },
  ];

  return (
    <SEOPrintContext.Provider value={isPrinting}>
      <div id="seo-audit-results" className="space-y-4">
        {auditMetadata && (
          <div className="hidden print:block mb-6">
            <img src="https://sharpen.studio/wp-content/uploads/2023/02/sharpen.svg" alt="Sharpen Studio" className="h-9 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-900">{L.seoPrintTitle}</h1>
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
        <div className="h-12 print:hidden" />
        <div className="fixed left-0 right-0 z-30 px-4 sm:px-6 lg:px-8 print:hidden pointer-events-none" style={{ top: `${stickyTop}px` }}>
          <div className="max-w-7xl mx-auto">
            <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-lg overflow-x-auto shadow-md pointer-events-auto">
              <div className="flex gap-0.5 p-1.5 items-center">
                <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider px-2 flex-shrink-0 select-none">{L.jumpTo}</span>
                <div className="w-px h-4 bg-gray-200 flex-shrink-0 mx-1" />
                {L.seoToc.map(s => (
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

        <div id="seo-summary" className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">Puntuación de Posicionamiento en Google</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className={`text-6xl font-bold ${scoreColor(seoScore)}`}>{seoScore.toFixed(1)}</span>
                <span className="text-2xl text-gray-400 font-medium">/10</span>
              </div>
              <div className="h-2 w-48 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${scoreBarColor(seoScore)}`} style={{ width: `${seoScore * 10}%` }} />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full ${getScoreLabelColor(seoScore)}`}>{getScoreLabel(seoScore)}</span>
              </div>
              <p className="text-xs text-gray-500 italic mt-1 max-w-md">{getScoreExplanation(seoScore)}</p>
              <p className="text-xs text-gray-400 italic mt-1 max-w-md">{getScoreBenchmark(seoScore)}</p>
              {(onExportMarkdown || onExportWord) && (
                <div className="mt-4 print:hidden">
                  <p className="text-xs text-gray-400 mb-2">Al imprimir: desactiva "Encabezados y pies de página" en las opciones del navegador para un PDF limpio.</p>
                  <div className="flex gap-2">
                  {onExportMarkdown && (
                    <button onClick={onExportMarkdown} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors">
                      <Download className="w-4 h-4" />
                      .md
                    </button>
                  )}
                  {onExportWord && (
                    <button onClick={onExportWord} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 text-sm font-medium rounded hover:bg-gray-200 transition-colors border border-gray-200">
                      <FileText className="w-4 h-4" />
                      .docx
                    </button>
                  )}
                  {onExportHtml && (
                    <button onClick={onExportHtml} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 text-sm font-medium rounded hover:bg-gray-200 transition-colors border border-gray-200">
                      <FileDown className="w-4 h-4" />
                      .html
                    </button>
                  )}
                  <button onClick={handlePrintPDF} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 text-sm font-medium rounded hover:bg-gray-200 transition-colors border border-gray-200">
                    <Printer className="w-4 h-4" />
                    PDF
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
              )}
            </div>
            <div className="sm:max-w-sm">
              <p className="text-xs text-gray-400 italic mb-2">{SECTION_EXPLANATIONS.seoSummary}</p>
              <p className="text-sm text-gray-700 leading-relaxed">{result.seoExecutiveSummary ?? ''}</p>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-gray-100 grid sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{L.targetKeywords}</p>
              <div className="flex flex-wrap gap-1.5">
                {(result.seoContext?.primaryKeywords ?? []).map((kw, i) => (
                  <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-medium">{kw}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{L.searchIntent}</p>
              <p className="text-sm text-gray-800">{result.seoContext?.searchIntent ?? ''}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{L.likelyCompetitors}</p>
              <p className="text-sm text-gray-800">{result.seoContext?.likelyCompetitors ?? ''}</p>
            </div>
          </div>
        </div>

        <div id="seo-scores" className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-1">{L.seoScoreCard}</h2>
            <p className="text-xs text-gray-400 italic">{SECTION_EXPLANATIONS.seoScores}</p>
          </div>
          <div className="px-6 py-4 space-y-3">
            {scoreRows.map(({ key, weight }) => {
              const rawScore = result.seoScoreCard[key] as number;
              const score = rawScore > 10 ? rawScore / 10 : rawScore;
              const label = L.seoScoreRowLabels[key] ?? key;
              return (
                <div key={key}>
                  <div className="flex items-center gap-4">
                    <div className="w-48 flex-shrink-0">
                      <p className="text-sm font-medium text-gray-700">{label}</p>
                      <p className="text-xs text-gray-400">{weight}</p>
                    </div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${scoreBarColor(score)}`} style={{ width: `${score * 10}%` }} />
                    </div>
                    <span className={`w-12 text-right text-sm font-bold ${scoreColor(score)}`}>{score.toFixed(1)}/10</span>
                    <span className={`hidden sm:inline-block px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${getScoreLabelColor(score)}`}>{getScoreLabel(score)}</span>
                  </div>
                  <p className="text-xs text-gray-400 italic mt-0.5 ml-52">{getScoreExplanation(score)}</p>
                  {key === 'schemaStructuredData' && (
                    <p className="text-xs text-amber-600 italic mt-0.5 ml-52">Listo para implementar — no está activo en la página aún</p>
                  )}
                </div>
              );
            })}
            <div className="pt-3 mt-2 border-t border-gray-100 flex items-center justify-between">
              <span className="font-bold text-gray-900">{L.weightedTotal}</span>
              <span className={`text-2xl font-bold ${scoreColor(seoScore)}`}>{seoScore.toFixed(1)}/10</span>
            </div>
          </div>
        </div>

        <CollapsibleSEOSection id="seo-headings" label={L.headingStructureMap} icon={<List className="w-5 h-5" />}>
          <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.seoHeadings}</p>
          <div className="pt-2">
            <p className="text-xs text-gray-500 mb-3">{L.headingStructureHint}</p>
            <HeadingStructureMap mapText={result.headingStructureMap ?? ''} />
          </div>
        </CollapsibleSEOSection>

        <div id="seo-keywords" className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-1">{L.keywordMap}</h2>
            <p className="text-xs text-gray-400 italic">{SECTION_EXPLANATIONS.seoKeywords}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{L.keyword}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{L.type}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{L.title}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">H1</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{L.meta}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{L.first100w}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{L.frequency}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{L.status}</th>
                </tr>
              </thead>
              <tbody>
                {(result.keywordMap ?? []).map((item, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.keyword}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${item.type === 'primary' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                        {item.type === 'primary' ? L.primary : L.secondary}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center"><BoolCell value={item.inTitle} /></td>
                    <td className="px-4 py-3 text-center"><BoolCell value={item.inH1} /></td>
                    <td className="px-4 py-3 text-center"><BoolCell value={item.inMeta} /></td>
                    <td className="px-4 py-3 text-center"><BoolCell value={item.inFirst100Words} /></td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700 font-medium">{item.frequency}</td>
                    <td className="px-4 py-3">
                      <KeywordStatusBadge
                        status={item.status}
                        goodLabel={L.statusGood}
                        needsWorkLabel={L.statusNeedsWork}
                        missingLabel={L.statusMissing}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <CollapsibleSEOSection id="seo-analysis" label={L.detailedAnalysis} icon={<Search className="w-5 h-5" />}>
          <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.seoAnalysis}</p>
          <div className="space-y-6 pt-2">
            {(result.detailedAnalysis ?? []).map((item, i) => (
              <div key={i} className={i > 0 ? 'border-t border-gray-100 pt-6' : ''}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-gray-900">{item.dimension}</h3>
                  <span className={`text-sm font-bold ${scoreColor(item.score)}`}>{item.score}/10</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-3 bg-gray-50 p-3 rounded-lg">{item.currentState}</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">{L.issuesFound}</h4>
                    <ul className="space-y-1.5">
                      {(item.issues ?? []).map((issue, j) => (
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
                      {(item.recommendations ?? []).map((rec, j) => (
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
        </CollapsibleSEOSection>

        <CollapsibleSEOSection id="seo-rewrites" label={L.metaAndHeadingRewrites} icon={<FileText className="w-5 h-5" />}>
          <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.seoRewrites}</p>
          <div className="space-y-5 pt-2">
            {(result.metaHeadingRewrites ?? []).map((rewrite, i) => (
              <div key={i} className={i > 0 ? 'border-t border-gray-100 pt-5' : ''}>
                <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wide rounded mb-3">{rewrite.element}</span>
                <div className="grid sm:grid-cols-2 gap-3 mb-2">
                  <div>
                    <p className="text-xs font-bold text-red-600 uppercase mb-1.5">{L.current}</p>
                    <div className="text-sm text-gray-800 bg-red-50 border-l-4 border-red-400 p-3 rounded-r-lg leading-relaxed">{rewrite.current}</div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-700 uppercase mb-1.5">{L.optimized}</p>
                    <div className="text-sm text-gray-800 bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-r-lg leading-relaxed font-medium">{rewrite.optimized}</div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 italic">{L.rationale}: <span>{rewrite.rationale}</span></p>
              </div>
            ))}
          </div>
        </CollapsibleSEOSection>

        {(result.schemaMarkupCode ?? []).length > 0 && (
          <CollapsibleSEOSection id="seo-schema" label={L.schemaMarkupCode} icon={<Code className="w-5 h-5" />}>
            <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.seoSchema}</p>
            <div className="space-y-5 pt-2">
              {(result.schemaMarkupCode ?? []).map((schema, i) => (
                <div key={i}>
                  <div className="mb-2">
                    <h3 className="text-sm font-bold text-gray-900">{schema.schemaType}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{schema.rationale}</p>
                  </div>
                  <CodeBlock
                    code={schema.code}
                    schemaType={schema.schemaType}
                    copyLabel={L.copy}
                    copiedLabel={L.copied}
                  />
                </div>
              ))}
            </div>
          </CollapsibleSEOSection>
        )}

        <CollapsibleSEOSection id="seo-gaps" label={L.contentGapAnalysis} icon={<TrendingUp className="w-5 h-5" />}>
          <p className="text-xs text-gray-400 italic mb-4">{SECTION_EXPLANATIONS.seoGaps}</p>
          <div className="pt-2 grid sm:grid-cols-2 gap-6">
            {(result.contentGapAnalysis?.missingSubtopics ?? []).length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">{L.missingSubtopics}</h3>
                <ul className="space-y-1.5">
                  {(result.contentGapAnalysis?.missingSubtopics ?? []).map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-red-400 flex-shrink-0">•</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(result.contentGapAnalysis?.unansweredQuestions ?? []).length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">{L.unansweredQuestions}</h3>
                <ul className="space-y-1.5">
                  {(result.contentGapAnalysis?.unansweredQuestions ?? []).map((q, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-amber-500 flex-shrink-0">?</span>{q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(result.contentGapAnalysis?.recommendedSections ?? []).length > 0 && (
              <div className="sm:col-span-2">
                <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">{L.recommendedNewSections}</h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {(result.contentGapAnalysis?.recommendedSections ?? []).map((s, i) => (
                    <div key={i} className="flex gap-2 text-sm text-gray-700 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                      <span className="text-emerald-500 flex-shrink-0">→</span>{s}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(result.contentGapAnalysis?.additionalWordCount ?? 0) > 0 && (
              <div className="sm:col-span-2 flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <Hash className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm text-blue-800">
                  {L.additionalWordCount(result.contentGapAnalysis?.additionalWordCount ?? 0)}
                </span>
              </div>
            )}
          </div>
        </CollapsibleSEOSection>

        <div id="seo-wins">
          <p className="text-xs text-gray-400 italic mb-3 px-1">{SECTION_EXPLANATIONS.seoWins}</p>
          <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center"><Zap className="w-3.5 h-3.5" /></span>
              {L.quickSeoWins}
            </h2>
            <div className="space-y-3">
              {(result.seoQuickWins ?? []).map((win, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-emerald-500 font-bold flex-shrink-0 mt-0.5">✓</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{win.action}</p>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-xs text-gray-400">{win.estimatedTime}</span>
                      <span className="text-xs text-blue-600 font-medium">{win.impact}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center"><Target className="w-3.5 h-3.5" /></span>
              {L.highImpactChanges}
            </h2>
            <div className="space-y-3">
              {(result.seoHighImpactChanges ?? []).map((item, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-red-500 font-bold flex-shrink-0 mt-0.5">★</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.action}</p>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-xs text-gray-400">{item.estimatedTime}</span>
                      <span className="text-xs text-blue-600 font-medium">{item.impact}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>

        <div id="seo-plan" className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">{L.seoActionPlan}</h2>
          <p className="text-xs text-gray-400 italic mb-5">{SECTION_EXPLANATIONS.seoPlan}</p>
          <div className="space-y-4">
            {[
              { key: 'week1' as const, label: L.week1, color: 'bg-emerald-600', light: 'bg-emerald-50 border-emerald-200' },
              { key: 'week2to4' as const, label: L.weeks2to4, color: 'bg-amber-600', light: 'bg-amber-50 border-amber-200' },
              { key: 'month2to3' as const, label: L.month2to3, color: 'bg-red-600', light: 'bg-red-50 border-red-200' },
            ].map(({ key, label, color, light }) => (
              <div key={key} className={`border ${light} rounded-lg p-4`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 ${color} text-white rounded-full flex items-center justify-center text-xs font-bold`}>{label[0]}</div>
                  <h3 className="font-bold text-gray-900">{label}</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{L.actions}</p>
                    <p className="text-sm text-gray-700">{result.seoActionPlan?.[key]?.actions ?? ''}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{L.expectedImpact}</p>
                    <p className="text-sm text-gray-700">{result.seoActionPlan?.[key]?.impact ?? ''}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 text-white rounded-lg p-6">
          <h2 className="text-lg font-bold mb-3">{L.seoFinalSummary}</h2>
          <p className="text-gray-300 leading-relaxed">{result.seoFinalSummary ?? ''}</p>
          <div className="mt-4 pt-4 border-t border-gray-700 flex items-center gap-3">
            <span className="text-gray-400 text-sm">{L.overallSeoScore}</span>
            <span className={`text-2xl font-bold ${scoreColor(seoScore)}`}>{seoScore.toFixed(1)}/10</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Glosario de términos</h2>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
            {SEO_GLOSSARY.map(entry => (
              <p key={entry.term} className="text-sm text-gray-700">
                <span className="font-semibold">{entry.term}:</span> {entry.definition}
              </p>
            ))}
          </div>
        </div>

      </div>
    </SEOPrintContext.Provider>
  );
}
