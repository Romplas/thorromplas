import { User, Ticket } from '@/types';

export const mockUsers: User[] = [
  { id: '1', nome: 'Administrador Romplas', email: 'admin@romplas.com.br', usuario: 'admin', telefone: '419853008469', tipo: 'admin', status: 'ativo' },
  { id: '2', nome: 'Gestor', email: 'gestor@gmail.com', usuario: 'gestor', telefone: '', tipo: 'gestor', status: 'ativo' },
  { id: '3', nome: 'Representante', email: 'representante@gmail.com', usuario: 'representante', telefone: '', tipo: 'representante', status: 'ativo' },
  { id: '4', nome: 'Supervisor', email: 'supervisor@gmail.com', usuario: 'supervisor', telefone: '', tipo: 'supervisor', supervisora: 'Supervisora', status: 'ativo' },
];

export const mockTickets: Ticket[] = [
  { id: 99, representante: 'Administrador', cliente: 'MOVEIS PREMIUM SA', motivo: 'Notas Fiscais', status: 'aberto', prioridade: 'Alta', data_criacao: '02/03/2026 08:00', data_atualizacao: '02/03/2026 15:53', atualizado_por: 'Administrador' },
  { id: 98, representante: 'Representante', cliente: 'COLCHARIA NACIONAL', motivo: 'Amostras', status: 'aberto', prioridade: 'Média', supervisor: 'Supervisor', data_criacao: '02/03/2026 07:15', data_atualizacao: '02/03/2026 15:53', atualizado_por: 'Representante' },
  { id: 96, representante: 'Representante', cliente: 'INDUSTRIA DE ESPUMAS BRASIL', motivo: 'Negociação', status: 'em_progresso', prioridade: 'Alta', supervisor: 'Supervisor', data_criacao: '02/03/2026 06:30', data_atualizacao: '02/03/2026 15:53', atualizado_por: 'Representante' },
  { id: 95, representante: 'Administrador', cliente: 'COMERCIO MEGA COLCHOES', motivo: 'Negociação', status: 'aguardando', prioridade: 'Média', data_criacao: '02/03/2026 05:00', data_atualizacao: '02/03/2026 15:53', atualizado_por: 'Administrador' },
  { id: 94, representante: 'Administrador', cliente: 'COLCHOES STAR LTDA', motivo: 'RNC', status: 'aberto', prioridade: 'Alta', data_criacao: '01/03/2026 14:00', data_atualizacao: '01/03/2026 14:00', atualizado_por: 'Administrador' },
  { id: 90, representante: 'Administrador', cliente: 'REI DAS ESPUMAS COMERCIO DE PLASTIC...', motivo: 'Solicitação de Pedidos', status: 'em_progresso', prioridade: 'Média', data_criacao: '26/02/2026 13:47', data_atualizacao: '26/02/2026 13:47', atualizado_por: 'Administrador' },
  { id: 85, representante: 'Representante', cliente: 'ATACADO DE ESPUMAS NORDESTE', motivo: 'Solicitação de Pedidos', status: 'finalizado', prioridade: 'Baixa', data_criacao: '26/02/2026 13:47', data_atualizacao: '26/02/2026 13:47', atualizado_por: 'Representante' },
  { id: 84, representante: 'Representante', cliente: 'COMERCIO MEGA COLCHOES', motivo: 'Solicitação Interna Romplas', status: 'aguardando', prioridade: 'Média', data_criacao: '26/02/2026 13:47', data_atualizacao: '26/02/2026 13:47', atualizado_por: 'Representante' },
];

export const motivoOptions = [
  'Notas Fiscais', 'Amostras', 'Negociação', 'RNC', 'Solicitação de Pedidos',
  'Solicitação Interna Romplas', 'Relatório de Pedidos Pendentes', 'SD (Solicitação de Desenvolvimento)',
];

export const clienteOptions = [
  'MOVEIS PREMIUM SA', 'COLCHARIA NACIONAL', 'INDUSTRIA DE ESPUMAS BRASIL',
  'COMERCIO MEGA COLCHOES', 'COLCHOES STAR LTDA', 'ZANOMAD MOVEIS LTDA',
  'REI DAS ESPUMAS COMERCIO DE PLASTICOS', 'ATACADO DE ESPUMAS NORDESTE',
];
