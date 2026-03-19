import { supabase } from '@/integrations/supabase/client';

/**
 * Faz backup do chamado e seu histórico em chamados_excluidos antes da exclusão definitiva.
 * Permite ao Admin restaurar tickets excluídos posteriormente.
 */
export async function backupChamadoBeforeDelete(
  chamadoId: number,
  motivoExclusao?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const deletedBy = user?.id ?? null;

  // Buscar chamado completo
  const { data: chamado, error: errChamado } = await supabase
    .from('chamados')
    .select('*')
    .eq('id', chamadoId)
    .single();

  if (errChamado || !chamado) return;

  // Remover 'id' do objeto para inserir em chamados depois (novo id será gerado)
  const { id: _id, ...dadosChamado } = chamado as Record<string, unknown>;

  const { data: excluido, error: errExcluido } = await supabase
    .from('chamados_excluidos')
    .insert({
      id_original: chamadoId,
      dados: dadosChamado,
      deleted_by: deletedBy,
      motivo_exclusao: motivoExclusao || null,
    })
    .select('id')
    .single();

  if (errExcluido || !excluido) return;

  // Buscar TODO o histórico do chamado (sem limite, todas as edições por qualquer usuário)
  const historico: Record<string, unknown>[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data: chunk } = await supabase
      .from('chamado_historico')
      .select('acao, descricao, descricao_ticket, created_at, user_id')
      .eq('chamado_id', chamadoId)
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (!chunk || chunk.length === 0) break;
    historico.push(...chunk);
    hasMore = chunk.length === pageSize;
    offset += pageSize;
  }

  if (historico.length > 0) {
    await supabase.from('chamado_historico_excluido').insert(
      historico.map((h) => ({
        chamado_excluido_id: excluido.id,
        chamado_id_original: chamadoId,
        acao: h.acao,
        descricao: h.descricao ?? null,
        descricao_ticket: h.descricao_ticket ?? null,
        created_at: h.created_at,
        user_id: h.user_id ?? null,
      }))
    );
  }
}

/**
 * Restaura um chamado excluído de volta para o ambiente ativo.
 * O ticket volta para o representante/supervisor original (do usuário que excluiu).
 */
export async function restaurarChamadoExcluido(chamadoExcluidoId: string): Promise<{ newId: number } | null> {
  const { data: excluido, error: errExcluido } = await supabase
    .from('chamados_excluidos')
    .select('*')
    .eq('id', chamadoExcluidoId)
    .single();

  if (errExcluido || !excluido) return null;

  const dados = excluido.dados as Record<string, unknown>;
  const idOriginal = excluido.id_original as number;

  // Inserir chamado em chamados (novo id será gerado)
  const insertChamado = { ...dados };
  delete insertChamado.id;

  const { data: novoChamado, error: errInsert } = await supabase
    .from('chamados')
    .insert(insertChamado)
    .select('id')
    .single();

  if (errInsert || !novoChamado) return null;

  const novoId = novoChamado.id as number;

  // Buscar TODO o histórico excluído e restaurar sem perder nenhuma edição
  const historicoExcluido: Record<string, unknown>[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data: chunk } = await supabase
      .from('chamado_historico_excluido')
      .select('acao, descricao, descricao_ticket, created_at, user_id')
      .eq('chamado_excluido_id', chamadoExcluidoId)
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (!chunk || chunk.length === 0) break;
    historicoExcluido.push(...chunk);
    hasMore = chunk.length === pageSize;
    offset += pageSize;
  }

  if (historicoExcluido.length > 0) {
    await supabase.from('chamado_historico').insert(
      historicoExcluido.map((h) => ({
        chamado_id: novoId,
        acao: h.acao,
        descricao: h.descricao ?? null,
        descricao_ticket: h.descricao_ticket ?? null,
        created_at: h.created_at,
        user_id: h.user_id ?? null,
      }))
    );
  }

  // Remover da tabela de excluídos (cascade remove historico_excluido)
  await supabase.from('chamados_excluidos').delete().eq('id', chamadoExcluidoId);

  return { newId };
}
