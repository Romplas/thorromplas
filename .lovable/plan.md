

## Analysis

The deletion logic is already implemented in both Kanban and Historico pages, and it works correctly at the database level:
- The FK from `chamado_historico` to `chamados` has `ON DELETE CASCADE`, so deleting a chamado automatically deletes its history records.
- Both pages have realtime subscriptions (`event: '*'`) that call `fetchData()` on any change, including DELETE events.

**However, there are two issues to fix:**

### Issue 1: Storage attachments are not cleaned up
When a chamado is deleted, any files uploaded to the `chamado-anexos` bucket under the chamado's folder remain as orphaned files. The delete handler should also remove these files from storage.

### Issue 2: Redundant history deletion before cascade
Both `handleDelete` functions manually delete from `chamado_historico` before deleting the chamado. Since the FK is `ON DELETE CASCADE`, this is redundant but not harmful. We can keep it for safety or remove it.

### Issue 3: Dashboard might still show deleted chamados
Need to check if the Dashboard page also fetches chamados and would need realtime updates.

## Plan

### 1. Add storage cleanup to Kanban `handleDelete`
Before deleting the chamado, list and remove all files in the `chamado-anexos` bucket under the path `{chamadoId}/`.

### 2. Add storage cleanup to Historico `handleDeleteConfirm`
Same storage cleanup logic.

### 3. Verify Dashboard has realtime subscription
If Dashboard fetches chamados, ensure it also uses realtime to reflect deletions.

### Technical Details

In both `Kanban.tsx` and `Historico.tsx` delete handlers, add before the chamado deletion:

```typescript
// Clean up storage attachments
const { data: files } = await supabase.storage
  .from('chamado-anexos')
  .list(String(id));
if (files && files.length > 0) {
  const filePaths = files.map(f => `${id}/${f.name}`);
  await supabase.storage.from('chamado-anexos').remove(filePaths);
}
```

No database changes needed -- the cascade and realtime are already correctly configured. The core deletion + cross-screen sync already works via the realtime subscriptions. The main improvement is ensuring storage cleanup.

