-- Lock down SELECT visibility for chamados and chamado_historico.
-- Goal: prevent representatives/supervisors from seeing other users' data.

-- 1) CHAMADOS: replace permissive SELECT policy
DROP POLICY IF EXISTS "Chamados viewable by authenticated" ON public.chamados;

CREATE POLICY "Chamados selectable by role"
  ON public.chamados
  FOR SELECT
  TO authenticated
  USING (
    -- Admin/Gestor: full read access
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
    -- Supervisor: only chamados linked to their supervisor record
    OR supervisor_id IN (
      SELECT s.id
      FROM public.supervisores s
      JOIN public.profiles p
        ON (lower(p.nome) = lower(s.nome) OR lower(p.usuario) = lower(s.nome))
      WHERE p.user_id = auth.uid()
    )
    -- Representante: only chamados linked to their representante record
    OR representante_id IN (
      SELECT r.id
      FROM public.representantes r
      JOIN public.profiles p
        ON (lower(p.nome) = lower(r.nome) OR lower(p.usuario) = lower(r.nome))
      WHERE p.user_id = auth.uid()
    )
  );

-- 2) HISTÓRICO: only visible if the underlying chamado is visible
DROP POLICY IF EXISTS "Historico viewable by authenticated" ON public.chamado_historico;

CREATE POLICY "Historico selectable by chamado visibility"
  ON public.chamado_historico
  FOR SELECT
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
  );

