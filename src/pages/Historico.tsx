import { useState } from 'react';
import { Eye, Trash2, Pencil } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { mockTickets } from '@/data/mockData';
import { Ticket } from '@/types';
import Layout from '@/components/Layout';

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_progresso: 'Em Progresso',
  fechado: 'Fechado',
};

export default function Historico() {
  const [selected, setSelected] = useState<Ticket | null>(null);

  return (
    <Layout>
      <h1 className="text-xl font-bold text-center mb-6">Histórico de Solicitações</h1>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {['Supervisor', 'TicketID', 'Clientes', '* Motivo', 'SubMotivos'].map((f) => (
          <div key={f}>
            <span className="text-xs text-muted-foreground">{f}</span>
            <Select>
              <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todos</SelectItem></SelectContent>
            </Select>
          </div>
        ))}
        <div>
          <span className="text-xs text-muted-foreground">Data Inicial</span>
          <Input type="date" className="h-8 text-xs mt-0.5" />
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Data Final</span>
          <Input type="date" className="h-8 text-xs mt-0.5" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Ticket List */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {mockTickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`border-l-4 rounded-lg p-4 cursor-pointer transition-colors ${
                ticket.status === 'aberto' ? 'border-l-red-500' :
                ticket.status === 'em_progresso' ? 'border-l-blue-500' :
                'border-l-green-500'
              } ${selected?.id === ticket.id ? 'bg-primary/5 border' : 'bg-card border'}`}
              onClick={() => setSelected(ticket)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-sm text-primary">TicketID : {ticket.id}</p>
                  <p className="text-xs text-muted-foreground">Status Supervisor: {ticket.supervisor || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">Modificado em: {ticket.data_atualizacao}</p>
                  <p className="text-xs text-muted-foreground">TicketID Criado em: {ticket.data_criacao}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Status Agendamento:</p>
                  <p className="text-xs font-semibold">Status: {statusLabels[ticket.status]}</p>
                  <div className="flex items-center gap-1 mt-2 justify-end">
                    <button className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    <button className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Atualizado por: {ticket.atualizado_por}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail Panel */}
        <div className="bg-card border rounded-lg p-6 flex items-center justify-center min-h-[300px]">
          {selected ? (
            <div className="w-full space-y-3">
              <h3 className="font-bold text-lg">Ticket #{selected.id}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="font-medium">Cliente:</span> {selected.cliente}</div>
                <div><span className="font-medium">Representante:</span> {selected.representante}</div>
                <div><span className="font-medium">Motivo:</span> {selected.motivo}</div>
                <div><span className="font-medium">Status:</span> {statusLabels[selected.status]}</div>
                <div><span className="font-medium">Prioridade:</span> {selected.prioridade}</div>
                <div><span className="font-medium">Criado:</span> {selected.data_criacao}</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Selecione um ticket para ver os detalhes</p>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Todos os Chamados</h3>
          <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            📄 Exportar PDF
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">ID</th>
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium">Representante</th>
                <th className="text-left p-3 font-medium">Supervisor</th>
                <th className="text-left p-3 font-medium">Motivo</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Prioridade</th>
              </tr>
            </thead>
            <tbody>
              {mockTickets.map((t) => (
                <tr key={t.id} className="border-b hover:bg-muted/30">
                  <td className="p-3">{t.id}</td>
                  <td className="p-3 text-primary font-medium">{t.cliente}</td>
                  <td className="p-3 text-primary">{t.representante}</td>
                  <td className="p-3">{t.supervisor || '-'}</td>
                  <td className="p-3">{t.motivo}</td>
                  <td className="p-3">
                    <span className={`status-badge ${t.status === 'aberto' ? 'status-open' : t.status === 'em_progresso' ? 'status-progress' : 'status-done'}`}>
                      {statusLabels[t.status]}
                    </span>
                  </td>
                  <td className="p-3">{t.prioridade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
