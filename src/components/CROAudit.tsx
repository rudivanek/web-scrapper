import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { callClaude } from '../lib/callClaude';
import { parseClaudeJson } from '../lib/parseJson';
import { CRO_SYSTEM_PROMPT, buildCROUserPrompt } from '../lib/prompts/croPrompt';
import { SEO_SYSTEM_PROMPT, buildSEOUserPrompt } from '../lib/prompts/seoPrompt';
import {
  COPY_SYSTEM_PROMPT_PASS1,
  COPY_SYSTEM_PROMPT_PASS2,
  COPY_MAX_TOKENS_PASS1,
  COPY_MAX_TOKENS_PASS2,
  buildCopyPass1UserPrompt,
  buildCopyPass2UserPrompt,
  mergePassResults,
} from '../lib/prompts/copyPrompt';
import { CROAuditResults } from './CROAuditResults';
import { SEOAuditResults } from './SEOAuditResults';
import { CopyAnalysisResults } from './CopyAnalysisResults';
import { SavedCROAudits } from './SavedCROAudits';
import { CopyZapSend } from './CopyZapSend';
import { LoadingModal } from './LoadingModal';
import { ExportInformeModal } from './ExportInformeModal';
import type { ExportInformeOptions } from './ExportInformeModal';
import {
  Loader2,
  AlertCircle,
  Shell,
  Key,
  Download,
  Check,
  FolderOpen,
  Play
} from 'lucide-react';
import { scrapeFullPage } from '../lib/firecrawl';
import { extractMetaTags, extractImages, extractHeadings, extractSeoMetadata, buildSeoMetadataBlock } from '../lib/htmlExtract';
import type { ExtractedMetaTags, ExtractedImage, ExtractedHeadings } from '../lib/htmlExtract';
import { formatCROAuditToMarkdown, formatSEOAuditToMarkdown, formatCopyAnalysisToMarkdown } from '../lib/markdownFormatters';
import { exportCROAuditToDocx, exportSEOAuditToDocx, exportCopyAnalysisToDocx } from '../lib/docxFormatters';
import { exportCROAuditToHtml, exportSEOAuditToHtml, exportCopyAnalysisToHtml, exportInformeCompletoToHtml, exportScrapeToHtml } from '../lib/htmlExporters';
import type { AuditResult, SEOAuditResult } from '../types/audit';
import type { CopyAnalysisResult } from '../types/copyAnalysis';

interface CROAuditProps {
  anthropicKey: string;
}

interface ScrapedData {
  url: string;
  markdown: string;
  title?: string;
  wordCount: number;
  metaTags?: ExtractedMetaTags;
  images?: ExtractedImage[];
  headings?: ExtractedHeadings;
}

function playDing() {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1318.5, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.08);
    osc1.connect(gain);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 1.4);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2637, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(2200, ctx.currentTime + 0.06);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.12, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + 0.9);
  } catch {
  }
}

