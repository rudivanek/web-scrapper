import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import type { BlueprintSection } from '../../types/sections';
import type { SectionTemplate } from '../../lib/sectionTemplates';
import { SECTION_TEMPLATES, applyTemplate } from '../../lib/sectionTemplates';

interface SectionTemplateModalProps {
  onSelect: (patch: Partial<BlueprintSection> | null) => void;
  onClose: () => void;
}

export function SectionTemplateModal({ onSelect, onClose }: SectionTemplateModalProps) {
  const [selected, setSelected] = useState<SectionTemplate | null>(null);
  const [count, setCount] = useState(3);

  const choose = (template: SectionTemplate) => {
    if (template.repeatBlocks.length === 0) {
      onSelect(applyTemplate(template, 0));
      return;
    }
    setSelected(template);
    setCount(template.repeatDefault);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-lg w-full max-w-lg shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-gray-900 font-semibold text-sm">
              {selected ? selected.label : 'Añadir sección'}
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">
              {selected
                ? `¿Cuántas ${selected.repeatLabel}?`
                : 'Las plantillas definen la estructura. El contenido lo pones tú.'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {selected ? (
          <div className="p-5">
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              Se crearán {count} {selected.repeatLabel} vacías, cada una con sus bloques de texto en el orden
              correcto. Podrás añadir o quitar después.
            </p>

            <div className="flex items-center justify-center gap-4 mb-5">
              <button
                onClick={() => setCount(c => Math.max(1, c - 1))}
                disabled={count <= 1}
                className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded text-gray-600 hover:border-gray-900 hover:text-gray-900 disabled:opacity-30 disabled:hover:border-gray-300 transition-colors"
                aria-label="Menos"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-3xl font-semibold text-gray-900 w-14 text-center tabular-nums">
                {count}
              </span>
              <button
                onClick={() => setCount(c => Math.min(24, c + 1))}
                disabled={count >= 24}
                className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded text-gray-600 hover:border-gray-900 hover:text-gray-900 disabled:opacity-30 disabled:hover:border-gray-300 transition-colors"
                aria-label="Más"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelected(null)}
                className="flex-1 py-2 text-xs font-medium border border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900 rounded transition-colors"
              >
                Atrás
              </button>
              <button
                onClick={() => onSelect(applyTemplate(selected, count))}
                className="flex-1 py-2 text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 rounded transition-colors"
              >
                Añadir sección
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 overflow-auto max-h-[60vh]">
            <button
              onClick={() => onSelect(null)}
              className="w-full flex items-center gap-3 p-3 bg-white hover:bg-gray-50 border border-dashed border-gray-300 hover:border-gray-900 rounded transition-colors text-left mb-4"
            >
              <div className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center text-gray-400 text-sm font-bold shrink-0">
                +
              </div>
              <div>
                <p className="text-gray-900 text-xs font-medium">Sección en blanco</p>
                <p className="text-gray-400 text-[11px]">Sin estructura predefinida</p>
              </div>
            </button>

            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-2 px-1">
              Plantillas
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SECTION_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => choose(template)}
                  className="flex items-center gap-3 p-3 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-900 rounded transition-colors text-left"
                >
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: `${template.color}15`, color: template.color }}
                  >
                    {template.glyph}
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-900 text-xs font-medium truncate">{template.label}</p>
                    <p className="text-gray-400 text-[11px] truncate">{template.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
