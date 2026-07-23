export function getScoreLabel(score: number): string {
  const s = score > 10 ? score / 10 : score;
  if (s >= 7.5) return 'Excelente';
  if (s >= 6.0) return 'Mejorable';
  return 'Requiere atención';
}

export function getScoreLabelColor(score: number): string {
  const s = score > 10 ? score / 10 : score;
  if (s >= 7.5) return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  if (s >= 6.0) return 'bg-amber-100 text-amber-800 border border-amber-200';
  return 'bg-red-100 text-red-800 border border-red-200';
}

export function getScoreExplanation(score: number): string {
  const normalizedScore = score > 10 ? score / 10 : score;

  if (normalizedScore < 6) {
    return "Requiere atención — está afectando tus resultados directamente.";
  }
  if (normalizedScore < 7.5) {
    return "Hay oportunidades de mejora que pueden incrementar resultados.";
  }
  return "Excelente — este elemento está funcionando muy bien.";
}

export function getScoreBenchmark(score: number): string {
  const normalizedScore = score > 10 ? score / 10 : score;

  if (normalizedScore < 6) {
    return "La mayoría de páginas bien optimizadas obtienen entre 7 y 9 — hay trabajo importante por hacer.";
  }
  if (normalizedScore < 7.5) {
    return "Estás cerca del nivel óptimo — pequeños ajustes pueden marcar una gran diferencia.";
  }
  return "Tu página está por encima del promedio — mantén este nivel.";
}

export const SECTION_EXPLANATIONS = {
  executive: "Un resumen rápido del estado general de tu página.",
  priority: "Las acciones más importantes a tomar, ordenadas por impacto.",
  scores: "Cómo calificó cada parte clave de tu página.",
  detailed: "Explicación de qué está fallando y cómo corregirlo.",
  copy: "Tu texto actual comparado con una versión mejorada.",
  e2content: "Contenido listo para copiar y pegar directamente en tu página.",
  competitor: "Qué hacen bien tus competidores y dónde puedes superarlos.",
  buyer: "Cómo experimenta tu página alguien que te encuentra por primera vez.",
  triggers: "Qué elementos de confianza y persuasión tiene (o le faltan) tu página.",
  pricing: "Cómo afecta la ausencia de precios a la decisión de tus clientes.",
  geo: "Qué tan visible eres en búsquedas de Google y en herramientas de IA.",
  mobile: "Cómo vive la experiencia alguien que entra desde su celular.",
  wins: "Lo que puedes hacer esta semana vs. lo que cambia más en el largo plazo.",
  wireframe: "Cómo debería estar ordenada tu página, zona por zona, para que cada visita avance hacia la conversión.",
  abtests: "Experimentos que puedes hacer para saber qué versión de tu página funciona mejor.",
  plan: "Tu hoja de ruta: qué hacer en el próximo mes, dos meses y tres meses.",
  summary: "Conclusiones finales y recomendaciones principales.",

  // SEO
  seoSummary: "Resumen del rendimiento SEO de tu página y oportunidades principales.",
  seoScores: "Calificación detallada de cada aspecto técnico de SEO.",
  seoHeadings: "La estructura de títulos y subtítulos de tu página y si está optimizada.",
  seoKeywords: "Las palabras que tus clientes buscan en Google — y si tu página las incluye o no.",
  seoAnalysis: "Análisis detallado de cada dimensión SEO con problemas y soluciones.",
  seoRewrites: "Versiones mejoradas de tus títulos y descripciones para mejor posicionamiento.",
  seoSchema: "Código estructurado que ayuda a Google a entender mejor tu contenido.",
  seoGaps: "Temas que tus clientes buscan pero tu página todavía no responde.",
  seoWins: "Cambios pequeños que puedes hacer hoy y que mejoran tu posición en Google.",
  seoPlan: "Plan de acción SEO escalonado por semanas y meses.",

  // Copy
  copySummary: "Vista general del rendimiento de tu contenido escrito.",
  copyDistribution: "Qué porcentaje de los textos de tu página están funcionando bien, regular o mal.",
  copyHeatmap: "Cada bloque de texto calificado y marcado con color según su efectividad.",
  copyDimensions: "Cómo califica cada cualidad de tu texto: claridad, persuasión, tono, etc.",
  copyRewrites: "Los bloques de texto más débiles reescritos para mayor conversión.",
  copyPatterns: "Los errores que se repiten en tu contenido y cómo corregirlos.",
  copyPlan: "Plan de mejora priorizado para tu contenido.",
} as const;

export const COLUMN_EXPLANATIONS = {
  impact: "Qué tanto puede mejorar tu conversión si implementas esto",
  effort: "Qué tan difícil o costoso es implementarlo",
  timeframe: "En cuánto tiempo puedes tenerlo listo",
} as const;

export const STATUS_EXPLANATIONS = {
  present: "Tu página ya transmite esto correctamente.",
  partial: "Existe pero puede reforzarse para tener más impacto.",
  missing: "Tu página no tiene esto — está afectando tu conversión.",
} as const;

export const COLOR_LABELS = {
  red: "Prioridad alta",
  yellow: "Mejorable",
  green: "Funcionando bien",
} as const;
