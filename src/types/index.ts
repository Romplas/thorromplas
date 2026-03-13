export type UserRole = 'admin' | 'gestor' | 'supervisor' | 'representante';

export type TicketStatus = 'pendente' | 'aberto' | 'em_progresso' | 'fechado';

export interface User {
  id: string;
  nome: string;
  email: string;
  usuario?: string;
  senha?: string;
  telefone?: string;
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
