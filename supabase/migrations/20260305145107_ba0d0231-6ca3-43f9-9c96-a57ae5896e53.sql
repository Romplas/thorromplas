CREATE POLICY "Authenticated can delete historico"
ON public.chamado_historico
FOR DELETE
TO authenticated
USING (true);