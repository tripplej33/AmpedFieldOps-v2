-- Migration: Add start_time, end_time, break_minutes to timesheets

ALTER TABLE public.timesheets
ADD COLUMN IF NOT EXISTS start_time text NULL,
ADD COLUMN IF NOT EXISTS end_time text NULL,
ADD COLUMN IF NOT EXISTS break_minutes integer DEFAULT 0;

-- Optional index for fast day timeline queries
CREATE INDEX IF NOT EXISTS idx_timesheets_user_entry_date ON public.timesheets (user_id, entry_date);
