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

  const toJson = useCallback(
    () => serializeBlueprint(envelope, sections),
    [envelope, sections],
  );

  return {
    sections,
    envelope,
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
