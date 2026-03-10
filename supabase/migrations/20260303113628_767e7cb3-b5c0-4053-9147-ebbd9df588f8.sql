
-- Add missing motivos
INSERT INTO motivos (nome) VALUES
  ('Acompanhamento de pedidos'),
  ('Alteração de pedidos'),
  ('Atualizar Tabela'),
  ('Atualização'),
  ('Book'),
  ('Financeiro'),
  ('Laudo Técnico'),
  ('Produtos Exclusivos'),
  ('Sugestão do Cliente')
ON CONFLICT DO NOTHING;

-- Create submotivos (objetivos) table
CREATE TABLE public.submotivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  motivo_id uuid NOT NULL REFERENCES motivos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(motivo_id, nome)
);

ALTER TABLE public.submotivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Submotivos viewable by authenticated" ON public.submotivos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage submotivos" ON public.submotivos
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed submotivos
INSERT INTO submotivos (motivo_id, nome)
SELECT m.id, s.nome FROM motivos m, (VALUES ('Prazo de entrega'),('Prazo de Faturamento'),('Cancelamento de pedido'),('Carga Fechada'),('Container'),('Diversos')) AS s(nome) WHERE m.nome = 'Acompanhamento de pedidos';

INSERT INTO submotivos (motivo_id, nome)
SELECT m.id, s.nome FROM motivos m, (VALUES ('Incluir observação'),('Forma de pagamento'),('Alteração de Transportadora'),('Alteração da Data de Entrega'),('Alteração de Quantidades'),('Diversos')) AS s(nome) WHERE m.nome = 'Alteração de pedidos';

INSERT INTO submotivos (motivo_id, nome)
SELECT m.id, s.nome FROM motivos m, (VALUES ('Amostra Caixa'),('Amostra Metro'),('Kit Azul')) AS s(nome) WHERE m.nome = 'Amostras';

INSERT INTO submotivos (motivo_id, nome)
SELECT m.id, s.nome FROM motivos m, (VALUES ('Cadastro de Transportadora'),('Cadastro do Cliente')) AS s(nome) WHERE m.nome = 'Atualização';

INSERT INTO submotivos (motivo_id, nome)
SELECT m.id, s.nome FROM motivos m, (VALUES ('Atualização / Itens / Valores / Produtos')) AS s(nome) WHERE m.nome = 'Atualizar Tabela';

INSERT INTO submotivos (motivo_id, nome)
SELECT m.id, s.nome FROM motivos m, (VALUES ('Geral')) AS s(nome) WHERE m.nome = 'Book';

INSERT INTO submotivos (motivo_id, nome)
SELECT m.id, s.nome FROM motivos m, (VALUES ('Análise de Crédito'),('Enviar comprovante'),('Prorrogação de boleto'),('Data Base')) AS s(nome) WHERE m.nome = 'Financeiro';

INSERT INTO submotivos (motivo_id, nome)
SELECT m.id, s.nome FROM motivos m, (VALUES ('Cliente')) AS s(nome) WHERE m.nome = 'Laudo Técnico';

INSERT INTO submotivos (motivo_id, nome)
SELECT m.id, s.nome FROM motivos m, (VALUES ('Condição pontual (pedido único)'),('Condição de Continuidade (Redes)'),('Prazo')) AS s(nome) WHERE m.nome = 'Negociação';

INSERT INTO submotivos (motivo_id, nome)
SELECT m.id, s.nome FROM motivos m, (VALUES ('Carta de Correção'),('Conferir Espelho da NFE'),('NFE Devolução - RNC')) AS s(nome) WHERE m.nome = 'Notas Fiscais';

INSERT INTO submotivos (motivo_id, nome)
SELECT m.id, s.nome FROM motivos m, (VALUES ('Em estoque')) AS s(nome) WHERE m.nome = 'Produtos Exclusivos';

INSERT INTO submotivos (motivo_id, nome)
SELECT m.id, s.nome FROM motivos m, (VALUES ('Clientes')) AS s(nome) WHERE m.nome = 'Relatório de Pedidos Pendentes';

INSERT INTO submotivos (motivo_id, nome)
SELECT m.id, s.nome FROM motivos m, (VALUES ('Orientativa (Romplas)'),('Abatimento na duplicata, quanto?'),('Devolução Parcial'),('Devolução Total')) AS s(nome) WHERE m.nome = 'RNC';

INSERT INTO submotivos (motivo_id, nome)
SELECT m.id, s.nome FROM motivos m, (VALUES ('Solicitação por Cor e Produto')) AS s(nome) WHERE m.nome = 'SD (Solicitação de Desenvolvimento)';

INSERT INTO submotivos (motivo_id, nome)
SELECT m.id, s.nome FROM motivos m, (VALUES ('Lotes')) AS s(nome) WHERE m.nome = 'Solicitação de Pedidos';

INSERT INTO submotivos (motivo_id, nome)
SELECT m.id, s.nome FROM motivos m, (VALUES ('Acompanhamento de Pedidos - Saldos'),('Amostras - Diversas'),('RNC'),('Diversas'),('Oportunidades de Negócios - Clientes Ativos'),('Oportunidades de Negócios - Clientes Inativos'),('Negociação - Interna')) AS s(nome) WHERE m.nome = 'Solicitação Interna Romplas';

INSERT INTO submotivos (motivo_id, nome)
SELECT m.id, s.nome FROM motivos m, (VALUES ('Diversas')) AS s(nome) WHERE m.nome = 'Sugestão do Cliente';
