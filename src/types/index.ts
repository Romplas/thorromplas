export type UserRole = 'admin' | 'gestor' | 'supervisor' | 'representante';

export type TicketStatus = 'aberto' | 'em_progresso' | 'aguardando' | 'finalizado';

export interface User {
  id: string;
  nome: string;
  email: string;
  tipo: UserRole;
  supervisora?: string;
  status: 'ativo' | 'inativo';
}

export interface Ticket {
  id: number;
  representante: string;
  cliente: string;
  motivo: string;
  submotivo?: string;
  status: TicketStatus;
  prioridade: 'Alta' | 'Média' | 'Baixa';
  supervisor?: string;
  gestor?: string;
  etapa?: string;
  descricao?: string;
  data_criacao: string;
  data_atualizacao: string;
  atualizado_por: string;
}
