import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Clock, User, ArrowRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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

interface ChamadoBasic {
  id: number;
  cliente_nome: string;
  motivo: string;
  status: string;
  etapa: string | null;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_progresso: 'Em Progresso',
  fechado: 'Fechado',
};

export default function Historico() {
  const [searchParams] = useSearchParams();
  const ticketIdParam = searchParams.get('ticketId');

  const [historico, setHistorico] = useState<HistoricoEntry[]>([]);
  const [chamados, setChamados] = useState<ChamadoBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string>(ticketIdParam || 'todos');
  const [filterAcao, setFilterAcao] = useState('todos');
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');

  useEffect(() => {
    fetchData();

    // Realtime subscription for chamado_historico
    const channel = supabase
      .channel('historico-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chamado_historico' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Also listen for chamados changes (status/etapa updates)
    const chamadosChannel = supabase
      .channel('historico-chamados-realtime')
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
      supabase.removeChannel(chamadosChannel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [historicoRes, chamadosRes, profilesRes] = await Promise.all([
      supabase.from('chamado_historico').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('chamados').select('id, cliente_nome, motivo, status, etapa, created_at').order('id', { ascending: false }),
      supabase.from('profiles').select('id, nome'),
    ]);

    const profileMap = new Map<string, string>();
    (profilesRes.data || []).forEach(p => profileMap.set(p.id, p.nome));

    const entries: HistoricoEntry[] = (historicoRes.data || []).map(h => ({
      ...h,
      user_nome: h.user_id ? profileMap.get(h.user_id) || 'Desconhecido' : 'Sistema',
    }));

    setHistorico(entries);
    setChamados(chamadosRes.data || []);
    setLoading(false);
  };

  // Get unique acao types for filter
  const acaoTypes = [...new Set(historico.map(h => h.acao))];

  // Filter
  const filtered = historico.filter(h => {
    if (selectedTicketId !== 'todos' && String(h.chamado_id) !== selectedTicketId) return false;
    if (filterAcao !== 'todos' && h.acao !== filterAcao) return false;
    if (dataInicial) {
      const entryDate = new Date(h.created_at).toISOString().split('T')[0];
      if (entryDate < dataInicial) return false;
    }
    if (dataFinal) {
      const entryDate = new Date(h.created_at).toISOString().split('T')[0];
      if (entryDate > dataFinal) return false;
    }
    return true;
  });

  // Group by ticket for the detail panel
  const selectedChamado = selectedTicketId !== 'todos'
    ? chamados.find(c => String(c.id) === selectedTicketId)
    : null;

  const ticketHistory = selectedTicketId !== 'todos'
    ? filtered.filter(h => String(h.chamado_id) === selectedTicketId)
    : [];

  const formatDateTime = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <Layout>
      <h1 className="text-xl font-bold text-center mb-6">Histórico de Atendimento</h1>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div>
          <span className="text-xs text-muted-foreground">TicketID</span>
          <Select value={selectedTicketId} onValueChange={setSelectedTicketId}>
            <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {chamados.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>#{c.id} - {c.cliente_nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Tipo de Ação</span>
          <Select value={filterAcao} onValueChange={setFilterAcao}>
            <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {acaoTypes.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Data Inicial</span>
          <Input type="date" className="h-8 text-xs mt-0.5" value={dataInicial} onChange={e => setDataInicial(e.target.value)} />
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Data Final</span>
          <Input type="date" className="h-8 text-xs mt-0.5" value={dataFinal} onChange={e => setDataFinal(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline */}
        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando histórico...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro encontrado.</p>
          ) : (
            filtered.map((entry) => (
              <div
                key={entry.id}
                className="flex gap-3 p-3 bg-card border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => setSelectedTicketId(String(entry.chamado_id))}
              >
                <div className="flex-shrink-0 mt-1">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {entry.acao.includes('Etapa') ? (
                      <ArrowRight className="h-4 w-4 text-primary" />
                    ) : entry.acao.includes('Status') ? (
                      <Clock className="h-4 w-4 text-primary" />
                    ) : (
                      <User className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-primary">Ticket #{entry.chamado_id}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDateTime(entry.created_at)}</span>
                  </div>
                  <p className="text-xs font-medium mt-0.5">{entry.acao}</p>
                  {entry.descricao && <p className="text-xs text-muted-foreground mt-0.5">{entry.descricao}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">Por: {entry.user_nome}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div className="bg-card border rounded-lg p-6 min-h-[300px]">
          {selectedChamado ? (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Ticket #{selectedChamado.id}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="font-medium">Cliente:</span> {selectedChamado.cliente_nome}</div>
                <div><span className="font-medium">Motivo:</span> {selectedChamado.motivo}</div>
                <div><span className="font-medium">Status:</span> {statusLabels[selectedChamado.status] || selectedChamado.status}</div>
                <div><span className="font-medium">Etapa:</span> {selectedChamado.etapa || 'THOR'}</div>
                <div><span className="font-medium">Criado em:</span> {formatDateTime(selectedChamado.created_at)}</div>
              </div>

              {/* Full timeline for this ticket */}
              <div className="mt-4">
                <h4 className="text-sm font-bold mb-3 text-primary">Linha do Tempo Completa</h4>
                <div className="relative border-l-2 border-primary/20 ml-3 space-y-4">
                  {ticketHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-6">Nenhum registro de histórico para este ticket.</p>
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
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              <div>
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Selecione um ticket para ver a linha do tempo completa</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
