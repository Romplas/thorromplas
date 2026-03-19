/**
 * Evento customizado para sincronizar atualizações de tickets em toda a aplicação.
 * Quando um ticket é editado e salvo (em Novo Chamado ou Histórico de Atendimento),
 * este evento é disparado para que todas as telas que exibem o ticket recarreguem os dados.
 */
const CHAMADO_UPDATED_EVENT = 'thorromplas:chamado-updated';

export interface ChamadoUpdatedEventDetail {
  chamadoId: number;
}

/**
 * Notifica que um ticket foi atualizado. Todas as telas que exibem tickets
 * devem escutar este evento e recarregar seus dados.
 */
export function notifyChamadoUpdated(chamadoId: number): void {
  window.dispatchEvent(
    new CustomEvent<ChamadoUpdatedEventDetail>(CHAMADO_UPDATED_EVENT, {
      detail: { chamadoId },
    })
  );
}

/**
 * Registra um listener para quando qualquer ticket for atualizado.
 * Retorna uma função para remover o listener.
 */
export function onChamadoUpdated(
  callback: (detail: ChamadoUpdatedEventDetail) => void
): () => void {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<ChamadoUpdatedEventDetail>;
    if (customEvent.detail?.chamadoId) {
      callback(customEvent.detail);
    }
  };
  window.addEventListener(CHAMADO_UPDATED_EVENT, handler);
  return () => window.removeEventListener(CHAMADO_UPDATED_EVENT, handler);
}
