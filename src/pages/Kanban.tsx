import { useState, useEffect } from 'react';
import { Eye, CheckCircle, Clock, Trash2, GripVertical, Pencil } from 'lucide-react';
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
}

interface ProfileOption {
  id: string;
  nome: string;
  user_id: string;
}

const columns = [
  { key: 'thor', label: 'THOR', bg: 'bg-red-600', card: 'bg-red-50 border-red-200' },
  { key: 'aguardando_resposta', label: 'Aguardando Resposta', bg: 'bg-purple-600', card: 'bg-purple-50 border-purple-200' },
  { key: 'retorno_interno', label: 'Retorno Interno Romplas', bg: 'bg-blue-600', card: 'bg-blue-50 border-blue-200' },
  { key: 'negociacao', label: 'Em Negociação', bg: 'bg-yellow-500', card: 'bg-yellow-50 border-yellow-200' },
  { key: 'alteracao', label: 'Alteração', bg: 'bg-teal-500', card: 'bg-teal-50 border-teal-200' },
  { key: 'completo', label: 'Completo', bg: 'bg-green-500', card: 'bg-green-50 border-green-200' },
  { key: 'perdido', label: 'Perdido', bg: 'bg-black', card: 'bg-gray-100 border-gray-300' },
  { key: 'rnc', label: 'RNC', bg: 'bg-pink-500', card: 'bg-pink-50 border-pink-200' },
  { key: 'sdp', label: 'SDP', bg: 'bg-orange-500', card: 'bg-orange-50 border-orange-200' },
  { key: 'amostras', label: 'Amostras', bg: 'bg-blue-900', card: 'bg-blue-50 border-blue-300' },
  { key: 'book', label: 'Book', bg: 'bg-lime-500', card: 'bg-lime-50 border-lime-200' },
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

function FilterRow({ icon, label, value, onChange, children }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 flex-1 text-xs">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">{label}</SelectItem>
          {children}
        </SelectContent>
      </Select>
    </div>
  );
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
  const [filterMotivo, setFilterMotivo] = useState('todos');
  const [filterCliente, setFilterCliente] = useState('todos');
  const [filterTicketId, setFilterTicketId] = useState('todos');
  const [filterBook, setFilterBook] = useState('todos');
  const [filterGestor, setFilterGestor] = useState('todos');

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
    if (filterMotivo !== 'todos' && c.motivo !== filterMotivo) return false;
    if (filterCliente !== 'todos' && c.cliente_nome !== filterCliente) return false;
    if (filterTicketId !== 'todos' && String(c.id) !== filterTicketId) return false;
    if (filterBook !== 'todos' && getTicketColumn(c) !== 'book') return false;
    if (filterGestor !== 'todos' && c.gestor_id !== filterGestor) return false;
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

        <div className="flex gap-4">
          {/* Filters - Vertical sidebar */}
          <div className="flex flex-col gap-2 bg-card rounded-lg p-3 shadow-sm border w-[180px] flex-shrink-0 self-start">
            <FilterRow icon={<Pencil className="h-3.5 w-3.5 text-primary" />} label="Supervisor" value={filterSupervisor} onChange={setFilterSupervisor}>
              {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </FilterRow>
            <FilterRow icon={<Pencil className="h-3.5 w-3.5 text-primary" />} label="Representantes" value={filterRepresentante} onChange={setFilterRepresentante}>
              {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </FilterRow>
            <FilterRow icon={<Pencil className="h-3.5 w-3.5 text-primary" />} label="Motivo" value={filterMotivo} onChange={setFilterMotivo}>
              {motivos.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </FilterRow>
            <FilterRow icon={<Pencil className="h-3.5 w-3.5 text-primary" />} label="Clientes" value={filterCliente} onChange={setFilterCliente}>
              {clientes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </FilterRow>
            <FilterRow icon={<Pencil className="h-3.5 w-3.5 text-primary" />} label="TicketID" value={filterTicketId} onChange={setFilterTicketId}>
              {chamados.map((c) => <SelectItem key={c.id} value={String(c.id)}>{String(c.id)}</SelectItem>)}
            </FilterRow>
            <FilterRow icon={<Pencil className="h-3.5 w-3.5 text-primary" />} label="Book" value={filterBook} onChange={setFilterBook}>
              <SelectItem value="book">Sim</SelectItem>
            </FilterRow>
            <FilterRow icon={<Pencil className="h-3.5 w-3.5 text-primary" />} label="Gestores" value={filterGestor} onChange={setFilterGestor}>
              {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </FilterRow>
          </div>

          {/* Kanban Board - Horizontal scroll */}
          {loading ? (
            <div className="flex-1 text-center py-12 text-muted-foreground">Carregando chamados...</div>
          ) : (
            <div className="flex-1 overflow-x-auto pb-4">
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
                          className={`${col.card} border rounded-lg p-2.5 space-y-1 cursor-grab active:cursor-grabbing transition-opacity ${draggedId === ticket.id ? 'opacity-40' : 'opacity-100'}`}
                        >
                          <div className="flex items-center gap-1">
                            <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <p className="font-bold text-xs">#{ticket.id}</p>
                          </div>
                          <p className="text-[10px]">
                            <span className="font-medium">Rep:</span> {ticket.representante_nome}
                          </p>
                          <p className="text-[10px]">
                            <span className="font-medium">Cliente:</span> {ticket.cliente_nome}
                          </p>
                          <p className="text-[10px]">
                            <span className="font-medium">Motivo:</span> {ticket.motivo}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            {formatDate(ticket.updated_at)}
                          </p>
                          <div className="flex items-center gap-1.5 pt-1 border-t border-black/10">
                            <button className="flex items-center gap-0.5 text-[9px] font-medium hover:opacity-70">
                              <Eye className="h-2.5 w-2.5" /> Exibir
                            </button>
                            <button className="flex items-center gap-0.5 text-[9px] font-medium hover:opacity-70">
                              <CheckCircle className="h-2.5 w-2.5" /> Validar
                            </button>
                            <button className="flex items-center gap-0.5 text-[9px] font-medium hover:opacity-70">
                              <Clock className="h-2.5 w-2.5" /> Histórico
                            </button>
                            {(role === 'admin' || role === 'gestor') && (
                              <button
                                className="ml-auto text-[9px] hover:opacity-70"
                                onClick={() => handleDelete(ticket.id)}
                              >
                                <Trash2 className="h-2.5 w-2.5" />
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
      </div>
    </Layout>
  );
}
