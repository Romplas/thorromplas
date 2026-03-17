
-- Drop and recreate INSERT policy to also match via usuario
DROP POLICY IF EXISTS "Authenticated can create chamados" ON public.chamados;
CREATE POLICY "Authenticated can create chamados"
  ON public.chamados FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
    OR has_role(auth.uid(), 'supervisor'::app_role)
    OR (representante_id IN (
      SELECT r.id FROM representantes r
      JOIN profiles p ON (lower(p.nome) = lower(r.nome) OR lower(p.usuario) = lower(r.nome))
      WHERE p.user_id = auth.uid()
    ))
  );

-- Drop and recreate UPDATE policy to also match via usuario
DROP POLICY IF EXISTS "Authenticated can update chamados" ON public.chamados;
CREATE POLICY "Authenticated can update chamados"
  ON public.chamados FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
    OR (supervisor_id IN (
      SELECT s.id FROM supervisores s
      JOIN profiles p ON (lower(p.nome) = lower(s.nome) OR lower(p.usuario) = lower(s.nome))
      WHERE p.user_id = auth.uid()
    ))
    OR (representante_id IN (
      SELECT r.id FROM representantes r
      JOIN profiles p ON (lower(p.nome) = lower(r.nome) OR lower(p.usuario) = lower(r.nome))
      WHERE p.user_id = auth.uid()
    ))
  );
