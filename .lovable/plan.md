

## Diagnóstico: Página Novo Chamado não carrega

Após analisar o código, identifiquei o provável problema:

### Causa raiz

Na linha 27 de `NovoChamado.tsx`, a query para `submotivos` usa um cast `as any` desnecessário (a tabela já existe nos tipos). Isso pode causar um erro silencioso. Além disso, não há tratamento de erros (`try/catch`) no `useEffect` que busca dados do Supabase -- se a query falhar, pode causar um crash não tratado que impede a renderização da página.

### Correções necessárias

1. **Remover o cast `as any`** na query de submotivos (linha 27), já que a tabela `submotivos` está definida corretamente em `types.ts`

2. **Adicionar `try/catch`** no `useEffect` de busca de dados para capturar erros e evitar crash da página

3. **Adicionar `console.error`** para facilitar debugging caso ocorra algum erro na busca

### Mudança em `src/pages/NovoChamado.tsx`

```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      const [mRes, sRes] = await Promise.all([
        supabase.from('motivos').select('id, nome').order('nome'),
        supabase.from('submotivos').select('id, motivo_id, nome').order('nome'),
      ]);
      if (mRes.data) setMotivos(mRes.data);
      if (sRes.data) setSubmotivos(sRes.data);
    } catch (error) {
      console.error('Erro ao carregar motivos/submotivos:', error);
    }
  };
  fetchData();
}, []);
```

