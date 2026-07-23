import { useState, useCallback } from 'react';
import { CheckCircle, Minus, Copy, Check, Zap, RefreshCw, Download } from 'lucide-react';
import { exportCopyZapToHtml } from '../lib/htmlExporters';
import { supabase } from '../lib/supabase';
import type { AuditResult, SEOAuditResult } from '../types/audit';
import type { CopyAnalysisResult } from '../types/copyAnalysis';

interface CopyZapSendProps {
  croResult: AuditResult | null;
  seoResult: SEOAuditResult | null;
  copyResult: CopyAnalysisResult | null;
  auditId?: string | null;
  savedResult?: { cards: PromptCard[]; combinedPrompt: string } | null;
  onSave?: (result: { cards: PromptCard[]; combinedPrompt: string } | null) => void;
  targetUrl?: string;
  brandName?: string;
}

type Priority = 'Alta' | 'Media';
type SourceTag = 'CRO' | 'SEO' | 'Copy';

interface PromptCard {
  id: string;
  label: string;
  priority: Priority;
  sources: SourceTag[];
  promptText: string;
  combinedText?: string;
}

function useCopyButton() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);
  return { copiedId, copy };
}

function SourceBadge({ tag }: { tag: SourceTag }) {
  const colors: Record<SourceTag, string> = {
    CRO: 'bg-orange-100 text-orange-700 border-orange-200',
    SEO: 'bg-blue-100 text-blue-700 border-blue-200',
    Copy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold border rounded ${colors[tag]}`}>
      {tag}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded ${
      priority === 'Alta'
        ? 'bg-red-100 text-red-700 border border-red-200'
        : 'bg-amber-100 text-amber-700 border border-amber-200'
    }`}>
      {priority}
    </span>
  );
}

