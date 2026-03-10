
-- ===========================================
-- THOR - Gerenciador de Chamados
-- Schema completo (corrigido)
-- ===========================================

-- 1. Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'supervisor', 'representante');
CREATE TYPE public.ticket_status AS ENUM ('aberto', 'em_progresso', 'aguardando', 'finalizado');
CREATE TYPE public.ticket_prioridade AS ENUM ('Alta', 'Média', 'Baixa');

-- 2. Tabela de roles (antes da função)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Função has_role (ANTES das policies que a usam)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Policies user_roles
CREATE POLICY "Roles viewable by authenticated"
  ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Tabela de perfis
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  usuario TEXT,
  telefone TEXT,
  supervisora TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clientes viewable by authenticated"
  ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gestores manage clientes"
  ON public.clientes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

-- 6. Motivos
CREATE TABLE public.motivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.motivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Motivos viewable by authenticated"
  ON public.motivos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage motivos"
  ON public.motivos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Chamados
CREATE TABLE public.chamados (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  representante_id UUID REFERENCES public.profiles(id),
  cliente_id UUID REFERENCES public.clientes(id),
  cliente_nome TEXT NOT NULL,
  motivo TEXT NOT NULL,
  submotivo TEXT,
  status ticket_status NOT NULL DEFAULT 'aberto',
  prioridade ticket_prioridade NOT NULL DEFAULT 'Média',
  supervisor_id UUID REFERENCES public.profiles(id),
  gestor_id UUID REFERENCES public.profiles(id),
  etapa TEXT,
  descricao TEXT,
  atualizado_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chamados viewable by authenticated"
  ON public.chamados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create chamados"
  ON public.chamados FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update chamados"
  ON public.chamados FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete chamados"
  ON public.chamados FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. Histórico de chamados
CREATE TABLE public.chamado_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id BIGINT REFERENCES public.chamados(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  acao TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chamado_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Historico viewable by authenticated"
  ON public.chamado_historico FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert historico"
  ON public.chamado_historico FOR INSERT TO authenticated WITH CHECK (true);

-- 9. Triggers updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chamados_updated_at
  BEFORE UPDATE ON public.chamados FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Trigger para criar perfil ao cadastrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Dados iniciais - Motivos
INSERT INTO public.motivos (nome) VALUES
  ('Notas Fiscais'), ('Amostras'), ('Negociação'), ('RNC'),
  ('Solicitação de Pedidos'), ('Solicitação Interna Romplas'),
  ('Relatório de Pedidos Pendentes'), ('SD (Solicitação de Desenvolvimento)');

-- 12. Dados iniciais - Clientes
INSERT INTO public.clientes (nome) VALUES
  ('MOVEIS PREMIUM SA'), ('COLCHARIA NACIONAL'), ('INDUSTRIA DE ESPUMAS BRASIL'),
  ('COMERCIO MEGA COLCHOES'), ('COLCHOES STAR LTDA'), ('ZANOMAD MOVEIS LTDA'),
  ('REI DAS ESPUMAS COMERCIO DE PLASTICOS'), ('ATACADO DE ESPUMAS NORDESTE');
