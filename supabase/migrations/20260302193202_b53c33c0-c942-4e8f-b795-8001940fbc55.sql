
-- Função para buscar email pelo username (acessível por anon para login)
CREATE OR REPLACE FUNCTION public.get_email_by_username(_username TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE usuario = _username LIMIT 1
$$;

-- Permitir que anon também possa ler profiles para insert do trigger funcionar
-- Adicionar policy para que o trigger handle_new_user funcione com service_role
-- (já funciona pois é SECURITY DEFINER)

-- Policy para permitir insert de profiles pelo trigger (anon não precisa, trigger usa security definer)
