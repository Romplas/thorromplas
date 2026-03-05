CREATE POLICY "Authenticated can insert clientes"
ON public.clientes
FOR INSERT
TO authenticated
WITH CHECK (true);