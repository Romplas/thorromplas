
-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated can insert historico" ON public.chamado_historico;

-- Create new policy allowing any authenticated user to insert
CREATE POLICY "Authenticated can insert historico"
ON public.chamado_historico
FOR INSERT
TO authenticated
WITH CHECK (true);
