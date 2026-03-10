ALTER TABLE public.chamados 
ADD COLUMN IF NOT EXISTS data_contato date,
ADD COLUMN IF NOT EXISTS data_retorno date;