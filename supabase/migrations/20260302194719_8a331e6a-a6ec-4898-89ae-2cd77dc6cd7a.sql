INSERT INTO public.user_roles (user_id, role)
VALUES ('79a8d799-7712-4641-bda6-905047097fe2', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;