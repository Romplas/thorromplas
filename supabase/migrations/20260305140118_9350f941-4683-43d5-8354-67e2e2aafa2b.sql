CREATE POLICY "Authenticated can insert redes"
ON public.redes
FOR INSERT
TO authenticated
WITH CHECK (true);