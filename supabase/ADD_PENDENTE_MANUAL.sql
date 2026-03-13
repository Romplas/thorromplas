-- Execute este SQL no Supabase Dashboard > SQL Editor
-- 1) Adiciona status 'pendente' ao ticket_status
-- 2) Adiciona etapa 'Pendente' à tabela etapas (antes de THOR)

ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'pendente';

INSERT INTO public.etapas (nome, label, cor, ordem)
SELECT 'pendente', 'Pendente', 'amber', 0
WHERE NOT EXISTS (SELECT 1 FROM public.etapas WHERE nome = 'pendente');
