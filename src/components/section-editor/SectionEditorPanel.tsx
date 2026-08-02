import { useState, useEffect, useRef } from 'react';
import {
  Layers, ChevronDown, ChevronRight, Plus, AlertCircle,
  Clipboard, Check, FileDown,
} from 'lucide-react';
import type { BlueprintSection } from '../../types/sections';
import { useBlueprintSections } from '../../hooks/useBlueprintSections';
import { SectionCard } from './SectionCard';
import { SectionTemplateModal } from './SectionTemplateModal';
import { saveSections, loadSections, clearSections, describeAge } from '../../lib/sectionStorage';
import type { StoredSections } from '../../lib/sectionStorage';

interface SectionEditorPanelProps {
  /** Current blueprint JSON. Empty string is valid — that is composer mode. */
  blueprintJson: string;
  /** Called with the re-serialized blueprint after every edit. */
  onChange: (nextJson: string) => void;
  /** True when an extraction produced this blueprint. Affects copy only. */
  hasExtraction: boolean;
  /** Used for the download filename. */
  siteName: string;
}

export function SectionEditorPanel({
  blueprintJson, onChange, hasExtraction, siteName,
}: SectionEditorPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    sections, parseError, dirty, instructions, setInstructions,
    mode, setMode, freeForm, setFreeForm, outlineFromSections,
    addSection, updateSection, deleteSection, moveSection, duplicateSection, toJson,
  } = useBlueprintSections(blueprintJson, onChange);

  // ── Persistence ──────────────────────────────────────────────────────────
  // Sections live in memory, so a reload would lose them. Save on change, and
  // offer to restore when the editor comes up empty (which is always the case
  // after a reload, since no extraction survives it).
  const [restorable, setRestorable] = useState<StoredSections | null>(null);
  const restoreChecked = useRef(false);

  useEffect(() => {
    if (restoreChecked.current) return;
    restoreChecked.current = true;
    if (blueprintJson.trim()) return;   // a live blueprint wins over saved state
    const saved = loadSections();
    if (saved && saved.sectionCount > 0) setRestorable(saved);
  }, [blueprintJson]);

  useEffect(() => {
    if (!dirty) return;
    saveSections(toJson(), siteName, sections.length);
  }, [dirty, sections, siteName, toJson]);

  const handleRestore = () => {
    if (!restorable) return;
    onChange(restorable.json);
    setRestorable(null);
    setExpanded(true);
  };

  const handleDiscard = () => {
    clearSections();
    setRestorable(null);
  };

  const handleTemplateSelect = (patch: Partial<BlueprintSection> | null) => {
    setShowTemplates(false);
    addSection(patch ?? undefined);
    setExpanded(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toJson());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([toJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `4-BLUEPRINT_${siteName || 'blueprint'}-blueprint.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const placeholderTotal = sections.reduce(
    (n, s) => n + s.assets.filter(a => a.url.trim() && /placehold|placeholder|dummyimage|example\.com/i.test(a.url)).length,
    0,
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
      <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center space-x-3 min-w-0 flex-1 text-left"
        >
          <span className="text-gray-500 shrink-0">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
          <Layers className="w-4 h-4 text-gray-500 shrink-0" />
          <span className="font-semibold text-gray-800 text-sm shrink-0">Editor de estructura</span>
          <span className="text-xs text-gray-400 shrink-0">
            {sections.length === 0
              ? 'sin secciones'
              : `${sections.length} ${sections.length === 1 ? 'sección' : 'secciones'}`}
          </span>
          {dirty && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
              editado
            </span>
          )}
          {placeholderTotal > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
              {placeholderTotal} placeholder{placeholderTotal === 1 ? '' : 's'}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {sections.length > 0 && (
            <>
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar JSON'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 rounded transition-colors"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Descargar</span>
              </button>
            </>
          )}
        </div>
      </div>

      {restorable && (
        <div className="flex items-start justify-between gap-3 px-5 py-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-start space-x-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
            <p className="text-xs text-blue-800 leading-relaxed">
              Tienes {restorable.sectionCount}{' '}
              {restorable.sectionCount === 1 ? 'sección guardada' : 'secciones guardadas'} de tu sesión
              anterior{restorable.sourceUrl ? ` (${restorable.sourceUrl})` : ''}, {describeAge(restorable.savedAt)}.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDiscard}
              className="px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 rounded transition-colors"
            >
              Descartar
            </button>
            <button
              onClick={handleRestore}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
            >
              Restaurar
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="p-5 space-y-3">
          {parseError && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">El blueprint no se pudo leer</p>
                <p className="text-xs mt-0.5">{parseError}</p>
                <p className="text-xs mt-1">
                  Puedes empezar de cero añadiendo secciones — al guardar se reemplazará el JSON dañado.
                </p>
              </div>
            </div>
          )}

          {!hasExtraction && sections.length > 0 && (
            <div className="flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Estructura creada a mano, sin extracción. No incluye globals (nav, footer) ni sistema de diseño —
                para eso extrae un sitio real.
              </span>
            </div>
          )}

          {/* Mode toggle — only one mode is sent to the builder */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
            <button
              onClick={() => setMode('structured')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                mode === 'structured' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Estructurado
            </button>
            <button
              onClick={() => setMode('free')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                mode === 'free' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Libre
            </button>
          </div>

          {mode === 'free' ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-200 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-700">Descripción libre de la página</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                    Describe la página como quieras. Esto reemplaza la lista de secciones en el prompt —
                    las secciones se conservan por si vuelves a Estructurado.
                  </p>
                </div>
                {sections.length > 0 && (
                  <button
                    onClick={() => setFreeForm(freeForm.trim() ? freeForm : outlineFromSections())}
                    disabled={Boolean(freeForm.trim())}
                    className="shrink-0 px-2.5 py-1.5 text-[11px] font-medium border border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900 disabled:opacity-40 disabled:hover:border-gray-300 rounded transition-colors"
                    title={freeForm.trim() ? 'Vacía el campo para rellenarlo desde las secciones' : undefined}
                  >
                    Rellenar desde las secciones
                  </button>
                )}
              </div>
              <textarea
                value={freeForm}
                onChange={e => setFreeForm(e.target.value)}
                rows={14}
                className="w-full border-0 px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none resize-y"
                placeholder={'Ejemplo:\n\n1. Hero a pantalla completa, imagen de fondo oscura, titular centrado y un CTA.\n2. Tres columnas de servicios con icono, título y descripción.\n3. Testimonios en carrusel.\n4. CTA final a ancho completo.'}
              />
              {!freeForm.trim() && (
                <p className="px-3.5 pb-2.5 text-[11px] text-amber-700">
                  Vacío: el prompt no llevará estructura. Escribe algo o vuelve a Estructurado.
                </p>
              )}
            </div>
          ) : (
          <>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-medium text-gray-700">Instrucciones de layout</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                Cambios que quieres sobre la estructura extraída. El builder les da prioridad por encima
                del layout original.
              </p>
            </div>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={4}
              className="w-full border-0 px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none resize-y"
              placeholder={'Ejemplo:\nHero a 3 columnas — col 1 imagen, col 2 copy, col 3 formulario.\nCTA a ancho completo.\nQuitar la galería de equipo.'}
            />
            {instructions.trim() && (
              <p className="px-3.5 pb-2.5 text-[11px] text-gray-400">
                Se incluirán en el prompt para builder.
              </p>
            )}
          </div>

          {sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 border border-gray-200 rounded flex items-center justify-center mb-4">
                <Layers className="w-5 h-5 text-gray-400" />
              </div>
              <h3 className="text-gray-700 font-medium mb-1 text-sm">Sin secciones todavía</h3>
              <p className="text-gray-400 text-xs mb-5 max-w-sm">
                Extrae un sitio para cargar su estructura, o compón una a mano desde cero.
              </p>
              <button
                onClick={() => setShowTemplates(true)}
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
              >
                <Plus className="w-4 h-4" /> Añadir sección
              </button>
            </div>
          ) : (
            <>
              {sections.map((section, i) => (
                <SectionCard
                  key={section._uid}
                  section={section}
                  position={i + 1}
                  total={sections.length}
                  onUpdate={updates => updateSection(section._uid, updates)}
                  onDelete={() => deleteSection(section._uid)}
                  onMove={dir => moveSection(section._uid, dir)}
                  onDuplicate={() => duplicateSection(section._uid)}
                />
              ))}
              <button
                onClick={() => setShowTemplates(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-300 hover:border-gray-900 text-gray-500 hover:text-gray-900 text-sm rounded transition-colors"
              >
                <Plus className="w-4 h-4" /> Añadir sección
              </button>
            </>
          )}
          </>
          )}
        </div>
      )}

      {showTemplates && (
        <SectionTemplateModal
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}
