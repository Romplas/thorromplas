-- Tabela para armazenar chamados excluídos (soft delete / backup antes de excluir)
-- Permite ao Admin visualizar e restaurar tickets excluídos
CREATE TABLE public.chamados_excluidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_original BIGINT NOT NULL,
  dados JSONB NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_by UUID,
  motivo_exclusao TEXT
);

ALTER TABLE public.chamados_excluidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view chamados_excluidos"
  ON public.chamados_excluidos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert chamados_excluidos"
  ON public.chamados_excluidos FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can delete chamados_excluidos"
  ON public.chamados_excluidos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Histórico dos chamados excluídos (para restaurar junto)
CREATE TABLE public.chamado_historico_excluido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_excluido_id UUID NOT NULL REFERENCES public.chamados_excluidos(id) ON DELETE CASCADE,
  chamado_id_original BIGINT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT,
  descricao_ticket TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  user_id UUID
);

CREATE INDEX idx_chamado_historico_excluido_chamado_id ON public.chamado_historico_excluido(chamado_id_original);

ALTER TABLE public.chamado_historico_excluido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view chamado_historico_excluido"
  ON public.chamado_historico_excluido FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert chamado_historico_excluido"
  ON public.chamado_historico_excluido FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can delete chamado_historico_excluido"
  ON public.chamado_historico_excluido FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
