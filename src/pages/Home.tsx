import { useState } from 'react';
import { Eye, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { mockTickets } from '@/data/mockData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';

const columns = [
  { key: 'thor', label: 'THOR', colorClass: 'kanban-column-thor', cardClass: 'ticket-card-red' },
  { key: 'aguardando', label: 'Aguardando Resposta', colorClass: 'kanban-column-aguardando', cardClass: 'ticket-card-blue' },
  { key: 'retorno', label: 'Retorno Interno Romplas', colorClass: 'kanban-column-retorno', cardClass: 'ticket-card-orange' },
  { key: 'completo', label: 'Completo', colorClass: 'kanban-column-completo', cardClass: 'ticket-card-green' },
];

const statusToColumn: Record<string, string> = {
  aberto: 'thor',
  em_progresso: 'aguardando',
  fechado: 'completo',
};

export default function Home() {
  const { profile } = useAuth();
  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-xl">
          Olá, <span className="text-primary font-semibold">{profile?.nome || 'Usuário'}</span>
        </h1>
        <p className="text-sm text-muted-foreground">Gerenciador de Chamados THOR</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 bg-card rounded-lg p-3 shadow-sm border">
        {['Supervisor', 'Representantes', 'Clientes', 'TicketID', 'Motivo'].map((filter) => (
          <div key={filter} className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">{filter}</span>
            <Select>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Localizar itens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map((col) => {
          const tickets = mockTickets.filter((t) => statusToColumn[t.status] === col.key);
          return (
            <div key={col.key} className="space-y-3">
              <div className={`${col.colorClass} text-white text-center py-2 rounded-lg font-semibold text-sm`}>
                {col.label} <span className="ml-1 bg-white/30 px-1.5 rounded-full text-xs">{tickets.length}</span>
              </div>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className={`${col.cardClass} rounded-lg p-3 space-y-1.5`}>
                    <p className="font-bold text-sm">TicketID: {ticket.id}</p>
                    <p className="text-xs"><span className="font-medium">Representante:</span> {ticket.representante}</p>
                    <p className="text-xs"><span className="font-medium">Cliente:</span> {ticket.cliente}</p>
                    <p className="text-xs"><span className="font-medium">Motivo:</span> {ticket.motivo}</p>
                    <p className="text-[10px] text-muted-foreground">Atualizado: {ticket.data_atualizacao}</p>
                    <div className="flex items-center gap-2 pt-1 border-t border-black/10">
                      <button className="flex items-center gap-1 text-[10px] font-medium hover:opacity-70">
                        <Eye className="h-3 w-3" /> Exibir
                      </button>
                      <button className="flex items-center gap-1 text-[10px] font-medium hover:opacity-70">
                        <CheckCircle className="h-3 w-3" /> Validar
                      </button>
                      <button className="flex items-center gap-1 text-[10px] font-medium hover:opacity-70">
                        <Clock className="h-3 w-3" /> Histórico
                      </button>
                      <button className="ml-auto text-[10px] hover:opacity-70">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
