import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Trash2, Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';

interface HistoricoEntry {
  id: string;
  chamado_id: number;
  acao: string;
  descricao: string | null;
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

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_progresso: 'Em Progresso',
  fechado: 'Fechado',
};

const statusColors: Record<string, string> = {
  aberto: 'bg-green-500',
  em_progresso: 'bg-orange-500',
  fechado: 'bg-red-600',
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
  const [searchParams] = useSearchParams();
  const ticketIdParam = searchParams.get('ticketId');

  const [historico, setHistorico] = useState<HistoricoEntry[]>([]);
  const [chamados, setChamados] = useState<ChamadoFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string>(ticketIdParam || 'todos');

  // Filters
  const [filterSupervisor, setFilterSupervisor] = useState('todos');
  const [filterMotivo, setFilterMotivo] = useState('todos');
  const [filterSubmotivo, setFilterSubmotivo] = useState('todos');
  const [filterCliente, setFilterCliente] = useState('todos');

  // Reference data
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [motivos, setMotivos] = useState<Motivo[]>([]);
  const [submotivos, setSubmotivos] = useState<Submotivo[]>([]);
  const [profileMap, setProfileMap] = useState<Map<string, string>>(new Map());
  const [profileByUserIdMap, setProfileByUserIdMap] = useState<Map<string, string>>(new Map());

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
    const [historicoRes, chamadosRes, profilesRes, supRes, motivosRes, submotivosRes] = await Promise.all([
      supabase.from('chamado_historico').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('chamados').select('*').order('id', { ascending: false }),
      supabase.from('profiles').select('id, nome, user_id'),
      supabase.from('supervisores').select('id, nome').eq('status', 'ativo').order('nome'),
      supabase.from('motivos').select('id, nome').order('nome'),
      supabase.from('submotivos').select('id, nome, motivo_id').order('nome'),
    ]);

    const pMap = new Map<string, string>();
    const pByUserIdMap = new Map<string, string>();
    (profilesRes.data || []).forEach(p => {
      pMap.set(p.id, p.nome);
      pByUserIdMap.set(p.user_id, p.nome);
    });
    setProfileMap(pMap);
    setProfileByUserIdMap(pByUserIdMap);

    const entries: HistoricoEntry[] = (historicoRes.data || []).map(h => ({
      ...h,
      user_nome: h.user_id ? pMap.get(h.user_id) || 'Desconhecido' : 'Sistema',
    }));

    setHistorico(entries);
    setChamados(chamadosRes.data || []);
    if (supRes.data) setSupervisores(supRes.data);
    if (motivosRes.data) setMotivos(motivosRes.data);
    if (submotivosRes.data) setSubmotivos(submotivosRes.data as Submotivo[]);
    setLoading(false);
  };

  // Resolve names for the selected chamado
  useEffect(() => {
    if (selectedTicketId === 'todos') return;
    const chamado = chamados.find(c => String(c.id) === selectedTicketId);
    if (!chamado) return;

    const resolve = async () => {
      // Supervisor
      if (chamado.supervisor_id) {
        const nome = profileMap.get(chamado.supervisor_id) || '';
        setSupervisorNome(nome);
      } else {
        setSupervisorNome('');
      }
      // Representante
      if (chamado.representante_id) {
        const nome = profileMap.get(chamado.representante_id) || '';
        if (nome) {
          setRepresentanteNome(nome);
        } else {
          const { data } = await supabase.from('representantes').select('nome').eq('id', chamado.representante_id).maybeSingle();
          setRepresentanteNome(data?.nome || '');
        }
      } else {
        setRepresentanteNome('');
      }
      // Gestor
      if (chamado.gestor_id) {
        setGestorNome(profileMap.get(chamado.gestor_id) || '');
      } else {
        setGestorNome('');
      }
    };
    resolve();
  }, [selectedTicketId, chamados, profileMap]);

  // Filter chamados for the ticket list
  const filteredChamadoIds = new Set(
    chamados
      .filter(c => {
        if (filterMotivo !== 'todos' && c.motivo !== filterMotivo) return false;
        if (filterCliente !== 'todos' && c.cliente_nome !== filterCliente) return false;
        if (filterSubmotivo !== 'todos' && c.submotivo !== filterSubmotivo) return false;
        return true;
      })
      .map(c => c.id)
  );

  // Get history entries filtered
  const filtered = historico.filter(h => {
    if (selectedTicketId !== 'todos' && String(h.chamado_id) !== selectedTicketId) return false;
    if (!filteredChamadoIds.has(h.chamado_id)) return false;
    return true;
  });

  // Unique clients for filter
  const uniqueClientes = [...new Set(chamados.map(c => c.cliente_nome).filter(Boolean))].sort();

  // Filtered submotivos based on selected motivo
  const filteredSubmotivos = filterMotivo !== 'todos'
    ? submotivos.filter(s => {
        const motivoObj = motivos.find(m => m.nome === filterMotivo);
        return motivoObj && s.motivo_id === motivoObj.id;
      })
    : submotivos;

  const selectedChamado = selectedTicketId !== 'todos'
    ? chamados.find(c => String(c.id) === selectedTicketId)
    : null;

  const ticketHistory = selectedTicketId !== 'todos'
    ? historico.filter(h => String(h.chamado_id) === selectedTicketId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];

  const formatDateTime = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR');
  };

  // Determine the etapa/status at the time of each history entry
  const getEntryColor = (entry: HistoricoEntry) => {
    // Find the chamado to get its current status
    const chamado = chamados.find(c => c.id === entry.chamado_id);
    if (!chamado) return 'bg-blue-500';

    // Try to extract etapa from description
    if (entry.acao.includes('Etapa')) {
      // Find etapa mentioned in description
      for (const [key, color] of Object.entries(etapaColors)) {
        const label = etapaLabelsMap[key];
        if (entry.descricao?.includes(label) || entry.descricao?.includes(key)) {
          return color;
        }
      }
    }

    // Use status color
    return statusColors[chamado.status] || 'bg-blue-500';
  };

  // Extract the "current state" from a history entry description
  const getEntryEtapaLabel = (entry: HistoricoEntry) => {
    // Try to find the target etapa in the description
    if (entry.descricao) {
      for (const [key, label] of Object.entries(etapaLabelsMap)) {
        if (entry.descricao.includes(`para "${label}"`) || entry.descricao.includes(`para ${label}`)) {
          return label;
        }
      }
      // Check if it mentions an etapa
      for (const [key, label] of Object.entries(etapaLabelsMap)) {
        if (entry.descricao.includes(label)) {
          return label;
        }
      }
    }
    return null;
  };

  const getEntryStatusLabel = (entry: HistoricoEntry) => {
    if (entry.descricao) {
      for (const [key, label] of Object.entries(statusLabels)) {
        if (entry.descricao.includes(`para ${label}`) || entry.descricao.includes(`para "${label}"`)) {
          return label;
        }
      }
      for (const [key, label] of Object.entries(statusLabels)) {
        if (entry.descricao.includes(label)) {
          return label;
        }
      }
    }
    const chamado = chamados.find(c => c.id === entry.chamado_id);
    return chamado ? statusLabels[chamado.status] || chamado.status : '';
  };

  return (
    <Layout>
      <div className="p-4">
        <h1 className="text-xl font-bold text-center mb-4">Histórico de Atendimento</h1>

        {/* Filters - similar to reference image */}
        <div className="flex flex-wrap items-center gap-3 mb-4 bg-card rounded-lg p-3 shadow-sm border">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Supervisor</span>
            <Select value={filterSupervisor} onValueChange={setFilterSupervisor}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {supervisores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">TicketID</span>
            <Select value={selectedTicketId} onValueChange={setSelectedTicketId}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {chamados.map(c => <SelectItem key={c.id} value={String(c.id)}>{String(c.id)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Clientes</span>
            <Select value={filterCliente} onValueChange={setFilterCliente}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {uniqueClientes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
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
        </div>

        {/* Main content: Left list + Right detail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: History cards list */}
          <div className="space-y-2 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Carregando histórico...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro encontrado.</p>
            ) : (
              filtered.map((entry) => {
                const entryEtapa = getEntryEtapaLabel(entry);
                const entryStatus = getEntryStatusLabel(entry);
                const bgColor = getEntryColor(entry);
                const isSelected = String(entry.chamado_id) === selectedTicketId;

                return (
                  <div
                    key={entry.id}
                    className={`rounded-lg overflow-hidden cursor-pointer transition-all shadow-md ${isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:shadow-lg'}`}
                    onClick={() => setSelectedTicketId(String(entry.chamado_id))}
                  >
                    <div className={`${bgColor} text-white px-4 py-3 space-y-1`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm">TicketID : {entry.chamado_id}</span>
                            <span className="text-[11px] opacity-90">
                              {entry.acao === 'Ticket Criado' ? '' : entry.acao}
                            </span>
                          </div>
                          <p className="text-xs mt-1">
                            <span className="font-semibold">Status : </span>
                            {entryStatus}
                          </p>
                          {entryEtapa && (
                            <p className="text-xs">
                              <span className="font-semibold">Etapa : </span>
                              {entryEtapa}
                            </p>
                          )}
                          {entry.acao === 'Ticket Criado' && (
                            <p className="text-xs font-semibold mt-0.5">{entry.acao}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          <Pencil className="h-3.5 w-3.5 opacity-70" />
                          <Trash2 className="h-3.5 w-3.5 opacity-70" />
                        </div>
                      </div>
                      <div className="text-[10px] opacity-80 space-y-0.5">
                        <p>Modificado em: {formatDateTime(entry.created_at)}</p>
                        <div className="flex items-center justify-between">
                          <p>
                            TicketID Criado em: {
                              (() => {
                                const chamado = chamados.find(c => c.id === entry.chamado_id);
                                return chamado ? formatDateTime(chamado.created_at) : '—';
                              })()
                            }
                          </p>
                          <span className="text-[10px] font-semibold">Atualizado por : {entry.user_nome}</span>
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
            {selectedChamado ? (
              <div className="space-y-4">
                {/* Row 1: ID + Cliente */}
                <div className="grid grid-cols-3 gap-3">
                  <ReadOnlyField label="TicketID" value={String(selectedChamado.id)} />
                  <div className="col-span-2">
                    <ReadOnlyField label="Clientes" value={selectedChamado.cliente_nome} />
                  </div>
                </div>

                {/* Row 2: Representante, Data Retorno */}
                <div className="grid grid-cols-3 gap-3">
                  <ReadOnlyField label="Representante" value={representanteNome} />
                  <ReadOnlyField label="Data Retorno" value={formatDate(selectedChamado.data_retorno)} />
                  <ReadOnlyField label="Data Contato" value={formatDate(selectedChamado.data_contato)} />
                </div>

                {/* Row 3: Motivo, SubMotivo */}
                <div className="grid grid-cols-3 gap-3">
                  <ReadOnlyField label="Motivo" value={selectedChamado.motivo} />
                  <ReadOnlyField label="SubMotivos" value={selectedChamado.submotivo || '—'} />
                  <ReadOnlyField label="Supervisor" value={supervisorNome} />
                </div>

                {/* Row 4: Etapa, Gestor, Status */}
                <div className="grid grid-cols-3 gap-3">
                  <ReadOnlyField label="EtapaTicket" value={etapaLabelsMap[selectedChamado.etapa || 'thor'] || selectedChamado.etapa || 'THOR'} />
                  <ReadOnlyField label="Gestor" value={gestorNome} />
                  <ReadOnlyField label="StatusTicket" value={statusLabels[selectedChamado.status] || selectedChamado.status} />
                </div>

                {/* Descrição */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Descrição</Label>
                  <div className="px-3 py-2 border border-border rounded-md bg-muted/40 text-sm min-h-[100px] whitespace-pre-wrap">
                    {selectedChamado.descricao || '—'}
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h4 className="text-sm font-bold mb-3 text-primary">Linha do Tempo</h4>
                  <div className="relative border-l-2 border-primary/20 ml-3 space-y-3">
                    {ticketHistory.length === 0 ? (
                      <p className="text-xs text-muted-foreground pl-6">Nenhum registro de histórico.</p>
                    ) : (
                      ticketHistory.map((entry) => (
                        <div key={entry.id} className="relative pl-6">
                          <div className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-primary border-2 border-background" />
                          <p className="text-xs font-semibold">{entry.acao}</p>
                          {entry.descricao && <p className="text-xs text-muted-foreground">{entry.descricao}</p>}
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDateTime(entry.created_at)} — {entry.user_nome}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[300px] text-center text-muted-foreground">
                <div>
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Selecione um ticket para ver os detalhes e a linha do tempo completa</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
