export type Lang = 'es' | 'en' | 'pt';
export type ImpactKey = 'High' | 'Medium' | 'Low';

export interface Labels {
  jumpTo: string;

  issuesFound: string;
  recommendations: string;
  findings: string;
  current: string;
  optimized: string;
  rewritten: string;
  rationale: string;
  weightedTotal: string;
  copied: string;
  copy: string;
  copyAll: string;
  allCopied: string;
  generatingPdf: string;
  exportPdf: string;
  retry: string;
  retryRewrites: string;

  urlAnalyzed: string;
  brand: string;
  pageType: string;
  generated: string;

  statusGood: string;
  statusNeedsWork: string;
  statusMissing: string;

  impactLabels: Record<ImpactKey, string>;

  keyword: string;
  type: string;
  title: string;
  meta: string;
  first100w: string;
  frequency: string;
  status: string;
  primary: string;
  secondary: string;

  targetKeywords: string;
  searchIntent: string;
  likelyCompetitors: string;

  seoPrintTitle: string;
  seoScoreCard: string;
  headingStructureMap: string;
  headingStructureHint: string;
  keywordMap: string;
  detailedAnalysis: string;
  metaAndHeadingRewrites: string;
  schemaMarkupCode: string;
  contentGapAnalysis: string;
  missingSubtopics: string;
  unansweredQuestions: string;
  recommendedNewSections: string;
  additionalWordCount: (n: number) => string;
  quickSeoWins: string;
  highImpactChanges: string;
  seoActionPlan: string;
  week1: string;
  weeks2to4: string;
  month2to3: string;
  actions: string;
  expectedImpact: string;
  seoFinalSummary: string;
  overallSeoScore: string;

  seoToc: { id: string; label: string }[];

  seoScoreRowLabels: Record<string, string>;

  croPrintTitle: string;
  executiveSummarySection: string;
  conversionGoal: string;
  trafficContext: string;
  targetAudience: string;
  marketIndustry: string;
  priorityRecommendations: string;
  tableHash: string;
  tableRecommendation: string;
  tableCategory: string;
  tableImpact: string;
  tableEffort: string;
  tableTimeframe: string;
  scoredAssessment: string;
  detailedAnalysisSection: string;
  copyTeardown: string;
  contentSuggestionsSection: string;
  contentSuggestionsDesc: string;
  generateContentSuggestions: string;
  generatingContentSuggestions: string;
  thisTypically1to2Min: string;
  competitorComparison: string;
  noCompetitorData: string;
  theirStrengths: string;
  theirWeaknesses: string;
  whatTheyDoBetter: string;
  whatYouDoBetter: string;
  buyerJourneySection: string;
  gaps: string;
  fix: string;
  emotionalTriggersSection: string;
  pricingPsychologySection: string;
  noPricingData: string;
  geoAIReadinessSection: string;
  mobileAnalysisSection: string;
  quickWinsAndHighImpact: string;
  quickWins: string;
  wireframeSection: string;
  wireframeCurrentStructure: string;
  wireframeStructuralProblems: string;
  wireframeRecommendedLayout: string;
  wireframeStatusLabels: Record<string, string>;
  wireframeCurrentlyAt: string;
  abTestsSection: string;
  actionPlanSection: string;
  days1to30: string;
  days31to60: string;
  days61to90: string;
  finalSummarySection: string;
  overallCroScore: string;
  truncatedWarningTitle: string;
  truncatedWarningBody: string;
  runSeoAudit: string;
  runningSeoAudit: string;
  seoAuditComplete: string;
  switchToSeoTab: string;
  viewSeoResults: string;
  runCopyAnalysis: string;
  analyzingCopy: string;
  copyAnalysisComplete: string;
  switchToCopyTab: string;
  viewCopyResults: string;

  croToc: { id: string; label: string }[];

  croScoreRowLabels: Record<string, string>;

  categoryLabels: Record<string, string>;

