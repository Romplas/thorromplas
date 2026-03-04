import { useState } from 'react';
import { Mail, AlertCircle, AlertTriangle, TrendingUp, FileText, CheckCircle, Trash2, CalendarIcon } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { mockTickets } from '@/data/mockData';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';

const statusColors = {
  aberto: '#EF4444',
  em_progresso: '#3B82F6',
  fechado: '#22C55E',
};

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_progresso: 'Em Progresso',
  fechado: 'Fechado',
};

const stats = [
  { label: 'Total de Chamados', value: 8, icon: Mail, color: 'text-primary' },
  { label: 'Pendentes', value: 7, icon: AlertCircle, color: 'text-red-500' },
  { label: 'Abertas', value: 4, icon: AlertTriangle, color: 'text-red-500' },
  { label: 'Em Progresso', value: 2, icon: TrendingUp, color: 'text-blue-500' },
  { label: 'Aguardando', value: 1, icon: FileText, color: 'text-yellow-500' },
  { label: 'Finalizados', value: 1, icon: CheckCircle, color: 'text-green-500' },
];

const barData = [
  { name: 'Aberto', value: 4, fill: '#EF4444' },
  { name: 'Em Progresso', value: 2, fill: '#3B82F6' },
  { name: 'Aguardando', value: 1, fill: '#F59E0B' },
  { name: 'Finalizado', value: 1, fill: '#22C55E' },
];

const pieData = [
  { name: 'Aberto', value: 50, color: '#EF4444' },
  { name: 'Em Progresso', value: 25, color: '#3B82F6' },
  { name: 'Aguardando', value: 13, color: '#F59E0B' },
  { name: 'Finalizado', value: 13, color: '#22C55E' },
];

const lastTicket = mockTickets[0];

export default function Dashboard() {
  const { profile } = useAuth();
  const [startDate, setStartDate] = useState<Date>(new Date(2026, 2, 1));
  const [endDate, setEndDate] = useState<Date>(new Date(2026, 2, 31));

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl">
            Olá, <span className="text-primary font-semibold">{profile?.nome || 'Usuário'}</span>
          </h1>
          <p className="text-sm text-muted-foreground">Painel de Chamados THOR</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 bg-card rounded-lg p-3 shadow-sm border">
        {['Supervisor', 'Representante', 'Gestor'].map((filter) => (
          <div key={filter} className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">{filter}</span>
            <Select>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border rounded-lg p-4 text-center">
            <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Last Ticket */}
      <div className="bg-card border rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Último Chamado</h3>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <p className="text-primary font-medium">Ticket #{lastTicket.id}</p>
            <p className="text-xs"><span className="font-medium">Representante:</span> {lastTicket.representante}</p>
            <p className="text-xs"><span className="font-medium">Cliente:</span> {lastTicket.cliente}</p>
            <p className="text-xs"><span className="font-medium">Motivo:</span> {lastTicket.motivo}</p>
          </div>
          <div className="text-right">
            <span className="status-badge status-open">Aberto</span>
            <p className="text-[10px] text-muted-foreground mt-1">{lastTicket.data_criacao}</p>
          </div>
        </div>
      </div>

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
      <div className="bg-card border rounded-lg p-4">
        <h3 className="font-semibold text-sm mb-4">Últimos 5 Chamados</h3>
        <div className="space-y-2">
          {mockTickets.slice(0, 5).map((ticket) => (
            <div key={ticket.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${ticket.status === 'aberto' ? 'bg-red-500' : ticket.status === 'em_progresso' ? 'bg-blue-500' : 'bg-green-500'}`} />
                <div>
                  <p className="text-sm font-semibold">#{ticket.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {ticket.representante} • {ticket.cliente} • {ticket.motivo}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`status-badge ${ticket.status === 'aberto' ? 'status-open' : ticket.status === 'em_progresso' ? 'status-progress' : 'status-done'}`}>
                  {statusLabels[ticket.status]}
                </span>
                <span className="text-[10px] text-muted-foreground">{ticket.data_criacao.split(' ')[0]}</span>
                <button className="text-red-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
