import { useState } from 'react';
import { X, Download, FileText, Code2 } from 'lucide-react';

export interface ExportInformeOptions {
  includeExtraction: boolean;
  includeReadyToUse: boolean;
}

interface ExportInformeModalProps {
  onExport: (options: ExportInformeOptions) => void;
  onCancel: () => void;
}

export function ExportInformeModal({ onExport, onCancel }: ExportInformeModalProps) {
  const [includeExtraction, setIncludeExtraction] = useState(true);
  const [includeReadyToUse, setIncludeReadyToUse] = useState(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div className="relative bg-white w-full max-w-md mx-4 rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Opciones de exportación</h2>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <label className="flex items-start gap-3.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={includeExtraction}
              onChange={e => setIncludeExtraction(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">Incluir "Datos Extraídos"</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                La información scrapeada de la página: meta tags, encabezados y contenido completo.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={includeReadyToUse}
              onChange={e => setIncludeReadyToUse(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">Incluir "Contenido listo para usar"</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Bloques de copy e implementaciones técnicas generadas para esta página, listos para aplicar.
              </p>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onExport({ includeExtraction, includeReadyToUse })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>
    </div>
  );
}
