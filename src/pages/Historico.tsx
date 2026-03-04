import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Trash2, Eye, Eraser, Paperclip, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import EditChamadoModal from '@/components/kanban/EditChamadoModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface HistoricoEntry {
  id: string;
  chamado_id: number;
  acao: string;
  descricao: string | null;
  descricao_ticket: string | null;
  created_at: string;
  user_id: string | null;
  user_nome?: string;
}

interface ChamadoFull {
  id: number;
  cliente_nome: string;
  motivo: string;
  submotivo: string | null;
  status: string;
  etapa: string | null;
  descricao: string | null;
  representante_id: string | null;
  supervisor_id: string | null;
  gestor_id: string | null;
  cliente_id: string | null;
  created_at: string;
  updated_at: string;
  data_contato: string | null;
  data_retorno: string | null;
}

interface Supervisor { id: string; nome: string }
interface Motivo { id: string; nome: string }
interface Submotivo { id: string; nome: string; motivo_id: string }
interface Representante { id: string; nome: string }
interface SupervisorRepresentante { supervisor_id: string; representante_id: string }

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_progresso: 'Em Progresso',
  fechado: 'Fechado',
};

const etapaLabelsMap: Record<string, string> = {
  thor: 'THOR',
  aguardando_resposta: 'Aguardando Resposta',
  retorno_interno: 'Retorno Interno Romplas',
  negociacao: 'Em Negociação',
  alteracao: 'Alteração',
  completo: 'Completo',
  perdido: 'Perdido',
  rnc: 'RNC',
  sdp: 'SDP',
  amostras: 'Amostras',
  book: 'Book',
};

const etapaColors: Record<string, string> = {
  thor: 'bg-red-600',
  aguardando_resposta: 'bg-purple-600',
  retorno_interno: 'bg-blue-600',
  negociacao: 'bg-yellow-500',
  alteracao: 'bg-teal-500',
  completo: 'bg-green-500',
  perdido: 'bg-gray-800',
  rnc: 'bg-pink-500',
  sdp: 'bg-orange-500',
  amostras: 'bg-blue-900',
  book: 'bg-lime-500',
};

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold text-muted-foreground">{label}</Label>
      <div className="px-3 py-2 border border-border rounded-md bg-muted/40 text-sm min-h-[36px] flex items-center">
        {value || '—'}
      </div>
    </div>
  );
}

