-- Permitir UPDATE em chamado_historico para usuários que já podem ver o chamado vinculado.
-- Necessário para sincronizar descricao_ticket quando o representante edita em Pendente/Pendente
-- sem criar nova linha no histórico (RLS bloqueava UPDATE antes: nenhuma policy FOR UPDATE).

CREATE POLICY "Historico updatable by chamado visibility"
  ON public.chamado_historico
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chamados c
      WHERE c.id = public.chamado_historico.chamado_id
        AND (
          has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'gestor'::app_role)
          OR c.supervisor_id IN (
            SELECT s.id
            FROM public.supervisores s
            JOIN public.profiles p
              ON (lower(p.nome) = lower(s.nome) OR lower(p.usuario) = lower(s.nome))
            WHERE p.user_id = auth.uid()
          )
          OR c.representante_id IN (
            SELECT r.id
            FROM public.representantes r
            JOIN public.profiles p
              ON (lower(p.nome) = lower(r.nome) OR lower(p.usuario) = lower(r.nome))
            WHERE p.user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.chamados c
      WHERE c.id = public.chamado_historico.chamado_id
        AND (
          has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'gestor'::app_role)
          OR c.supervisor_id IN (
            SELECT s.id
            FROM public.supervisores s
            JOIN public.profiles p
              ON (lower(p.nome) = lower(s.nome) OR lower(p.usuario) = lower(s.nome))
            WHERE p.user_id = auth.uid()
          )
          OR c.representante_id IN (
            SELECT r.id
            FROM public.representantes r
            JOIN public.profiles p
              ON (lower(p.nome) = lower(r.nome) OR lower(p.usuario) = lower(r.nome))
            WHERE p.user_id = auth.uid()
          )
        )
    )
  );
