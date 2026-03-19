import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, Eye, CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { restaurarChamadoExcluido } from '@/lib/chamadoExcluido';
import { notifyChamadoUpdated } from '@/lib/chamadoEvents';

interface ChamadoExcluido {
  id: string;
  id_original: number;
  dados: Record<string, unknown>;
  deleted_at: string;
  deleted_by: string | null;
  motivo_exclusao: string | null;
  deleted_by_nome?: string;
}

interface HistoricoEntry {
  id: string;
  acao: string;
  descricao: string | null;
  descricao_ticket: string | null;
  created_at: string;
  user_id: string | null;
  user_nome?: string;
}

interface Supervisor { id: string; nome: string }
interface Motivo { id: string; nome: string }
interface Submotivo { id: string; nome: string; motivo_id: string }
interface Representante { id: string; nome: string }
interface SupervisorRepresentante { supervisor_id: string; representante_id: string }

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  aberto: 'Aberto',
  em_progresso: 'Em Progresso',
  fechado: 'Fechado',
};

const etapaLabelsMap: Record<string, string> = {
  pendente: 'Pendente',
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
  pendente: 'bg-amber-600',
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

export default function TicketsExcluidos() {
  const [excluidos, setExcluidos] = useState<ChamadoExcluido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [historicoSelecionado, setHistoricoSelecionado] = useState<HistoricoEntry[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [filterCollapsed, setFilterCollapsed] = useState(false);

  const [filterSupervisor, setFilterSupervisor] = useState('todos');
  const [filterRepresentante, setFilterRepresentante] = useState('todos');
  const [filterMotivo, setFilterMotivo] = useState('todos');
  const [filterSubmotivo, setFilterSubmotivo] = useState('todos');
  const [filterCliente, setFilterCliente] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterEtapa, setFilterEtapa] = useState('todos');
  const [filterGestor, setFilterGestor] = useState('todos');
  const [filterTicketId, setFilterTicketId] = useState('todos');
  const [filterDateStart, setFilterDateStart] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - 6, 1);
  });
  const [filterDateEnd, setFilterDateEnd] = useState<Date>(() => new Date());

  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [representantes, setRepresentantes] = useState<Representante[]>([]);
  const [motivos, setMotivos] = useState<Motivo[]>([]);
  const [submotivos, setSubmotivos] = useState<Submotivo[]>([]);
  const [profileMap, setProfileMap] = useState<Map<string, string>>(new Map());
  const [supervisorMap, setSupervisorMap] = useState<Map<string, string>>(new Map());
  const [representanteMap, setRepresentanteMap] = useState<Map<string, string>>(new Map());
  const [dbEtapas, setDbEtapas] = useState<{ nome: string; label: string; cor: string }[]>([]);
  const [srLinks, setSrLinks] = useState<SupervisorRepresentante[]>([]);

  const fetchData = async () => {
    setLoading(true);
    const [excluidosRes, profilesRes, supRes, motivosRes, submotivosRes, repRes, etapasRes, srRes] = await Promise.all([
      (supabase as any).from('chamados_excluidos').select('*').order('deleted_at', { ascending: false }),
      supabase.from('profiles').select('id, nome, user_id'),
      supabase.from('supervisores').select('id, nome').eq('status', 'ativo').order('nome'),
      supabase.from('motivos').select('id, nome').order('nome'),
      supabase.from('submotivos').select('id, nome, motivo_id').order('nome'),
      supabase.from('representantes').select('id, nome'),
      supabase.from('etapas').select('nome, label, cor').order('ordem'),
      supabase.from('supervisor_representante').select('supervisor_id, representante_id'),
    ]);

    const pMap = new Map<string, string>();
    (profilesRes.data || []).forEach((p: { id: string; nome: string; user_id: string }) => {
      pMap.set(p.id, p.nome);
      pMap.set(p.user_id, p.nome);
    });
    setProfileMap(pMap);

    const items: ChamadoExcluido[] = (excluidosRes.data || []).map((e: Record<string, unknown>) => ({
      ...e,
      deleted_by_nome: e.deleted_by ? (pMap.get(e.deleted_by as string) || 'Desconhecido') : 'Sistema',
    })) as ChamadoExcluido[];

    setExcluidos(items);
    if (supRes.data) {
      setSupervisores(supRes.data);
      const sMap = new Map<string, string>();
      supRes.data.forEach((s: { id: string; nome: string }) => sMap.set(s.id, s.nome));
      setSupervisorMap(sMap);
    }
    if (motivosRes.data) setMotivos(motivosRes.data);
    if (submotivosRes.data) setSubmotivos(submotivosRes.data as Submotivo[]);
    if (repRes.data) {
      setRepresentantes(repRes.data);
      const rMap = new Map<string, string>();
      repRes.data.forEach((r: { id: string; nome: string }) => rMap.set(r.id, r.nome));
      setRepresentanteMap(rMap);
    }
    if (etapasRes.data) setDbEtapas(etapasRes.data);
    if (srRes.data) setSrLinks(srRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('tickets-excluidos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados_excluidos' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredRepresentantes = filterSupervisor !== 'todos'
    ? representantes.filter(r =>
        srLinks.some(sr => sr.supervisor_id === filterSupervisor && sr.representante_id === r.id)
      )
    : representantes;

  const filteredSubmotivos = filterMotivo !== 'todos'
    ? submotivos.filter(s => {
        const motivoObj = motivos.find(m => m.nome === filterMotivo);
        return motivoObj && s.motivo_id === motivoObj.id;
      })
    : submotivos;

  const formatDateTime = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR');
  };

  const getDados = (e: ChamadoExcluido) => e.dados || {};
  const getCliente = (e: ChamadoExcluido) => String(getDados(e).cliente_nome || '—');
  const getMotivo = (e: ChamadoExcluido) => String(getDados(e).motivo || '—');
  const getSubmotivo = (e: ChamadoExcluido) => String(getDados(e).submotivo || '—');
  const getStatus = (e: ChamadoExcluido) => String(getDados(e).status || 'aberto');
  const getEtapa = (e: ChamadoExcluido) => (String(getDados(e).etapa || 'thor')).toLowerCase();
  const getDescricao = (e: ChamadoExcluido) => String(getDados(e).descricao || '—');
  const getRepId = (e: ChamadoExcluido) => getDados(e).representante_id as string | null;
  const getSupId = (e: ChamadoExcluido) => getDados(e).supervisor_id as string | null;
  const getGestorId = (e: ChamadoExcluido) => getDados(e).gestor_id as string | null;

  // Buscar todo o histórico do ticket selecionado (todas as edições, independente de quem fez)
  useEffect(() => {
    if (!selectedId) {
      setHistoricoSelecionado([]);
      return;
    }
    const fetchHistorico = async () => {
      setLoadingHistorico(true);
      const all: HistoricoEntry[] = [];
      const pageSize = 1000;
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const { data: chunk } = await (supabase as any)
          .from('chamado_historico_excluido')
          .select('id, acao, descricao, descricao_ticket, created_at, user_id')
          .eq('chamado_excluido_id', selectedId)
          .order('created_at', { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (!chunk || chunk.length === 0) break;
        all.push(...chunk.map((h: Record<string, unknown>) => ({
          ...h,
          user_nome: h.user_id ? profileMap.get(h.user_id as string) || 'Desconhecido' : 'Sistema',
        })) as HistoricoEntry[]);
        hasMore = chunk.length === pageSize;
        offset += pageSize;
      }
      setHistoricoSelecionado(all);
      setLoadingHistorico(false);
    };
    fetchHistorico();
  }, [selectedId, profileMap]);

  const filtered = excluidos.filter(e => {
    const cliente = getCliente(e);
    const motivo = getMotivo(e);
    const submotivo = getSubmotivo(e);
    const status = getStatus(e);
    const etapa = getEtapa(e);
    const repId = getRepId(e);
    const supId = getSupId(e);
    const gestorId = getGestorId(e);

    if (filterTicketId !== 'todos' && String(e.id_original) !== filterTicketId) return false;
    if (filterSupervisor !== 'todos') {
      const repIdsForSup = srLinks.filter(sr => sr.supervisor_id === filterSupervisor).map(sr => sr.representante_id);
      const matchSup = supId === filterSupervisor || (repId && repIdsForSup.includes(repId));
      if (!matchSup) return false;
      if (filterRepresentante !== 'todos' && repId !== filterRepresentante) return false;
    } else if (filterRepresentante !== 'todos' && repId !== filterRepresentante) return false;
    if (filterMotivo !== 'todos' && motivo !== filterMotivo) return false;
    if (filterSubmotivo !== 'todos' && submotivo !== filterSubmotivo) return false;
    if (filterCliente !== 'todos' && cliente !== filterCliente) return false;
    if (filterStatus !== 'todos' && status !== filterStatus) return false;
    if (filterEtapa !== 'todos' && etapa !== filterEtapa) return false;
    if (filterGestor !== 'todos' && gestorId !== filterGestor) return false;

    const deletedDate = new Date(e.deleted_at);
    if (filterDateStart) {
      const start = new Date(filterDateStart);
      start.setHours(0, 0, 0, 0);
      if (deletedDate < start) return false;
    }
    if (filterDateEnd) {
      const end = new Date(filterDateEnd);
      end.setHours(23, 59, 59, 999);
      if (deletedDate > end) return false;
    }
    return true;
  });

  const uniqueClientes = [...new Set(excluidos.map(getCliente).filter(Boolean))].sort();

  const selected = selectedId ? excluidos.find(e => e.id === selectedId) : null;

  const handleResetFilters = () => {
    const d = new Date();
    setFilterSupervisor('todos');
    setFilterRepresentante('todos');
    setFilterMotivo('todos');
    setFilterSubmotivo('todos');
    setFilterCliente('todos');
    setFilterStatus('todos');
    setFilterEtapa('todos');
    setFilterGestor('todos');
    setFilterTicketId('todos');
    setFilterDateStart(new Date(d.getFullYear(), d.getMonth() - 6, 1));
    setFilterDateEnd(new Date());
  };

  const handleRestaurar = async () => {
    if (!selectedId) return;
    setRestoring(true);
    try {
      const result = await restaurarChamadoExcluido(selectedId);
      if (result) {
        notifyChamadoUpdated(result.newId);
        toast.success(`Ticket restaurado com sucesso! Novo ID: #${result.newId}`);
        setSelectedId(null);
        fetchData();
      } else {
        toast.error('Erro ao restaurar ticket');
      }
    } catch (err: unknown) {
      toast.error('Erro ao restaurar: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Layout>
      <div className="p-4">
        <h1 className="text-xl font-bold text-center mb-4">Tickets Excluídos</h1>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Visualize e restaure tickets excluídos. Disponível apenas para Administrador.
        </p>

        <div className="mb-4 bg-card rounded-lg shadow-sm border overflow-hidden">
          <button
            type="button"
            onClick={() => setFilterCollapsed(!filterCollapsed)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
          >
            <span className="text-sm font-medium">Filtros</span>
            {filterCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <div className={cn("border-t border-border", filterCollapsed && "hidden")}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-3">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                      <CalendarIcon className="h-4 w-4" />
                      {format(filterDateStart, 'dd/MM/yyyy', { locale: ptBR })} até {format(filterDateEnd, 'dd/MM/yyyy', { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-2 space-y-2">
                      <Label>Data início</Label>
                      <Calendar mode="single" selected={filterDateStart} onSelect={(d) => d && setFilterDateStart(d)} locale={ptBR} />
                      <Label>Data fim</Label>
                      <Calendar mode="single" selected={filterDateEnd} onSelect={(d) => d && setFilterDateEnd(d)} locale={ptBR} />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0 min-w-[100px]">Supervisor</span>
                <Select value={filterSupervisor} onValueChange={(v) => { setFilterSupervisor(v); setFilterRepresentante('todos'); }}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {supervisores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0 min-w-[100px]">Representante</span>
                <Select value={filterRepresentante} onValueChange={setFilterRepresentante}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {filteredRepresentantes.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0 min-w-[100px]">TicketID</span>
                <SearchableSelect
                  options={[{ value: 'todos', label: 'Todos' }, ...excluidos.map(e => ({ value: String(e.id_original), label: String(e.id_original) }))]}
                  value={filterTicketId}
                  onValueChange={(v) => { setFilterTicketId(v); setSelectedId(null); }}
                  placeholder="Todos"
                  searchPlaceholder="Pesquisar..."
                  className="h-8 w-36 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0 min-w-[100px]">Cliente</span>
                <SearchableSelect
                  options={[{ value: 'todos', label: 'Todos' }, ...uniqueClientes.map(c => ({ value: c, label: c }))]}
                  value={filterCliente}
                  onValueChange={setFilterCliente}
                  placeholder="Todos"
                  className="h-8 w-36 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0 min-w-[100px]">Motivo</span>
                <Select value={filterMotivo} onValueChange={(v) => { setFilterMotivo(v); setFilterSubmotivo('todos'); }}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {motivos.map(m => <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0 min-w-[100px]">Submotivo</span>
                <Select value={filterSubmotivo} onValueChange={setFilterSubmotivo}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {filteredSubmotivos.map(s => <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0 min-w-[100px]">Etapa</span>
                <Select value={filterEtapa} onValueChange={setFilterEtapa}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {dbEtapas.map(e => <SelectItem key={e.nome} value={e.nome}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0 min-w-[100px]">Status</span>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="aberto">Aberto</SelectItem>
                    <SelectItem value="em_progresso">Em Progresso</SelectItem>
                    <SelectItem value="fechado">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0 min-w-[100px]">Gestor</span>
                <Select value={filterGestor} onValueChange={setFilterGestor}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {[...new Map(excluidos.filter(e => getGestorId(e)).map(e => [getGestorId(e)!, profileMap.get(getGestorId(e)!) || 'Desconhecido'])).entries()]
                      .sort((a, b) => a[1].localeCompare(b[1]))
                      .map(([id, nome]) => <SelectItem key={id} value={id}>{nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 flex justify-end">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleResetFilters}>Limpar filtros</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum ticket excluído encontrado.</p>
            ) : (
              filtered.map((e) => {
                const etapa = getEtapa(e);
                const bgColor = etapaColors[etapa] || etapaColors.thor;
                const etapaLabel = etapaLabelsMap[etapa] || etapa;
                const repNome = getRepId(e) ? representanteMap.get(getRepId(e)!) || '—' : '—';
                const supNome = getSupId(e) ? supervisorMap.get(getSupId(e)!) || '—' : '—';
                const isSelected = e.id === selectedId;

                return (
                  <div
                    key={e.id}
                    className={cn(
                      'rounded-lg overflow-hidden cursor-pointer transition-all shadow-md',
                      isSelected && 'ring-2 ring-primary ring-offset-2'
                    )}
                    onClick={() => setSelectedId(e.id)}
                  >
                    <div className={`${bgColor} text-white`}>
                      <div className="flex flex-col md:flex-row">
                        <div className="w-full md:w-[35%] px-3 py-2.5 space-y-0.5 border-b md:border-b-0 md:border-r border-white/20 text-[11px]">
                          <p className="font-bold text-sm">TicketID: {e.id_original}</p>
                          <p><span className="font-semibold">Cliente: </span>{getCliente(e)}</p>
                          <p><span className="font-semibold">Etapa: </span>{etapaLabel}</p>
                          <p><span className="font-semibold">Motivo: </span>{getMotivo(e)}</p>
                          <p><span className="font-semibold">Representante: </span>{repNome}</p>
                          <p><span className="font-semibold">Supervisor: </span>{supNome}</p>
                        </div>
                        <div className="w-full md:w-[65%] px-3 py-2.5 text-[11px]">
                          <p><span className="font-semibold">Excluído por: </span>{e.deleted_by_nome}</p>
                          <p><span className="font-semibold">Data exclusão: </span>{formatDateTime(e.deleted_at)}</p>
                          <p className="mt-1 truncate"><span className="font-semibold">Descrição: </span>{getDescricao(e)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-card border rounded-lg p-5 max-h-[calc(100vh-300px)] overflow-y-auto">
            {selected ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <ReadOnlyField label="TicketID (original)" value={String(selected.id_original)} />
                  <div className="col-span-1 sm:col-span-2">
                    <ReadOnlyField label="Cliente" value={getCliente(selected)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ReadOnlyField label="Representante" value={getRepId(selected) ? representanteMap.get(getRepId(selected)!) || '—' : '—'} />
                  <ReadOnlyField label="Supervisor" value={getSupId(selected) ? supervisorMap.get(getSupId(selected)!) || '—' : '—'} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ReadOnlyField label="Motivo" value={getMotivo(selected)} />
                  <ReadOnlyField label="Submotivo" value={getSubmotivo(selected)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ReadOnlyField label="Etapa" value={etapaLabelsMap[getEtapa(selected)] || getEtapa(selected)} />
                  <ReadOnlyField label="Status" value={statusLabels[getStatus(selected)] || getStatus(selected)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Excluído por</Label>
                  <div className="px-3 py-2 border rounded-md bg-muted/40 text-sm">{selected.deleted_by_nome}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Data da exclusão</Label>
                  <div className="px-3 py-2 border rounded-md bg-muted/40 text-sm">{formatDateTime(selected.deleted_at)}</div>
                </div>
                {selected.motivo_exclusao && (
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Motivo da exclusão</Label>
                    <div className="px-3 py-2 border rounded-md bg-muted/40 text-sm">{selected.motivo_exclusao}</div>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Descrição</Label>
                  <div className="px-3 py-2 border rounded-md bg-muted/40 text-sm min-h-[80px] whitespace-pre-wrap">{getDescricao(selected)}</div>
                </div>

                {/* Histórico completo - todas as edições, independente de quem fez */}
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Histórico completo de edições</Label>
                  {loadingHistorico ? (
                    <p className="text-xs text-muted-foreground">Carregando histórico...</p>
                  ) : historicoSelecionado.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum registro no histórico.</p>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 border rounded-md p-2 bg-muted/20">
                      {historicoSelecionado.map((h, i) => (
                        <div key={h.id} className="text-xs border-l-2 border-primary/50 pl-2 py-1.5 space-y-0.5">
                          <p className="font-semibold">{h.acao}</p>
                          <p className="text-muted-foreground">Por: {h.user_nome} • {formatDateTime(h.created_at)}</p>
                          {(h.descricao || h.descricao_ticket) && (
                            <p className="whitespace-pre-wrap break-words text-[11px]">{h.descricao || h.descricao_ticket}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={handleRestaurar}
                  disabled={restoring}
                >
                  <RotateCcw className="h-4 w-4" />
                  {restoring ? 'Restaurando...' : 'Restaurar ticket para o ambiente do usuário'}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-muted-foreground">
                <Eye className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Selecione um ticket para ver os detalhes e restaurar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
