-- Unforced errors: true when the losing shot of the point was a mistake the
-- winner didn't force. Ticked in the tracker or later in the points editor.
-- Service faults count as unforced in the analysis whatever this says.

ALTER TABLE public.points
  ADD COLUMN IF NOT EXISTS is_unforced_error BOOLEAN NOT NULL DEFAULT false;
