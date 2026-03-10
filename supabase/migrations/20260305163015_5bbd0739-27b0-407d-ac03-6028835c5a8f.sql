ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS metros_totais text,
  ADD COLUMN IF NOT EXISTS negociado_com text,
  ADD COLUMN IF NOT EXISTS nfe text,
  ADD COLUMN IF NOT EXISTS tipo_solicitacao text,
  ADD COLUMN IF NOT EXISTS status_agendamento text;