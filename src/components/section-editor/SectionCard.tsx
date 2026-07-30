import { useState, useCallback } from 'react';
import {
  ChevronDown, ChevronRight, Trash2, Plus, X,
  ArrowUp, ArrowDown, CopyPlus, AlertTriangle,
} from 'lucide-react';
import type {
  BlueprintSection, LayoutContract, SectionType,
  TextBlock, TextBlockRole, SectionAsset, AssetRole, CtaButton,
} from '../../types/sections';
import {
  SECTION_TYPES, TEXT_BLOCK_ROLES, ASSET_ROLES,
  DESKTOP_LAYOUTS, MOBILE_LAYOUTS, DEFAULT_LAYOUT_CONTRACT,
} from '../../types/sections';

interface SectionCardProps {
  section: BlueprintSection;
  position: number;
  total: number;
  onUpdate: (updates: Partial<BlueprintSection>) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
}

const field =
  'w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors';
const fieldSm =
  'w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors';
const labelCls =
  'text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1.5 block';

/** Flags obviously-fake image URLs so they never ride along into a client deliverable. */
const PLACEHOLDER_HOSTS = ['placehold.co', 'placeholder.com', 'via.placeholder', 'placekitten', 'dummyimage.com', 'example.com', 'lorempixel'];
function isPlaceholderUrl(url: string): boolean {
  const u = url.toLowerCase();
  return PLACEHOLDER_HOSTS.some(h => u.includes(h));
}

function ColorSwatch({ hex, onChange }: { hex: string | null; onChange: (hex: string | null) => void }) {
  const value = hex && /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#ffffff';
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-9 h-9 overflow-hidden border border-gray-300 rounded cursor-pointer shrink-0">
        <div className="absolute inset-0" style={{ backgroundColor: hex || 'transparent' }} />
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
      <input
        type="text"
        value={hex ?? ''}
        onChange={e => onChange(e.target.value.trim() ? e.target.value : null)}
        className={`${field} font-mono`}
        placeholder="null (sin dato)"
      />
    </div>
  );
}

