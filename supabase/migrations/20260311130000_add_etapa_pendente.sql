-- Add etapa 'Pendente' before THOR (ordem 0)
-- Run in Supabase Dashboard > SQL Editor if needed
INSERT INTO public.etapas (nome, label, cor, ordem)
SELECT 'pendente', 'Pendente', 'amber', 0
WHERE NOT EXISTS (SELECT 1 FROM public.etapas WHERE nome = 'pendente');
