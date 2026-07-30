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

  const commit = useCallback((next: BlueprintSection[]) => {
    setSections(next);
    setDirty(true);
    const json = serializeBlueprint(envelope, next);
    lastEmitted.current = json;
    onChange?.(json);
  }, [envelope, onChange]);

  const updateSection = useCallback((uid: string, updates: Partial<BlueprintSection>) => {
    setSections(prev => {
      const next = prev.map(s => (s._uid === uid ? { ...s, ...updates } : s));
      setDirty(true);
      const json = serializeBlueprint(envelope, next);
      lastEmitted.current = json;
      onChange?.(json);
      return next;
    });
  }, [envelope, onChange]);

  const addSection = useCallback((partial?: Partial<BlueprintSection>) => {
    setSections(prev => {
      const base = createEmptySection(prev.length + 1);
      const next = [...prev, partial ? { ...base, ...partial, _uid: base._uid } : base];
      setDirty(true);
      const json = serializeBlueprint(envelope, next);
      lastEmitted.current = json;
      onChange?.(json);
      return next;
    });
  }, [envelope, onChange]);

  const deleteSection = useCallback((uid: string) => {
    setSections(prev => {
      const next = prev.filter(s => s._uid !== uid);
      setDirty(true);
      const json = serializeBlueprint(envelope, next);
      lastEmitted.current = json;
      onChange?.(json);
      return next;
    });
  }, [envelope, onChange]);

  const moveSection = useCallback((uid: string, direction: -1 | 1) => {
    setSections(prev => {
      const idx = prev.findIndex(s => s._uid === uid);
      const target = idx + direction;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      setDirty(true);
      const json = serializeBlueprint(envelope, next);
      lastEmitted.current = json;
      onChange?.(json);
      return next;
    });
  }, [envelope, onChange]);

  const duplicateSection = useCallback((uid: string) => {
    setSections(prev => {
      const idx = prev.findIndex(s => s._uid === uid);
      if (idx === -1) return prev;
      const copy = createEmptySection(prev.length + 1);
      const cloned: BlueprintSection = {
        ...structuredClone({ ...prev[idx], _uid: '' }),
        _uid: copy._uid,
        section_name: `${prev[idx].section_name} (copy)`,
      };
      const next = [...prev.slice(0, idx + 1), cloned, ...prev.slice(idx + 1)];
      setDirty(true);
      const json = serializeBlueprint(envelope, next);
      lastEmitted.current = json;
      onChange?.(json);
      return next;
    });
  }, [envelope, onChange]);

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
    replaceAll: commit,
    toJson,
  };
}