/** Editor for the three layout_contract fields that MUST stay string[]. */
function StringListEditor({
  label, items, placeholder, onChange,
}: {
  label: string;
  items: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft('');
  };

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="space-y-1.5 mb-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5">
            <span className="flex-1 text-xs text-gray-700 leading-relaxed break-words">{item}</span>
            <button
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-gray-400 hover:text-red-500 transition-colors shrink-0 mt-0.5"
              aria-label={`Remove ${label} item ${i + 1}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-[11px] text-gray-400 italic px-0.5">Vacío</p>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          className={fieldSm}
          placeholder={placeholder}
        />
        <button
          onClick={add}
          className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 rounded transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

const CONTRACT_TEXT_FIELDS: { key: keyof LayoutContract; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: 'section_role', label: 'Section Role', placeholder: 'Qué logra esta sección en el embudo' },
  { key: 'column_structure', label: 'Column Structure', placeholder: "p. ej. '60/40 text-left image-right'" },
  { key: 'content_position', label: 'Content Position', placeholder: 'center | left | right | overlay-center | overlay-left | overlay-bottom' },
  { key: 'image_position', label: 'Image Position', placeholder: 'left | right | background | above | below | none' },
  { key: 'card_or_grid_structure', label: 'Card / Grid Structure', placeholder: 'Describe el layout de tarjetas, o déjalo vacío' , multiline: true },
  { key: 'alignment_rules', label: 'Alignment Rules', placeholder: 'text-center | text-left | mixed' },
  { key: 'spacing_density', label: 'Spacing Density', placeholder: 'tight | normal | spacious | hero-scale' },
];

function ContractTab({ contract, onUpdate }: { contract: LayoutContract; onUpdate: (lc: LayoutContract) => void }) {
  const set = (key: keyof LayoutContract, value: string | string[]) =>
    onUpdate({ ...contract, [key]: value });

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2.5">
        <p className="text-[11px] text-blue-800 leading-relaxed">
          El Layout Contract es la especificación estructural autoritativa. Los constructores de IA deben seguirlo
          exactamente — columnas, posición de imagen, estructura de grid y comportamiento móvil se imponen sobre
          cualquier otro instinto.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Desktop Layout</label>
          <select
            value={contract.desktop_layout}
            onChange={e => set('desktop_layout', e.target.value)}
            className={`${field} cursor-pointer`}
          >
            <option value="">— sin definir —</option>
            {DESKTOP_LAYOUTS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Mobile Layout</label>
          <select
            value={contract.mobile_layout}
            onChange={e => set('mobile_layout', e.target.value)}
            className={`${field} cursor-pointer`}
          >
            <option value="">— sin definir —</option>
            {MOBILE_LAYOUTS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {CONTRACT_TEXT_FIELDS.map(({ key, label, placeholder, multiline }) => (
        <div key={key}>
          <label className={labelCls}>{label}</label>
          {multiline ? (
            <textarea
              value={contract[key] as string}
              onChange={e => set(key, e.target.value)}
              className={`${field} min-h-[60px] resize-y`}
              placeholder={placeholder}
              rows={2}
            />
          ) : (
            <input
              type="text"
              value={contract[key] as string}
              onChange={e => set(key, e.target.value)}
              className={field}
              placeholder={placeholder}
            />
          )}
        </div>
      ))}

      <div className="pt-2 border-t border-gray-200 space-y-4">
        <StringListEditor
          label="Must Preserve"
          items={contract.must_preserve}
          placeholder="Lo que NUNCA debe cambiar. Enter para añadir."
          onChange={v => set('must_preserve', v)}
        />
        <StringListEditor
          label="Allowed Simplifications"
          items={contract.allowed_simplifications}
          placeholder="Lo que sí se puede simplificar. Enter para añadir."
          onChange={v => set('allowed_simplifications', v)}
        />
        <StringListEditor
          label="Do Not Do"
          items={contract.do_not_do}
          placeholder="Errores de layout a prohibir. Enter para añadir."
          onChange={v => set('do_not_do', v)}
        />
      </div>
    </div>
  );
}

function CopyTab({ section, onUpdate }: { section: BlueprintSection; onUpdate: (u: Partial<BlueprintSection>) => void }) {
  const updateCta = (i: number, updates: Partial<CtaButton>) =>
    onUpdate({ cta_buttons: section.cta_buttons.map((b, idx) => (idx === i ? { ...b, ...updates } : b)) });

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2.5">
        <p className="text-[11px] text-amber-800 leading-relaxed">
          Copia textual del sitio real. No inventes ni reescribas texto aquí — si falta, déjalo vacío.
        </p>
      </div>

      <div>
        <label className={labelCls}>Headline</label>
        <input
          type="text"
          value={section.headline ?? ''}
          onChange={e => onUpdate({ headline: e.target.value || null })}
          className={field}
        />
      </div>
      <div>
        <label className={labelCls}>Subheadline</label>
        <input
          type="text"
          value={section.subheadline ?? ''}
          onChange={e => onUpdate({ subheadline: e.target.value || null })}
          className={field}
        />
      </div>
      <div>
        <label className={labelCls}>Body Text</label>
        <textarea
          value={section.body_text ?? ''}
          onChange={e => onUpdate({ body_text: e.target.value || null })}
          className={`${field} min-h-[80px] resize-y`}
          rows={3}
        />
      </div>

      <div className="pt-2 border-t border-gray-200">
        <label className={labelCls}>CTA Buttons</label>
        <div className="space-y-2">
          {section.cta_buttons.map((btn, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={btn.text}
                onChange={e => updateCta(i, { text: e.target.value })}
                className={fieldSm}
                placeholder="Texto del botón"
              />
              <select
                value={btn.style}
                onChange={e => updateCta(i, { style: e.target.value as CtaButton['style'] })}
                className={`${fieldSm} w-32 cursor-pointer shrink-0`}
              >
                <option value="primary">primary</option>
                <option value="secondary">secondary</option>
                <option value="ghost">ghost</option>
              </select>
              <button
                onClick={() => onUpdate({ cta_buttons: section.cta_buttons.filter((_, idx) => idx !== i) })}
                className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                aria-label={`Remove CTA ${i + 1}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => onUpdate({ cta_buttons: [...section.cta_buttons, { text: '', style: 'primary' }] })}
            className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-300 hover:border-gray-900 text-gray-500 hover:text-gray-900 text-xs rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Añadir CTA
          </button>
        </div>
      </div>
    </div>
  );
}

