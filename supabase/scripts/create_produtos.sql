-- Execute este script no Supabase Dashboard > SQL Editor
-- Tabela de produtos (codProduto / Produto)
CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cod_produto TEXT NOT NULL,
  produto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cod_produto)
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Produtos viewable by authenticated" ON public.produtos;
CREATE POLICY "Produtos viewable by authenticated"
  ON public.produtos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins gestores manage produtos" ON public.produtos;
CREATE POLICY "Admins gestores manage produtos"
  ON public.produtos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));
