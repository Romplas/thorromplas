import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Clock, Trash2, FilterX } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EditChamadoModal from '@/components/kanban/EditChamadoModal';
import DeleteConfirmDialog from '@/components/kanban/DeleteConfirmDialog';

interface ChamadoWithNames {
  id: number;
  cliente_nome: string;
  motivo: string;
  submotivo: string | null;
  status: string;
  etapa: string | null;
  descricao: string | null;
  created_at: string;
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
  const { role, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [chamados, setChamados] = useState<ChamadoWithNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilterApplied, setRoleFilterApplied] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Edit modal state
  const [editTicket, setEditTicket] = useState<ChamadoWithNames | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Delete confirmation state
  const [deleteTicketId, setDeleteTicketId] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Profile map for name resolution in modal
  const [profileMap, setProfileMap] = useState<Map<string, string>>(new Map());

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

  const handleClearFilters = () => {
    if (!isRestricted) setFilterSupervisor('todos');
    if (role !== 'representante') setFilterRepresentante('todos');
    setFilterCliente('todos');
    setFilterTicketId('todos');
    setFilterMotivo('todos');
    setFilterGestor('todos');
  };

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

    // Realtime subscription for chamados
    const channel = supabase
      .channel('kanban-chamados')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chamados' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

    const pMap = new Map<string, string>();
    const profileByUserIdMap = new Map<string, string>();
    if (profilesRes.data) {
      profilesRes.data.forEach((p) => {
        pMap.set(p.id, p.nome);
        profileByUserIdMap.set(p.user_id, p.nome);
      });
    }
    setProfileMap(pMap);

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
          ? pMap.get(c.representante_id) || profileByUserIdMap.get(c.representante_id) || repMap.get(c.representante_id) || 'N/A'
          : 'N/A',
        gestor_nome: c.gestor_id ? pMap.get(c.gestor_id) || profileByUserIdMap.get(c.gestor_id) || '' : '',
      }));
      setChamados(mapped);
    }

    if (supRes.data) setSupervisores(supRes.data);
    if (repRes.data) setRepresentantes(repRes.data);
    if (srRes.data) setSrLinks(srRes.data);
    if (clientesRes.data) setAllClientes(clientesRes.data as Cliente[]);
    if (motivosRes.data) setMotivos(motivosRes.data);

    // Auto-set filters based on role
    if (!roleFilterApplied && profile) {
      if (role === 'supervisor' && supRes.data) {
        const mySupervisor = supRes.data.find(s => s.nome.toLowerCase() === profile.nome.toLowerCase());
        if (mySupervisor) {
          setFilterSupervisor(mySupervisor.id);
          setRoleFilterApplied(true);
        }
      } else if (role === 'representante' && repRes.data) {
        const myRep = repRes.data.find(r => r.nome.toLowerCase() === profile.nome.toLowerCase());
        if (myRep) {
          // Find supervisor linked to this representante
          const link = (srRes.data || []).find(sr => sr.representante_id === myRep.id);
          if (link) setFilterSupervisor(link.supervisor_id);
          setFilterRepresentante(myRep.id);
          setRoleFilterApplied(true);
        }
      }
    }

    setLoading(false);
  };

  // Cascading reset handlers
  const handleSupervisorChange = (value: string) => {
    setFilterSupervisor(value);
    setFilterRepresentante('todos');
    setFilterCliente('todos');
    setFilterTicketId('todos');
    setFilterMotivo('todos');
  };

  const handleRepresentanteChange = (value: string) => {
    setFilterRepresentante(value);
    setFilterCliente('todos');
    setFilterTicketId('todos');
    setFilterMotivo('todos');
  };

  const handleDelete = async (id: number, motivo: string) => {
    try {
      // Log before deleting
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      let userProfileId: string | null = null;
      if (currentUser) {
        const { data: prof } = await supabase.from('profiles').select('id').eq('user_id', currentUser.id).maybeSingle();
        userProfileId = prof?.id || null;
      }

      // Clean up storage attachments
      const { data: files } = await supabase.storage.from('chamado-anexos').list(String(id));
      if (files && files.length > 0) {
        await supabase.storage.from('chamado-anexos').remove(files.map(f => `${id}/${f.name}`));
      }

      // Delete history (cascade would handle it, but explicit for safety)
      await supabase.from('chamado_historico').delete().eq('chamado_id', id);

      // Delete the chamado itself
      const { error } = await supabase.from('chamados').delete().eq('id', id);
      if (error) throw error;

      setChamados((prev) => prev.filter((c) => c.id !== id));
      toast({ title: `Chamado #${id} excluído definitivamente` });
    } catch (err: any) {
      toast({ title: 'Erro ao excluir chamado', variant: 'destructive' });
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
      // Record history for drag-drop etapa change
      const oldEtapaLabel = columns.find(c => c.key === currentCol)?.label || currentCol;
      const newEtapaLabel = columns.find(c => c.key === colKey)?.label || colKey;
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      let userProfileId: string | null = null;
      if (currentUser) {
        const { data: prof } = await supabase.from('profiles').select('id').eq('user_id', currentUser.id).maybeSingle();
        userProfileId = prof?.id || null;
      }
      await supabase.from('chamado_historico').insert({
        chamado_id: ticket.id,
        user_id: userProfileId,
        acao: 'Alteração de Etapa',
        descricao: `Etapa alterada de "${oldEtapaLabel}" para "${newEtapaLabel}" (drag-drop)`,
        descricao_ticket: ticket.descricao || null,
      } as any);
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
  // Pre-filter chamados by supervisor+representante to derive dropdown options
  const chamadosForDropdowns = chamados.filter((c) => {
    if (filterSupervisor !== 'todos') {
      // Filter directly by supervisor_id on chamado
      if (c.supervisor_id === filterSupervisor) {
        // Direct match on supervisor_id
      } else {
        // Also check via representante link
        const repIdsForSupervisor = srLinks
          .filter(sr => sr.supervisor_id === filterSupervisor)
          .map(sr => sr.representante_id);
        if (!c.representante_id || !repIdsForSupervisor.includes(c.representante_id)) return false;
      }
    }
    if (filterRepresentante !== 'todos') {
      if (c.representante_id !== filterRepresentante) return false;
    }
    return true;
  });

  // Derived dropdown options from filtered chamados
  const ticketIdOptions = chamadosForDropdowns.map(c => String(c.id));
  const clienteOptions = [...new Set(chamadosForDropdowns.map(c => c.cliente_nome).filter(Boolean))].sort();
  const motivoOptions = [...new Set(chamadosForDropdowns.map(c => c.motivo).filter(Boolean))].sort();

  const filteredChamados = chamadosForDropdowns.filter((c) => {
    if (filterCliente !== 'todos' && c.cliente_nome !== filterCliente) return false;
    if (filterTicketId !== 'todos' && String(c.id) !== filterTicketId) return false;
    if (filterMotivo !== 'todos' && c.motivo !== filterMotivo) return false;
    if (filterGestor !== 'todos' && c.gestor_id !== filterGestor) return false;
    return true;
  });

  const isRestricted = role === 'supervisor' || role === 'representante';
  const roleLabel = profile?.nome || (role === 'admin' ? 'Administrador' : role === 'gestor' ? 'Gestor' : role === 'supervisor' ? 'Supervisor' : 'Representante');

  return (
    <Layout>
      <div className="p-4">
        <div className="mb-4">
          <h1 className="text-xl">
            Olá, <span className="text-primary font-semibold">{profile?.nome || 'Usuário'}</span>
          </h1>
          <p className="text-sm text-muted-foreground">Gerenciador de Chamados THOR</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4 bg-card rounded-lg p-3 shadow-sm border">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Supervisor</span>
            <Select value={filterSupervisor} onValueChange={handleSupervisorChange} disabled={isRestricted}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {supervisores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Representantes</span>
            <Select value={filterRepresentante} onValueChange={handleRepresentanteChange} disabled={role === 'representante'}>
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
                {clienteOptions.map((nome) => <SelectItem key={nome} value={nome}>{nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">TicketID</span>
            <Select value={filterTicketId} onValueChange={setFilterTicketId}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {ticketIdOptions.map((id) => <SelectItem key={id} value={id}>{id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Motivo</span>
            <Select value={filterMotivo} onValueChange={setFilterMotivo}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {motivoOptions.map((nome) => <SelectItem key={nome} value={nome}>{nome}</SelectItem>)}
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
          <button
            onClick={handleClearFilters}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-border bg-muted/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Limpar filtros"
          >
            <FilterX className="h-4 w-4" />
          </button>
        </div>

        {/* Kanban Board */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando chamados...</div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3" style={{ minWidth: `${columns.length * 310}px` }}>
              {columns.map((col) => {
                const tickets = filteredChamados.filter((c) => getTicketColumn(c) === col.key);
                const isOver = dragOverCol === col.key;
                return (
                  <div
                    key={col.key}
                    className={`flex-shrink-0 w-72 space-y-2.5 transition-all ${isOver ? 'ring-2 ring-primary/50 rounded-lg' : ''}`}
                    onDragOver={(e) => handleDragOver(e, col.key)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col.key)}
                  >
                    <div className={`${col.bg} text-white text-center py-2.5 rounded-lg font-semibold text-sm`}>
                      {col.label}{' '}
                      <span className="ml-1 bg-white/30 px-2 rounded-full text-xs">{tickets.length}</span>
                    </div>
                    <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto">
                      {tickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, ticket.id)}
                          onDragEnd={handleDragEnd}
                          className={`rounded-xl overflow-hidden shadow-md cursor-grab active:cursor-grabbing transition-opacity ${draggedId === ticket.id ? 'opacity-40' : 'opacity-100'}`}
                        >
                          <div className={`${col.cardBg} text-white px-4 py-4 space-y-2`}>
                            <p className="text-xs font-bold text-center">TicketID : {ticket.id}</p>
                            <p className="text-[11px] text-center font-semibold">
                              Representante : {ticket.representante_nome}
                            </p>
                            <p className="text-[11px] text-center mt-2 font-semibold">
                              Cliente : {ticket.cliente_nome}
                            </p>
                            <p className="text-[11px] text-center mt-2">
                              <span className="font-semibold">Motivo :</span> {ticket.motivo}
                            </p>
                            <p className="text-[11px] text-center mt-2">
                              <span className="font-semibold">Etapa :</span> {col.label}
                            </p>
                            <p className="text-[11px] text-center">
                              <span className="font-semibold">Gestor :</span> {ticket.gestor_nome || ''}
                            </p>
                            <p className="text-[11px] text-center mt-2 font-semibold">
                              Atualizado : {formatDate(ticket.updated_at)}
                            </p>
                          </div>
                          <div className="bg-gray-900 flex items-center justify-center gap-5 py-2.5">
                            <button
                              className="text-white hover:text-gray-300 transition-colors"
                              title="Editar"
                              onClick={() => { setEditTicket(ticket); setEditOpen(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              className="text-white hover:text-gray-300 transition-colors"
                              title="Histórico"
                              onClick={() => navigate(`/historico?ticketId=${ticket.id}`)}
                            >
                              <Clock className="h-4 w-4" />
                            </button>
                            <button
                              className="text-white hover:text-red-400 transition-colors"
                              title="Excluir"
                              onClick={() => { setDeleteTicketId(ticket.id); setDeleteOpen(true); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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

      <EditChamadoModal
        open={editOpen}
        onOpenChange={setEditOpen}
        chamado={editTicket}
        onSaved={fetchData}
        profileMap={profileMap}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        ticketId={deleteTicketId}
        onConfirm={async (motivo: string) => {
          if (deleteTicketId !== null) {
            await handleDelete(deleteTicketId, motivo);
            setDeleteOpen(false);
            setDeleteTicketId(null);
          }
        }}
      />
    </Layout>
  );
}
