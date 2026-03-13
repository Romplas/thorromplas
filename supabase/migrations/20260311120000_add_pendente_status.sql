-- Add 'pendente' to ticket_status enum
-- Run in Supabase Dashboard > SQL Editor if needed
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'pendente';