function TextBlocksTab({ blocks, onChange }: { blocks: TextBlock[]; onChange: (next: TextBlock[]) => void }) {
  const update = (i: number, updates: Partial<TextBlock>) =>
    onChange(blocks.map((b, idx) => (idx === i ? { ...b, ...updates } : b)));

  const move = (i: number, dir: -1 | 1) => {
    const t = i + dir;
    if (t < 0 || t >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[t]] = [next[t], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-500 leading-relaxed">
        Cada bloque es texto visible, verbatim, con su rol semántico. Este es el contenido que se reconstruye —
        el orden importa.
      </p>
      {blocks.map((block, i) => (
        <div key={i} className="bg-gray-50 border border-gray-200 rounded p-3">
          <div className="flex items-center justify-between mb-2 gap-2">
            <select
              value={block.role}
              onChange={e => update(i, { role: e.target.value as TextBlockRole })}
              className={`${fieldSm} w-32 cursor-pointer`}
            >
              {TEXT_BLOCK_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => move(i, -1)} disabled={i === 0}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors">
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === blocks.length - 1}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors">
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onChange(blocks.filter((_, idx) => idx !== i))}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <textarea
            value={block.content}
            onChange={e => update(i, { content: e.target.value })}
            className={`${fieldSm} min-h-[54px] resize-y`}
            rows={2}
            placeholder="Texto verbatim"
          />
        </div>
      ))}
      <button
        onClick={() => onChange([...blocks, { role: 'paragraph', content: '' }])}
        className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-300 hover:border-gray-900 text-gray-500 hover:text-gray-900 text-xs rounded transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Añadir bloque de texto
      </button>
    </div>
  );
}

function AssetsTab({ assets, onChange }: { assets: SectionAsset[]; onChange: (next: SectionAsset[]) => void }) {
  const update = (i: number, updates: Partial<SectionAsset>) =>
    onChange(assets.map((a, idx) => (idx === i ? { ...a, ...updates } : a)));

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-500 leading-relaxed">
        URLs reales de imágenes del sitio. No uses servicios de placeholder.
      </p>
      {assets.map((asset, i) => {
        const flagged = asset.url.trim() !== '' && isPlaceholderUrl(asset.url);
        return (
          <div key={i} className="bg-gray-50 border border-gray-200 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">Imagen {i + 1}</span>
              <button onClick={() => onChange(assets.filter((_, idx) => idx !== i))}
                className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              <input type="text" value={asset.url} onChange={e => update(i, { url: e.target.value })}
                className={fieldSm} placeholder="URL absoluta de la imagen" />
              {flagged && (
                <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  <span>URL de placeholder detectada. Sustitúyela por la imagen real antes de exportar.</span>
                </div>
              )}
              <input type="text" value={asset.alt} onChange={e => update(i, { alt: e.target.value })}
                className={fieldSm} placeholder="Texto alternativo" />
              <select value={asset.role} onChange={e => update(i, { role: e.target.value as AssetRole })}
                className={`${fieldSm} cursor-pointer`}>
                {ASSET_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        );
      })}
      <button
        onClick={() => onChange([...assets, { url: '', alt: '', role: 'card' }])}
        className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-300 hover:border-gray-900 text-gray-500 hover:text-gray-900 text-xs rounded transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Añadir imagen
      </button>
    </div>
  );
}

const TYPE_COLOR: Record<string, string> = {
  hero: '#2563eb', features: '#059669', testimonials: '#7c3aed',
  pricing: '#d97706', cta: '#dc2626', about: '#0891b2',
  portfolio: '#db2777', blog: '#4f46e5', contact: '#0d9488',
  faq: '#ea580c', stats: '#6366f1', team: '#16a34a',
  partners: '#6b7280', content: '#3b82f6', gallery: '#ec4899',
};