export function CROAudit({ anthropicKey }: CROAuditProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'cro' | 'seo' | 'copy' | 'copyzap'>(() => {
    const saved = sessionStorage.getItem('cro_audit_tab');
    return (saved as 'cro' | 'seo' | 'copy' | 'copyzap') || 'cro';
  });
  const [showHistory, setShowHistory] = useState(() => {
    const saved = sessionStorage.getItem('cro_show_history');
    return saved === 'true';
  });

  const [urlInput, setUrlInput] = useState(() => {
    const saved = sessionStorage.getItem('cro_url_input');
    return saved || '';
  });
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(() => {
    const saved = sessionStorage.getItem('cro_scraped_data');
    const parsed = saved ? JSON.parse(saved) : null;
    return parsed?.metaTags ? parsed : null;
  });
  const [scraping, setScraping] = useState(false);
  const [scrapingError, setScrapingError] = useState<string | null>(null);

  const [brandName, setBrandName] = useState(() => {
    const saved = sessionStorage.getItem('cro_brand_name');
    return saved || '';
  });
  const [pageType, setPageType] = useState(() => {
    const saved = sessionStorage.getItem('cro_page_type');
    return saved || 'Landing Page';
  });

  const [auditId, setAuditId] = useState<string | null>(() => {
    const saved = sessionStorage.getItem('cro_audit_id');
    return saved || null;
  });
  const [croResult, setCroResult] = useState<AuditResult | null>(() => {
    const saved = sessionStorage.getItem('cro_result');
    return saved ? JSON.parse(saved) : null;
  });
  const [croLoading, setCroLoading] = useState(false);
  const [croError, setCroError] = useState<string | null>(null);

  const [seoResult, setSeoResult] = useState<SEOAuditResult | null>(() => {
    const saved = sessionStorage.getItem('cro_seo_result');
    return saved ? JSON.parse(saved) : null;
  });
  const [seoLoading, setSeoLoading] = useState(false);
  const [seoError, setSeoError] = useState<string | null>(null);

  const [copyResult, setCopyResult] = useState<CopyAnalysisResult | null>(() => {
    const saved = sessionStorage.getItem('cro_copy_result');
    return saved ? JSON.parse(saved) : null;
  });
  const [copyzapResult, setCopyzapResult] = useState<any>(() => {
    const savedCopyzap = sessionStorage.getItem('cro_copyzap_result');
    const savedAuditId = sessionStorage.getItem('cro_audit_id');
    if (!savedCopyzap || !savedAuditId) return null;
    try {
      const parsed = JSON.parse(savedCopyzap);
      return parsed?.auditId === savedAuditId ? parsed.result : null;
    } catch {
      return null;
    }
  });
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copyRewritesLoading, setCopyRewritesLoading] = useState(false);

  const [contentSuggestionsLoading, setContentSuggestionsLoading] = useState(false);
  const [contentSuggestionsError, setContentSuggestionsError] = useState<string | null>(null);

  const [spinnerVisible, setSpinnerVisible] = useState(false);
  const [spinnerMessage, setSpinnerMessage] = useState('');
  const [cancelRequested, setCancelRequested] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);


  useEffect(() => {
    sessionStorage.setItem('cro_audit_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const titles: Record<string, string> = {
      cro: 'Sharpen.Studio — Auditoría de Conversión',
      seo: 'Sharpen.Studio — Auditoría SEO',
      copy: 'Sharpen.Studio — Análisis de Contenido',
    };
    document.title = titles[activeTab] || 'Sharpen.Studio';
    return () => {
      document.title = 'Sharpen.Studio';
    };
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem('cro_show_history', showHistory.toString());
  }, [showHistory]);

  useEffect(() => {
    sessionStorage.setItem('cro_url_input', urlInput);
  }, [urlInput]);

  useEffect(() => {
    if (scrapedData) {
      sessionStorage.setItem('cro_scraped_data', JSON.stringify(scrapedData));
    }
  }, [scrapedData]);

  useEffect(() => {
    sessionStorage.setItem('cro_brand_name', brandName);
  }, [brandName]);

  useEffect(() => {
    sessionStorage.setItem('cro_page_type', pageType);
  }, [pageType]);

  useEffect(() => {
    if (auditId) {
      sessionStorage.setItem('cro_audit_id', auditId);
    }
  }, [auditId]);

  useEffect(() => {
    if (croResult) {
      sessionStorage.setItem('cro_result', JSON.stringify(croResult));
    }
  }, [croResult]);

  useEffect(() => {
    if (seoResult) {
      sessionStorage.setItem('cro_seo_result', JSON.stringify(seoResult));
    }
  }, [seoResult]);

  useEffect(() => {
    if (copyResult) {
      sessionStorage.setItem('cro_copy_result', JSON.stringify(copyResult));
    }
  }, [copyResult]);

  useEffect(() => {
    if (copyzapResult && auditId) {
      sessionStorage.setItem('cro_copyzap_result', JSON.stringify({ auditId, result: copyzapResult }));
    } else {
      sessionStorage.removeItem('cro_copyzap_result');
    }
  }, [copyzapResult, auditId]);

  const handleScrapePage = async () => {
    if (!urlInput.trim()) {
      setScrapingError('Please enter a URL');
      return;
    }

    const newUrl = urlInput.startsWith('http') ? urlInput : `https://${urlInput}`;
    const isNewUrl = !scrapedData || newUrl !== scrapedData.url;

    setScraping(true);
    setScrapingError(null);
    setScrapedData(null);
    sessionStorage.removeItem('cro_scraped_data');

    if (isNewUrl) {
      setCroResult(null);
      setSeoResult(null);
      setCopyResult(null);
      setCopyzapResult(null);
      setAuditId(null);
      sessionStorage.removeItem('cro_result');
      sessionStorage.removeItem('cro_seo_result');
      sessionStorage.removeItem('cro_copy_result');
      sessionStorage.removeItem('cro_copyzap_result');
      sessionStorage.removeItem('cro_audit_id');
    }

    try {
      const result = await scrapeFullPage(newUrl);

      if (!result.success || !result.data?.markdown) {
        throw new Error('Failed to scrape page');
      }

      const html = result.data.html || '';
      const rawHtml = result.data.rawHtml || '';
      const htmlForContent = html || rawHtml;

      const seoMeta = (html || rawHtml) ? extractSeoMetadata(html, rawHtml) : null;
      const seoBlock = seoMeta ? buildSeoMetadataBlock(seoMeta) : '';
      const enrichedMarkdown = seoBlock + result.data.markdown;

      const domExtracted = htmlForContent ? extractMetaTags(htmlForContent) : null;
      const NOT_FOUND = 'NOT FOUND';
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

      const wordCount = enrichedMarkdown.split(/\s+/).length;

      setScrapedData({
        url: newUrl,
        markdown: enrichedMarkdown,
        title: result.data.metadata?.title || seoMeta?.metaTitle || newUrl,
        wordCount,
        metaTags,
        images,
        headings,
      });
      setScrapingError(null);
    } catch (err) {
      setScrapingError(err instanceof Error ? err.message : 'Failed to scrape page');
    } finally {
      setScraping(false);
    }
  };

  const handleCancel = () => {
    setCancelRequested(true);
    setSpinnerVisible(false);
    setCroLoading(false);
    setSeoLoading(false);
    setCopyLoading(false);
    setCopyRewritesLoading(false);
  };

  const exportToMarkdown = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToWord = async (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunCROAudit = async () => {
    if (!scrapedData || !user) return;

    setCroLoading(true);
    setCroError(null);
    setCancelRequested(false);
    setCopyzapResult(null);
    setSeoResult(null);
    setCopyResult(null);
    setAuditId(null);
    sessionStorage.removeItem('cro_seo_result');
    sessionStorage.removeItem('cro_copy_result');
    sessionStorage.removeItem('cro_audit_id');
    sessionStorage.removeItem('cro_copyzap_result');

    setSpinnerMessage('Running CRO Audit... this may take 1–2 minutes.');
    setSpinnerVisible(true);

    let currentAuditId: string | null = null;

    try {
      if (cancelRequested) throw new Error('Cancelled by user');

      const auditData = {
        brandName: brandName || 'Unknown',
        pageType,
        targetUrl: scrapedData.url,
        pageMarkdown: scrapedData.markdown,
        competitor1: '',
        competitor2: '',
        competitor3: '',
        notes: '',
        metaTags: scrapedData.metaTags,
        images: scrapedData.images,
        headings: scrapedData.headings,
      };

      const { data: funcResult, error: funcError } = await supabase.functions.invoke('run-cro-audit', {
        body: {
          userId: user.id,
          brandName: auditData.brandName,
          pageType: auditData.pageType,
          targetUrl: auditData.targetUrl,
          pageMarkdown: auditData.pageMarkdown,
        },
      });

      if (funcError || !funcResult?.success) {
        throw new Error(funcError?.message || funcResult?.error || 'Failed to create audit record');
      }

      currentAuditId = funcResult.auditId;
      setAuditId(currentAuditId);

      const userPrompt = buildCROUserPrompt(auditData);
      const rawResult = await callClaude(anthropicKey, CRO_SYSTEM_PROMPT, userPrompt, 16000);
      const structuredResult = parseClaudeJson(rawResult);

      await supabase
        .from('audits')
        .update({
          status: 'completed',
          structured_result_json: structuredResult,
          weighted_score: structuredResult.weighted_score,
          detected_language: structuredResult.detected_language,
          model_used: 'claude-3-5-sonnet-20241022',
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentAuditId);

      setCroResult(structuredResult as AuditResult);
      await runContentSuggestions(currentAuditId!, structuredResult as AuditResult);
    } catch (err) {
      console.error('[CRO] Error:', err);
      setCroError(err instanceof Error ? err.message : 'CRO audit failed');
      if (currentAuditId) {
        await supabase.from('audits').update({ status: 'failed' }).eq('id', currentAuditId);
      }
    } finally {
      setCroLoading(false);
      setSpinnerVisible(false);
    }
  };

  const handleRunSEOAudit = async () => {
    if (!scrapedData || !user) return;

    setSeoLoading(true);
    setSeoError(null);
    setCancelRequested(false);
    setCopyzapResult(null);
    setSpinnerMessage('Running SEO Audit... this may take 1–2 minutes.');
    setSpinnerVisible(true);

    let currentAuditId = auditId;

    try {
      if (cancelRequested) throw new Error('Cancelled by user');

      const auditData = {
        brandName: brandName || 'Unknown',
        pageType,
        targetUrl: scrapedData.url,
        pageMarkdown: scrapedData.markdown,
        metaTags: scrapedData.metaTags,
        images: scrapedData.images,
        headings: scrapedData.headings,
      };

      const { data: funcResult, error: funcError } = await supabase.functions.invoke('run-seo-audit', {
        body: {
          userId: user.id,
          brandName: auditData.brandName,
          pageType: auditData.pageType,
          targetUrl: auditData.targetUrl,
          pageMarkdown: auditData.pageMarkdown,
          auditId: currentAuditId,
        },
      });

      if (funcError || !funcResult?.success) {
        throw new Error(funcError?.message || funcResult?.error || 'Failed to create audit record');
      }

      currentAuditId = funcResult.auditId;
      setAuditId(currentAuditId);

      const userPrompt = buildSEOUserPrompt(auditData);
      const rawResult = await callClaude(anthropicKey, SEO_SYSTEM_PROMPT, userPrompt, 16000);
      const structuredResult = parseClaudeJson(rawResult);

      await supabase.from('audits').update({
        seo_status: 'completed',
        seo_result_json: structuredResult,
        copyzap_result_json: null,
        updated_at: new Date().toISOString(),
      }).eq('id', currentAuditId);

      setSeoResult(structuredResult as SEOAuditResult);
      playDing();
    } catch (err) {
      console.error('[SEO] Error:', err);
      setSeoError(err instanceof Error ? err.message : 'SEO audit failed');
      if (currentAuditId) {
        await supabase.from('audits').update({ seo_status: 'failed' }).eq('id', currentAuditId);
      }
    } finally {
      setSeoLoading(false);
      setSpinnerVisible(false);
    }
  };

  const handleRunCopyAnalysis = async () => {
    if (!scrapedData || !user) return;

    setCopyLoading(true);
    setCopyError(null);
    setCancelRequested(false);
    setCopyzapResult(null);
    setSpinnerMessage('Running Copy Analysis Pass 1... this may take 1–2 minutes.');
    setSpinnerVisible(true);

    let currentAuditId = auditId;

    try {
      if (cancelRequested) throw new Error('Cancelled by user');

      const auditData = {
        brandName: brandName || 'Unknown',
        pageType,
        targetUrl: scrapedData.url,
        pageMarkdown: scrapedData.markdown,
        headings: scrapedData.headings,
      };

      const { data: funcResult, error: funcError } = await supabase.functions.invoke('run-copy-analysis', {
        body: {
          userId: user.id,
          brandName: auditData.brandName,
          pageType: auditData.pageType,
          targetUrl: auditData.targetUrl,
          pageMarkdown: auditData.pageMarkdown,
          auditId: currentAuditId,
        },
      });

      if (funcError || !funcResult?.success) {
        throw new Error(funcError?.message || funcResult?.error || 'Failed to create audit record');
      }

      currentAuditId = funcResult.auditId;
      setAuditId(currentAuditId);

      const pass1UserPrompt = buildCopyPass1UserPrompt(auditData);
      const pass1Raw = await callClaude(anthropicKey, COPY_SYSTEM_PROMPT_PASS1, pass1UserPrompt, COPY_MAX_TOKENS_PASS1);
      const pass1Result = parseClaudeJson(pass1Raw);

      const partialMerged = mergePassResults(pass1Result, null);
      await supabase.from('audits').update({
        copy_status: 'pass1_complete',
        copy_result_json: partialMerged,
        copyzap_result_json: null,
        updated_at: new Date().toISOString(),
      }).eq('id', currentAuditId);

      setCopyResult(partialMerged as CopyAnalysisResult);
      setCopyLoading(false);
      setCopyRewritesLoading(true);
      playDing();

      setSpinnerMessage('Running Copy Analysis Pass 2 (rewrites)... almost done.');

      const pass2UserPrompt = buildCopyPass2UserPrompt(pass1Result, auditData);
      const pass2Raw = await callClaude(anthropicKey, COPY_SYSTEM_PROMPT_PASS2, pass2UserPrompt, COPY_MAX_TOKENS_PASS2);
      const pass2Result = parseClaudeJson(pass2Raw);

      const finalMerged = mergePassResults(pass1Result, pass2Result);
      await supabase.from('audits').update({
        copy_status: 'completed',
        copy_result_json: finalMerged,
        copy_error_message: null,
        copyzap_result_json: null,
        updated_at: new Date().toISOString(),
      }).eq('id', currentAuditId);

      setCopyResult(finalMerged as CopyAnalysisResult);
      setCopyRewritesLoading(false);
      playDing();
    } catch (err) {
      console.error('[Copy] Error:', err);
      setCopyRewritesLoading(false);
      setCopyLoading(false);
      const errMsg = err instanceof Error ? err.message : 'Copy analysis failed';
      setCopyError(errMsg);
      if (currentAuditId) {
        await supabase.from('audits').update({
          copy_status: 'failed',
          copy_error_message: errMsg,
          updated_at: new Date().toISOString(),
        }).eq('id', currentAuditId);
      }
    } finally {
      setSpinnerVisible(false);
    }
  };

  const runContentSuggestions = async (auditIdParam: string, croResultParam: AuditResult) => {
    if (!user || !scrapedData) return;

    setContentSuggestionsLoading(true);
    setContentSuggestionsError(null);
    setSpinnerMessage('Generating content suggestions... this may take 1–2 minutes.');
    setSpinnerVisible(true);

    try {
      if (cancelRequested) throw new Error('Cancelled by user');

      const auditData = {
        brandName: brandName || 'Unknown',
        pageType,
        targetUrl: scrapedData.url,
        pageMarkdown: scrapedData.markdown,
        existingAuditResult: croResultParam,
      };

      const { data: funcResult, error: funcError } = await supabase.functions.invoke('generate-content-suggestions', {
        body: {
          userId: user.id,
          auditId: auditIdParam,
        },
      });

      if (funcError || !funcResult?.success) {
        throw new Error(funcError?.message || funcResult?.error || 'Failed to create content suggestions record');
      }

      const { CONTENT_SUGGESTIONS_SYSTEM_PROMPT, buildContentSuggestionsUserPrompt } = await import('../lib/prompts/contentSuggestionsPrompt');
      const userPrompt = buildContentSuggestionsUserPrompt(auditData);
      const rawResult = await callClaude(anthropicKey, CONTENT_SUGGESTIONS_SYSTEM_PROMPT, userPrompt, 12000);
      const structuredResult = parseClaudeJson(rawResult);

      const mergedResult = {
        ...croResultParam,
        readyToUseContent: structuredResult.readyToUseContent || [],
      };

      await supabase.from('audits').update({
        structured_result_json: mergedResult,
        content_suggestions_status: 'completed',
        updated_at: new Date().toISOString(),
      }).eq('id', auditIdParam);

      setCroResult(mergedResult as AuditResult);
      playDing();
    } catch (err) {
      console.error('[ContentSuggestions] Error:', err);
      setContentSuggestionsError(err instanceof Error ? err.message : 'Failed to generate content suggestions');
      if (auditIdParam) {
        await supabase.from('audits').update({
          content_suggestions_status: 'failed',
        }).eq('id', auditIdParam);
      }
    } finally {
      setContentSuggestionsLoading(false);
      setSpinnerVisible(false);
    }
  };

  const handleGenerateContentSuggestions = async () => {
    if (!auditId || !user || !croResult || !scrapedData) return;
    await runContentSuggestions(auditId, croResult);
  };

  const handleLoadAudit = (audit: any) => {
    setAuditId(audit.id);
    setBrandName(audit.brand_name);
    setPageType(audit.page_type);

    if (audit.target_url) {
      setUrlInput(audit.target_url);
      setScrapedData({
        url: audit.target_url,
        markdown: '',
        title: audit.brand_name,
        wordCount: 0
      });
    }

    setCroResult(audit.structured_result_json as AuditResult || null);
    setSeoResult(audit.seo_result_json as SEOAuditResult || null);
    setCopyResult(audit.copy_result_json as CopyAnalysisResult || null);
    setCopyzapResult(audit.copyzap_result_json || null);

    setShowHistory(false);
    setActiveTab('cro');
  };

  const resetForm = () => {
    setUrlInput('');
    setScrapedData(null);
    setBrandName('');
    setPageType('Landing Page');
    setAuditId(null);
    setCroResult(null);
    setSeoResult(null);
    setCopyResult(null);
    setCopyzapResult(null);
    setCroError(null);
    setSeoError(null);
    setCopyError(null);
    setScrapingError(null);

    sessionStorage.removeItem('cro_url_input');
    sessionStorage.removeItem('cro_scraped_data');
    sessionStorage.removeItem('cro_brand_name');
    sessionStorage.removeItem('cro_page_type');
    sessionStorage.removeItem('cro_audit_id');
    sessionStorage.removeItem('cro_result');
    sessionStorage.removeItem('cro_seo_result');
    sessionStorage.removeItem('cro_copy_result');
    sessionStorage.removeItem('cro_copyzap_result');

    setShowHistory(false);
    setActiveTab('cro');
  };

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

  if (showHistory) {
    return (
      <div className="bg-white border border-gray-300">
        <div className="border-b border-gray-300 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Saved Audits</h2>
          <button
            onClick={resetForm}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Back to New Audit
          </button>
        </div>
        <div className="p-6">
          <SavedCROAudits onLoadAudit={handleLoadAudit} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-300">
      <div className="border-b border-gray-300 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shell className="w-6 h-6 text-orange-500" />
          <h1 className="text-xl font-bold text-gray-900">Módulo de Auditorías</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            View History
          </button>
          <div className="flex items-center gap-2 text-sm">
            <Key className="w-4 h-4 text-green-600" />
            <span className="text-green-600 font-medium">●  Session Active</span>
          </div>
        </div>
      </div>

      <div className="p-6 border-b border-gray-300 bg-gray-50">
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => {
                const newUrl = e.target.value;
                setUrlInput(newUrl);
                if (scrapedData && newUrl.trim() !== scrapedData.url) {
                  setScrapedData(null);
                  sessionStorage.removeItem('cro_scraped_data');
                }
              }}
              placeholder="Enter page URL to audit"
              className="flex-1 px-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
              disabled={scraping}
            />
            <button
              onClick={handleScrapePage}
              disabled={scraping || !urlInput.trim()}
              className="px-6 py-3 bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {scraping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scraping...
                </>
              ) : scrapedData ? (
                <>
                  <Download className="w-4 h-4" />
                  Re-scrape
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Scrape Page
                </>
              )}
            </button>
          </div>

          {scrapingError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {scrapingError}
            </div>
          )}

          {scrapedData && (
            <div className="p-4 bg-white border border-gray-300 flex items-center gap-3">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{scrapedData.title}</div>
                <div className="text-sm text-gray-500">{scrapedData.wordCount.toLocaleString()} words</div>
              </div>
              <button
                onClick={() => exportScrapeToHtml(scrapedData, brandName || 'extraccion')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold border border-gray-300 transition-colors"
                title="Exportar datos extraídos como HTML"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar HTML
              </button>
            </div>
          )}

          {scrapedData && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Enter brand name"
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Page Type
                </label>
                <select
                  value={pageType}
                  onChange={(e) => setPageType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {PAGE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {scrapedData && (
        <>
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-end">
            <div
              title={
                !croResult || !seoResult || !copyResult || !copyzapResult
                  ? 'Completa los 3 análisis para exportar el informe combinado'
                  : undefined
              }
            >
              <button
                disabled={!croResult || !seoResult || !copyResult || !copyzapResult}
                onClick={() => {
                  if (!croResult || !seoResult || !copyResult || !copyzapResult) return;
                  setShowExportModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar Informe Completo
              </button>
            </div>
          </div>

          <div style={{ background: '#f9f6f0', borderLeft: '4px solid #c8a96e', color: '#555', fontSize: '13px', lineHeight: '1.6', padding: '12px 20px', margin: 0 }}>
            <strong style={{ color: '#333' }}>Criterio de uso:</strong> Este reporte combina observaciones objetivas del contenido extraído con interpretación estratégica. Por ello, sus hallazgos y recomendaciones deben entenderse como insumos de análisis para apoyar decisiones de negocio, no como juicios absolutos. La validación final siempre debe considerar contexto, mercado, oferta y objetivos comerciales.
          </div>

          <div className="flex border-b border-gray-300">
            <button
              onClick={() => setActiveTab('cro')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'cro'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Auditoría de Conversión
            </button>
            <button
              onClick={() => setActiveTab('seo')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'seo'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Auditoría de Posicionamiento en Google
            </button>
            <button
              onClick={() => setActiveTab('copy')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'copy'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Análisis de Contenido y Textos
            </button>
            <button
              onClick={() => setActiveTab('copyzap')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'copyzap'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Acciones de Copy
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'cro' && (
              <div className="space-y-6">
                {!croResult && (
                  <button
                    onClick={handleRunCROAudit}
                    disabled={croLoading || !brandName.trim()}
                    className="px-6 py-3 bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {croLoading ? 'Analizando conversión...' : 'Analizar Conversión'}
                  </button>
                )}

                {croResult && (
                  <div className="space-y-4">
                    <button
                      onClick={handleRunCROAudit}
                      disabled={croLoading}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 border border-gray-300 transition-colors"
                    >
                      Volver a analizar conversión
                    </button>
                    <CROAuditResults
                      result={croResult}
                      onExportMarkdown={() => {
                        const content = formatCROAuditToMarkdown(croResult, brandName || 'Report');
                        exportToMarkdown(content, `cro-audit-${brandName || 'report'}.md`);
                      }}
                      onExportWord={async () => {
                        const blob = await exportCROAuditToDocx(croResult, brandName || 'Report');
                        exportToWord(blob, `cro-audit-${brandName || 'report'}.docx`);
                      }}
                      onExportHtml={() => {
                        exportCROAuditToHtml(croResult, brandName || 'Report', scrapedData?.url || '');
                      }}
                      exportFilename={`cro-audit-${brandName || 'report'}`}
                      targetUrl={scrapedData.url}
                      brandName={brandName}
                      pageType={pageType}
                      onGenerateContentSuggestions={handleGenerateContentSuggestions}
                      contentSuggestionsLoading={contentSuggestionsLoading}
                      contentSuggestionsError={contentSuggestionsError}
                      onRunSEOAudit={handleRunSEOAudit}
                      seoLoading={seoLoading}
                      seoError={seoError}
                      hasSEOResult={!!seoResult}
                      onSwitchToSEO={() => setActiveTab('seo')}
                      onRunCopyAnalysis={handleRunCopyAnalysis}
                      copyLoading={copyLoading}
                      copyError={copyError}
                      hasCopyResult={!!copyResult}
                      onSwitchToCopy={() => setActiveTab('copy')}
                    />
                  </div>
                )}

                {croError && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">CRO Audit Failed</div>
                      <div className="text-sm mt-1">{croError}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'seo' && (
              <div className="space-y-6">
                {!seoResult && (
                  <button
                    onClick={handleRunSEOAudit}
                    disabled={seoLoading || !brandName.trim()}
                    className="px-6 py-3 bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {seoLoading ? 'Analizando SEO...' : 'Analizar SEO'}
                  </button>
                )}

                {seoResult && (
                  <div className="space-y-4">
                    <button
                      onClick={handleRunSEOAudit}
                      disabled={seoLoading}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 border border-gray-300 transition-colors"
                    >
                      Volver a analizar SEO
                    </button>
                    <SEOAuditResults
                      result={seoResult}
                      onExportMarkdown={() => {
                        const content = formatSEOAuditToMarkdown(seoResult, brandName || 'Report');
                        exportToMarkdown(content, `seo-audit-${brandName || 'report'}.md`);
                      }}
                      onExportWord={async () => {
                        const blob = await exportSEOAuditToDocx(seoResult, brandName || 'Report');
                        exportToWord(blob, `seo-audit-${brandName || 'report'}.docx`);
                      }}
                      onExportHtml={() => {
                        exportSEOAuditToHtml(seoResult, brandName || 'Report', scrapedData?.url || '');
                      }}
                      exportFilename={`seo-audit-${brandName || 'report'}`}
                      auditMetadata={{
                        targetUrl: scrapedData.url,
                        brandName: brandName || 'Unknown',
                        pageType,
                      }}
                    />
                  </div>
                )}

                {seoError && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">SEO Audit Failed</div>
                      <div className="text-sm mt-1">{seoError}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'copy' && (
              <div className="space-y-6">
                {!copyResult && (
                  <button
                    onClick={handleRunCopyAnalysis}
                    disabled={copyLoading || !brandName.trim()}
                    className="px-6 py-3 bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {copyLoading ? 'Analizando contenido...' : 'Analizar Contenido'}
                  </button>
                )}

                {copyResult && (
                  <div className="space-y-4">
                    <button
                      onClick={handleRunCopyAnalysis}
                      disabled={copyLoading || copyRewritesLoading}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 border border-gray-300 transition-colors"
                    >
                      Volver a analizar contenido
                    </button>
                    <CopyAnalysisResults
                      result={copyResult}
                      onExportMarkdown={() => {
                        const content = formatCopyAnalysisToMarkdown(copyResult, brandName || 'Report');
                        exportToMarkdown(content, `copy-analysis-${brandName || 'report'}.md`);
                      }}
                      onExportWord={async () => {
                        const blob = await exportCopyAnalysisToDocx(copyResult, brandName || 'Report');
                        exportToWord(blob, `copy-analysis-${brandName || 'report'}.docx`);
                      }}
                      onExportHtml={() => {
                        exportCopyAnalysisToHtml(copyResult, brandName || 'Report', scrapedData?.url || '');
                      }}
                      exportFilename={`copy-analysis-${brandName || 'report'}`}
                      rewritesLoading={copyRewritesLoading}
                      auditMetadata={{
                        targetUrl: scrapedData.url,
                        brandName: brandName || 'Unknown',
                        pageType,
                      }}
                    />
                  </div>
                )}

                {copyError && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Copy Analysis Failed</div>
                      <div className="text-sm mt-1">{copyError}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'copyzap' && (
              <CopyZapSend
                croResult={croResult}
                seoResult={seoResult}
                copyResult={copyResult}
                auditId={auditId}
                savedResult={copyzapResult}
                onSave={setCopyzapResult}
                targetUrl={scrapedData?.url}
                brandName={brandName}
              />
            )}
          </div>
        </>
      )}

      <LoadingModal isOpen={spinnerVisible} onCancel={handleCancel} message={spinnerMessage} />

      {showExportModal && croResult && seoResult && copyResult && copyzapResult && scrapedData && (
        <ExportInformeModal
          onCancel={() => setShowExportModal(false)}
          onExport={(opts: ExportInformeOptions) => {
            const exportData = scrapedData;
            setShowExportModal(false);
            exportInformeCompletoToHtml(
              croResult,
              seoResult,
              copyResult,
              copyzapResult.cards,
              copyzapResult.combinedPrompt,
              [
                { label: 'CRO Audit', available: true },
                { label: 'SEO Audit', available: true },
                { label: 'Copy Analysis', available: true },
              ],
              brandName || 'Report',
              exportData.url,
              exportData,
              { includeExtraction: opts.includeExtraction, includeReadyToUse: opts.includeReadyToUse },
            );
          }}
        />
      )}
    </div>
  );
}
