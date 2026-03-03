
-- Create etapas table to store valid kanban column/stage values
CREATE TABLE public.etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  label text NOT NULL,
  cor text NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.etapas ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view
CREATE POLICY "Etapas viewable by authenticated" ON public.etapas FOR SELECT TO authenticated USING (true);

-- Admins manage
CREATE POLICY "Admins manage etapas" ON public.etapas FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert the default etapas
INSERT INTO public.etapas (nome, label, cor, ordem) VALUES
  ('thor', 'THOR', 'red', 1),
  ('aguardando_resposta', 'Aguardando Resposta', 'purple', 2),
  ('retorno_interno', 'Retorno Interno Romplas', 'blue', 3),
  ('negociacao', 'Em Negociação', 'yellow', 4),
  ('alteracao', 'Alteração', 'teal', 5),
  ('completo', 'Completo', 'green', 6),
  ('perdido', 'Perdido', 'black', 7),
  ('rnc', 'RNC', 'pink', 8),
  ('sdp', 'SDP', 'orange', 9),
  ('amostras', 'Amostras', 'navy', 10),
  ('book', 'Book', 'lime', 11);
