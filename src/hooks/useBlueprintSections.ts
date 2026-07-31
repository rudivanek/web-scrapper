import { useState, useEffect, useCallback, useRef } from 'react';
import type { BlueprintSection } from '../types/sections';
import { parseBlueprint, serializeBlueprint, createEmptySection } from '../types/sections';

/**
 * In-memory section editor state, backed by the blueprint JSON string that
 * DesignExtractor already holds. No Supabase, no new tables.
 *
 * Pass the current blueprintJson in; every mutation calls onChange with the
 * re-serialized JSON so downstream consumers (vibePrompt, downloads, exports)
 * see the edits with no extra plumbing.
 */
export function useBlueprintSections(
  blueprintJson: string,
  onChange?: (nextJson: string) => void,
) {
  const [sections, setSections] = useState<BlueprintSection[]>([]);
  const [envelope, setEnvelope] = useState<Record<string, unknown>>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Track the JSON we last emitted so an echo back through props doesn't
  // clobber local state (and regenerate every _uid, collapsing open cards).
  const lastEmitted = useRef<string | null>(null);

  useEffect(() => {
    if (lastEmitted.current !== null && blueprintJson === lastEmitted.current) return;
    const { envelope: env, sections: secs, error } = parseBlueprint(blueprintJson);
    setEnvelope(env);
    setSections(secs);
    setParseError(error);
    setDirty(false);
    lastEmitted.current = null;
  }, [blueprintJson]);

  const emit = useCallback((next: BlueprintSection[]) => {
    const json = serializeBlueprint(envelope, next);
    lastEmitted.current = json;
    setSections(next);
    setDirty(true);
    onChange?.(json);
  }, [envelope, onChange]);

  const updateSection = useCallback((uid: string, updates: Partial<BlueprintSection>) => {
    emit(sections.map(s => (s._uid === uid ? { ...s, ...updates } : s)));
  }, [sections, emit]);

  const addSection = useCallback((partial?: Partial<BlueprintSection>) => {
    const base = createEmptySection(sections.length + 1);
    const created = partial ? { ...base, ...partial, _uid: base._uid } : base;
    emit([...sections, created]);
  }, [sections, emit]);

  const deleteSection = useCallback((uid: string) => {
    emit(sections.filter(s => s._uid !== uid));
  }, [sections, emit]);

  const moveSection = useCallback((uid: string, direction: -1 | 1) => {
    const idx = sections.findIndex(s => s._uid === uid);
    const target = idx + direction;
    if (idx === -1 || target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[idx], next[target]] = [next[target], next[idx]];
    emit(next);
  }, [sections, emit]);

  const duplicateSection = useCallback((uid: string) => {
    const idx = sections.findIndex(s => s._uid === uid);
    if (idx === -1) return;
    const fresh = createEmptySection(sections.length + 1);
    const cloned: BlueprintSection = {
      ...structuredClone({ ...sections[idx], _uid: '' }),
      _uid: fresh._uid,
      section_name: `${sections[idx].section_name} (copy)`,
    };
    emit([...sections.slice(0, idx + 1), cloned, ...sections.slice(idx + 1)]);
  }, [sections, emit]);

  /**
   * Free-text layout instructions from the user, stored in the blueprint envelope so they
   * persist, download and restore alongside the sections with no extra plumbing.
   */
  const instructions = typeof envelope.user_instructions === 'string' ? envelope.user_instructions : '';

  const writeEnvelope = useCallback((patch: Record<string, unknown>) => {
    const nextEnvelope = { ...envelope };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === '' || (typeof value === 'string' && !value.trim())) {
        delete nextEnvelope[key];
      } else {
        nextEnvelope[key] = value;
      }
    }
    setEnvelope(nextEnvelope);
    setDirty(true);
    const json = serializeBlueprint(nextEnvelope, sections);
    lastEmitted.current = json;
    onChange?.(json);
  }, [envelope, sections, onChange]);

  const setInstructions = useCallback((text: string) => {
    writeEnvelope({ user_instructions: text });
  }, [writeEnvelope]);

  /** 'structured' = section cards; 'free' = one free-form description. Stored in the envelope. */
  const mode: 'structured' | 'free' = envelope.blueprint_mode === 'free' ? 'free' : 'structured';
  const freeForm = typeof envelope.free_form === 'string' ? envelope.free_form : '';

  const setMode = useCallback((next: 'structured' | 'free') => {
    // Sections are never discarded — both modes live in the same blueprint, and only the
    // active one is sent to the builder. Switching back restores everything untouched.
    writeEnvelope({ blueprint_mode: next === 'free' ? 'free' : undefined });
  }, [writeEnvelope]);

  const setFreeForm = useCallback((text: string) => {
    writeEnvelope({ free_form: text });
  }, [writeEnvelope]);

  /** Plain-text outline of the current sections, as a starting draft for free mode. */
  const outlineFromSections = useCallback((): string => {
    if (sections.length === 0) return '';
    return sections.map((sec, i) => {
      const lc = sec.layout_contract;
      const bits = [lc.desktop_layout, lc.column_structure].filter(Boolean).join(' · ');
      const head = `${i + 1}. ${sec.section_name} (${sec.section_type})${bits ? ` — ${bits}` : ''}`;
      const copy = sec.headline ? `\n   Titular: ${sec.headline}` : '';
      const imgs = sec.assets.length > 0 ? `\n   ${sec.assets.length} imagen${sec.assets.length === 1 ? '' : 'es'}` : '';
      return head + copy + imgs;
    }).join('\n');
  }, [sections]);

  const toJson = useCallback(
    () => serializeBlueprint(envelope, sections),
    [envelope, sections],
  );

  return {
    sections,
    envelope,
    instructions,
    setInstructions,
    mode,
    setMode,
    freeForm,
    setFreeForm,
    outlineFromSections,
    parseError,
    dirty,
    addSection,
    updateSection,
    deleteSection,
    moveSection,
    duplicateSection,
    replaceAll: emit,
    toJson,
  };
}
