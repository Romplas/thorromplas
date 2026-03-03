import { useState, useEffect } from 'react';
import { Eye, CheckCircle, Clock, Trash2 } from 'lucide-react';
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
  representante_nome?: string;
}

interface ProfileOption {
  id: string;
  nome: string;
  user_id: string;
}

const columns = [
  { key: 'thor', label: 'THOR', bg: 'bg-red-600', card: 'bg-red-50 border-red-200' },
  { key: 'aguardando', label: 'Aguardando Resposta', bg: 'bg-purple-600', card: 'bg-purple-50 border-purple-200' },
  { key: 'retorno', label: 'Retorno Interno Romplas', bg: 'bg-blue-600', card: 'bg-blue-50 border-blue-200' },
  { key: 'negociacao', label: 'Em Negociação', bg: 'bg-yellow-500', card: 'bg-yellow-50 border-yellow-200' },
  { key: 'alteracao', label: 'Alteração', bg: 'bg-teal-500', card: 'bg-teal-50 border-teal-200' },
  { key: 'completo', label: 'Completo', bg: 'bg-green-500', card: 'bg-green-50 border-green-200' },
  { key: 'perdido', label: 'Perdido', bg: 'bg-black', card: 'bg-gray-100 border-gray-300' },
  { key: 'rnc', label: 'RNC', bg: 'bg-pink-500', card: 'bg-pink-50 border-pink-200' },
  { key: 'sdp', label: 'SDP', bg: 'bg-orange-500', card: 'bg-orange-50 border-orange-200' },
  { key: 'amostras', label: 'Amostras', bg: 'bg-blue-900', card: 'bg-blue-50 border-blue-300' },
  { key: 'book', label: 'Book', bg: 'bg-lime-500', card: 'bg-lime-50 border-lime-200' },
];

const statusToColumn: Record<string, string> = {
  aberto: 'thor',
  em_progresso: 'aguardando',
  aguardando: 'retorno',
  finalizado: 'completo',
};

const etapaToColumn: Record<string, string> = {
  negociacao: 'negociacao',
  alteracao: 'alteracao',
  perdido: 'perdido',
  rnc: 'rnc',
  sdp: 'sdp',
  amostras: 'amostras',
  book: 'book',
};

export default function Kanban() {
  const { profile, role } = useAuth();
  const { toast } = useToast();
  const [chamados, setChamados] = useState<ChamadoWithNames[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [motivos, setMotivos] = useState<string[]>([]);
  const [clientes, setClientes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterSupervisor, setFilterSupervisor] = useState('todos');
  const [filterRepresentante, setFilterRepresentante] = useState('todos');
  const [filterCliente, setFilterCliente] = useState('todos');
  const [filterTicketId, setFilterTicketId] = useState('todos');
  const [filterMotivo, setFilterMotivo] = useState('todos');

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
    return true;
  });

  const userName = profile?.nome || 'Usuário';
  const roleLabel = role === 'admin' ? 'Administrador' : role === 'gestor' ? 'Gestor' : role === 'supervisor' ? 'Supervisor' : 'Representante';

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-xl">
            Olá, <span className="text-primary font-semibold">{roleLabel}</span>
          </h1>
          <p className="text-sm text-muted-foreground">Gerenciador de Chamados THOR</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6 bg-card rounded-lg p-3 shadow-sm border">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Supervisor</span>
            <Select value={filterSupervisor} onValueChange={setFilterSupervisor}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Localizar itens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Representantes</span>
            <Select value={filterRepresentante} onValueChange={setFilterRepresentante}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Localizar itens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Clientes</span>
            <Select value={filterCliente} onValueChange={setFilterCliente}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Localizar itens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">TicketID</span>
            <Select value={filterTicketId} onValueChange={setFilterTicketId}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Localizar itens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {chamados.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{String(c.id)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Motivo</span>
            <Select value={filterMotivo} onValueChange={setFilterMotivo}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Localizar itens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {motivos.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Kanban Board */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando chamados...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {columns.map((col) => {
              const tickets = filteredChamados.filter((c) => {
                const colByStatus = statusToColumn[c.status];
                const colByEtapa = c.etapa ? etapaToColumn[c.etapa] : undefined;
                return colByEtapa === col.key || (!colByEtapa && colByStatus === col.key);
              });
              return (
                <div key={col.key} className="space-y-3">
                  <div className={`${col.bg} text-white text-center py-2 rounded-lg font-semibold text-sm`}>
                    {col.label}{' '}
                    <span className="ml-1 bg-white/30 px-1.5 rounded-full text-xs">{tickets.length}</span>
                  </div>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {tickets.map((ticket) => (
                      <div key={ticket.id} className={`${col.card} border rounded-lg p-3 space-y-1.5`}>
                        <p className="font-bold text-sm">TicketID: {ticket.id}</p>
                        <p className="text-xs">
                          <span className="font-medium">Representante:</span> {ticket.representante_nome}
                        </p>
                        <p className="text-xs">
                          <span className="font-medium">Cliente:</span> {ticket.cliente_nome}
                        </p>
                        <p className="text-xs">
                          <span className="font-medium">Motivo:</span> {ticket.motivo}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Atualizado: {formatDate(ticket.updated_at)}
                        </p>
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
                          {(role === 'admin' || role === 'gestor') && (
                            <button
                              className="ml-auto text-[10px] hover:opacity-70"
                              onClick={() => handleDelete(ticket.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {tickets.length === 0 && (
                      <p className="text-xs text-center text-muted-foreground py-4">Nenhum chamado</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