export function SectionCard({
  section, position, total, onUpdate, onDelete, onMove, onDuplicate,
}: SectionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'contract' | 'copy' | 'text' | 'assets'>('contract');

  const updateContract = useCallback(
    (lc: LayoutContract) => onUpdate({ layout_contract: lc }),
    [onUpdate],
  );

  const color = TYPE_COLOR[section.section_type] || '#6b7280';
  const contract = section.layout_contract || DEFAULT_LAYOUT_CONTRACT;
  const hasContract = Boolean(contract.desktop_layout);
  const placeholderCount = section.assets.filter(a => a.url.trim() && isPlaceholderUrl(a.url)).length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden group/card">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xs text-gray-400 font-mono w-5 shrink-0 text-right">{position}</span>

        <div
          className="w-3 h-3 shrink-0 border border-gray-300 rounded-sm"
          style={{ backgroundColor: section.background_color || 'transparent' }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-gray-900 text-sm font-medium truncate">
              {section.section_name || 'Sección sin nombre'}
            </span>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
              style={{ backgroundColor: `${color}15`, color }}
            >
              {section.section_type}
            </span>
            {placeholderCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-3 h-3" />
                {placeholderCount}
              </span>
            )}
          </div>
          {!expanded && (
            <p className="text-gray-400 text-xs truncate mt-0.5">
              {hasContract
                ? `${contract.desktop_layout} · ${contract.mobile_layout || 'móvil sin definir'} · ${section.text_blocks.length} ${section.text_blocks.length === 1 ? 'bloque' : 'bloques'} · ${section.assets.length} ${section.assets.length === 1 ? 'imagen' : 'imágenes'}`
                : <span className="text-amber-600">Sin layout contract — extrae la página o complétalo a mano</span>}
            </p>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => onMove(-1)} disabled={position === 1}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            aria-label="Mover arriba">
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onMove(1)} disabled={position === total}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            aria-label="Mover abajo">
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDuplicate}
            className="opacity-0 group-hover/card:opacity-100 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded transition-all"
            aria-label="Duplicar sección">
            <CopyPlus className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}
            className="opacity-0 group-hover/card:opacity-100 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
            aria-label="Eliminar sección">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setExpanded(!expanded)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
            aria-label={expanded ? 'Contraer' : 'Expandir'}>
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-200 px-4 pt-4 pb-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className={labelCls}>Nombre de sección</label>
              <input
                type="text"
                value={section.section_name}
                onChange={e => onUpdate({ section_name: e.target.value })}
                className={field}
                placeholder="p. ej. Hero"
              />
            </div>
            <div>
              <label className={labelCls}>Tipo</label>
              <select
                value={section.section_type}
                onChange={e => onUpdate({ section_type: e.target.value as SectionType })}
                className={`${field} cursor-pointer`}
              >
                {SECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className={labelCls}>Color de fondo</label>
              <ColorSwatch hex={section.background_color} onChange={v => onUpdate({ background_color: v })} />
            </div>
            <div>
              <label className={labelCls}>Color de texto</label>
              <ColorSwatch hex={section.text_color} onChange={v => onUpdate({ text_color: v })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className={labelCls}>Tono de fondo</label>
              <select
                value={section.background_tone ?? ''}
                onChange={e => onUpdate({ background_tone: (e.target.value || null) as BlueprintSection['background_tone'] })}
                className={`${field} cursor-pointer`}
              >
                <option value="">— sin definir —</option>
                <option value="dark">dark</option>
                <option value="light">light</option>
                <option value="mid">mid</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Alto estimado (desktop)</label>
              <input
                type="text"
                value={section.estimated_height_desktop ?? ''}
                onChange={e => onUpdate({ estimated_height_desktop: e.target.value || null })}
                className={field}
                placeholder="100vh · 400px"
              />
            </div>
          </div>

          <div className="flex gap-1 mb-4 border-b border-gray-200">
            {([
              { id: 'contract', label: 'Contract' },
              { id: 'copy', label: 'Copy' },
              { id: 'text', label: 'Bloques' },
              { id: 'assets', label: 'Imágenes' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'text-gray-900 border-gray-900'
                    : 'text-gray-400 border-transparent hover:text-gray-700'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {tab.label}
                  {tab.id === 'contract' && hasContract && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  )}
                  {tab.id === 'text' && section.text_blocks.length > 0 && (
                    <span className="bg-gray-100 border border-gray-200 text-gray-500 px-1.5 rounded text-[10px]">
                      {section.text_blocks.length}
                    </span>
                  )}
                  {tab.id === 'assets' && section.assets.length > 0 && (
                    <span className="bg-gray-100 border border-gray-200 text-gray-500 px-1.5 rounded text-[10px]">
                      {section.assets.length}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>

          {activeTab === 'contract' && <ContractTab contract={contract} onUpdate={updateContract} />}
          {activeTab === 'copy' && <CopyTab section={section} onUpdate={onUpdate} />}
          {activeTab === 'text' && (
            <TextBlocksTab blocks={section.text_blocks} onChange={tb => onUpdate({ text_blocks: tb })} />
          )}
          {activeTab === 'assets' && (
            <AssetsTab assets={section.assets} onChange={a => onUpdate({ assets: a })} />
          )}
        </div>
      )}
    </div>
  );
}


