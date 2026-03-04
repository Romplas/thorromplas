
-- Drop the broken UPDATE policy
DROP POLICY IF EXISTS "Authenticated can update chamados" ON public.chamados;

-- Create a fixed UPDATE policy that properly handles representante/supervisor ID matching
-- representante_id stores IDs from the representantes table, not profiles table
-- We need to match via name: profile.nome = representantes.nome
CREATE POLICY "Authenticated can update chamados"
ON public.chamados
FOR UPDATE
TO authenticated
USING (
  -- Admin or Gestor: full access
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'gestor'::app_role)
  -- Supervisor: can update chamados linked to their supervisor record
  OR supervisor_id IN (
    SELECT s.id FROM supervisores s
    JOIN profiles p ON lower(p.nome) = lower(s.nome)
    WHERE p.user_id = auth.uid()
  )
  -- Representante: can update chamados linked to their representante record
  OR representante_id IN (
    SELECT r.id FROM representantes r
    JOIN profiles p ON lower(p.nome) = lower(r.nome)
    WHERE p.user_id = auth.uid()
  )
);

-- Also fix the INSERT policy for the same reason
DROP POLICY IF EXISTS "Authenticated can create chamados" ON public.chamados;

CREATE POLICY "Authenticated can create chamados"
ON public.chamados
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR has_role(auth.uid(), 'supervisor'::app_role)
  OR representante_id IN (
    SELECT r.id FROM representantes r
    JOIN profiles p ON lower(p.nome) = lower(r.nome)
    WHERE p.user_id = auth.uid()
  )
);

-- Also fix DELETE policy to include gestor
DROP POLICY IF EXISTS "Admins can delete chamados" ON public.chamados;

CREATE POLICY "Admins gestores can delete chamados"
ON public.chamados
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'gestor'::app_role)
);
