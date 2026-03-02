
-- Restringir INSERT de chamados para garantir que o representante_id pertence ao usuário
DROP POLICY "Authenticated can create chamados" ON public.chamados;
CREATE POLICY "Authenticated can create chamados"
  ON public.chamados FOR INSERT TO authenticated
  WITH CHECK (
    representante_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gestor')
  );

-- Restringir UPDATE de chamados
DROP POLICY "Authenticated can update chamados" ON public.chamados;
CREATE POLICY "Authenticated can update chamados"
  ON public.chamados FOR UPDATE TO authenticated
  USING (
    representante_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR supervisor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gestor')
  );

-- Restringir INSERT de histórico
DROP POLICY "Authenticated can insert historico" ON public.chamado_historico;
CREATE POLICY "Authenticated can insert historico"
  ON public.chamado_historico FOR INSERT TO authenticated
  WITH CHECK (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
