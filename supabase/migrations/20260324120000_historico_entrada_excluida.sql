-- Registro de exclusão de uma única entrada do histórico (grid/etapa), não do ticket inteiro.
-- Gestores e supervisores inserem; apenas admin visualiza (tela Tickets Excluídos).

CREATE TABLE public.historico_entrada_excluida (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id BIGINT NOT NULL,
  historico_entrada_id UUID NOT NULL,
  entrada JSONB NOT NULL,
  chamado_snapshot JSONB NOT NULL,
  etapa_entrada_label TEXT,
  etapa_entrada_key TEXT,
  status_entrada_label TEXT,
  status_entrada_key TEXT,
  motivo_exclusao TEXT NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_by UUID
);

CREATE INDEX idx_historico_entrada_excluida_chamado_id ON public.historico_entrada_excluida(chamado_id);
CREATE INDEX idx_historico_entrada_excluida_deleted_at ON public.historico_entrada_excluida(deleted_at DESC);

ALTER TABLE public.historico_entrada_excluida ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view historico_entrada_excluida"
  ON public.historico_entrada_excluida FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- INSERT aberto para authenticated (igual chamados_excluidos); só admin lê na tela Tickets Excluídos.
CREATE POLICY "Authenticated can insert historico_entrada_excluida"
  ON public.historico_entrada_excluida FOR INSERT TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE public.historico_entrada_excluida IS 'Backup de linha excluída de chamado_historico (apenas a etapa/grid), com justificativa.';
