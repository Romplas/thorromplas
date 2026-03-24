import { supabase } from '@/integrations/supabase/client';

// Helper to access tables that may have typing issues
const from = (table: string) => (supabase as any).from(table);

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

  const { id: _id, ...dadosChamado } = chamado as Record<string, unknown>;

  const { data: excluido, error: errExcluido } = await from('chamados_excluidos')
    .insert({
      id_original: chamadoId,
      dados: dadosChamado,
      deleted_by: deletedBy,
      motivo_exclusao: motivoExclusao || null,
    })
    .select('id')
    .single();

  if (errExcluido || !excluido) return;

  // Buscar TODO o histórico do chamado
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
    historico.push(...(chunk as Record<string, unknown>[]));
    hasMore = chunk.length === pageSize;
    offset += pageSize;
  }

  if (historico.length > 0) {
    await from('chamado_historico_excluido').insert(
      historico.map((h) => ({
        chamado_excluido_id: (excluido as any).id,
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
 */
export async function restaurarChamadoExcluido(chamadoExcluidoId: string): Promise<{ newId: number } | null> {
  const { data: excluido, error: errExcluido } = await from('chamados_excluidos')
    .select('*')
    .eq('id', chamadoExcluidoId)
    .single();

  if (errExcluido || !excluido) return null;

  const dados = (excluido as any).dados as Record<string, unknown>;
  const idOriginal = (excluido as any).id_original as number;

  const insertChamado = { ...dados };
  delete insertChamado.id;

  const { data: novoChamado, error: errInsert } = await supabase
    .from('chamados')
    .insert(insertChamado as any)
    .select('id')
    .single();

  if (errInsert || !novoChamado) return null;

  const novoId = (novoChamado as any).id as number;

  // Buscar TODO o histórico excluído e restaurar
  const historicoExcluido: Record<string, unknown>[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data: chunk } = await from('chamado_historico_excluido')
      .select('acao, descricao, descricao_ticket, created_at, user_id')
      .eq('chamado_excluido_id', chamadoExcluidoId)
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (!chunk || chunk.length === 0) break;
    historicoExcluido.push(...(chunk as Record<string, unknown>[]));
    hasMore = chunk.length === pageSize;
    offset += pageSize;
  }

  if (historicoExcluido.length > 0) {
    await supabase.from('chamado_historico').insert(
      historicoExcluido.map((h) => ({
        chamado_id: novoId,
        acao: h.acao as string,
        descricao: (h.descricao as string) ?? null,
        descricao_ticket: (h.descricao_ticket as string) ?? null,
        created_at: h.created_at as string,
        user_id: (h.user_id as string) ?? null,
      }))
    );
  }

  // Remover da tabela de excluídos
  await from('chamados_excluidos').delete().eq('id', chamadoExcluidoId);

  return { newId: novoId };
}

export type HistoricoEntradaRow = {
  id: string;
  chamado_id: number;
  acao: string;
  descricao: string | null;
  descricao_ticket: string | null;
  created_at: string;
  user_id: string | null;
};

/**
 * Registra exclusão de uma única linha de chamado_historico (etapa/grid), com justificativa.
 * O ticket permanece ativo.
 */
export async function backupHistoricoEntradaBeforeDelete(
  entrada: HistoricoEntradaRow,
  chamado: Record<string, unknown>,
  motivoExclusao: string,
  etapaEntradaLabel: string,
  etapaEntradaKey: string,
  statusEntradaLabel: string,
  statusEntradaKey: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  const deletedBy = user?.id ?? null;

  const chamadoSnapshot = {
    cliente_nome: chamado.cliente_nome,
    motivo: chamado.motivo,
    submotivo: chamado.submotivo,
    etapa: chamado.etapa,
    status: chamado.status,
    representante_id: chamado.representante_id,
    supervisor_id: chamado.supervisor_id,
    gestor_id: chamado.gestor_id,
    descricao: chamado.descricao,
  };

  const entradaSnapshot = {
    id: entrada.id,
    acao: entrada.acao,
    descricao: entrada.descricao,
    descricao_ticket: entrada.descricao_ticket,
    created_at: entrada.created_at,
    user_id: entrada.user_id,
  };

  const { error } = await from('historico_entrada_excluida').insert({
    chamado_id: entrada.chamado_id,
    historico_entrada_id: entrada.id,
    entrada: entradaSnapshot,
    chamado_snapshot: chamadoSnapshot,
    etapa_entrada_label: etapaEntradaLabel,
    etapa_entrada_key: etapaEntradaKey,
    status_entrada_label: statusEntradaLabel,
    status_entrada_key: statusEntradaKey,
    motivo_exclusao: motivoExclusao,
    deleted_by: deletedBy,
  });

  if (error) {
    console.error('[backupHistoricoEntradaBeforeDelete]', error);
    const msg =
      error.message ||
      (error as { details?: string }).details ||
      'Erro ao salvar registro da exclusão';
    return { ok: false, message: msg };
  }
  return { ok: true };
}
