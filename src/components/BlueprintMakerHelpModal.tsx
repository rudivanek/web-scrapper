import { X, Camera, AlertTriangle, AlertCircle } from 'lucide-react';

interface HelpEntry {
  term: string;
  hint?: string;
  body: string;
}

interface HelpGroup {
  label: string;
  entries: HelpEntry[];
}

const GROUPS: HelpGroup[] = [
  {
    label: 'Direcciones',
    entries: [
      {
        term: 'URL de diseño',
        body: 'Colores, tipografías y espaciados. Solo el sistema de diseño viaja bien entre sitios distintos.',
      },
      {
        term: 'URL de texto/copy',
        hint: 'opcional',
        body: 'Texto, imágenes y estructura. Vacía = se usa la URL de diseño para todo.',
      },
    ],
  },
  {
    label: 'Texto',
    entries: [
      {
        term: 'De la URL de texto/copy',
        body: 'Por defecto. Texto real del sitio, palabra por palabra. Es lo que quieres para un cliente.',
      },
      {
        term: 'Lorem Ipsum',
        body: 'Relleno para maquetar. Desactiva la revisión de texto inventado. No entregues así.',
      },
    ],
  },
  {
    label: 'Imágenes',
    entries: [
      {
        term: 'De la URL de diseño / de texto',
        body: 'Elige de qué sitio salen las imágenes reales. Normalmente el de texto: es el del cliente.',
      },
      {
        term: 'Rellenar huecos con Unsplash',
        body: 'Genéricas donde no haya una real. Van marcadas para que las reemplaces.',
      },
    ],
  },
  {
    label: 'Estructura',
    entries: [
      {
        term: 'Generar lista de secciones',
        body: 'Una llamada extra a Claude. Sin esto el editor queda vacío y el prompt no lleva secciones.',
      },
      {
        term: 'Editor de estructura',
        body: 'Renombra, reordena y borra secciones. Las plantillas dan la estructura vacía; el texto lo pones tú.',
      },
      {
        term: 'Guardado',
        body: 'Se guarda en este navegador y se recupera al recargar. Para conservarlo de verdad, descarga.',
      },
    ],
  },
  {
    label: 'Salida',
    entries: [
      {
        term: 'design.md · copy.md · images.md',
        body: 'Sistema de diseño, texto verbatim y URLs de imágenes. Van dentro del prompt, no se adjuntan aparte.',
      },
      {
        term: 'blueprint.json',
        body: 'La lista de secciones con sus reglas de layout. Descárgalo desde el editor.',
      },
      {
        term: 'Prompt para builder',
        body: 'Lovable, Bolt, v0, Claude Design, Replit. HTML único para una página; React para un proyecto.',
      },
    ],
  },
];

export function BlueprintMakerHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Guía de Blueprint Maker"
    >
      <div
        className="bg-white border border-gray-200 rounded-lg w-full max-w-xl shadow-xl my-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Guía de Blueprint Maker</h2>
            <p className="text-xs text-gray-500 mt-0.5">Qué hace cada opción y qué esperar</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="bg-gray-50 rounded px-3.5 py-3 mb-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              <span className="text-gray-900 font-medium">El flujo:</span> extraes un sitio → corriges la
              estructura en el editor → copias el prompt → adjuntas una captura → lo pegas en tu builder.
            </p>
          </div>

          {GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs font-medium text-gray-400 mt-4 mb-1.5 first:mt-0">{group.label}</p>
              {group.entries.map(entry => (
                <div key={entry.term} className="border-t border-gray-200 py-2.5">
                  <p className="text-[13px] font-medium text-gray-900 mb-0.5">
                    {entry.term}
                    {entry.hint && <span className="font-normal text-gray-400"> {entry.hint}</span>}
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">{entry.body}</p>
                </div>
              ))}
            </div>
          ))}

          <p className="text-xs font-medium text-gray-400 mt-4 mb-1.5">Avisos que pueden aparecer</p>
          <div className="border-t border-gray-200 py-2.5 flex gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" />
            <div>
              <p className="text-[13px] font-medium text-gray-900 mb-0.5">Texto no encontrado en la página</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                La IA inventó esas frases. Verifícalas contra el sitio real antes de entregar.
              </p>
            </div>
          </div>
          <div className="border-t border-b border-gray-200 py-2.5 flex gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="text-[13px] font-medium text-gray-900 mb-0.5">
                design.md o lista de secciones incompleta
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                La respuesta se cortó. Vuelve a extraer antes de usar los archivos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3.5 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded">
            <Camera className="w-4 h-4 shrink-0 text-amber-700" />
            <p className="text-xs text-amber-800 leading-snug">
              Siempre adjunta tu propia captura, de la página de texto — nunca la del sitio de diseño.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
