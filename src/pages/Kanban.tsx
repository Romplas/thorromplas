import { useState, useEffect } from 'react';
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
  cliente_id: string | null;
  representante_nome?: string;
  gestor_nome?: string;
}

interface Supervisor { id: string; nome: string }
interface Representante { id: string; codigo: number; nome: string }
interface SupervisorRepresentante { supervisor_id: string; representante_id: string }
interface Cliente { id: string; nome: string; representante_id: string | null }
interface Motivo { id: string; nome: string }
interface ProfileOption { id: string; nome: string; user_id: string }

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

const statusToEtapa: Record<string, string> = {
  aberto: 'thor',
  em_progresso: 'aguardando_resposta',
  fechado: 'completo',
};

function getTicketColumn(c: ChamadoWithNames): string {
  if (c.etapa) return c.etapa.toLowerCase();
  return statusToEtapa[c.status] || 'thor';
}

export default function Kanban() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [chamados, setChamados] = useState<ChamadoWithNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Reference data
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [representantes, setRepresentantes] = useState<Representante[]>([]);
  const [srLinks, setSrLinks] = useState<SupervisorRepresentante[]>([]);
  const [allClientes, setAllClientes] = useState<Cliente[]>([]);
  const [motivos, setMotivos] = useState<Motivo[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);

  // Cascading filters
  const [filterSupervisor, setFilterSupervisor] = useState('todos');
  const [filterRepresentante, setFilterRepresentante] = useState('todos');
  const [filterCliente, setFilterCliente] = useState('todos');
  const [filterTicketId, setFilterTicketId] = useState('todos');
  const [filterMotivo, setFilterMotivo] = useState('todos');
  const [filterGestor, setFilterGestor] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');

  // Derived filtered lists for cascading
  const filteredRepresentantes = filterSupervisor !== 'todos'
    ? representantes.filter(r =>
        srLinks.some(sr => sr.supervisor_id === filterSupervisor && sr.representante_id === r.id)
      )
    : representantes;

  const filteredClientes = filterRepresentante !== 'todos'
    ? allClientes.filter(c => c.representante_id === filterRepresentante)
    : allClientes;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [chamadosRes, supRes, repRes, srRes, clientesRes, motivosRes, profilesRes, gestorRolesRes] = await Promise.all([
      supabase.from('chamados').select('*').order('updated_at', { ascending: false }),
      supabase.from('supervisores').select('id, nome').eq('status', 'ativo').order('nome'),
      supabase.from('representantes').select('id, codigo, nome').order('nome'),
      supabase.from('supervisor_representante').select('supervisor_id, representante_id'),
      supabase.from('clientes').select('id, nome, representante_id').order('nome').limit(1000),
      supabase.from('motivos').select('id, nome').order('nome'),
      supabase.from('profiles').select('id, nome, user_id, status').eq('status', 'ativo'),
      supabase.from('user_roles').select('user_id, role').eq('role', 'gestor'),
    ]);

    const profileMap = new Map<string, string>();
    const profileByUserIdMap = new Map<string, string>();
    if (profilesRes.data) {
      profilesRes.data.forEach((p) => {
        profileMap.set(p.id, p.nome);
        profileByUserIdMap.set(p.user_id, p.nome);
      });
    }

    // Filter profiles to only gestores
    const gestorUserIds = new Set((gestorRolesRes?.data || []).map((r: any) => r.user_id));
    const gestorProfiles = (profilesRes.data || []).filter((p: any) => gestorUserIds.has(p.user_id));
    setProfiles(gestorProfiles);

    // Also build a map from representantes table
    const repMap = new Map<string, string>();
    if (repRes.data) {
      repRes.data.forEach((r) => repMap.set(r.id, r.nome));
    }

    if (chamadosRes.data) {
      const mapped = chamadosRes.data.map((c) => ({
        ...c,
        representante_nome: c.representante_id
          ? profileMap.get(c.representante_id) || profileByUserIdMap.get(c.representante_id) || repMap.get(c.representante_id) || 'N/A'
          : 'N/A',
        gestor_nome: c.gestor_id ? profileMap.get(c.gestor_id) || profileByUserIdMap.get(c.gestor_id) || '' : '',
      }));
      setChamados(mapped);
    }

    if (supRes.data) setSupervisores(supRes.data);
    if (repRes.data) setRepresentantes(repRes.data);
    if (srRes.data) setSrLinks(srRes.data);
    if (clientesRes.data) setAllClientes(clientesRes.data as Cliente[]);
    if (motivosRes.data) setMotivos(motivosRes.data);
    setLoading(false);
  };

  // Cascading reset handlers
  const handleSupervisorChange = (value: string) => {
    setFilterSupervisor(value);
    setFilterRepresentante('todos');
    setFilterCliente('todos');
  };

  const handleRepresentanteChange = (value: string) => {
    setFilterRepresentante(value);
    setFilterCliente('todos');
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

  // Build a map: representante_id (from representantes table) -> list of supervisor_ids
  // chamados have supervisor_id & representante_id referencing profiles, but filter uses supervisores/representantes tables
  // We need to filter by cliente_nome matching clientes table
  const filteredChamados = chamados.filter((c) => {
    // Supervisor filter: find representante IDs linked to this supervisor, then find chamados whose cliente belongs to those representantes
    if (filterSupervisor !== 'todos') {
      const repIdsForSupervisor = srLinks
        .filter(sr => sr.supervisor_id === filterSupervisor)
        .map(sr => sr.representante_id);
      const clienteNamesForSupervisor = allClientes
        .filter(cl => cl.representante_id && repIdsForSupervisor.includes(cl.representante_id))
        .map(cl => cl.nome);
      if (!clienteNamesForSupervisor.includes(c.cliente_nome)) return false;
    }

    // Representante filter: find clientes linked to this representante
    if (filterRepresentante !== 'todos') {
      const clienteNamesForRep = allClientes
        .filter(cl => cl.representante_id === filterRepresentante)
        .map(cl => cl.nome);
      if (!clienteNamesForRep.includes(c.cliente_nome)) return false;
    }

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
            <Select value={filterSupervisor} onValueChange={handleSupervisorChange}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {supervisores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Representantes</span>
            <Select value={filterRepresentante} onValueChange={handleRepresentanteChange}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {filteredRepresentantes.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Clientes</span>
            <Select value={filterCliente} onValueChange={setFilterCliente}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {filteredClientes.filter((c) => c.nome).map((c) => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">TicketID</span>
            <Select value={filterTicketId} onValueChange={setFilterTicketId}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {chamados.map((c) => <SelectItem key={c.id} value={String(c.id)}>{String(c.id)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Motivo</span>
            <Select value={filterMotivo} onValueChange={setFilterMotivo}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {motivos.filter((m) => m.nome).map((m) => <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Gestores</span>
            <Select value={filterGestor} onValueChange={setFilterGestor}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Status Ticket</span>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aberto">Aberto</SelectItem>
                <SelectItem value="em_progresso">Em Progresso</SelectItem>
                <SelectItem value="fechado">Fechado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Kanban Board */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando chamados...</div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3" style={{ minWidth: `${columns.length * 280}px` }}>
              {columns.map((col) => {
                const tickets = filteredChamados.filter((c) => getTicketColumn(c) === col.key);
                const isOver = dragOverCol === col.key;
                return (
                  <div
                    key={col.key}
                    className={`flex-shrink-0 w-64 space-y-2 transition-all ${isOver ? 'ring-2 ring-primary/50 rounded-lg' : ''}`}
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
