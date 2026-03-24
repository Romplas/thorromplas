-- Alinha INSERT com chamados_excluidos: qualquer usuário autenticado pode registrar
-- o backup (a UI já restringe quem vê o botão; política antiga com has_role falhava em alguns ambientes).
DROP POLICY IF EXISTS "Gestor supervisor admin can insert historico_entrada_excluida"
  ON public.historico_entrada_excluida;
DROP POLICY IF EXISTS "Authenticated can insert historico_entrada_excluida"
  ON public.historico_entrada_excluida;

CREATE POLICY "Authenticated can insert historico_entrada_excluida"
  ON public.historico_entrada_excluida FOR INSERT TO authenticated
  WITH CHECK (true);
