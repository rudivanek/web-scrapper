export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const CRO_GLOSSARY: GlossaryEntry[] = [
  { term: 'A/B test', definition: 'prueba donde se comparan dos versiones de una página para ver cuál convierte mejor' },
  { term: 'Above the fold', definition: 'lo que el visitante ve sin necesidad de hacer scroll' },
  { term: 'Bounce rate', definition: 'porcentaje de visitantes que se van sin hacer ninguna acción' },
  { term: 'CTA', definition: 'botón o enlace de llamada a la acción, como "Contáctanos" o "Cotizar"' },
  { term: 'CTR', definition: 'porcentaje de personas que hacen clic en un elemento de la página' },
  { term: 'Decoy pricing', definition: 'técnica donde se agrega una opción de precio para hacer otra más atractiva' },
  { term: 'Exit intent', definition: 'detección de cuando el usuario está a punto de cerrar la página' },
  { term: 'Heatmap', definition: 'mapa de calor — visualización de dónde hacen clic o hasta dónde leen los visitantes' },
  { term: 'Hero', definition: 'la sección principal visible al inicio de la página' },
  { term: 'Lead magnet', definition: 'recurso gratuito (guía, diagnóstico) que se ofrece a cambio de datos de contacto' },
  { term: 'Microcopy', definition: 'textos pequeños como etiquetas de botones, mensajes de error o textos de ayuda' },
  { term: 'Social proof', definition: 'prueba social — testimonios, reseñas o logos que generan confianza' },
  { term: 'Sticky CTA', definition: 'botón de contacto que permanece visible mientras el usuario hace scroll' },
  { term: 'Trust signals', definition: 'elementos que generan confianza: testimonios, logos de clientes, certificaciones' },
  { term: 'UI/UX', definition: 'experiencia del usuario — qué tan fácil e intuitivo es navegar el sitio' },
  { term: 'WebP', definition: 'formato de imagen que carga más rápido que JPG o PNG' },
];

export const SEO_GLOSSARY: GlossaryEntry[] = [
  { term: 'Alt text', definition: 'descripción de una imagen que Google puede leer' },
  { term: 'Anchor text', definition: 'el texto visible de un enlace — Google lo usa para entender a qué apunta' },
  { term: 'Backlink', definition: 'enlace desde otro sitio web hacia el tuyo — aumenta tu autoridad en Google' },
  { term: 'Breadcrumb', definition: 'navegación secundaria que muestra la ruta de la página (Inicio > Servicios > Web)' },
  { term: 'CTR', definition: 'porcentaje de personas que hacen clic en tu resultado dentro de Google' },
  { term: 'E-E-A-T', definition: 'criterios de Google para evaluar Experiencia, Autoridad y Confiabilidad de un sitio' },
  { term: 'Featured snippet', definition: 'respuesta destacada que Google muestra arriba de todos los resultados' },
  { term: 'H1', definition: 'título principal de la página, el más importante para Google' },
  { term: 'H2', definition: 'subtítulo de sección' },
  { term: 'H3', definition: 'subtítulo de tercer nivel dentro de una sección' },
  { term: 'Keyword', definition: 'término de búsqueda que usan tus clientes en Google' },
  { term: 'LSI', definition: 'palabras semánticamente relacionadas con tu término principal de búsqueda' },
  { term: 'Meta description', definition: 'el texto que aparece debajo del título de tu página en Google' },
  { term: 'On-page SEO', definition: 'optimizaciones que se hacen dentro de la propia página (títulos, textos, imágenes)' },
  { term: 'Rich snippets', definition: 'resultados enriquecidos en Google con estrellas, precios o preguntas frecuentes' },
  { term: 'Schema markup', definition: 'código invisible que Google lee para mostrar información especial en resultados' },
  { term: 'SEO', definition: 'posicionamiento en Google — qué tan fácil es encontrarte cuando alguien busca tu servicio' },
  { term: 'SERP', definition: 'página de resultados de Google donde aparece tu sitio' },
  { term: 'Title tag', definition: 'el título que Google muestra en sus resultados de búsqueda' },
  { term: 'WebP', definition: 'formato de imagen optimizado que carga más rápido que JPG o PNG' },
];

export const COPY_GLOSSARY: GlossaryEntry[] = [
  { term: 'Above the fold', definition: 'lo que el visitante lee sin necesidad de hacer scroll' },
  { term: 'Benefit-driven copy', definition: 'texto enfocado en qué gana el cliente, no en características del servicio' },
  { term: 'Call to action (CTA)', definition: 'frase o botón que invita al visitante a dar el siguiente paso' },
  { term: 'Clarity', definition: 'claridad — qué tan fácil es entender el mensaje a primera lectura' },
  { term: 'Copywriting', definition: 'redacción persuasiva orientada a convertir lectores en clientes' },
  { term: 'Emotional triggers', definition: 'palabras o frases que conectan con las emociones del lector' },
  { term: 'Feature vs benefit', definition: 'característica (qué hace el servicio) vs beneficio (qué gana el cliente)' },
  { term: 'Hero copy', definition: 'el texto principal visible al inicio de la página — el más importante' },
  { term: 'Microcopy', definition: 'textos pequeños como etiquetas de botones, confirmaciones o mensajes de ayuda' },
  { term: 'Objection handling', definition: 'anticipar y responder dudas del cliente dentro del texto' },
  { term: 'Power words', definition: 'palabras que generan impacto emocional o urgencia en el lector' },
  { term: 'Readability', definition: 'legibilidad — qué tan fácil es leer el texto en términos de longitud y estructura' },
  { term: 'Social proof', definition: 'prueba social — testimonios o casos de éxito que generan confianza' },
  { term: 'Tone of voice', definition: 'el tono y personalidad con que está escrita la página' },
  { term: 'Trust signals', definition: 'elementos textuales que generan confianza: garantías, años de experiencia, clientes' },
  { term: 'Urgency', definition: 'sensación de que actuar ahora tiene un beneficio o evita una pérdida' },
];

export function glossaryToMarkdown(entries: GlossaryEntry[]): string {
  let md = '\n\n---\n\n## Glosario de términos\n\n';
  for (const entry of entries) {
    md += `**${entry.term}:** ${entry.definition}\n\n`;
  }
  return md;
}
