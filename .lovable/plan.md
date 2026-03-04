

## Diagnóstico

Identifiquei **3 problemas** que impedem o histórico de funcionar:

### Problema 1: Case mismatch na etapa
A tabela `etapas` armazena `nome` em **lowercase** (`thor`, `aguardando_resposta`), mas o modal define o valor padrão como `'THOR'` (uppercase). Isso causa:
- O Select de "Etapa Ticket" não mostra o valor selecionado
- A comparação de mudanças falha (compara `'THOR'` com `'thor'`)

### Problema 2: RLS bloqueando insert no histórico
A tabela `chamado_historico` está **vazia** — nenhum registro foi gravado. A política de INSERT só permite `admin` ou o próprio usuário. Usuários com role `gestor` ou `supervisor` são bloqueados silenciosamente.

### Problema 3: Não há registro de criação do ticket
Quando um chamado é criado na tela de Novo Chamado, nenhuma entrada inicial é inserida no histórico.

---

## Plano de Correção

### 1. Migração SQL — Corrigir RLS do chamado_historico
- Dropar a política de INSERT existente
- Criar nova política permitindo insert para qualquer usuário autenticado (gestor, supervisor, representante, admin)

### 2. EditChamadoModal — Corrigir case da etapa
- Linha 106: trocar `'THOR'` por `'thor'` no valor padrão
- Linha 288: remover `.toLowerCase()` na comparação (já será lowercase)
- Adicionar log de erro no insert do histórico para diagnóstico

### 3. NovoChamado — Registrar criação no histórico
- Após criar o chamado com sucesso, inserir um registro `"Ticket Criado"` na tabela `chamado_historico` com os dados iniciais (status, etapa, cliente, motivo)

### 4. Kanban drag-drop — Já funciona
O código de drag-drop já insere histórico, só precisa da correção de RLS para funcionar.