  copyPrintTitle: string;
  copySummarySection: string;
  totalBlocks: string;
  readingLevel: string;
  readTime: string;
  tone: string;
  weakestDimension: string;
  strongestDimension: string;
  scoreDistributionSection: string;
  strong: string;
  mediocre: string;
  weak: string;
  blocks: string;
  copyHeatmapSection: string;
  dimensionAnalysisSection: string;
  dimensionRadar: string;
  topPriorityRewritesSection: string;
  currentCopy: string;
  rewrittenCopy: string;
  patternAnalysisSection: string;
  recurringPatterns: string;
  dominantWeakness: string;
  worstWritingHabit: string;
  coachingAdvice: string;
  copyActionPlanSection: string;
  actionColumn: string;
  blocksColumn: string;
  impactColumn: string;
  finalCopyAssessment: string;
  overallCopyScore: string;
  generatingRewrites: string;
  generatingHighImpactRewrites: string;
  generatingActionPlan: string;
  rewritesFailed: (err: string) => string;
  actionPlanUnavailable: string;
  filter: string;
  filterAll: (n: number) => string;
  filterGreen: (n: number) => string;
  filterYellow: (n: number) => string;
  filterRed: (n: number) => string;
  clickToExpand: string;
  issues: string;
  rewrite: string;
  dimensions: string;

  conversionScore: string;
  copyScoreLabel: string;
  printHint: string;
  glossaryTitle: string;

  coldVisitorLabel: string;
  coldVisitorSub: string;
  warmVisitorLabel: string;
  warmVisitorSub: string;
  hotVisitorLabel: string;
  hotVisitorSub: string;

  triggerPresent: string;
  triggerPartial: string;
  triggerAbsent: string;

  abControlLabel: string;
  abVariantBLabel: string;
  abPrimaryMetric: string;
  abSuggestedDuration: string;

  runSeoAuditTitle: string;
  runSeoAuditDesc: string;
  runCopyAnalysisTitle: string;
  runCopyAnalysisDesc: string;
  thisTypically1to3Min: string;

  copyToc: { id: string; label: string }[];

  colorLegend: string;
  blockSection: (n: number) => string;
  heatmapDimLabels: Record<string, string>;
}

