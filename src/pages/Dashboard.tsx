import { useState, useEffect, useMemo } from 'react';
import { Mail, AlertCircle, AlertTriangle, TrendingUp, CheckCircle, FileText, Trash2, CalendarIcon, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  aberto: 'Aberto',
  em_progresso: 'Em Progresso',
  fechado: 'Fechado',
};

export default function Dashboard() {
  const { profile, role } = useAuth();
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date>(new Date(2026, 2, 1));
  const [endDate, setEndDate] = useState<Date>(new Date(2026, 2, 31));
  const [chamados, setChamados] = useState<any[]>([]);
  const [representanteId, setRepresentanteId] = useState<string | null>(null);
  const isRepresentante = role === 'representante';

  // Filter data (for non-representante)
  const [supervisores, setSupervisores] = useState<{ id: string; nome: string }[]>([]);
  const [representantes, setRepresentantes] = useState<{ id: string; nome: string }[]>([]);
  const [gestores, setGestores] = useState<{ id: string; nome: string }[]>([]);
  const [srLinks, setSrLinks] = useState<{ supervisor_id: string; representante_id: string }[]>([]);
  const [filterSupervisor, setFilterSupervisor] = useState<string>('todos');
  const [filterRepresentante, setFilterRepresentante] = useState<string>('todos');
  const [filterGestor, setFilterGestor] = useState<string>('todos');

  // Fetch filter options (supervisores, representantes, gestores)
  useEffect(() => {
    if (isRepresentante) return;
    const fetchFilterData = async () => {
      const [supRes, repRes, srRes, profilesRes, gestorRolesRes] = await Promise.all([
        supabase.from('supervisores').select('id, nome').eq('status', 'ativo').order('nome'),
        supabase.from('representantes').select('id, nome').order('nome'),
        supabase.from('supervisor_representante').select('supervisor_id, representante_id'),
        supabase.from('profiles').select('id, nome, user_id, status').eq('status', 'ativo'),
        supabase.from('user_roles').select('user_id, role').eq('role', 'gestor'),
      ]);
      if (supRes.data) setSupervisores(supRes.data);
      if (repRes.data) setRepresentantes(repRes.data);
      if (srRes.data) setSrLinks(srRes.data);
      if (profilesRes.data && gestorRolesRes.data) {
        const gestorUserIds = new Set((gestorRolesRes.data || []).map((r: any) => r.user_id));
        const gestorProfiles = (profilesRes.data || []).filter((p: any) => gestorUserIds.has(p.user_id));
        setGestores(gestorProfiles);
      }
    };
    fetchFilterData();
  }, [isRepresentante]);

  const filteredRepresentantes = filterSupervisor !== 'todos'
    ? representantes.filter(r => srLinks.some(sr => sr.supervisor_id === filterSupervisor && sr.representante_id === r.id))
    : representantes;

  // Reset representante when supervisor changes
  const handleSupervisorChange = (v: string) => {
    setFilterSupervisor(v);
    setFilterRepresentante('todos');
  };

  // Fetch representante ID for the logged-in user
  useEffect(() => {
    if (!profile || !isRepresentante) return;
    const fetchRepId = async () => {
      const { data } = await supabase
        .from('representantes')
        .select('id')
        .ilike('nome', profile.nome)
        .single();
      if (data) setRepresentanteId(data.id);
    };
    fetchRepId();
  }, [profile, isRepresentante]);

  // Fetch chamados (with filters for non-representante)
  useEffect(() => {
    const fetchChamados = async () => {
      let query = supabase.from('chamados').select('*').order('created_at', { ascending: false });

      if (isRepresentante && representanteId) {
        query = query.eq('representante_id', representanteId);
      }

      const { data } = await query;
      if (!data) return;

      let filtered = data;

      // Apply date filter (inclusive range)
      if (startDate || endDate) {
        filtered = filtered.filter((c: any) => {
          const created = new Date(c.created_at);
          if (startDate) {
            const d = new Date(startDate);
            d.setHours(0, 0, 0, 0);
            if (created < d) return false;
          }
          if (endDate) {
            const d = new Date(endDate);
            d.setHours(23, 59, 59, 999);
            if (created > d) return false;
          }
          return true;
        });
      }

      // Apply role filters (for admin/gestor/supervisor)
      if (!isRepresentante) {
        if (filterRepresentante !== 'todos') {
          filtered = filtered.filter((c: any) => c.representante_id === filterRepresentante);
        }
        if (filterSupervisor !== 'todos') {
          const repIdsUnderSup = new Set(
            srLinks.filter(sr => sr.supervisor_id === filterSupervisor).map(sr => sr.representante_id)
          );
          filtered = filtered.filter((c: any) => repIdsUnderSup.has(c.representante_id));
        }
        if (filterGestor !== 'todos') {
          filtered = filtered.filter((c: any) => c.gestor_id === filterGestor);
        }
      }

      setChamados(filtered);
    };

    if (!isRepresentante || representanteId) {
      fetchChamados();
    }
  }, [isRepresentante, representanteId, filterSupervisor, filterRepresentante, filterGestor, startDate, endDate, srLinks]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-chamados')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados' }, () => {
        // Re-fetch
        const fetchChamados = async () => {
          let query = supabase.from('chamados').select('*').order('created_at', { ascending: false });
          if (isRepresentante && representanteId) {
            query = query.eq('representante_id', representanteId);
          }
          const { data } = await query;
          if (data) setChamados(data);
        };
        fetchChamados();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isRepresentante, representanteId]);

  // Compute stats: Pendentes = status pendente, Abertos = aberto, Em Progresso = em_progresso, Finalizados = fechado
  const stats = useMemo(() => {
    const total = chamados.length;
    const pendentes = chamados.filter(c => c.status === 'pendente').length;
    const abertos = chamados.filter(c => c.status === 'aberto').length;
    const emProgresso = chamados.filter(c => c.status === 'em_progresso').length;
    const finalizados = chamados.filter(c => c.status === 'fechado').length;

    return [
      { label: 'Total de Chamados', value: total, icon: Mail, color: 'text-primary' },
      { label: 'Pendentes', value: pendentes, icon: AlertCircle, color: 'text-amber-500' },
      { label: 'Abertos', value: abertos, icon: AlertTriangle, color: 'text-red-500' },
      { label: 'Em Progresso', value: emProgresso, icon: TrendingUp, color: 'text-blue-500' },
      { label: 'Finalizados', value: finalizados, icon: CheckCircle, color: 'text-green-500' },
    ];
  }, [chamados]);

  const lastTicket = chamados[0];
  const last5 = chamados.slice(0, 5);
  const pendentesAtivacao = chamados.filter(c => c.status === 'pendente');

  // Chart data
  const barData = useMemo(() => [
    { name: 'Pendente', value: chamados.filter(c => c.status === 'pendente').length, fill: '#F59E0B' },
    { name: 'Aberto', value: chamados.filter(c => c.status === 'aberto').length, fill: '#EF4444' },
    { name: 'Em Progresso', value: chamados.filter(c => c.status === 'em_progresso').length, fill: '#3B82F6' },
    { name: 'Finalizado', value: chamados.filter(c => c.status === 'fechado').length, fill: '#22C55E' },
  ], [chamados]);

  const pieData = useMemo(() => {
    const total = chamados.length || 1;
    return [
      { name: 'Pendente', value: Math.round((chamados.filter(c => c.status === 'pendente').length / total) * 100), color: '#F59E0B' },
      { name: 'Aberto', value: Math.round((chamados.filter(c => c.status === 'aberto').length / total) * 100), color: '#EF4444' },
      { name: 'Em Progresso', value: Math.round((chamados.filter(c => c.status === 'em_progresso').length / total) * 100), color: '#3B82F6' },
      { name: 'Finalizado', value: Math.round((chamados.filter(c => c.status === 'fechado').length / total) * 100), color: '#22C55E' },
    ];
  }, [chamados]);

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl">
            Olá, <span className="text-primary font-semibold">{profile?.nome || 'Usuário'}</span>
          </h1>
          <p className="text-sm text-muted-foreground">Painel de Chamados THOR</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs font-normal", !startDate && "text-muted-foreground")}>
                <CalendarIcon className="h-4 w-4 text-primary" />
                {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Data início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-xs">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs font-normal", !endDate && "text-muted-foreground")}>
                <CalendarIcon className="h-4 w-4 text-primary" />
                {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Data fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Filters - hidden for representante */}
      {!isRepresentante && (
        <div className="flex flex-wrap items-center gap-3 mb-6 bg-card rounded-lg p-3 shadow-sm border">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Supervisor</span>
            <Select value={filterSupervisor} onValueChange={handleSupervisorChange}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {supervisores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Representante</span>
            <Select value={filterRepresentante} onValueChange={setFilterRepresentante}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {filteredRepresentantes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Gestor</span>
            <Select value={filterGestor} onValueChange={setFilterGestor}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {gestores.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border rounded-lg p-4 text-center">
            <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Last Ticket */}
      {lastTicket && (
        <div className="bg-card border rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Último Chamado</h3>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="text-primary font-medium">Ticket #{lastTicket.id}</p>
              <p className="text-xs"><span className="font-medium">Cliente:</span> {lastTicket.cliente_nome}</p>
              <p className="text-xs"><span className="font-medium">Motivo:</span> {lastTicket.motivo}</p>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <span className={`status-badge ${lastTicket.status === 'pendente' ? 'status-waiting' : lastTicket.status === 'aberto' ? 'status-open' : lastTicket.status === 'em_progresso' ? 'status-progress' : 'status-done'}`}>
                {statusLabels[lastTicket.status] || lastTicket.status}
              </span>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(lastTicket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
                <button
                  type="button"
                  className="text-primary hover:text-primary/70 transition-colors"
                  title="Ver histórico"
                  onClick={() => navigate(`/historico?ticketId=${lastTicket.id}`)}
                >
                  <Clock className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-4">Chamados por Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-4">Distribuição de Chamados</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="bg-card border rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-sm mb-4">Últimos 5 Chamados</h3>
        <div className="space-y-2">
          {last5.map((ticket) => (
            <div key={ticket.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${ticket.status === 'pendente' ? 'bg-amber-500' : ticket.status === 'aberto' ? 'bg-red-500' : ticket.status === 'em_progresso' ? 'bg-blue-500' : 'bg-green-500'}`} />
                <div>
                  <p className="text-sm font-semibold">#{ticket.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {ticket.cliente_nome} • {ticket.motivo}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`status-badge ${ticket.status === 'pendente' ? 'status-waiting' : ticket.status === 'aberto' ? 'status-open' : ticket.status === 'em_progresso' ? 'status-progress' : 'status-done'}`}>
                  {statusLabels[ticket.status] || ticket.status}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(ticket.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                <button
                  className="text-primary hover:text-primary/70"
                  title="Ver histórico"
                  onClick={() => navigate(`/historico?ticketId=${ticket.id}`)}
                >
                  <Clock className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {last5.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum chamado encontrado.</p>
          )}
        </div>
      </div>

      {/* Pendentes de Ativação - visible for representante */}
      {isRepresentante && (
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-4">Chamados Pendentes de Ativação</h3>
          <div className="space-y-2">
            {pendentesAtivacao.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <div>
                    <p className="text-sm font-semibold">#{ticket.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.cliente_nome} • {ticket.motivo}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="status-badge status-waiting">Pendente</span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(ticket.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                  <button
                    className="text-primary hover:text-primary/70"
                    title="Ver histórico"
                    onClick={() => navigate(`/historico?ticketId=${ticket.id}`)}
                  >
                    <Clock className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {pendentesAtivacao.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum chamado pendente de ativação.</p>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