export default function Historico() {
  const { role, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const ticketIdParam = searchParams.get('ticketId');

  const [historico, setHistorico] = useState<HistoricoEntry[]>([]);
  const [chamados, setChamados] = useState<ChamadoFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string>(ticketIdParam || 'todos');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [anexosDialogOpen, setAnexosDialogOpen] = useState(false);
  const [anexos, setAnexos] = useState<{ nome: string; path: string }[]>([]);
  const [loadingAnexos, setLoadingAnexos] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');

  // Filters
  const [filterSupervisor, setFilterSupervisor] = useState('todos');
  const [filterMotivo, setFilterMotivo] = useState('todos');
  const [filterSubmotivo, setFilterSubmotivo] = useState('todos');
  const [filterCliente, setFilterCliente] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');

  // Reference data
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [motivos, setMotivos] = useState<Motivo[]>([]);
  const [submotivos, setSubmotivos] = useState<Submotivo[]>([]);
  const [profileMap, setProfileMap] = useState<Map<string, string>>(new Map());
  const [supervisorMap, setSupervisorMap] = useState<Map<string, string>>(new Map());
  const [representanteMap, setRepresentanteMap] = useState<Map<string, string>>(new Map());
  const [dbEtapas, setDbEtapas] = useState<{ nome: string; label: string; cor: string }[]>([]);
  const [srLinks, setSrLinks] = useState<SupervisorRepresentante[]>([]);
  const [allClientes, setAllClientes] = useState<{ id: string; nome: string; representante_id: string | null }[]>([]);
  const [roleFilterApplied, setRoleFilterApplied] = useState(false);
  // Resolved names for detail panel
  const [supervisorNome, setSupervisorNome] = useState('');
  const [representanteNome, setRepresentanteNome] = useState('');
  const [gestorNome, setGestorNome] = useState('');

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('historico-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamado_historico' }, () => fetchData())
      .subscribe();

    const chamadosChannel = supabase
      .channel('historico-chamados-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(chamadosChannel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [historicoRes, chamadosRes, profilesRes, supRes, motivosRes, submotivosRes, repRes, etapasRes, srRes, clientesRes] = await Promise.all([
      supabase.from('chamado_historico').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('chamados').select('*').order('id', { ascending: false }),
      supabase.from('profiles').select('id, nome, user_id'),
      supabase.from('supervisores').select('id, nome').eq('status', 'ativo').order('nome'),
      supabase.from('motivos').select('id, nome').order('nome'),
      supabase.from('submotivos').select('id, nome, motivo_id').order('nome'),
      supabase.from('representantes').select('id, nome'),
      supabase.from('etapas').select('nome, label, cor').order('ordem'),
      supabase.from('supervisor_representante').select('supervisor_id, representante_id'),
      supabase.from('clientes').select('id, nome, representante_id').order('nome').limit(1000),
    ]);

    const pMap = new Map<string, string>();
    (profilesRes.data || []).forEach(p => {
      pMap.set(p.id, p.nome);
      pMap.set(p.user_id, p.nome);
    });
    setProfileMap(pMap);

    const entries: HistoricoEntry[] = (historicoRes.data || []).map((h: any) => ({
      ...h,
      descricao_ticket: h.descricao_ticket || null,
      user_nome: h.user_id ? pMap.get(h.user_id) || 'Desconhecido' : 'Sistema',
    }));

    setHistorico(entries);
    setChamados(chamadosRes.data || []);
    if (supRes.data) {
      setSupervisores(supRes.data);
      const sMap = new Map<string, string>();
      supRes.data.forEach(s => sMap.set(s.id, s.nome));
      setSupervisorMap(sMap);
    }
    if (motivosRes.data) setMotivos(motivosRes.data);
    if (submotivosRes.data) setSubmotivos(submotivosRes.data as Submotivo[]);
    if (repRes.data) {
      const rMap = new Map<string, string>();
      repRes.data.forEach((r: any) => rMap.set(r.id, r.nome));
      setRepresentanteMap(rMap);
    }
    if (etapasRes.data) setDbEtapas(etapasRes.data);
    if (srRes.data) setSrLinks(srRes.data);
    if (clientesRes.data) setAllClientes(clientesRes.data as any);

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
          const link = (srRes.data || []).find(sr => sr.representante_id === myRep.id);
          if (link) setFilterSupervisor(link.supervisor_id);
          setRoleFilterApplied(true);
        }
      }
    }

    setLoading(false);
  };

  // Resolve names for the selected entry's chamado
  useEffect(() => {
    const ticketId = selectedEntryId
      ? historico.find(h => h.id === selectedEntryId)?.chamado_id
      : selectedTicketId !== 'todos' ? Number(selectedTicketId) : null;

    if (!ticketId) return;
    const chamado = chamados.find(c => c.id === ticketId);
    if (!chamado) return;

    const resolve = async () => {
      setSupervisorNome(chamado.supervisor_id ? (supervisorMap.get(chamado.supervisor_id) || profileMap.get(chamado.supervisor_id) || '') : '');
      if (chamado.representante_id) {
        const nome = representanteMap.get(chamado.representante_id) || profileMap.get(chamado.representante_id) || '';
        if (nome) {
          setRepresentanteNome(nome);
        } else {
          const { data } = await supabase.from('representantes').select('nome').eq('id', chamado.representante_id).maybeSingle();
          setRepresentanteNome(data?.nome || '');
        }
      } else {
        setRepresentanteNome('');
      }
      setGestorNome(chamado.gestor_id ? profileMap.get(chamado.gestor_id) || '' : '');
    };
    resolve();
  }, [selectedEntryId, selectedTicketId, chamados, profileMap]);

  // Role-based base filtering
  const isRestricted = role === 'supervisor' || role === 'representante';

  // Filter chamados
  const filteredChamadoIds = new Set(
    chamados
      .filter(c => {
        // Role-based: supervisor sees only chamados linked to their representantes via clientes
        if (filterSupervisor !== 'todos') {
          const repIdsForSupervisor = srLinks
            .filter(sr => sr.supervisor_id === filterSupervisor)
            .map(sr => sr.representante_id);
          const clienteNamesForSupervisor = allClientes
            .filter(cl => cl.representante_id && repIdsForSupervisor.includes(cl.representante_id))
            .map(cl => cl.nome);
          if (!clienteNamesForSupervisor.includes(c.cliente_nome)) return false;
        }
        if (filterMotivo !== 'todos' && c.motivo !== filterMotivo) return false;
        if (filterCliente !== 'todos' && c.cliente_nome !== filterCliente) return false;
        if (filterSubmotivo !== 'todos' && c.submotivo !== filterSubmotivo) return false;
        if (filterStatus !== 'todos' && c.status !== filterStatus) return false;
        return true;
      })
      .map(c => c.id)
  );

  const filtered = (() => {
    const seenIds = new Set<string>();
    return historico
      .filter(h => {
        if (seenIds.has(h.id)) return false;
        seenIds.add(h.id);
        if (selectedTicketId !== 'todos' && String(h.chamado_id) !== selectedTicketId) return false;
        if (!filteredChamadoIds.has(h.chamado_id)) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  })();

  const uniqueClientes = [...new Set(chamados.map(c => c.cliente_nome).filter(Boolean))].sort();

  const filteredSubmotivos = filterMotivo !== 'todos'
    ? submotivos.filter(s => {
        const motivoObj = motivos.find(m => m.nome === filterMotivo);
        return motivoObj && s.motivo_id === motivoObj.id;
      })
    : submotivos;

  // Selected entry for detail
  const selectedEntry = selectedEntryId ? historico.find(h => h.id === selectedEntryId) : null;
  const selectedChamado = selectedEntry
    ? chamados.find(c => c.id === selectedEntry.chamado_id)
    : null;

  const formatDateTime = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR');
  };

  // Build a map of etapa at each history entry by reconstructing the timeline
  const entryEtapaMap = (() => {
    const map = new Map<string, string>();

    // Build dynamic label→key map from DB etapas (more reliable than hardcoded)
    const dynamicLabelToKey = new Map<string, string>();
    dbEtapas.forEach(e => dynamicLabelToKey.set(e.label.toLowerCase(), e.nome));
    // Also add hardcoded as fallback
    Object.entries(etapaLabelsMap).forEach(([k, v]) => {
      if (!dynamicLabelToKey.has(v.toLowerCase())) dynamicLabelToKey.set(v.toLowerCase(), k);
    });

    // Helper to resolve a label to a key
    const resolveLabel = (label: string): string | undefined => {
      return dynamicLabelToKey.get(label.toLowerCase());
    };

    // Group history by chamado_id, sorted ascending (oldest first)
    const byChamado = new Map<number, HistoricoEntry[]>();
    historico.forEach(h => {
      if (!byChamado.has(h.chamado_id)) byChamado.set(h.chamado_id, []);
      byChamado.get(h.chamado_id)!.push(h);
    });

    // Build chamado etapa lookup for initial etapa
    const chamadoEtapaMap = new Map<number, string>();
    chamados.forEach(c => chamadoEtapaMap.set(c.id, (c as any).etapa || 'thor'));

    byChamado.forEach((entries, chamadoId) => {
      // Sort ascending by date
      const sorted = [...entries].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      // Start with the first known etapa - if there's only a "Ticket Criado" with no etapa info, use 'thor'
      let currentEtapa = 'thor';
      sorted.forEach(entry => {
        // Check if this entry changes the etapa
        if (entry.descricao) {
          let newLabel: string | null = null;
          if (entry.acao === 'Alteração de Etapa') {
            const match = entry.descricao.match(/para "([^"]+)"/);
            if (match) newLabel = match[1];
          } else if (entry.descricao.includes('Etapa:')) {
            const match = entry.descricao.match(/Etapa:.*?→\s*"([^"]+)"/);
            if (match) newLabel = match[1];
          }
          if (newLabel) {
            const key = resolveLabel(newLabel);
            if (key) currentEtapa = key;
          }
        }
        map.set(entry.id, currentEtapa);
      });
    });
    return map;
  })();

  // Build a map of gestor name at each history entry by reconstructing the timeline
  const entryGestorNameMap = (() => {
    const map = new Map<string, string>();

    const byChamado = new Map<number, HistoricoEntry[]>();
    historico.forEach(h => {
      if (!byChamado.has(h.chamado_id)) byChamado.set(h.chamado_id, []);
      byChamado.get(h.chamado_id)!.push(h);
    });

    byChamado.forEach((entries, chamadoId) => {
      const sorted = [...entries].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const chamado = chamados.find(c => c.id === chamadoId);
      const currentGestorName = chamado?.gestor_id ? (profileMap.get(chamado.gestor_id) || '') : '';

      // Find the original gestor by looking at the first gestor change's "from" value
      let originalGestor = currentGestorName;
      for (const entry of sorted) {
        if (entry.descricao && entry.descricao.includes('Gestor:')) {
          const match = entry.descricao.match(/Gestor:\s*"([^"]+)"\s*→/);
          if (match) {
            originalGestor = match[1] === 'Nenhum' ? '' : match[1];
            break;
          }
        }
      }

      // Walk forward assigning gestor at each point
      let gestor = originalGestor;
      sorted.forEach(entry => {
        if (entry.descricao && entry.descricao.includes('Gestor:')) {
          const match = entry.descricao.match(/Gestor:.*?→\s*"([^"]+)"/);
          if (match) {
            gestor = match[1] === 'Nenhum' ? '' : match[1];
          }
        }
        map.set(entry.id, gestor);
      });
    });

    return map;
  })();

  const getEntryColor = (entry: HistoricoEntry) => {
    const etapa = entryEtapaMap.get(entry.id) || 'thor';
    return etapaColors[etapa] || 'bg-blue-500';
  };

  const handleCardClick = (entry: HistoricoEntry) => {
    setSelectedEntryId(entry.id);
    setSelectedTicketId(String(entry.chamado_id));
  };

  const handleClearSelection = () => {
    setSelectedEntryId(null);
  };

  const handleEditClick = () => {
    if (selectedChamado) setEditModalOpen(true);
  };

  const handleVerAnexoClick = async () => {
    if (!selectedChamado) return;
    setAnexosDialogOpen(true);
    setLoadingAnexos(true);
    try {
      const { data, error } = await supabase.storage
        .from('chamado-anexos')
        .list(String(selectedChamado.id));
      if (data && !error) {
        setAnexos(data.map(f => ({ nome: f.name, path: `${selectedChamado.id}/${f.name}` })));
      } else {
        setAnexos([]);
      }
    } catch {
      setAnexos([]);
    }
    setLoadingAnexos(false);
  };

  const getAnexoUrl = (path: string) => {
    const { data } = supabase.storage.from('chamado-anexos').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleAnexoView = (anexo: { nome: string; path: string }) => {
    const url = getAnexoUrl(anexo.path);
    const ext = anexo.nome.toLowerCase().split('.').pop() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(ext)) {
      setPreviewName(anexo.nome);
      setPreviewUrl(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleAnexoDownload = (anexo: { nome: string; path: string }) => {
    const url = getAnexoUrl(anexo.path);
    const a = document.createElement('a');
    a.href = url;
    a.download = anexo.nome;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Layout>
      <div className="p-4">
        <h1 className="text-xl font-bold text-center mb-4">Histórico de Atendimento</h1>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4 bg-card rounded-lg p-3 shadow-sm border">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Supervisor</span>
            <Select value={filterSupervisor} onValueChange={setFilterSupervisor} disabled={isRestricted}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {supervisores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">TicketID</span>
            <SearchableSelect
              options={[{ value: 'todos', label: 'Todos' }, ...chamados.map(c => ({ value: String(c.id), label: String(c.id) }))]}
              value={selectedTicketId}
              onValueChange={(v) => { setSelectedTicketId(v); setSelectedEntryId(null); }}
              placeholder="Todos"
              searchPlaceholder="Pesquisar ticket..."
              className="h-8 w-36 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Clientes</span>
            <SearchableSelect
              options={[{ value: 'todos', label: 'Todos' }, ...uniqueClientes.map(c => ({ value: c, label: c }))]}
              value={filterCliente}
              onValueChange={setFilterCliente}
              placeholder="Todos"
              searchPlaceholder="Pesquisar cliente..."
              className="h-8 w-44 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Motivo</span>
            <Select value={filterMotivo} onValueChange={(v) => { setFilterMotivo(v); setFilterSubmotivo('todos'); }}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {motivos.map(m => <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">SubMotivos</span>
            <Select value={filterSubmotivo} onValueChange={setFilterSubmotivo}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {filteredSubmotivos.map(s => <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>)}
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

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: History cards */}
          <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Carregando histórico...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro encontrado.</p>
            ) : (
              filtered.map((entry) => {
                const chamado = chamados.find(c => c.id === entry.chamado_id);
                const bgColor = getEntryColor(entry);
                const isSelected = entry.id === selectedEntryId;
                const entryEtapa = entryEtapaMap.get(entry.id) || 'thor';
                const etapaLabel = etapaLabelsMap[entryEtapa] || entryEtapa;
                const statusLabel = chamado ? (statusLabels[chamado.status] || chamado.status) : '—';
                const cardRepNome = chamado?.representante_id ? (representanteMap.get(chamado.representante_id) || profileMap.get(chamado.representante_id) || '') : '';
                const gestorName = entryGestorNameMap.get(entry.id) || '';

                return (
                  <div
                    key={entry.id}
                    className={`rounded-lg overflow-hidden cursor-pointer transition-all shadow-md ${isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:shadow-lg'}`}
                    onClick={() => handleCardClick(entry)}
                  >
                    {/* Card with two-section layout */}
                    <div className={`${bgColor} text-white`}>
                      <div className="flex">
                        {/* Left section - ticket info */}
                        <div className="w-[35%] px-3 py-2.5 space-y-0.5 border-r border-white/20 text-[11px]">
                          <p className="font-bold text-sm">TicketID : {entry.chamado_id}</p>
                          <p><span className="font-semibold">Cliente : </span>{chamado?.cliente_nome || '—'}</p>
                          <p className="font-semibold">Etapa Ticket : {etapaLabel}</p>
                          <p><span className="font-semibold">Motivo : </span>{chamado?.motivo || '—'}</p>
                          <p><span className="font-semibold">Representante : </span>{cardRepNome || '—'}</p>
                          <p><span className="font-semibold">Supervisora : </span>{chamado?.supervisor_id ? (supervisorMap.get(chamado.supervisor_id) || '—') : '—'}</p>
                        </div>

                        {/* Right section - description + status row */}
                        <div className="w-[65%] flex flex-col">
                          {/* Description box */}
                          <div className="bg-white/15 text-white px-3 py-2 mx-2 mt-2 rounded text-[11px] min-h-[60px]">
                            <p className="font-semibold">Descrição : {entry.descricao_ticket ?? chamado?.descricao ?? '—'}</p>
                          </div>

                          {/* Bottom status row */}
                          <div className="flex items-end justify-between px-3 py-2 text-[10px]">
                            <div className="space-y-0.5">
                              <p><span className="font-semibold">Status Ticket : </span>{statusLabel}</p>
                              <p><span className="font-semibold">Atualizado por : </span>{entry.user_nome}</p>
                              <p><span className="font-semibold">Data e hora da atualização : </span>{formatDateTime(entry.created_at)}</p>
                            </div>
                            <div className="space-y-0.5 text-right">
                              <p><span className="font-semibold">Gestor: </span>{gestorName || '—'}</p>
                              <p className="text-green-200"><span className="font-semibold">Ticket Criado por : </span>{(() => {
                                // Find the "Ticket Criado" entry for this chamado
                                const creationEntry = historico.find(h => h.chamado_id === entry.chamado_id && h.acao === 'Ticket Criado');
                                return creationEntry?.user_nome || '—';
                              })()}</p>
                              <p className="text-yellow-200 font-semibold">TicketID Criado em: {chamado ? formatDateTime(chamado.created_at) : '—'}</p>
                            </div>
                            <div className="flex items-center gap-1.5 ml-2">
                              <Pencil className="h-4 w-4 opacity-80 hover:opacity-100" />
                              <Trash2 className="h-4 w-4 opacity-80 hover:opacity-100" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Detail panel */}
          <div className="bg-card border rounded-lg p-5 max-h-[calc(100vh-240px)] overflow-y-auto">
            {selectedChamado && selectedEntry ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <ReadOnlyField label="TicketID" value={String(selectedChamado.id)} />
                  <div className="col-span-2">
                    <ReadOnlyField label="Clientes" value={selectedChamado.cliente_nome} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <ReadOnlyField label="Representante" value={representanteNome} />
                  <ReadOnlyField label="Data Retorno" value={formatDate(selectedChamado.data_retorno)} />
                  <ReadOnlyField label="Data Contato" value={formatDate(selectedChamado.data_contato)} />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <ReadOnlyField label="Motivo" value={selectedChamado.motivo} />
                  <ReadOnlyField label="SubMotivos" value={selectedChamado.submotivo || '—'} />
                  <ReadOnlyField label="Supervisor" value={supervisorNome} />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <ReadOnlyField label="EtapaTicket" value={etapaLabelsMap[selectedChamado.etapa || 'thor'] || selectedChamado.etapa || 'THOR'} />
                  <ReadOnlyField label="Gestor" value={selectedEntry ? (entryGestorNameMap.get(selectedEntry.id) || '') : gestorNome} />
                  <ReadOnlyField label="StatusTicket" value={statusLabels[selectedChamado.status] || selectedChamado.status} />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Descrição</Label>
                  <div className="px-3 py-2 border border-border rounded-md bg-muted/40 text-sm min-h-[100px] whitespace-pre-wrap">
                    {selectedEntry?.descricao_ticket ?? selectedChamado.descricao ?? '—'}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <Button variant="default" size="sm" className="gap-1.5" onClick={handleEditClick}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleClearSelection}>
                    <Eraser className="h-4 w-4" />
                    Limpar
                  </Button>
                  <Button variant="secondary" size="sm" className="gap-1.5" onClick={handleVerAnexoClick}>
                    <Paperclip className="h-4 w-4" />
                    Ver Anexo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[300px] text-center text-muted-foreground">
                <div>
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Selecione um registro para ver os detalhes</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {selectedChamado && (
          <EditChamadoModal
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            chamado={selectedChamado as any}
            onSaved={fetchData}
            profileMap={profileMap}
          />
        )}

        {/* Anexos Dialog */}
        <Dialog open={anexosDialogOpen} onOpenChange={setAnexosDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Anexos - Ticket {selectedChamado?.id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {loadingAnexos ? (
                <p className="text-sm text-muted-foreground animate-pulse">Carregando anexos...</p>
              ) : anexos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum anexo encontrado.</p>
              ) : (
                anexos.map((anexo, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-3 bg-muted/30 border rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm truncate">{anexo.nome}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAnexoView(anexo)} title="Visualizar">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAnexoDownload(anexo)} title="Baixar">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{previewName}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center overflow-auto max-h-[70vh]">
              {previewUrl && previewName.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewUrl} className="w-full h-[70vh] border-0 rounded" />
              ) : previewUrl ? (
                <img src={previewUrl} alt={previewName} className="max-w-full max-h-[70vh] object-contain rounded" />
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
