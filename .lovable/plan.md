
## Plano: Remover filtro "Status Ticket" do Kanban

### O que será feito
Remover o dropdown de filtro **"Status Ticket"** da barra de filtros na tela Kanban (linhas 335-346) e o estado/lógica associada.

### Alterações técnicas

**`src/pages/Kanban.tsx`:**
1. Remover o estado `filterStatus` (linha 79)
2. Remover o bloco JSX do filtro "Status Ticket" (linhas 335-346)
3. Remover a condição de filtro por status na função `filteredChamados` (linha 257)
