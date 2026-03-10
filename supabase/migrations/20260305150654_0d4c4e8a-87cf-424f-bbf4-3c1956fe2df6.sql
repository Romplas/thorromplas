
DROP POLICY "Admins gestores can delete chamados" ON public.chamados;

CREATE POLICY "Authenticated can delete chamados"
ON public.chamados
FOR DELETE
TO authenticated
USING (true);
