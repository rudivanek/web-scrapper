/*
  # Add CopyZap result column to audits table

  ## Summary
  Adds a new nullable JSONB column to store the generated Acciones de Copy brief
  (prompt cards + combined prompt) so results persist across sessions and when
  loading saved audits.

  ## Changes
  - `audits` table: adds `copyzap_result_json` (jsonb, nullable)
    - Stores: `{ cards: PromptCard[], combinedPrompt: string }`
    - Written on every "Generar brief" / "Regenerar brief" click
    - Restored when loading a saved audit from history

  ## Notes
  - No RLS changes needed — the column inherits existing row-level policies
  - Non-destructive: column is nullable, existing rows unaffected
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audits' AND column_name = 'copyzap_result_json'
  ) THEN
    ALTER TABLE audits ADD COLUMN copyzap_result_json jsonb;
  END IF;
END $$;
