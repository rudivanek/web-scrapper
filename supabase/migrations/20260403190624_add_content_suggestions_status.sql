/*
  # Add content_suggestions_status column to audits table

  Tracks the status of the optional second-pass content suggestions generation.
  
  - pending: not yet requested
  - processing: being generated
  - completed: done
  - failed: error occurred
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audits' AND column_name = 'content_suggestions_status'
  ) THEN
    ALTER TABLE audits ADD COLUMN content_suggestions_status text DEFAULT NULL;
  END IF;
END $$;
