-- Add description column to books
ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS description text; 