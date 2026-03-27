

## Plano: Webhook n8n ao salvar ticket (supervisor/gestor/admin)

### Objetivo
Ao clicar em "Salvar" em um ticket, se o usuário for supervisor, gestor ou admin, acionar o webhook do n8n para enviar email ao representante vinculado.

### Arquivos a criar

**1. Edge Function `supabase/functions/notify-n8n-webhook/index.ts`**
- Recebe `{ chamado_id }` no body
- Valida JWT via `getClaims()`
- Verifica se o usuário tem role `admin`, `gestor` ou `supervisor` — se não, retorna sem acionar
- Busca dados do chamado (id, cliente_nome, motivo, status, etapa, descricao, negociado_com, representante_id)
- Busca o nome do representante via tabela `representantes`
- Busca o email do representante cruzando `representantes.nome` com `profiles.nome` (campo `email`)
- Faz POST para `https://automacoes-n8n.2qfd43.easypanel.host/webhook/8f187f65-ce32-4af9-9d25-1c8e0a3a4da3` com os dados do ticket + email/nome do representante
- Retorna sucesso/erro com CORS headers

**2. Criar `src/lib/n8nWebhook.ts`**
- Função `notifyN8nWebhook(chamadoId: number)` que invoca a edge function via `supabase.functions.invoke('notify-n8n-webhook', ...)`
- Erros tratados silenciosamente (console.warn)

### Arquivos a modificar

**3. Adicionar chamada `notifyN8nWebhook` nos pontos de save:**
- `src/components/kanban/EditChamadoModal.tsx` (linha ~407, junto ao `notifyChamadoPush`)
- `src/components/chamado/ChamadoCard.tsx` (linha ~285, junto ao `notifyChamadoPush`)
- `src/pages/Kanban.tsx` (linha ~527, drag & drop de status)

A verificação de role é feita server-side na edge function — o frontend chama em todos os casos e a função decide se aciona ou não o webhook.

### Payload enviado ao n8n
```json
{
  "chamado_id": 123,
  "cliente_nome": "...",
  "motivo": "...",
  "status": "...",
  "etapa": "...",
  "descricao": "...",
  "negociado_com": "...",
  "representante_nome": "...",
  "representante_email": "rep@email.com",
  "updated_at": "2026-03-27T..."
}
```

### Observações
- Nenhuma mudança no banco de dados necessária
- A URL do webhook fica hardcoded na edge function (não precisa de secret pois é endpoint público do n8n)
- Se o chamado não tiver representante vinculado, a função retorna sem acionar o webhook