const es: Labels = {
  jumpTo: 'Ir a',

  issuesFound: 'Problemas encontrados',
  recommendations: 'Recomendaciones',
  findings: 'Hallazgos',
  current: 'Actual',
  optimized: 'Optimizado',
  rewritten: 'Reescrito',
  rationale: 'Justificación',
  weightedTotal: 'Total ponderado',
  copied: '¡Copiado!',
  copy: 'Copiar',
  copyAll: 'Copiar todo el contenido',
  allCopied: '¡Todo copiado!',
  generatingPdf: 'Generando PDF...',
  exportPdf: 'Exportar PDF',
  retry: 'Reintentar',
  retryRewrites: 'Reintentar reescrituras',

  urlAnalyzed: 'URL analizada',
  brand: 'Marca',
  pageType: 'Tipo de página',
  generated: 'Generado',

  statusGood: 'Correcto',
  statusNeedsWork: 'Mejorable',
  statusMissing: 'Ausente',

  impactLabels: { High: 'Alto', Medium: 'Medio', Low: 'Bajo' },

  keyword: 'Palabra clave',
  type: 'Tipo',
  title: 'Título',
  meta: 'Meta',
  first100w: 'Prim. 100 pal.',
  frequency: 'Frec.',
  status: 'Estado',
  primary: 'principal',
  secondary: 'secundaria',

  targetKeywords: 'Palabras clave objetivo',
  searchIntent: 'Intención de búsqueda',
  likelyCompetitors: 'Competidores probables',

  seoPrintTitle: 'Auditoría de contenido SEO',
  seoScoreCard: 'Tabla de puntuaciones SEO',
  headingStructureMap: 'Mapa de estructura de encabezados',
  headingStructureHint: 'Jerarquía completa de encabezados — las banderas amarillas indican problemas encontrados.',
  keywordMap: 'Mapa de palabras clave',
  detailedAnalysis: 'Análisis detallado',
  metaAndHeadingRewrites: 'Reescritura de meta y encabezados',
  schemaMarkupCode: 'Código de schema markup',
  contentGapAnalysis: 'Análisis de brechas de contenido',
  missingSubtopics: 'Subtemas faltantes',
  unansweredQuestions: 'Preguntas sin respuesta',
  recommendedNewSections: 'Nuevas secciones recomendadas',
  additionalWordCount: (n) => `Palabras adicionales recomendadas: ${n.toLocaleString()} palabras`,
  quickSeoWins: 'Mejoras rápidas SEO',
  highImpactChanges: 'Cambios de alto impacto',
  seoActionPlan: 'Plan de acción SEO',
  week1: 'Semana 1',
  weeks2to4: 'Semanas 2–4',
  month2to3: 'Mes 2–3',
  actions: 'Acciones',
  expectedImpact: 'Impacto esperado',
  seoFinalSummary: 'Resumen final SEO',
  overallSeoScore: 'Puntuación general SEO:',

  seoToc: [
    { id: 'seo-summary', label: 'Resumen' },
    { id: 'seo-scores', label: 'Scores' },
    { id: 'seo-headings', label: 'Encabezados' },
    { id: 'seo-keywords', label: 'Keywords' },
    { id: 'seo-analysis', label: 'Análisis' },
    { id: 'seo-rewrites', label: 'Reescrituras' },
    { id: 'seo-schema', label: 'Schema' },
    { id: 'seo-gaps', label: 'Brechas' },
    { id: 'seo-wins', label: 'Quick Wins' },
    { id: 'seo-plan', label: 'Plan' },
  ],

  seoScoreRowLabels: {
    titleMeta: 'Título y Descripción en Google',
    headingStructure: 'Jerarquía de Títulos',
    contentQuality: 'Calidad y Profundidad del Contenido',
    keywordOptimization: 'Optimización de Palabras Clave',
    links: 'Enlaces Internos y Externos',
    imageMedia: 'Optimización de Imágenes',
    schemaStructuredData: 'Código Schema Generado',
    contentArchitecture: 'Arquitectura del Contenido',
  },

  croPrintTitle: 'Auditoría de página CRO',
  executiveSummarySection: 'A. Resumen ejecutivo',
  conversionGoal: 'Objetivo de conversión',
  trafficContext: 'Contexto de tráfico',
  targetAudience: 'Audiencia objetivo',
  marketIndustry: 'Mercado / industria',
  priorityRecommendations: 'B. Recomendaciones prioritarias',
  tableHash: '#',
  tableRecommendation: 'Recomendación',
  tableCategory: 'Categoría',
  tableImpact: 'Impacto',
  tableEffort: 'Esfuerzo',
  tableTimeframe: 'Plazo',
  scoredAssessment: 'C. Evaluación puntuada',
  detailedAnalysisSection: 'D. Análisis detallado',
  copyTeardown: 'E. Análisis y reescritura del copy',
  contentSuggestionsSection: 'E2. Sugerencias de contenido listas para usar',
  contentSuggestionsDesc: 'Bloques de contenido completamente redactados, listos para copiar y pegar en tu página.',
  generateContentSuggestions: 'Generar sugerencias de contenido',
  generatingContentSuggestions: 'Generando sugerencias de contenido...',
  thisTypically1to2Min: 'Esto suele tardar 1–2 minutos',
  competitorComparison: 'F. Comparativa de competidores',
  noCompetitorData: 'Análisis de competidores: No incluido — no se proporcionaron datos de competidores. Para agregar esta sección, extrae 1–3 páginas de competidores y vuelve a ejecutar la auditoría.',
  theirStrengths: 'Sus fortalezas',
  theirWeaknesses: 'Sus debilidades',
  whatTheyDoBetter: 'Lo que hacen mejor',
  whatYouDoBetter: 'Lo que tú haces mejor',
  buyerJourneySection: 'G. Análisis del journey del comprador',
  gaps: 'Brechas',
  fix: 'Acción',
  emotionalTriggersSection: 'H. Auditoría de disparadores emocionales',
  pricingPsychologySection: 'I. Psicología de precios',
  noPricingData: 'No hay análisis de precios disponible para esta auditoría. Vuelve a ejecutar la auditoría para generar insights de psicología de precios.',
  geoAIReadinessSection: 'J. GEO / Preparación para IA',
  mobileAnalysisSection: 'K. Análisis mobile-first',
  quickWinsAndHighImpact: 'L-M. Quick Wins & Cambios de alto impacto',
  quickWins: 'Quick Wins',
  wireframeSection: 'N. Estructura recomendada de página',
  wireframeCurrentStructure: 'Estructura actual de la página',
  wireframeStructuralProblems: 'Problemas estructurales detectados',
  wireframeRecommendedLayout: 'Distribución recomendada — Zona por Zona',
  wireframeStatusLabels: {
    exists_correct: '✓ Ya existe',
    move_up: '↑ Mover arriba',
    missing: '✗ Falta',
    move_down: '↓ Mover abajo',
    reduce: '✂ Eliminar o reducir',
  },
  wireframeCurrentlyAt: 'actualmente en posición',
  abTestsSection: 'O. Pruebas A/B recomendadas',
  actionPlanSection: 'P. Plan de acción 30-60-90 días',
  days1to30: 'Días 1–30',
  days31to60: 'Días 31–60',
  days61to90: 'Días 61–90',
  finalSummarySection: 'Q. Resumen final',
  overallCroScore: 'Puntuación general CRO:',
  truncatedWarningTitle: 'El análisis fue truncado',
  truncatedWarningBody: 'La respuesta alcanzó el límite máximo de tokens. Algunas secciones pueden estar incompletas. Considera volver a ejecutarlo con menos contenido de página.',
  runSeoAudit: 'Ejecutar auditoría SEO',
  runningSeoAudit: 'Ejecutando auditoría SEO...',
  seoAuditComplete: 'Auditoría SEO completada',
  switchToSeoTab: 'Cambia a la pestaña SEO para ver los resultados',
  viewSeoResults: 'Ver resultados SEO →',
  runCopyAnalysis: 'Ejecutar análisis de copy',
  analyzingCopy: 'Analizando rendimiento del copy...',
  copyAnalysisComplete: 'Análisis de copy completado',
  switchToCopyTab: 'Cambia a la pestaña Copy para ver el mapa de calor',
  viewCopyResults: 'Ver análisis de copy →',

  croToc: [
    { id: 'executive', label: 'A. Resumen' },
    { id: 'priority', label: 'B. Prioridades' },
    { id: 'scores', label: 'C. Scores' },
    { id: 'detailed', label: 'D. Análisis' },
    { id: 'copy', label: 'E. Copy' },
    { id: 'competitor', label: 'F. Competidores' },
    { id: 'buyer', label: 'G. Buyer Journey' },
    { id: 'triggers', label: 'H. Disparadores' },
    { id: 'pricing', label: 'I. Precios' },
    { id: 'geo', label: 'J. GEO/IA' },
    { id: 'mobile', label: 'K. Mobile' },
    { id: 'wins', label: 'L-M. Quick Wins' },
    { id: 'wireframe', label: 'N. Wireframe' },
    { id: 'abtests', label: 'O. A/B Tests' },
    { id: 'plan', label: 'P. Plan' },
    { id: 'summary', label: 'Q. Resumen' },
  ],

  croScoreRowLabels: {
    valueProposition: 'Propuesta de Valor',
    headline: 'Efectividad del Título',
    cta: 'Botones de Acción',
    aboveTheFold: 'Parte Visible sin Scroll',
    narrativeFlow: 'Flujo Narrativo',
    trustSignals: 'Señales de Confianza',
    objectionHandling: 'Manejo de Objeciones',
    microCopy: 'Micro-textos',
    accessibility: 'Accesibilidad',
  },

  categoryLabels: {
    trust: 'Confianza y prueba social',
    cta: 'CTAs y conversión',
    faq: 'FAQ y manejo de objeciones',
    'social-proof': 'Prueba social',
    'objection-handling': 'Manejo de objeciones',
    narrative: 'Narrativa e historia',
    pricing: 'Precios',
    'lead-magnet': 'Imanes de leads',
    'technical-seo': 'SEO técnico',
    mobile: 'Mobile',
    other: 'Otro',
  },

  copyPrintTitle: 'Análisis de rendimiento del copy',
  copySummarySection: 'A. Resumen del rendimiento del copy',
  totalBlocks: 'Bloques totales',
  readingLevel: 'Nivel de lectura',
  readTime: 'Tiempo de lectura',
  tone: 'Tono',
  weakestDimension: 'Dimensión más débil',
  strongestDimension: 'Dimensión más fuerte',
  scoreDistributionSection: 'B. Distribución de puntuaciones',
  strong: 'Fuerte',
  mediocre: 'Mediocre',
  weak: 'Débil',
  blocks: 'bloques',
  copyHeatmapSection: 'C. Mapa de calor del copy',
  dimensionAnalysisSection: 'D. Análisis por dimensión',
  dimensionRadar: 'Radar de dimensiones',
  topPriorityRewritesSection: 'E. Reescrituras prioritarias',
  currentCopy: 'Copy actual',
  rewrittenCopy: 'Copy reescrito',
  patternAnalysisSection: 'F. Análisis de patrones y coaching',
  recurringPatterns: 'Patrones de copy recurrentes',
  dominantWeakness: 'Debilidad dominante',
  worstWritingHabit: 'Peor hábito de escritura',
  coachingAdvice: 'Consejo de coaching',
  copyActionPlanSection: 'G. Plan de acción de mejora del copy',
  actionColumn: 'Acción',
  blocksColumn: 'Bloques',
  impactColumn: 'Impacto',
  finalCopyAssessment: 'Evaluación final del copy',
  overallCopyScore: 'Puntuación general del copy:',
  generatingRewrites: 'Generando reescrituras para los bloques más débiles...',
  generatingHighImpactRewrites: 'Generando reescrituras de alto impacto...',
  generatingActionPlan: 'Generando plan de acción...',
  rewritesFailed: (err) => `Error en reescrituras: ${err}`,
  actionPlanUnavailable: 'Plan de acción no disponible — las reescrituras no se completaron.',
  filter: 'Filtrar',
  filterAll: (n) => `Todos (${n})`,
  filterGreen: (n) => `Verde (${n})`,
  filterYellow: (n) => `Amarillo (${n})`,
  filterRed: (n) => `Rojo (${n})`,
  clickToExpand: 'Haz clic en cualquier bloque para expandir',
  issues: 'Problemas',
  rewrite: 'Reescritura',
  dimensions: 'dimensiones',

  conversionScore: 'Puntuación de Conversión',
  copyScoreLabel: 'Puntuación de Contenido y Textos',
  printHint: 'Al imprimir: desactiva "Encabezados y pies de página" en las opciones del navegador para un PDF limpio.',
  glossaryTitle: 'Glosario de términos',

  coldVisitorLabel: 'Visitante nuevo',
  coldVisitorSub: 'No te conoce todavía',
  warmVisitorLabel: 'Visitante interesado',
  warmVisitorSub: 'Te está evaluando',
  hotVisitorLabel: 'Visitante listo',
  hotVisitorSub: 'Quiere contratar',

  triggerPresent: 'Presente',
  triggerPartial: 'Parcial',
  triggerAbsent: 'Ausente',

  abControlLabel: 'Control (actual)',
  abVariantBLabel: 'Variante B',
  abPrimaryMetric: 'Métrica principal:',
  abSuggestedDuration: 'Plazo sugerido:',

  runSeoAuditTitle: 'Ejecutar auditoría SEO de contenido',
  runSeoAuditDesc: 'Analiza el SEO on-page, la estructura del contenido y la visibilidad en buscadores usando los mismos datos de página — sin necesidad de volver a extraerlos.',
  runCopyAnalysisTitle: 'Ejecutar análisis de rendimiento del copy',
  runCopyAnalysisDesc: 'Puntúa cada párrafo por persuasión, claridad y poder de conversión — con un mapa de calor visual que muestra qué copy funciona y cuál es peso muerto.',
  thisTypically1to3Min: 'Esto suele tardar 1–3 minutos',

  copyToc: [
    { id: 'copy-summary', label: 'A. Resumen' },
    { id: 'copy-distribution', label: 'B. Distribución' },
    { id: 'copy-heatmap', label: 'C. Heatmap' },
    { id: 'copy-dimensions', label: 'D. Dimensiones' },
    { id: 'copy-rewrites', label: 'E. Reescrituras' },
    { id: 'copy-patterns', label: 'F. Patrones' },
    { id: 'copy-plan', label: 'G. Plan' },
  ],

  colorLegend: 'Leyenda de colores:',
  blockSection: (n) => `Sección ${n} de tu página`,
  heatmapDimLabels: {
    clarity: 'Claridad',
    persuasion: 'Persuasión',
    emotionalTone: 'Emoción',
    benefitFeatureRatio: 'Benef./Caract.',
    powerWords: 'Palabras Impacto',
    activeVoice: 'Voz Activa',
    conversionRelevance: 'Relev. Conv.',
  },
};