function PromptBox({ text, cardId, copiedId, onCopy }: {
  text: string;
  cardId: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  const isCopied = copiedId === cardId;
  return (
    <div className="relative mt-3">
      <div className="bg-gray-50 border border-gray-200 border-l-4 border-l-blue-500 p-4 pr-24">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{text}</pre>
      </div>
      <button
        onClick={() => onCopy(text, cardId)}
        className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-colors ${
          isCopied
            ? 'bg-green-50 border-green-300 text-green-700'
            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
        }`}
      >
        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {isCopied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  );
}

function firstSentence(text: string, maxLen = 90): string {
  const match = text.match(/^[^.!?]+[.!?]/);
  const raw = match ? match[0].trim() : text.slice(0, maxLen).trim();
  return raw.length > maxLen ? raw.slice(0, maxLen - 1) + '…' : raw;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

function buildCards(
  croResult: AuditResult | null,
  seoResult: SEOAuditResult | null,
  copyResult: CopyAnalysisResult | null,
): PromptCard[] {
  const cards: PromptCard[] = [];

  const primaryKeyword = seoResult?.seoContext?.primaryKeywords?.[0] || 'tu keyword principal';
  const primaryConversionGoal = croResult?.contextIdentification?.primaryConversionGoal || '';
  const marketIndustry = croResult?.contextIdentification?.marketIndustry || '';

  const getCROScore = (key: keyof AuditResult['scoredAssessment']) =>
    croResult ? (croResult.scoredAssessment[key] as number) : null;

  const getCopyDimAvg = (dim: string): number | null => {
    if (!copyResult) return null;
    const found = copyResult.dimensionAverages.find(
      d => d.dimension.toLowerCase() === dim.toLowerCase()
    );
    return found ? found.average : null;
  };

  const ctaCROScore = getCROScore('cta');
  const convRelAvg = getCopyDimAvg('conversionRelevance') ?? getCopyDimAvg('Conversion Relevance');
  const ctaSourcesCRO = ctaCROScore != null && ctaCROScore < 70;
  const ctaSourcesCopy = convRelAvg != null && convRelAvg < 6;
  if (ctaSourcesCRO || ctaSourcesCopy) {
    const sources: SourceTag[] = [];
    if (ctaSourcesCRO) sources.push('CRO');
    if (ctaSourcesCopy) sources.push('Copy');

    let ejemplo = `${primaryConversionGoal || 'Solicita tu diagnóstico gratuito'} → Sin compromiso. Respuesta en 24h.`;
    if (croResult?.readyToUseContent) {
      const ctaContent = croResult.readyToUseContent.find(
        (c: { category?: string; content?: string }) =>
          /cta/i.test(c.category || '')
      );
      if (ctaContent?.content) {
        ejemplo = firstSentence(stripMarkdown(ctaContent.content));
      }
    }

    cards.push({
      id: 'cta',
      label: 'CTA principal',
      priority: 'Alta',
      sources,
      promptText: `Reescribe el CTA principal de esta página para maximizar clics y conversiones.

Contexto: ${primaryConversionGoal || 'conversión principal de la página'}
Keyword objetivo: ${primaryKeyword}

El nuevo CTA debe:
- Comunicar el beneficio inmediato, no solo la acción
- Generar urgencia o reducir fricción percibida
- Ser específico al contexto de la audiencia
- Estar en voz activa y primera persona cuando aplique

Ejemplo de referencia: "${ejemplo}"

Entrega 3 versiones del CTA con diferentes ángulos (beneficio, urgencia, especificidad) y explica brevemente el razonamiento de cada una.`,
    });
  }

  const headlineCROScore = getCROScore('headline');
  const headingStructureSEO = seoResult ? (seoResult.seoScoreCard?.headingStructure ?? null) : null;
  const h1Text = seoResult?.metaHeadingRewrites?.find(
    (r: { element?: string }) => /h1/i.test(r.element || '')
  );
  const keywordInH1 = seoResult ? (
    h1Text
      ? (h1Text as { current?: string }).current?.toLowerCase().includes(primaryKeyword.toLowerCase())
      : false
  ) : null;

  const h1SourcesCRO = headlineCROScore != null && headlineCROScore < 70;
  const h1SourcesSEO = (headingStructureSEO != null && headingStructureSEO < 70) || keywordInH1 === false;
  if (h1SourcesCRO || h1SourcesSEO) {
    const sources: SourceTag[] = [];
    if (h1SourcesCRO) sources.push('CRO');
    if (h1SourcesSEO) sources.push('SEO');

    let ejemplo = `${primaryKeyword} — especialistas en ${marketIndustry || 'tu sector'}`;
    if (h1Text && (h1Text as { optimized?: string }).optimized) {
      ejemplo = (h1Text as { optimized: string }).optimized;
    }

    cards.push({
      id: 'h1',
      label: 'H1 / Hero headline',
      priority: 'Alta',
      sources,
      promptText: `Reescribe el H1 y headline principal de esta página para mejorar posicionamiento y conversión simultáneamente.

Keyword objetivo: ${primaryKeyword}
Industria / mercado: ${marketIndustry || 'sector relevante'}

El nuevo H1 debe:
- Incluir la keyword objetivo de forma natural al inicio o cerca del inicio
- Comunicar el beneficio diferenciador en menos de 10 palabras
- Resonar emocionalmente con la audiencia objetivo
- Estar optimizado tanto para buscadores como para humanos

Ejemplo de referencia: "${ejemplo}"

Entrega 3 versiones del H1 con diferentes enfoques y explica por qué cada una funciona para SEO y conversión.`,
    });
  }

  const benefitFeatureAvg = getCopyDimAvg('benefitFeatureRatio') ?? getCopyDimAvg('Benefit-to-Feature Ratio');
  if (benefitFeatureAvg != null && benefitFeatureAvg < 6) {
    const priority: Priority = benefitFeatureAvg < 4 ? 'Alta' : 'Media';

    let ejemplo = 'Sección de servicios — reescribir enfocado en beneficios tangibles';
    if (copyResult?.topPriorityRewrites) {
      const filtered = copyResult.topPriorityRewrites.filter(
        (r: { sectionName?: string; rewrite?: string }) =>
          !/(cta|botón|button|hero|header)/i.test(r.sectionName || '')
      );
      if (filtered.length > 0) {
        const examples = filtered.slice(0, 2).map((r: { sectionName?: string; rewrite?: string }) =>
          `"${r.sectionName || 'sección'} — ${firstSentence(r.rewrite || '')}"`
        );
        ejemplo = examples.join('\n- ');
      }
    }

    cards.push({
      id: 'entregables',
      label: 'Entregables y servicios',
      priority,
      sources: ['Copy'],
      promptText: `Reescribe la sección de entregables y servicios cambiando el enfoque de características a beneficios tangibles.

Problema detectado: El copy actual describe lo que haces (características) en lugar de lo que el cliente gana (beneficios). Puntuación beneficio/característica: ${benefitFeatureAvg.toFixed(1)}/10.

Para cada servicio o entregable, transforma la descripción con esta estructura:
- Beneficio principal → resultado concreto que obtiene el cliente
- Diferenciador → por qué es mejor o diferente a la alternativa
- Reducción de riesgo → qué fricción o miedo elimina

Ejemplo de referencia:
- ${ejemplo}

Entrega la versión reescrita completa de la sección con foco en beneficios medibles y concretos.`,
    });
  }

  const pricingFindings = croResult?.pricingPsychology?.findings?.length ?? 0;
  const convRelAvg2 = getCopyDimAvg('conversionRelevance') ?? getCopyDimAvg('Conversion Relevance');
  const pricingSourcesCRO = pricingFindings > 0;
  const pricingSourcesCopy = convRelAvg2 != null && convRelAvg2 < 6;
  if (pricingSourcesCRO || pricingSourcesCopy) {
    const sources: SourceTag[] = [];
    if (pricingSourcesCRO) sources.push('CRO');
    if (pricingSourcesCopy) sources.push('Copy');

    cards.push({
      id: 'precios',
      label: 'Sección de precios / paquetes',
      priority: sources.length >= 2 ? 'Alta' : 'Media',
      sources,
      promptText: `Reescribe y optimiza la sección de precios o paquetes de esta página aplicando principios de psicología de precios.

Objetivo de conversión: ${primaryConversionGoal || 'conversión principal'}

Aplica las siguientes técnicas según corresponda:
- Anclaje de precios: presenta primero la opción más cara para que las demás parezcan razonables
- Efecto señuelo: incluye una opción intermedia que haga la principal más atractiva
- Framing de valor: expresa el precio en términos de ROI o costo diario cuando aplique
- Reducción de fricción: elimina la percepción de riesgo con garantías o pruebas

Entrega la estructura recomendada de precios/paquetes con el copy completo para cada opción.`,
    });
  }

  const narrativeFlowScore = getCROScore('narrativeFlow');
  const persuasionAvg = getCopyDimAvg('persuasion') ?? getCopyDimAvg('Persuasion Strength');
  const procesoSourcesCRO = narrativeFlowScore != null && narrativeFlowScore < 70;
  const procesoSourcesCopy = (benefitFeatureAvg != null && benefitFeatureAvg < 6) || (persuasionAvg != null && persuasionAvg < 6);
  if (procesoSourcesCRO || procesoSourcesCopy) {
    const sources: SourceTag[] = [];
    if (procesoSourcesCRO) sources.push('CRO');
    if (procesoSourcesCopy) sources.push('Copy');

    let ejemplo = primaryConversionGoal
      ? `Paso 1 · Semana 1 — Defines ${primaryConversionGoal} antes de avanzar al siguiente paso`
      : 'Paso 1 · Semana 1 — Defines el objetivo y estableces las bases del proceso';
    if (croResult?.copyRewrites) {
      const procesoRewrite = croResult.copyRewrites.find(
        (r: { element?: string; improved?: string }) =>
          /proceso|step|cómo|pasos|fase/i.test(r.element || '')
      );
      if (procesoRewrite?.improved) {
        ejemplo = `Paso 1 · Semana 1 — ${firstSentence(procesoRewrite.improved)}`;
      }
    }

    cards.push({
      id: 'proceso',
      label: 'Proceso',
      priority: sources.length >= 2 ? 'Alta' : 'Media',
      sources,
      promptText: `Reescribe la sección de proceso o metodología de trabajo para hacerla más persuasiva y reducir la fricción del cliente potencial.

Problema detectado: La narrativa actual no guía al visitante con suficiente claridad desde el problema hasta la solución. El flujo lógico y la persuasión necesitan refuerzo.

El proceso reescrito debe:
- Usar una estructura de pasos numerados con timeframes concretos
- Mostrar progreso y reducir la percepción de complejidad o riesgo
- Incluir un micro-beneficio en cada paso (qué gana el cliente en esa etapa)
- Terminar con el resultado final tangible

Ejemplo de referencia: "${ejemplo}"

Entrega el proceso completo con 3–5 pasos, cada uno con nombre, timeframe y micro-beneficio.`,
    });
  }

  const keywordInFirst100 = seoResult ? (() => {
    const contentGaps = seoResult.contentGapAnalysis;
    if (!contentGaps) return null;
    const hasKeywordGap = Array.isArray(contentGaps.missingSubtopics)
      ? contentGaps.missingSubtopics.some((k: string) =>
          k.toLowerCase().includes(primaryKeyword.toLowerCase())
        )
      : false;
    return !hasKeywordGap;
  })() : null;

  const emotionalToneAvg = getCopyDimAvg('emotionalTone') ?? getCopyDimAvg('Emotional Tone');
  const primerasSourcesSEO = keywordInFirst100 === false;
  const primerasSourcesCopy = (persuasionAvg != null && persuasionAvg < 6) || (emotionalToneAvg != null && emotionalToneAvg < 6);
  if (primerasSourcesSEO || primerasSourcesCopy) {
    const sources: SourceTag[] = [];
    if (primerasSourcesSEO) sources.push('SEO');
    if (primerasSourcesCopy) sources.push('Copy');

    cards.push({
      id: 'primeras100',
      label: 'Primeras 100 palabras',
      priority: sources.length >= 2 ? 'Alta' : 'Media',
      sources,
      promptText: `Reescribe las primeras 100 palabras de esta página para maximizar tanto el impacto SEO como la retención del visitante.

Keyword objetivo: ${primaryKeyword}
Tono emocional deseado: Confianza, claridad y urgencia relevante

Las primeras 100 palabras deben:
- Incluir la keyword principal en las primeras 2–3 oraciones de forma natural
- Identificar el problema del visitante y posicionar la solución inmediatamente
- Generar suficiente interés para que el visitante siga leyendo
- Evitar genéricos como "Bienvenido a..." o "Somos una empresa de..."

Entrega 2 versiones: una más directa y orientada a conversión, otra con más énfasis en empatía con el problema del cliente.`,
    });
  }

  const trustSignalsScore = getCROScore('trustSignals');
  const contentGaps = seoResult?.contentGapAnalysis;
  const hasFAQGap = contentGaps
    ? (Array.isArray(contentGaps.unansweredQuestions) && contentGaps.unansweredQuestions.length > 0) ||
      (Array.isArray(contentGaps.recommendedSections) &&
        contentGaps.recommendedSections.some((s: string) => /faq|pregunta/i.test(s)))
    : false;
  const faqSourcesSEO = hasFAQGap;
  const faqSourcesCRO = trustSignalsScore != null && trustSignalsScore < 70;
  if (faqSourcesSEO || faqSourcesCRO) {
    const sources: SourceTag[] = [];
    if (faqSourcesCRO) sources.push('CRO');
    if (faqSourcesSEO) sources.push('SEO');

    const unanswered = contentGaps?.unansweredQuestions?.slice(0, 3) ?? [];

    cards.push({
      id: 'faq',
      label: 'FAQ',
      priority: sources.length >= 2 ? 'Alta' : 'Media',
      sources,
      promptText: `Crea o reescribe la sección de FAQ de esta página para responder las objeciones principales y mejorar el posicionamiento en búsquedas de pregunta.

Keyword objetivo: ${primaryKeyword}
${unanswered.length > 0 ? `Preguntas sin respuesta detectadas:\n${unanswered.map((q: string) => `- ${q}`).join('\n')}` : ''}

Cada respuesta de FAQ debe:
- Empezar con la keyword o variación semántica relevante
- Responder directa y completamente en 2–4 oraciones
- Incluir un micro-CTA implícito o explícito cuando sea natural
- Estar optimizada para Featured Snippets (respuesta directa en primera oración)

Entrega entre 5 y 8 preguntas con sus respuestas completas, ordenadas de mayor a menor frecuencia de búsqueda estimada.`,
    });
  }

  const linksScore = seoResult ? (seoResult.seoScoreCard?.links ?? null) : null;
  if (linksScore != null && linksScore < 70) {
    let ejemplo1 = `"${primaryConversionGoal || 'Solicita información'}" →`;
    let ejemplo2 = `"Conoce más sobre ${primaryKeyword}" →`;
    if (croResult?.copyRewrites) {
      const anchorRewrites = croResult.copyRewrites.filter(
        (r: { element?: string }) => /anchor|enlace|link|cta|botón/i.test(r.element || '')
      ).slice(0, 2);
      if (anchorRewrites.length > 0) {
        const parts = anchorRewrites.map((r: { element?: string; improved?: string; current?: string }) =>
          `"${firstSentence(r.improved || r.element || '')}" en lugar de "${r.current || r.element || ''}"`
        );
        if (parts[0]) ejemplo1 = parts[0];
        if (parts[1]) ejemplo2 = parts[1];
      }
    }

    cards.push({
      id: 'anchors',
      label: 'Anchor text y CTAs secundarios',
      priority: 'Media',
      sources: ['SEO'],
      promptText: `Reescribe todos los anchor texts y CTAs secundarios de esta página para mejorar el SEO interno y la tasa de clics.

Keyword objetivo: ${primaryKeyword}
Objetivo de conversión principal: ${primaryConversionGoal || 'conversión de la página'}

Los nuevos anchor texts deben:
- Usar texto descriptivo y relevante en lugar de "click aquí" o "leer más"
- Incluir variaciones semánticas de la keyword cuando aplique
- Generar expectativa clara sobre el destino del enlace
- Ser consistentes con el objetivo de conversión de cada sección

Ejemplo de referencia:
- ${ejemplo1}
- ${ejemplo2}

Entrega una lista completa de anchor texts recomendados con el contexto donde debe aparecer cada uno.`,
    });
  }

  const wireframeZones = croResult?.pageWireframe?.recommendedZones;
  if (wireframeZones && Array.isArray(wireframeZones) && wireframeZones.length > 0) {
    const zonesList = wireframeZones
      .map((z, i) => `${i + 1}. ${z.name}${z.status ? ` [${z.status}]` : ''}`)
      .join('\n');

    const combinedText = `Reestructura la página completa siguiendo esta arquitectura de contenido optimizada para conversión:

${zonesList}

Para cada zona:
- Escribe el copy completo según el objetivo de la zona
- Respeta el orden establecido — la estructura es la base sobre la que funciona todo el copy
- Asegura transiciones suaves entre zonas para mantener la narrativa

Keyword objetivo: ${primaryKeyword}
Objetivo de conversión: ${primaryConversionGoal || 'conversión principal de la página'}`;

    cards.push({
      id: 'wireframe',
      label: 'Estructura de página',
      priority: 'Alta',
      sources: ['CRO'],
      promptText: combinedText,
      combinedText,
    });
  }

  const sourceCounts = new Map<string, number>();
  cards.forEach(card => {
    if (card.id !== 'cta' && card.id !== 'h1' && card.id !== 'wireframe') {
      sourceCounts.set(card.id, card.sources.length);
    }
  });

  return cards.map(card => {
    if (card.id === 'cta' || card.id === 'h1' || card.id === 'wireframe') {
      return { ...card, priority: 'Alta' as Priority };
    }
    if (card.id === 'entregables' && benefitFeatureAvg != null && benefitFeatureAvg < 4) {
      return { ...card, priority: 'Alta' as Priority };
    }
    const count = sourceCounts.get(card.id) ?? card.sources.length;
    return { ...card, priority: (count >= 2 ? 'Alta' : 'Media') as Priority };
  });
}

function buildCombinedPrompt(cards: PromptCard[]): string {
  if (cards.length === 0) return '';

  const condensed: Record<string, string> = {
    cta: 'Reescribe el CTA principal enfocándote en el beneficio inmediato y reducción de fricción. Usa voz activa y primera persona.',
    h1: 'Reescribe el H1 incluyendo la keyword objetivo al inicio y comunicando el diferenciador en menos de 10 palabras.',
    entregables: 'Reescribe la sección de servicios transformando cada característica en un beneficio tangible con resultado concreto.',
    precios: 'Optimiza la sección de precios aplicando anclaje, efecto señuelo y framing de valor.',
    proceso: 'Reescribe el proceso con pasos numerados, timeframes y un micro-beneficio por etapa.',
    primeras100: 'Reescribe las primeras 100 palabras incluyendo la keyword en las primeras 2–3 oraciones y posicionando el problema–solución inmediatamente.',
    faq: 'Crea una sección de FAQ respondiendo las objeciones principales con respuestas optimizadas para Featured Snippets.',
    anchors: 'Reescribe todos los anchor texts usando texto descriptivo con variaciones semánticas de la keyword.',
    wireframe: '',
  };

  const hasWireframe = cards.some(c => c.id === 'wireframe');

  const sections = cards.map(card => {
    if (card.combinedText) return `[${card.label.toUpperCase()}]\n${card.combinedText}`;
    const text = condensed[card.id] || card.promptText.split('\n')[0];
    return `[${card.label.toUpperCase()}]\n${text}`;
  }).join('\n\n');

  const altaCards = cards.filter(c => c.priority === 'Alta');
  let priorityNote = '\n\n---\nPRIORIDAD: ';
  if (hasWireframe) {
    priorityNote += 'Aplica primero Estructura de página, CTA y H1 — el orden correcto de secciones es la base sobre la que todo el copy funciona.';
  } else {
    const topNames = altaCards.slice(0, 3).map(c => c.label).join(', ');
    priorityNote += `Empieza por ${topNames || 'los cambios de mayor impacto'} — son los que mayor impacto tienen en conversión y posicionamiento.`;
  }

  return `Al mejorar el copy de esta página, aplica todas las siguientes instrucciones:\n\n${sections}${priorityNote}`;
}

export function CopyZapSend({
  croResult,
  seoResult,
  copyResult,
  auditId,
  savedResult,
  onSave,
  targetUrl = '',
  brandName = '',
}: CopyZapSendProps) {
  const hasAnyResult = !!(croResult || seoResult || copyResult);
  const [isGenerating, setIsGenerating] = useState(false);
  const { copiedId, copy } = useCopyButton();

  const generated = !!savedResult;
  const cards = savedResult?.cards ?? [];
  const combinedPrompt = savedResult?.combinedPrompt ?? '';

  const { copiedId: combinedCopied, copy: copyFn } = useCopyButton();

  const reportStatus = [
    { label: 'CRO Audit', available: !!croResult },
    { label: 'SEO Audit', available: !!seoResult },
    { label: 'Copy Analysis', available: !!copyResult },
  ];

  function handleGenerate() {
    onSave?.(null);
    setIsGenerating(true);
    setTimeout(() => {
      const newCards = buildCards(croResult, seoResult, copyResult);
      const newCombined = buildCombinedPrompt(newCards);
      const result = { cards: newCards, combinedPrompt: newCombined };
      onSave?.(result);
      setIsGenerating(false);
      if (auditId) {
        supabase
          .from('audits')
          .update({ copyzap_result_json: result })
          .eq('id', auditId)
          .then(() => {});
      }
    }, 600);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-900">Acciones de Copy</h2>
          </div>
          <p className="text-sm text-gray-500">
            Brief listo — generado a partir de los análisis disponibles
          </p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        {reportStatus.map(({ label, available }) => (
          <div
            key={label}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              available
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-gray-100 border-gray-200 text-gray-400'
            }`}
          >
            {available ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <Minus className="w-3.5 h-3.5" />
            )}
            {label}
          </div>
        ))}
      </div>

      {!hasAnyResult ? (
        <div className="text-center py-16 text-gray-400">
          <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Run at least one analysis first to generate your Acciones de Copy brief.</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generando...
                </>
              ) : generated ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Regenerar brief
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Generar brief
                </>
              )}
            </button>
          </div>

          {generated && (
            <>
              {cards.length === 0 ? (
                <div className="text-center py-12 text-gray-400 border border-gray-200 rounded">
                  <p className="text-sm">No se detectaron problemas de copy relevantes en los análisis disponibles.</p>
                </div>
              ) : (
                <>
                  {cards.filter(c => c.priority === 'Alta').length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                        Prioridad Alta
                        <span className="ml-2 font-normal text-gray-400 normal-case">
                          ({cards.filter(c => c.priority === 'Alta').length} elemento{cards.filter(c => c.priority === 'Alta').length !== 1 ? 's' : ''})
                        </span>
                      </h3>
                      {cards.filter(c => c.priority === 'Alta').map(card => (
                        <div key={card.id} className="mb-4 border border-gray-200 p-4 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {card.sources.map(s => <SourceBadge key={s} tag={s} />)}
                              <span className="text-sm font-semibold text-gray-900">{card.label}</span>
                            </div>
                            <PriorityBadge priority={card.priority} />
                          </div>
                          <PromptBox
                            text={card.promptText}
                            cardId={card.id}
                            copiedId={copiedId}
                            onCopy={copy}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {cards.filter(c => c.priority === 'Media').length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                        Prioridad Media
                        <span className="ml-2 font-normal text-gray-400 normal-case">
                          ({cards.filter(c => c.priority === 'Media').length} elemento{cards.filter(c => c.priority === 'Media').length !== 1 ? 's' : ''})
                        </span>
                      </h3>
                      {cards.filter(c => c.priority === 'Media').map(card => (
                        <div key={card.id} className="mb-4 border border-gray-200 p-4 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {card.sources.map(s => <SourceBadge key={s} tag={s} />)}
                              <span className="text-sm font-semibold text-gray-900">{card.label}</span>
                            </div>
                            <PriorityBadge priority={card.priority} />
                          </div>
                          <PromptBox
                            text={card.promptText}
                            cardId={card.id}
                            copiedId={copiedId}
                            onCopy={copy}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-2 border-gray-900 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-gray-900">
                        Prompt completo
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => exportCopyZapToHtml(cards, combinedPrompt, targetUrl, reportStatus, brandName)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Exportar HTML
                        </button>
                        <button
                          onClick={() => copyFn(combinedPrompt, 'combined')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-colors ${
                            combinedCopied === 'combined'
                              ? 'bg-green-50 border-green-300 text-green-700'
                              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {combinedCopied === 'combined' ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          {combinedCopied === 'combined' ? 'Copiado' : 'Copiar todo'}
                        </button>
                      </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 border-l-4 border-l-gray-900 p-4">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                        {combinedPrompt}
                      </pre>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
