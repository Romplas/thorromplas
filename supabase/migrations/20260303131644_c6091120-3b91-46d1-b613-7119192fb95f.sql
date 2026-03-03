
-- Create supervisores table
CREATE TABLE public.supervisores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create representantes table  
CREATE TABLE public.representantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo integer NOT NULL,
  nome text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create supervisor_representante junction table
CREATE TABLE public.supervisor_representante (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id uuid NOT NULL REFERENCES public.supervisores(id) ON DELETE CASCADE,
  representante_id uuid NOT NULL REFERENCES public.representantes(id) ON DELETE CASCADE,
  UNIQUE(supervisor_id, representante_id)
);

-- Create redes table
CREATE TABLE public.redes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Alter clientes table to add new columns
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS codigo integer,
  ADD COLUMN IF NOT EXISTS representante_id uuid REFERENCES public.representantes(id),
  ADD COLUMN IF NOT EXISTS rede_id uuid REFERENCES public.redes(id);

-- RLS for supervisores
ALTER TABLE public.supervisores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Supervisores viewable by authenticated" ON public.supervisores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gestores manage supervisores" ON public.supervisores FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

-- RLS for representantes
ALTER TABLE public.representantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Representantes viewable by authenticated" ON public.representantes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gestores manage representantes" ON public.representantes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

-- RLS for supervisor_representante
ALTER TABLE public.supervisor_representante ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supervisor_representante viewable by authenticated" ON public.supervisor_representante FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gestores manage supervisor_representante" ON public.supervisor_representante FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

-- RLS for redes
ALTER TABLE public.redes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Redes viewable by authenticated" ON public.redes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gestores manage redes" ON public.redes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));