const en: Labels = {
  jumpTo: 'Jump to',

  issuesFound: 'Issues Found',
  recommendations: 'Recommendations',
  findings: 'Findings',
  current: 'Current',
  optimized: 'Optimized',
  rewritten: 'Rewritten',
  rationale: 'Rationale',
  weightedTotal: 'Weighted Total',
  copied: 'Copied!',
  copy: 'Copy',
  copyAll: 'Copy All Content',
  allCopied: 'All Copied!',
  generatingPdf: 'Generating PDF...',
  exportPdf: 'Export PDF',
  retry: 'Retry',
  retryRewrites: 'Retry Rewrites',

  urlAnalyzed: 'URL Analyzed',
  brand: 'Brand',
  pageType: 'Page Type',
  generated: 'Generated',

  statusGood: 'Good',
  statusNeedsWork: 'Needs Work',
  statusMissing: 'Missing',

  impactLabels: { High: 'High', Medium: 'Medium', Low: 'Low' },

  keyword: 'Keyword',
  type: 'Type',
  title: 'Title',
  meta: 'Meta',
  first100w: 'First 100W',
  frequency: 'Freq.',
  status: 'Status',
  primary: 'primary',
  secondary: 'secondary',

  targetKeywords: 'Target Keywords',
  searchIntent: 'Search Intent',
  likelyCompetitors: 'Likely Competitors',

  seoPrintTitle: 'SEO Content Audit',
  seoScoreCard: 'SEO Score Card',
  headingStructureMap: 'Heading Structure Map',
  headingStructureHint: 'Complete heading hierarchy — yellow flags indicate issues found.',
  keywordMap: 'Keyword Map',
  detailedAnalysis: 'Detailed Analysis',
  metaAndHeadingRewrites: 'Meta & Heading Rewrites',
  schemaMarkupCode: 'Schema Markup Code',
  contentGapAnalysis: 'Content Gap Analysis',
  missingSubtopics: 'Missing Subtopics',
  unansweredQuestions: 'Unanswered Questions',
  recommendedNewSections: 'Recommended New Sections',
  additionalWordCount: (n) => `Recommended additional word count: ${n.toLocaleString()} words`,
  quickSeoWins: 'Quick SEO Wins',
  highImpactChanges: 'High-Impact Changes',
  seoActionPlan: 'SEO Action Plan',
  week1: 'Week 1',
  weeks2to4: 'Weeks 2–4',
  month2to3: 'Month 2–3',
  actions: 'Actions',
  expectedImpact: 'Expected Impact',
  seoFinalSummary: 'SEO Final Summary',
  overallSeoScore: 'Overall SEO Score:',

  seoToc: [
    { id: 'seo-summary', label: 'Summary' },
    { id: 'seo-scores', label: 'Scores' },
    { id: 'seo-headings', label: 'Headings' },
    { id: 'seo-keywords', label: 'Keywords' },
    { id: 'seo-analysis', label: 'Analysis' },
    { id: 'seo-rewrites', label: 'Rewrites' },
    { id: 'seo-schema', label: 'Schema' },
    { id: 'seo-gaps', label: 'Gaps' },
    { id: 'seo-wins', label: 'Wins' },
    { id: 'seo-plan', label: 'Plan' },
  ],

  seoScoreRowLabels: {
    titleMeta: 'Title Tag & Meta Description',
    headingStructure: 'Heading Hierarchy',
    contentQuality: 'Content Quality & Depth',
    keywordOptimization: 'Keyword Optimization',
    links: 'Internal & External Links',
    imageMedia: 'Image & Media SEO',
    schemaStructuredData: 'Schema & Structured Data',
    contentArchitecture: 'Content Architecture',
  },

  croPrintTitle: 'CRO Page Audit',
  executiveSummarySection: 'A. Executive Summary',
  conversionGoal: 'Conversion Goal',
  trafficContext: 'Traffic Context',
  targetAudience: 'Target Audience',
  marketIndustry: 'Market / Industry',
  priorityRecommendations: 'B. Priority Recommendations',
  tableHash: '#',
  tableRecommendation: 'Recommendation',
  tableCategory: 'Category',
  tableImpact: 'Impact',
  tableEffort: 'Effort',
  tableTimeframe: 'Timeframe',
  scoredAssessment: 'C. Scored Assessment',
  detailedAnalysisSection: 'D. Detailed Analysis',
  copyTeardown: 'E. Copy Teardown & Rewrites',
  contentSuggestionsSection: 'E2. Ready-to-Use Content Suggestions',
  contentSuggestionsDesc: 'Fully written content blocks ready to copy and paste into your page.',
  generateContentSuggestions: 'Generate Content Suggestions',
  generatingContentSuggestions: 'Generating content suggestions...',
  thisTypically1to2Min: 'This typically takes 1–2 minutes',
  competitorComparison: 'F. Competitor Comparison',
  noCompetitorData: 'Competitor analysis: Not included — no competitor data provided. To add this section, scrape 1–3 competitor pages and re-run the audit.',
  theirStrengths: 'Their Strengths',
  theirWeaknesses: 'Their Weaknesses',
  whatTheyDoBetter: 'What They Do Better',
  whatYouDoBetter: 'What You Do Better',
  buyerJourneySection: 'G. Buyer Journey Analysis',
  gaps: 'Gaps',
  fix: 'Fix',
  emotionalTriggersSection: 'H. Emotional Triggers Audit',
  pricingPsychologySection: 'I. Pricing Psychology',
  noPricingData: 'No pricing analysis available for this audit. Re-run the audit to generate pricing psychology insights.',
  geoAIReadinessSection: 'J. GEO / AI Readiness',
  mobileAnalysisSection: 'K. Mobile-First Analysis',
  quickWinsAndHighImpact: 'L-M. Quick Wins & High-Impact Changes',
  quickWins: 'Quick Wins',
  wireframeSection: 'N. Recommended Page Structure',
  wireframeCurrentStructure: 'Current Page Structure',
  wireframeStructuralProblems: 'Structural Problems Detected',
  wireframeRecommendedLayout: 'Recommended Layout — Zone by Zone',
  wireframeStatusLabels: {
    exists_correct: '✓ Already exists',
    move_up: '↑ Move up',
    missing: '✗ Missing',
    move_down: '↓ Move down',
    reduce: '✂ Remove or reduce',
  },
  wireframeCurrentlyAt: 'currently at position',
  abTestsSection: 'O. Recommended A/B Tests',
  actionPlanSection: 'P. 30-60-90 Day Action Plan',
  days1to30: 'Days 1–30',
  days31to60: 'Days 31–60',
  days61to90: 'Days 61–90',
  finalSummarySection: 'Q. Final Summary',
  overallCroScore: 'Overall CRO Score:',
  truncatedWarningTitle: 'Audit was truncated',
  truncatedWarningBody: 'The response hit the maximum token limit. Some sections may be incomplete. Consider re-running with less page content.',
  runSeoAudit: 'Run SEO Audit',
  runningSeoAudit: 'Running SEO audit...',
  seoAuditComplete: 'SEO Content Audit complete',
  switchToSeoTab: 'Switch to the SEO tab to view results',
  viewSeoResults: 'View SEO Results →',
  runCopyAnalysis: 'Run Copy Performance Analysis',
  analyzingCopy: 'Analyzing copy performance...',
  copyAnalysisComplete: 'Copy Performance Analysis complete',
  switchToCopyTab: 'Switch to the Copy tab to view the heatmap',
  viewCopyResults: 'View Copy Analysis →',

  croToc: [
    { id: 'executive', label: 'A. Summary' },
    { id: 'priority', label: 'B. Priority' },
    { id: 'scores', label: 'C. Scores' },
    { id: 'detailed', label: 'D. Analysis' },
    { id: 'copy', label: 'E. Copy' },
    { id: 'competitor', label: 'F. Competitors' },
    { id: 'buyer', label: 'G. Buyer Journey' },
    { id: 'triggers', label: 'H. Triggers' },
    { id: 'pricing', label: 'I. Pricing' },
    { id: 'geo', label: 'J. GEO/AI' },
    { id: 'mobile', label: 'K. Mobile' },
    { id: 'wins', label: 'L-M. Wins' },
    { id: 'wireframe', label: 'N. Wireframe' },
    { id: 'abtests', label: 'O. A/B Tests' },
    { id: 'plan', label: 'P. Plan' },
    { id: 'summary', label: 'Q. Summary' },
  ],

  croScoreRowLabels: {
    valueProposition: 'Value Proposition',
    headline: 'Headline Effectiveness',
    cta: 'CTA Buttons',
    aboveTheFold: 'Above the Fold',
    narrativeFlow: 'Narrative Flow',
    trustSignals: 'Trust Signals',
    objectionHandling: 'Objection Handling',
    microCopy: 'Micro-Copy',
    accessibility: 'Accessibility',
  },

  categoryLabels: {
    trust: 'Trust & Social Proof',
    cta: 'CTAs & Conversion',
    faq: 'FAQ & Objection Handling',
    'social-proof': 'Social Proof',
    'objection-handling': 'Objection Handling',
    narrative: 'Narrative & Story',
    pricing: 'Pricing',
    'lead-magnet': 'Lead Magnets',
    'technical-seo': 'Technical SEO',
    mobile: 'Mobile',
    other: 'Other',
  },

  copyPrintTitle: 'Copy Performance Analysis',
  copySummarySection: 'A. Copy Performance Summary',
  totalBlocks: 'Total Blocks',
  readingLevel: 'Reading Level',
  readTime: 'Read Time',
  tone: 'Tone',
  weakestDimension: 'Weakest Dimension',
  strongestDimension: 'Strongest Dimension',
  scoreDistributionSection: 'B. Score Distribution',
  strong: 'Strong',
  mediocre: 'Mediocre',
  weak: 'Weak',
  blocks: 'blocks',
  copyHeatmapSection: 'C. Copy Heatmap',
  dimensionAnalysisSection: 'D. Dimension Analysis',
  dimensionRadar: 'Dimension Radar',
  topPriorityRewritesSection: 'E. Top Priority Rewrites',
  currentCopy: 'Current Copy',
  rewrittenCopy: 'Rewritten Copy',
  patternAnalysisSection: 'F. Pattern Analysis & Coaching',
  recurringPatterns: 'Recurring Copy Patterns',
  dominantWeakness: 'Dominant Weakness',
  worstWritingHabit: 'Worst Writing Habit',
  coachingAdvice: 'Coaching Advice',
  copyActionPlanSection: 'G. Copy Improvement Action Plan',
  actionColumn: 'Action',
  blocksColumn: 'Blocks',
  impactColumn: 'Impact',
  finalCopyAssessment: 'Final Copy Assessment',
  overallCopyScore: 'Overall Copy Score:',
  generatingRewrites: 'Generating rewrites for weakest copy blocks...',
  generatingHighImpactRewrites: 'Generating high-impact rewrites...',
  generatingActionPlan: 'Generating action plan...',
  rewritesFailed: (err) => `Rewrites failed: ${err}`,
  actionPlanUnavailable: 'Action plan unavailable — rewrites did not complete.',
  filter: 'Filter',
  filterAll: (n) => `All (${n})`,
  filterGreen: (n) => `Green (${n})`,
  filterYellow: (n) => `Yellow (${n})`,
  filterRed: (n) => `Red (${n})`,
  clickToExpand: 'Click any block to expand',
  issues: 'Issues',
  rewrite: 'Rewrite',
  dimensions: 'dimensions',

  conversionScore: 'Conversion Score',
  copyScoreLabel: 'Copy & Content Score',
  printHint: 'When printing: disable "Headers and footers" in browser print options for a clean PDF.',
  glossaryTitle: 'Terms Glossary',

  coldVisitorLabel: 'New Visitor',
  coldVisitorSub: "Doesn't know you yet",
  warmVisitorLabel: 'Interested Visitor',
  warmVisitorSub: 'Is evaluating you',
  hotVisitorLabel: 'Ready Visitor',
  hotVisitorSub: 'Ready to hire',

  triggerPresent: 'Present',
  triggerPartial: 'Partial',
  triggerAbsent: 'Absent',

  abControlLabel: 'Control (current)',
  abVariantBLabel: 'Variant B',
  abPrimaryMetric: 'Primary Metric:',
  abSuggestedDuration: 'Suggested Duration:',

  runSeoAuditTitle: 'Run SEO Content Audit',
  runSeoAuditDesc: 'Analyze on-page SEO, content structure, and search visibility using the same page data — no re-scraping needed.',
  runCopyAnalysisTitle: 'Run Copy Performance Analysis',
  runCopyAnalysisDesc: 'Score every paragraph for persuasion, clarity, and conversion power — with a visual heatmap showing which copy is working and which is dead weight.',
  thisTypically1to3Min: 'This typically takes 1–3 minutes',

  copyToc: [
    { id: 'copy-summary', label: 'A. Summary' },
    { id: 'copy-distribution', label: 'B. Distribution' },
    { id: 'copy-heatmap', label: 'C. Heatmap' },
    { id: 'copy-dimensions', label: 'D. Dimensions' },
    { id: 'copy-rewrites', label: 'E. Rewrites' },
    { id: 'copy-patterns', label: 'F. Patterns' },
    { id: 'copy-plan', label: 'G. Action Plan' },
  ],

  colorLegend: 'Color Legend:',
  blockSection: (n) => `Section ${n} of your page`,
  heatmapDimLabels: {
    clarity: 'Clarity',
    persuasion: 'Persuasion',
    emotionalTone: 'Emotion',
    benefitFeatureRatio: 'Benefit/Feature',
    powerWords: 'Power Words',
    activeVoice: 'Active Voice',
    conversionRelevance: 'Conv. Relevance',
  },
};

export const LABELS: Record<string, Labels> = { es, en };

export function getLabels(language?: string): Labels {
  const lang = (language ?? 'es').toLowerCase().slice(0, 2);
  return LABELS[lang] ?? LABELS.es;
}
