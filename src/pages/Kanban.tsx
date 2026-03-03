import { useState, useEffect, useRef } from 'react';
import { Pencil, Clock, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChamadoWithNames {
  id: number;
  cliente_nome: string;
  motivo: string;
  status: string;
  etapa: string | null;
  updated_at: string;
  representante_id: string | null;
  supervisor_id: string | null;
  gestor_id: string | null;
  representante_nome?: string;
  gestor_nome?: string;
}

interface ProfileOption {
  id: string;
  nome: string;
  user_id: string;
}

const columns = [
  { key: 'thor', label: 'THOR', bg: 'bg-red-600', cardBg: 'bg-red-600' },
  { key: 'aguardando_resposta', label: 'Aguardando Resposta', bg: 'bg-purple-600', cardBg: 'bg-purple-600' },
  { key: 'retorno_interno', label: 'Retorno Interno Romplas', bg: 'bg-blue-600', cardBg: 'bg-blue-600' },
  { key: 'negociacao', label: 'Em Negociação', bg: 'bg-yellow-500', cardBg: 'bg-yellow-500' },
  { key: 'alteracao', label: 'Alteração', bg: 'bg-teal-500', cardBg: 'bg-teal-500' },
  { key: 'completo', label: 'Completo', bg: 'bg-green-500', cardBg: 'bg-green-500' },
  { key: 'perdido', label: 'Perdido', bg: 'bg-black', cardBg: 'bg-gray-800' },
  { key: 'rnc', label: 'RNC', bg: 'bg-pink-500', cardBg: 'bg-pink-500' },
  { key: 'sdp', label: 'SDP', bg: 'bg-orange-500', cardBg: 'bg-orange-500' },
  { key: 'amostras', label: 'Amostras', bg: 'bg-blue-900', cardBg: 'bg-blue-900' },
  { key: 'book', label: 'Book', bg: 'bg-lime-500', cardBg: 'bg-lime-500' },
];

// Tickets without etapa use status to determine initial column
const statusToEtapa: Record<string, string> = {
  aberto: 'thor',
  em_progresso: 'aguardando_resposta',
  aguardando: 'retorno_interno',
  finalizado: 'completo',
};

function getTicketColumn(c: ChamadoWithNames): string {
  if (c.etapa) return c.etapa;
  return statusToEtapa[c.status] || 'thor';
}

export default function Kanban() {
  const { profile, role } = useAuth();
  const { toast } = useToast();
  const [chamados, setChamados] = useState<ChamadoWithNames[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [motivos, setMotivos] = useState<string[]>([]);
  const [clientes, setClientes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Filters
  const [filterSupervisor, setFilterSupervisor] = useState('todos');
  const [filterRepresentante, setFilterRepresentante] = useState('todos');
  const [filterCliente, setFilterCliente] = useState('todos');
  const [filterTicketId, setFilterTicketId] = useState('todos');
  const [filterMotivo, setFilterMotivo] = useState('todos');
  const [filterGestor, setFilterGestor] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [chamadosRes, profilesRes, motivosRes, clientesRes] = await Promise.all([
      supabase.from('chamados').select('*').order('updated_at', { ascending: false }),
      supabase.from('profiles').select('id, nome, user_id'),
      supabase.from('motivos').select('nome'),
      supabase.from('clientes').select('nome'),
    ]);

    const profileMap = new Map<string, string>();
    if (profilesRes.data) {
      profilesRes.data.forEach((p) => profileMap.set(p.id, p.nome));
      setProfiles(profilesRes.data);
    }

    if (chamadosRes.data) {
      const mapped = chamadosRes.data.map((c) => ({
        ...c,
        representante_nome: c.representante_id ? profileMap.get(c.representante_id) || 'Desconhecido' : 'N/A',
        gestor_nome: c.gestor_id ? profileMap.get(c.gestor_id) || 'Desconhecido' : '',
      }));
      setChamados(mapped);
    }

    if (motivosRes.data) setMotivos(motivosRes.data.map((m) => m.nome));
    if (clientesRes.data) setClientes(clientesRes.data.map((c) => c.nome));
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from('chamados').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir chamado', variant: 'destructive' });
    } else {
      setChamados((prev) => prev.filter((c) => c.id !== id));
      toast({ title: 'Chamado excluído' });
    }
  };

  const handleDragStart = (e: React.DragEvent, ticketId: number) => {
    setDraggedId(ticketId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(ticketId));
  };

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colKey);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    setDragOverCol(null);
    if (draggedId === null) return;

    const ticket = chamados.find((c) => c.id === draggedId);
    if (!ticket) return;

    const currentCol = getTicketColumn(ticket);
    if (currentCol === colKey) {
      setDraggedId(null);
      return;
    }

    // Optimistic update
    setChamados((prev) =>
      prev.map((c) => (c.id === draggedId ? { ...c, etapa: colKey } : c))
    );
    setDraggedId(null);

    const { error } = await supabase
      .from('chamados')
      .update({ etapa: colKey })
      .eq('id', draggedId);

    if (error) {
      toast({ title: 'Erro ao mover chamado', variant: 'destructive' });
      // Revert
      setChamados((prev) =>
        prev.map((c) => (c.id === ticket.id ? { ...c, etapa: ticket.etapa } : c))
      );
    } else {
      toast({ title: `Chamado movido para ${columns.find((c) => c.key === colKey)?.label}` });
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverCol(null);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredChamados = chamados.filter((c) => {
    if (filterSupervisor !== 'todos' && c.supervisor_id !== filterSupervisor) return false;
    if (filterRepresentante !== 'todos' && c.representante_id !== filterRepresentante) return false;
    if (filterCliente !== 'todos' && c.cliente_nome !== filterCliente) return false;
    if (filterTicketId !== 'todos' && String(c.id) !== filterTicketId) return false;
    if (filterMotivo !== 'todos' && c.motivo !== filterMotivo) return false;
    if (filterGestor !== 'todos' && c.gestor_id !== filterGestor) return false;
    if (filterStatus !== 'todos' && c.status !== filterStatus) return false;
    return true;
  });

  const roleLabel = role === 'admin' ? 'Administrador' : role === 'gestor' ? 'Gestor' : role === 'supervisor' ? 'Supervisor' : 'Representante';

  return (
    <Layout>
      <div className="p-4">
        <div className="mb-4">
          <h1 className="text-xl">
            Olá, <span className="text-primary font-semibold">{roleLabel}</span>
          </h1>
          <p className="text-sm text-muted-foreground">Gerenciador de Chamados THOR</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4 bg-card rounded-lg p-3 shadow-sm border">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Supervisor</span>
            <Select value={filterSupervisor} onValueChange={setFilterSupervisor}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Representantes</span>
            <Select value={filterRepresentante} onValueChange={setFilterRepresentante}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Clientes</span>
            <Select value={filterCliente} onValueChange={setFilterCliente}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {clientes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">TicketID</span>
            <Select value={filterTicketId} onValueChange={setFilterTicketId}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {chamados.map((c) => <SelectItem key={c.id} value={String(c.id)}>{String(c.id)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Motivo</span>
            <Select value={filterMotivo} onValueChange={setFilterMotivo}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {motivos.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Gestores</span>
            <Select value={filterGestor} onValueChange={setFilterGestor}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Status Ticket</span>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aberto">Aberto</SelectItem>
                <SelectItem value="em_progresso">Em Progresso</SelectItem>
                <SelectItem value="aguardando">Aguardando</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Kanban Board - Horizontal scroll */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando chamados...</div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3" style={{ minWidth: `${columns.length * 220}px` }}>
              {columns.map((col) => {
                const tickets = filteredChamados.filter((c) => getTicketColumn(c) === col.key);
                const isOver = dragOverCol === col.key;
                return (
                  <div
                    key={col.key}
                    className={`flex-shrink-0 w-52 space-y-2 transition-all ${isOver ? 'ring-2 ring-primary/50 rounded-lg' : ''}`}
                    onDragOver={(e) => handleDragOver(e, col.key)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col.key)}
                  >
                    <div className={`${col.bg} text-white text-center py-2 rounded-lg font-semibold text-xs`}>
                      {col.label}{' '}
                      <span className="ml-1 bg-white/30 px-1.5 rounded-full text-[10px]">{tickets.length}</span>
                    </div>
                    <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                      {tickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, ticket.id)}
                          onDragEnd={handleDragEnd}
                          className={`rounded-xl overflow-hidden shadow-md cursor-grab active:cursor-grabbing transition-opacity ${draggedId === ticket.id ? 'opacity-40' : 'opacity-100'}`}
                        >
                          {/* Card body - colored */}
                          <div className={`${col.cardBg} text-white px-3 py-3 space-y-1.5`}>
                            <p className="text-[11px] font-bold text-center">TicketID : {ticket.id}</p>
                            <p className="text-[10px] text-center">
                              <span className="font-semibold">Representante :</span> {ticket.representante_nome}
                            </p>
                            <p className="text-[10px] text-center mt-2">
                              <span className="font-semibold">Cliente :</span> {ticket.cliente_nome}
                            </p>
                            <p className="text-[10px] text-center mt-1">
                              <span className="font-semibold">Motivo :</span> {ticket.motivo}
                            </p>
                            <p className="text-[10px] text-center mt-2">
                              <span className="font-semibold">Etapa :</span> {col.label}
                            </p>
                            <p className="text-[10px] text-center">
                              <span className="font-semibold">Gestor :</span> {ticket.gestor_nome || ''}
                            </p>
                            <p className="text-[10px] text-center mt-2 font-semibold">
                              Atualizado : {formatDate(ticket.updated_at)}
                            </p>
                          </div>
                          {/* Card footer - dark */}
                          <div className="bg-gray-900 flex items-center justify-center gap-4 py-2">
                            <button className="text-white hover:text-gray-300 transition-colors" title="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button className="text-white hover:text-gray-300 transition-colors" title="Histórico">
                              <Clock className="h-3.5 w-3.5" />
                            </button>
                            {(role === 'admin' || role === 'gestor') && (
                              <button
                                className="text-white hover:text-red-400 transition-colors"
                                title="Excluir"
                                onClick={() => handleDelete(ticket.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {tickets.length === 0 && (
                        <p className="text-[10px] text-center text-muted-foreground py-4">Nenhum chamado</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
