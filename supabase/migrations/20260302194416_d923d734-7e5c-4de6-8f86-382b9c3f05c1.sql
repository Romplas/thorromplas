
-- Allow gestores to insert profiles
CREATE POLICY "Gestores can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

-- Allow gestores to update profiles
CREATE POLICY "Gestores can update profiles"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Allow gestores to delete profiles
CREATE POLICY "Gestores can delete profiles"
ON public.profiles FOR DELETE
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Allow gestores to manage roles
CREATE POLICY "Gestores can manage roles"
ON public.user_roles FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role));
