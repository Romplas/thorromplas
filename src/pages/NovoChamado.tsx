import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import { Paperclip, Home, Clock, RotateCcw, X, FileText, FileSpreadsheet, Film, Image, Music, File, CheckCircle2, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import AmostrasCreationForm, { type AmostrasFullFormData, defaultAmostrasFullForm } from '@/components/chamado/AmostrasCreationForm';
import romplasLogo from '@/assets/romplas-logo.png';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import ChamadoCard, { type ChamadoCriado } from '@/components/chamado/ChamadoCard';

interface Motivo { id: string; nome: string }
interface Submotivo { id: string; motivo_id: string; nome: string }
interface Supervisor { id: string; nome: string }
interface Representante { id: string; codigo: number; nome: string }
interface Cliente { id: string; codigo: number | null; nome: string; representante_id: string | null; rede_id: string | null }
interface Rede { id: string; nome: string }
interface SupervisorRepresentante { supervisor_id: string; representante_id: string }
interface GestorProfile { id: string; nome: string }

// ChamadoCriado is imported from ChamadoCard

const ACCEPTED_TYPES: Record<string, { label: string; maxMB: number; icon: React.ReactNode }> = {
  'application/pdf': { label: 'PDF', maxMB: 10, icon: <FileText className="h-4 w-4" /> },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOCX', maxMB: 10, icon: <FileText className="h-4 w-4" /> },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { label: 'XLSX', maxMB: 10, icon: <FileSpreadsheet className="h-4 w-4" /> },
  'video/mp4': { label: 'MP4', maxMB: 50, icon: <Film className="h-4 w-4" /> },
  'video/quicktime': { label: 'MOV', maxMB: 50, icon: <Film className="h-4 w-4" /> },
  'video/x-msvideo': { label: 'AVI', maxMB: 50, icon: <Film className="h-4 w-4" /> },
  'video/webm': { label: 'WEBM', maxMB: 50, icon: <Film className="h-4 w-4" /> },
  'image/jpeg': { label: 'JPEG', maxMB: 5, icon: <Image className="h-4 w-4" /> },
  'image/png': { label: 'PNG', maxMB: 5, icon: <Image className="h-4 w-4" /> },
  'audio/mpeg': { label: 'MP3', maxMB: 15, icon: <Music className="h-4 w-4" /> },
  'text/plain': { label: 'TXT', maxMB: 2, icon: <File className="h-4 w-4" /> },
};

const ACCEPT_STRING = Object.keys(ACCEPTED_TYPES).join(',');

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NovoChamado() {
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [motivos, setMotivos] = useState<Motivo[]>([]);
  const [submotivos, setSubmotivos] = useState<Submotivo[]>([]);
  const [selectedMotivo, setSelectedMotivo] = useState<string>('');
  const [selectedSubmotivo, setSelectedSubmotivo] = useState<string>('');
  const [filteredSubmotivos, setFilteredSubmotivos] = useState<Submotivo[]>([]);
  const [anexos, setAnexos] = useState<globalThis.File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  // Cascading data
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [representantes, setRepresentantes] = useState<Representante[]>([]);
  const [srLinks, setSrLinks] = useState<SupervisorRepresentante[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [redes, setRedes] = useState<Rede[]>([]);
  const [gestorProfiles, setGestorProfiles] = useState<GestorProfile[]>([]);

  // Cascading selections
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');
  const [selectedRepresentante, setSelectedRepresentante] = useState<string>('');
  const [selectedCodigoCliente, setSelectedCodigoCliente] = useState<string>('');
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [selectedRede, setSelectedRede] = useState<string>('');

  // Additional form fields
  const [dataContato, setDataContato] = useState('');
  const [dataRetorno, setDataRetorno] = useState('');
  const [metrosTotais, setMetrosTotais] = useState('');
  const [negociadoCom, setNegociadoCom] = useState('');
  const [nfe, setNfe] = useState('');
  const [tipoSolicitacao, setTipoSolicitacao] = useState('');
  const [gestor, setGestor] = useState('');
  const [statusAgendamento, setStatusAgendamento] = useState('');
  // Structured description fields (for Negociação)
  interface ProdutoItem { codProduto: string; produto: string; preco: string; metros: string }
  const [produtos, setProdutos] = useState<ProdutoItem[]>([{ codProduto: '', produto: '', preco: '', metros: '' }]);
  const [prazo, setPrazo] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState('');
  const [descricaoTexto, setDescricaoTexto] = useState('');

  // Check if motivo is Negociação
  const selectedMotivoNome = motivos.find(m => m.id === selectedMotivo)?.nome || '';
  const isNegociacao = selectedMotivoNome.toLowerCase() === 'negociação';
  const isSD = selectedMotivoNome.toLowerCase().includes('sd') || selectedMotivoNome.toLowerCase().includes('solicitação de desenvolvimento');
  const isRNC = selectedMotivoNome.toLowerCase() === 'rnc';
  const isAmostras = selectedMotivoNome.toLowerCase() === 'amostras';
  const isBook = selectedMotivoNome.toLowerCase() === 'book';
  const hasSpecialForm = isSD || isRNC || isAmostras || isBook;

  // Modal states for special forms
  const [showSDForm, setShowSDForm] = useState(false);
  const [showRNCForm, setShowRNCForm] = useState(false);
  const [showAmostrasForm, setShowAmostrasForm] = useState(false);
  const [showBookForm, setShowBookForm] = useState(false);

  // Special form data
  interface SDFormData {
    cliente: string; representante: string; segmentoMercado: string; aplicacaoProduto: string;
    estimativaConsumo: string; precoAlvo: string;
    necessitaAmostra: string; amostraTipo: string; // 'placa' | 'metros'
    desenvolvimento: string; // 'nova_cor' | 'novo_produto' | 'extrusado' | 'espalmado'
    amostraReferenciaAnexa: string; qualFabricante: string;
    gramaturaTotal: string; espessura: string; substrato: string; gravacao: string;
    aditivos: string; quaisAditivos: string;
    corPantone: string; qualPantone: string;
    observacoesComplementares: string;
    statusAprovacao: string; motivoReprovacao: string;
  }
  interface RNCProduto { produto: string; cod: string; metros: string; }
  interface RNCFormData {
    cliente: string; representante: string;
    produtos: RNCProduto[];
    amostraAnexa: string; imagensVideo: boolean; imagensFotos: boolean;
    nfVenda: string;
    descricaoNaoConformidade: string;
    objetivoAlertarEmpresa: boolean; objetivoDevParcial: boolean; objetivoDevTotal: boolean; objetivoNegociacao: boolean;
    parecerFabrica: string; autorizadoResposta: string; // 'sim' | 'nao' | ''
    motivo: string;
    fechamentoRnc: string;
    dataComercial: string; assinaturaComercial: string;
    dataQualidade: string; assinaturaQualidade: string;
    dataFinanceiro: string; assinaturaFinanceiro: string;
  }
  interface BookFormData { tipoBook: string; quantidade: string; destino: string; observacoes: string }
  interface BookFormData { tipoBook: string; quantidade: string; destino: string; observacoes: string }

  const defaultSdForm: SDFormData = { cliente: '', representante: '', segmentoMercado: '', aplicacaoProduto: '', estimativaConsumo: '', precoAlvo: '', necessitaAmostra: 'nao', amostraTipo: '', desenvolvimento: '', amostraReferenciaAnexa: 'nao', qualFabricante: '', gramaturaTotal: '', espessura: '', substrato: '', gravacao: '', aditivos: 'nao', quaisAditivos: '', corPantone: 'nao', qualPantone: '', observacoesComplementares: '', statusAprovacao: '', motivoReprovacao: '' };
  const [sdForm, setSdForm] = useState<SDFormData>({ ...defaultSdForm });
  const defaultRncForm: RNCFormData = {
    cliente: '', representante: '',
    produtos: [{ produto: '', cod: '', metros: '' }],
    amostraAnexa: 'nao', imagensVideo: false, imagensFotos: false,
    nfVenda: '', descricaoNaoConformidade: '',
    objetivoAlertarEmpresa: false, objetivoDevParcial: false, objetivoDevTotal: false, objetivoNegociacao: false,
    parecerFabrica: '', autorizadoResposta: '', motivo: '', fechamentoRnc: '',
    dataComercial: '', assinaturaComercial: '',
    dataQualidade: '', assinaturaQualidade: '',
    dataFinanceiro: '', assinaturaFinanceiro: '',
  };
  const [rncForm, setRncForm] = useState<RNCFormData>({ ...defaultRncForm });
  const [amostrasForm, setAmostrasForm] = useState<AmostrasFullFormData>({ ...defaultAmostrasFullForm });
  const [bookForm, setBookForm] = useState<BookFormData>({ tipoBook: '', quantidade: '', destino: '', observacoes: '' });
  const [specialFormFilled, setSpecialFormFilled] = useState(false);

  const buildSpecialDescricao = () => {
    if (isSD) {
      const lines = [
        `[SDP - Solicitação de Desenvolvimento de Produto]`,
        `Cliente: ${sdForm.cliente}`,
        `Representante: ${sdForm.representante}`,
        `Segmento de Mercado: ${sdForm.segmentoMercado}`,
        `Aplicação do Produto: ${sdForm.aplicacaoProduto}`,
        `Estimativa de Consumo em Metros: ${sdForm.estimativaConsumo}`,
        `Preço Alvo: ${sdForm.precoAlvo}`,
        `Necessita de Amostra: ${sdForm.necessitaAmostra === 'sim' ? `Sim (${sdForm.amostraTipo})` : 'Não'}`,
        `Desenvolvimento: ${sdForm.desenvolvimento}`,
        `Amostra Referência Anexa: ${sdForm.amostraReferenciaAnexa === 'sim' ? `Sim - Fabricante: ${sdForm.qualFabricante}` : 'Não'}`,
      ];
      if (sdForm.amostraReferenciaAnexa !== 'sim') {
        lines.push(`Gramatura Total: ${sdForm.gramaturaTotal}`, `Espessura: ${sdForm.espessura}`, `Substrato: ${sdForm.substrato}`, `Gravação: ${sdForm.gravacao}`);
        lines.push(`Aditivos: ${sdForm.aditivos === 'sim' ? `Sim - ${sdForm.quaisAditivos}` : 'Não'}`);
        lines.push(`Cor Pantone: ${sdForm.corPantone === 'sim' ? `Sim - ${sdForm.qualPantone}` : 'Não'}`);
      }
      if (sdForm.observacoesComplementares) lines.push(`Observações Complementares: ${sdForm.observacoesComplementares}`);
      return lines.join('\n');
    }
    if (isRNC) return `[RNC] NF Venda: ${rncForm.nfVenda}, Produtos: ${rncForm.produtos.filter(p => p.produto).map((p, i) => `${p.produto} (Cód: ${p.cod || '-'}, Metros: ${p.metros || '-'})`).join('; ')}${rncForm.descricaoNaoConformidade ? '\nDescrição: ' + rncForm.descricaoNaoConformidade : ''}`;
    if (isAmostras) {
      const tipo = amostrasForm.amostraTipo === 'cartela' ? 'Cartela' : amostrasForm.amostraTipo === 'metragem' ? 'Metragem' : amostrasForm.amostraTipo === 'a4' ? 'A4' : '-';
      const prodCount = Object.keys(amostrasForm.selectedProducts).length;
      return `[Amostras] Tipo: ${tipo}, Qtd: ${amostrasForm.amostraQuantidade}, Produtos selecionados: ${prodCount}${amostrasForm.finalidade ? '\nFinalidade: ' + amostrasForm.finalidade : ''}`;
    }
    if (isBook) return `[Book] Tipo: ${bookForm.tipoBook}, Quantidade: ${bookForm.quantidade}, Destino: ${bookForm.destino}${bookForm.observacoes ? '\nObservações: ' + bookForm.observacoes : ''}`;
    return '';
  };

  // Helper to build description from structured fields
  const buildDescricao = (negociacao: boolean) => {
    if (hasSpecialForm && specialFormFilled) {
      // Não inclui dados do formulário especial na descrição - ficam apenas no PDF
      return descricaoTexto || '';
    }
    if (!negociacao) return descricaoTexto;
    const prodLines = produtos.map((p, i) => 
      `Produto ${i + 1}: Cód: ${p.codProduto}, Produto: ${p.produto}, Preço: ${p.preco}, Metros: ${p.metros}`
    ).join('\n');
    const structured = `${prodLines}\nPrazo: ${prazo}\nTipo de Entrega: ${tipoEntrega}`;
    return descricaoTexto ? `${structured}\n\nObservações: ${descricaoTexto}` : structured;
  };

  // Created tickets (from session + loaded from DB)
  const [chamadosCriados, setChamadosCriados] = useState<ChamadoCriado[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // New client dialog
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [newClientNome, setNewClientNome] = useState('');
  const [newClientCodigo, setNewClientCodigo] = useState('');
  const [newClientRede, setNewClientRede] = useState('');
  const [savingClient, setSavingClient] = useState(false);
  const [showNewRedeInput, setShowNewRedeInput] = useState(false);
  const [newRedeNome, setNewRedeNome] = useState('');
  const [savingRede, setSavingRede] = useState(false);

  const isSupervisorLocked = role === 'supervisor' || role === 'representante';
  const isRepresentanteLocked = role === 'representante';

  // Derived filtered lists
  const filteredRepresentantes = selectedSupervisor
    ? representantes.filter(r =>
        srLinks.some(sr => sr.supervisor_id === selectedSupervisor && sr.representante_id === r.id)
      )
    : representantes;

  const filteredClientes = selectedRepresentante
    ? clientes.filter(c => c.representante_id === selectedRepresentante)
    : clientes;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mRes, sRes, supRes, repRes, srRes, redeRes, gestorRolesRes, profilesRes] = await Promise.all([
          supabase.from('motivos').select('id, nome').order('nome'),
          supabase.from('submotivos').select('id, motivo_id, nome').order('nome'),
          supabase.from('supervisores').select('id, nome').eq('status', 'ativo').order('nome'),
          supabase.from('representantes').select('id, codigo, nome').order('nome'),
          supabase.from('supervisor_representante').select('supervisor_id, representante_id'),
          supabase.from('redes').select('id, nome').order('nome'),
          supabase.from('user_roles').select('user_id, role').in('role', ['gestor', 'admin']),
          supabase.from('profiles').select('id, nome, user_id, status').eq('status', 'ativo'),
        ]);
        if (mRes.data) setMotivos(mRes.data);
        if (sRes.data) setSubmotivos(sRes.data);
        if (supRes.data) setSupervisores(supRes.data);
        if (repRes.data) setRepresentantes(repRes.data);
        if (srRes.data) setSrLinks(srRes.data);
        if (redeRes.data) setRedes(redeRes.data);

        // Build gestor profiles list
        const gestorUserIds = new Set((gestorRolesRes?.data || []).map((r: any) => r.user_id));
        const gestores = (profilesRes?.data || [])
          .filter((p: any) => gestorUserIds.has(p.user_id))
          .map((p: any) => ({ id: p.id, nome: p.nome }));
        setGestorProfiles(gestores);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    fetchData();
  }, []);

  // Load existing open/THOR chamados from DB
  const loadExistingTickets = async () => {
    setLoadingTickets(true);
    try {
      const { data, error } = await supabase
        .from('chamados')
        .select('*')
        .eq('status', 'aberto')
        .eq('etapa', 'thor')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      if (data && data.length > 0) {
        // Resolve names for loaded chamados
        const supIds = [...new Set(data.map(d => d.supervisor_id).filter(Boolean))];
        const repIds = [...new Set(data.map(d => d.representante_id).filter(Boolean))];
        const clienteIds = [...new Set(data.map(d => d.cliente_id).filter(Boolean))];
        
        const [supRes, repRes, clienteRes, redeRes] = await Promise.all([
          supIds.length > 0 ? supabase.from('supervisores').select('id, nome').in('id', supIds) : { data: [] },
          repIds.length > 0 ? supabase.from('representantes').select('id, nome').in('id', repIds) : { data: [] },
          clienteIds.length > 0 ? supabase.from('clientes').select('id, codigo, nome, rede_id').in('id', clienteIds) : { data: [] },
          supabase.from('redes').select('id, nome'),
        ]);

        const supMap = new Map((supRes.data || []).map((s: any) => [s.id, s.nome]));
        const repMap = new Map((repRes.data || []).map((r: any) => [r.id, r.nome]));
        const clienteMap = new Map((clienteRes.data || []).map((c: any) => [c.id, c]));
        const redeMap = new Map((redeRes.data || []).map((r: any) => [r.id, r.nome]));

        const mapped: ChamadoCriado[] = data.map((d: any) => {
          const cliente = clienteMap.get(d.cliente_id);
          return {
            id: d.id,
            status: d.status,
            etapa: d.etapa?.toUpperCase() || 'THOR',
            supervisor: supMap.get(d.supervisor_id) || '',
            representante: repMap.get(d.representante_id) || '',
            cliente: d.cliente_nome || '',
            codigoCliente: cliente?.codigo?.toString() || '',
            rede: cliente?.rede_id ? (redeMap.get(cliente.rede_id) || '') : '',
            dataContato: d.data_contato || '',
            dataRetorno: d.data_retorno || '',
            motivo: d.motivo || '',
            submotivo: d.submotivo || '',
            metrosTotais: (d as any).metros_totais || '',
            negociadoCom: (d as any).negociado_com || '',
            nfe: (d as any).nfe || '',
            tipoSolicitacao: (d as any).tipo_solicitacao || '',
            gestor: '',
            statusAgendamento: (d as any).status_agendamento || '',
            descricao: d.descricao || '',
            anexosNomes: [],
            anexos: [],
            criadoEm: new Date(d.created_at).toLocaleString('pt-BR'),
          };
        });
        setChamadosCriados(mapped);
      } else {
        setChamadosCriados([]);
      }
    } catch (err) {
      console.error('Erro ao carregar tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    loadExistingTickets();

    // Realtime subscription for chamados changes from any user
    const channel = supabase
      .channel('novo-chamado-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados' }, () => {
        loadExistingTickets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-fill supervisor/representante based on logged-in user role
  useEffect(() => {
    if (!profile || !role) return;
    if (role === 'supervisor') {
      // Find supervisor record matching profile name
      const sup = supervisores.find(s => s.nome === profile.supervisora || s.nome === profile.nome);
      if (sup && selectedSupervisor !== sup.id) {
        setSelectedSupervisor(sup.id);
      }
    } else if (role === 'representante') {
      // Find representante matching profile name
      const rep = representantes.find(r => r.nome === profile.nome);
      if (rep && selectedRepresentante !== rep.id) {
        // Find linked supervisor
        const link = srLinks.find(sr => sr.representante_id === rep.id);
        if (link) {
          const sup = supervisores.find(s => s.id === link.supervisor_id);
          if (sup && selectedSupervisor !== sup.id) {
            setSelectedSupervisor(sup.id);
          }
        }
        setSelectedRepresentante(rep.id);
      }
    }
  }, [profile, role, supervisores, representantes, srLinks]);

  useEffect(() => {
    const fetchClientes = async () => {
      if (!selectedRepresentante) {
        setClientes([]);
        return;
      }
      const { data } = await supabase
        .from('clientes')
        .select('id, codigo, nome, representante_id, rede_id')
        .eq('representante_id', selectedRepresentante)
        .order('nome')
        .limit(1000);
      if (data) setClientes(data as Cliente[]);
    };
    fetchClientes();
  }, [selectedRepresentante]);

  useEffect(() => {
    if (selectedMotivo) {
      setFilteredSubmotivos(submotivos.filter(s => s.motivo_id === selectedMotivo));
    } else {
      setFilteredSubmotivos([]);
    }
  }, [selectedMotivo, submotivos]);

  const handleSupervisorChange = (value: string) => {
    setSelectedSupervisor(value);
    setSelectedRepresentante('');
    setSelectedCodigoCliente('');
    setSelectedCliente('');
    setSelectedRede('');
  };

  const handleRepresentanteChange = (value: string) => {
    setSelectedRepresentante(value);
    setSelectedCodigoCliente('');
    setSelectedCliente('');
    setSelectedRede('');
  };

  const handleCodigoClienteChange = (value: string) => {
    setSelectedCodigoCliente(value);
    setSelectedCliente(value);
    const cliente = clientes.find(c => c.id === value);
    if (cliente?.rede_id) {
      setSelectedRede(cliente.rede_id);
    } else {
      setSelectedRede('');
    }
  };

  const handleClienteChange = (value: string) => {
    setSelectedCliente(value);
    setSelectedCodigoCliente(value);
    const cliente = clientes.find(c => c.id === value);
    if (cliente?.rede_id) {
      setSelectedRede(cliente.rede_id);
    } else {
      setSelectedRede('');
    }
  };

  // Helper to get names from IDs
  const getName = (list: { id: string; nome: string }[], id: string) =>
    list.find(item => item.id === id)?.nome || '';

  const handleCriarChamado = async () => {
    // Validation
    if (!selectedCliente) {
      toast.error('Selecione um cliente.');
      return;
    }
    if (!dataRetorno) {
      toast.error('Informe a data de retorno.');
      return;
    }
    if (!selectedMotivo) {
      toast.error('Selecione o motivo principal.');
      return;
    }
    // Conditional required fields for Negociação
    if (isNegociacao) {
      if (!metrosTotais) {
        toast.error('Informe os metros totais (obrigatório para Negociação).');
        return;
      }
      if (!negociadoCom) {
        toast.error('Selecione com quem foi negociado (obrigatório para Negociação).');
        return;
      }
    }
    // Validate structured description fields only for Negociação
    if (isNegociacao) {
      const hasEmptyProduct = produtos.some(p => !p.codProduto || !p.produto || !p.preco || !p.metros);
      if (hasEmptyProduct) {
        toast.error('Preencha todos os campos de produto na descrição.');
        return;
      }
      if (!prazo) {
        toast.error('Informe o prazo na descrição.');
        return;
      }
      if (!tipoEntrega) {
        toast.error('Selecione o tipo de entrega na descrição.');
        return;
      }
    }

    // Anexos obrigatórios para motivos especiais
    if (hasSpecialForm && anexos.length === 0) {
      toast.error('Anexos são obrigatórios para este tipo de solicitação.');
      return;
    }

    setSubmitting(true);
    try {
      const clienteObj = clientes.find(c => c.id === selectedCliente);
      const motivoNome = getName(motivos, selectedMotivo);
      const submotivoNome = getName(filteredSubmotivos, selectedSubmotivo);

      const { data, error } = await supabase.from('chamados').insert({
        cliente_id: selectedCliente,
        cliente_nome: clienteObj?.nome || '',
        motivo: motivoNome,
        submotivo: submotivoNome || null,
        descricao: buildDescricao(isNegociacao) || null,
        status: 'aberto',
        etapa: 'thor',
        supervisor_id: selectedSupervisor || null,
        representante_id: selectedRepresentante || null,
        prioridade: 'Média',
        gestor_id: gestor || null,
        data_contato: dataContato || null,
        data_retorno: dataRetorno || null,
        metros_totais: metrosTotais || null,
        negociado_com: negociadoCom || null,
        nfe: nfe || null,
        tipo_solicitacao: tipoSolicitacao || null,
        status_agendamento: statusAgendamento || null,
      } as any).select('id').single();

      if (error) throw error;

      // Upload attachments to Supabase Storage
      const uploadedFiles: { nome: string; path: string }[] = [];
      for (const file of anexos) {
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${data.id}/${Date.now()}_${sanitizedName}`;
        const { error: uploadError } = await supabase.storage
          .from('chamado-anexos')
          .upload(filePath, file, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false,
          });
        if (uploadError) {
          console.error('Erro ao enviar anexo:', uploadError.message, uploadError);
          toast.error(`Erro ao enviar ${file.name}: ${uploadError.message}`);
        } else {
          uploadedFiles.push({ nome: file.name, path: filePath });
        }
      }

      const novoChamado: ChamadoCriado = {
        id: data.id,
        status: 'aberto',
        etapa: 'THOR',
        supervisor: getName(supervisores, selectedSupervisor),
        representante: getName(representantes, selectedRepresentante),
        cliente: clienteObj?.nome || '',
        codigoCliente: clienteObj?.codigo?.toString() || '',
        rede: getName(redes, selectedRede),
        dataContato,
        dataRetorno,
        motivo: motivoNome,
        submotivo: submotivoNome,
        metrosTotais,
        negociadoCom,
        nfe,
        tipoSolicitacao,
        gestor: gestorProfiles.find(g => g.id === gestor)?.nome || '',
        statusAgendamento,
        descricao: buildDescricao(isNegociacao),
        anexosNomes: anexos.map(f => f.name),
        anexos: uploadedFiles,
        criadoEm: new Date().toLocaleString('pt-BR'),
      };

      setChamadosCriados(prev => [novoChamado, ...prev.filter(c => c.id !== novoChamado.id)]);

      // Register creation in history
      let userProfileId: string | null = null;
      if (profile?.id) {
        userProfileId = profile.id;
      } else {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: prof } = await supabase.from('profiles').select('id').eq('user_id', currentUser.id).maybeSingle();
          userProfileId = prof?.id || null;
        }
      }
      // Save special form data to sdp_data column
      if (hasSpecialForm && specialFormFilled) {
        let formData: any = null;
        if (isSD) formData = { ...sdForm, formType: 'sdp' };
        else if (isRNC) formData = { ...rncForm, formType: 'rnc' };
        else if (isAmostras) formData = { ...amostrasForm, formType: 'amostras' };
        else if (isBook) formData = { ...bookForm, formType: 'book' };
        if (formData) {
          await supabase.from('chamados').update({ sdp_data: formData as any } as any).eq('id', data.id);
        }
      }

      const { error: histError } = await supabase.from('chamado_historico').insert({
        chamado_id: data.id,
        user_id: userProfileId,
        acao: 'Ticket Criado',
        descricao: `Ticket criado — Cliente: ${clienteObj?.nome || ''}, Motivo: ${motivoNome}${submotivoNome ? ', Objetivo: ' + submotivoNome : ''}, Status: Aberto, Etapa: THOR`,
        descricao_ticket: buildDescricao(isNegociacao) || null,
      } as any);
      if (histError) console.error('Erro ao inserir histórico de criação:', histError);

      toast.success(`Chamado #${data.id} criado com sucesso!`);

      // Reset form (preserve locked fields)
      if (!isSupervisorLocked) setSelectedSupervisor('');
      if (!isRepresentanteLocked) setSelectedRepresentante('');
      setSelectedCodigoCliente('');
      setSelectedCliente('');
      setSelectedRede('');
      setSelectedMotivo('');
      setSelectedSubmotivo('');
      setDataContato('');
      setDataRetorno('');
      setMetrosTotais('');
      setNegociadoCom('');
      setNfe('');
      setTipoSolicitacao('');
      setGestor('');
      setStatusAgendamento('');
      setProdutos([{ codProduto: '', produto: '', preco: '', metros: '' }]);
      setPrazo('');
      setTipoEntrega('');
      setDescricaoTexto('');
      setSdForm({ ...defaultSdForm });
      setRncForm({ ...defaultRncForm });
      setAmostrasForm({ ...defaultAmostrasFullForm });
      setBookForm({ tipoBook: '', quantidade: '', destino: '', observacoes: '' });
      setSpecialFormFilled(false);
      setAnexos([]);
      setFileErrors([]);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao criar chamado: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLimpar = () => {
    if (!isSupervisorLocked) setSelectedSupervisor('');
    if (!isRepresentanteLocked) setSelectedRepresentante('');
    setSelectedCodigoCliente('');
    setSelectedCliente('');
    setSelectedRede('');
    setSelectedMotivo('');
    setSelectedSubmotivo('');
    setDataContato('');
    setDataRetorno('');
    setMetrosTotais('');
    setNegociadoCom('');
    setNfe('');
    setTipoSolicitacao('');
    setGestor('');
    setStatusAgendamento('');
    setProdutos([{ codProduto: '', produto: '', preco: '', metros: '' }]);
    setPrazo('');
    setTipoEntrega('');
    setDescricaoTexto('');
    setSdForm({ ...defaultSdForm });
    setRncForm({ ...defaultRncForm });
    setAmostrasForm({ ...defaultAmostrasFullForm });
    setBookForm({ tipoBook: '', quantidade: '', destino: '', observacoes: '' });
    setSpecialFormFilled(false);
    setAnexos([]);
    setFileErrors([]);
  };

  const handleSaveNewClient = async () => {
    if (!newClientNome.trim()) {
      toast.error('Informe o nome do cliente.');
      return;
    }
    if (!selectedRepresentante) {
      toast.error('Selecione um representante antes de cadastrar um cliente.');
      return;
    }
    setSavingClient(true);
    try {
      const insertData: any = {
        nome: newClientNome.trim(),
        representante_id: selectedRepresentante,
      };
      if (newClientCodigo) insertData.codigo = Number(newClientCodigo);
      if (newClientRede) insertData.rede_id = newClientRede;

      const { data, error } = await supabase.from('clientes').insert(insertData).select('id, codigo, nome, representante_id, rede_id').single();
      if (error) throw error;

      // Add to local list and select
      setClientes(prev => [...prev, data as Cliente]);
      setSelectedCliente(data.id);
      setSelectedCodigoCliente(data.id);
      if (data.rede_id) setSelectedRede(data.rede_id);

      toast.success(`Cliente "${data.nome}" cadastrado com sucesso!`);
      setShowNewClientDialog(false);
      setNewClientNome('');
      setNewClientCodigo('');
      setNewClientRede('');
    } catch (err: any) {
      toast.error('Erro ao cadastrar cliente: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSavingClient(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col min-h-[calc(100vh-3rem-3rem)] -m-6">
        <div className="flex-1 p-6">
          <div className="bg-card border rounded-lg p-6">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <div>
                <Label className="text-xs font-semibold">Supervisor</Label>
                <Select value={selectedSupervisor} onValueChange={handleSupervisorChange} disabled={isSupervisorLocked}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {supervisores.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Representantes</Label>
                <Select value={selectedRepresentante} onValueChange={handleRepresentanteChange} disabled={isRepresentanteLocked}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {filteredRepresentantes.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Código do Cliente Opcional</Label>
                <SearchableSelect
                  className="mt-1"
                  value={selectedCodigoCliente}
                  onValueChange={handleCodigoClienteChange}
                  disabled={!selectedRepresentante}
                  placeholder={selectedRepresentante ? "Selecione o Código" : "Selecione um representante"}
                  searchPlaceholder="Pesquisar código..."
                  options={filteredClientes.map(c => ({ value: c.id, label: String(c.codigo || '—') }))}
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-destructive">* Clientes</Label>
                  <button type="button" title="Cadastrar novo cliente" onClick={() => setShowNewClientDialog(true)} className="text-primary hover:text-primary/80 transition-colors">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <SearchableSelect
                  className="mt-1 border-destructive/50"
                  value={selectedCliente}
                  onValueChange={handleClienteChange}
                  disabled={!selectedRepresentante}
                  placeholder={selectedRepresentante ? "Selecione o Cliente" : "Selecione um representante"}
                  searchPlaceholder="Pesquisar cliente..."
                  options={filteredClientes.map(c => ({ value: c.id, label: c.nome }))}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
              <div>
                <Label className="text-xs font-semibold">Rede Opcional</Label>
                <SearchableSelect
                  className="mt-1"
                  value={selectedRede}
                  onValueChange={setSelectedRede}
                  placeholder="Auto-preenchido"
                  searchPlaceholder="Pesquisar rede..."
                  options={redes.map(r => ({ value: r.id, label: r.nome }))}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Data Contato</Label>
                <Input type="date" className="mt-1" value={dataContato} onChange={e => setDataContato(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-destructive">* Data Retorno</Label>
                <Input type="date" className="mt-1 border-destructive/50" value={dataRetorno} onChange={e => setDataRetorno(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-destructive">* Motivo Principal da Solicitação</Label>
                <Select onValueChange={v => { setSelectedMotivo(v); setSelectedSubmotivo(''); setSpecialFormFilled(false); setSdForm({ ...defaultSdForm }); setRncForm({ ...defaultRncForm }); setAmostrasForm({ ...defaultAmostrasFullForm }); setBookForm({ tipoBook: '', quantidade: '', destino: '', observacoes: '' }); setDescricaoTexto(''); }} value={selectedMotivo}>
                  <SelectTrigger className="mt-1 border-destructive/50"><SelectValue placeholder="Selecione o Motivo" /></SelectTrigger>
                  <SelectContent>
                    {motivos.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Objetivo Principal da Solicitação</Label>
                <Select disabled={!selectedMotivo} value={selectedSubmotivo} onValueChange={setSelectedSubmotivo}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={selectedMotivo ? "Selecione o Objetivo" : "Selecione um motivo primeiro"} /></SelectTrigger>
                  <SelectContent>
                    {filteredSubmotivos.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
              <div>
                <Label className={`text-xs font-semibold ${isNegociacao ? 'text-destructive' : ''}`}>{isNegociacao ? '* ' : ''}Metros Totais</Label>
                <Input className={`mt-1 ${isNegociacao ? 'border-destructive/50' : ''}`} value={metrosTotais} onChange={e => setMetrosTotais(e.target.value)} />
              </div>
              <div>
                <Label className={`text-xs font-semibold ${isNegociacao ? 'text-destructive' : ''}`}>{isNegociacao ? '* ' : ''}Negociado com:</Label>
                <Select value={negociadoCom} onValueChange={setNegociadoCom}>
                  <SelectTrigger className={`mt-1 ${isNegociacao ? 'border-destructive/50' : ''}`}><SelectValue placeholder="Localizar itens" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="André">André</SelectItem>
                    <SelectItem value="Douglas">Douglas</SelectItem>
                    <SelectItem value="Vinicius">Vinicius</SelectItem>
                    <SelectItem value="João Pedro">João Pedro</SelectItem>
                    <SelectItem value="Sr Ivo">Sr Ivo</SelectItem>
                    <SelectItem value="Tathy">Tathy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Nº NFE</Label>
                <Input className="mt-1" value={nfe} onChange={e => setNfe(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold">Tipo de Solicitação</Label>
                <Select value={tipoSolicitacao} onValueChange={setTipoSolicitacao}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Interna">Interna</SelectItem>
                    <SelectItem value="Romplas">Romplas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Gestor</Label>
                <Select value={gestor} onValueChange={setGestor}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
                  <SelectContent>
                    {gestorProfiles.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Status Agendamentos</Label>
                <Select value={statusAgendamento} onValueChange={setStatusAgendamento}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Agendado">Agendado</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>


            {/* Row 4 - Descrição (campos estruturados) + Anexos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">{isNegociacao ? <span className="text-destructive">* </span> : ''}Descrição</Label>
                {isNegociacao ? (
                  <div className="mt-1 border border-destructive/50 rounded-lg p-4 space-y-3">
                    {/* Produtos */}
                    {produtos.map((prod, i) => (
                      <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Cód Produto *</Label>
                          <Input
                            className="h-8 text-xs border-destructive/50"
                            placeholder="Código"
                            value={prod.codProduto}
                            onChange={e => {
                              const updated = [...produtos];
                              updated[i] = { ...updated[i], codProduto: e.target.value };
                              setProdutos(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Produto *</Label>
                          <Input
                            className="h-8 text-xs border-destructive/50"
                            placeholder="Produto"
                            value={prod.produto}
                            onChange={e => {
                              const updated = [...produtos];
                              updated[i] = { ...updated[i], produto: e.target.value };
                              setProdutos(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Preço *</Label>
                          <Input
                            className="h-8 text-xs border-destructive/50"
                            placeholder="R$ 0,00"
                            value={prod.preco}
                            onChange={e => {
                              const updated = [...produtos];
                              updated[i] = { ...updated[i], preco: e.target.value };
                              setProdutos(updated);
                            }}
                          />
                        </div>
                        <div className="flex gap-1 items-end">
                          <div className="flex-1">
                            <Label className="text-[10px] text-muted-foreground">Metros *</Label>
                            <Input
                              className="h-8 text-xs border-destructive/50"
                              placeholder="Metros"
                              value={prod.metros}
                              onChange={e => {
                                const updated = [...produtos];
                                updated[i] = { ...updated[i], metros: e.target.value };
                                setProdutos(updated);
                              }}
                            />
                          </div>
                          {produtos.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setProdutos(prev => prev.filter((_, idx) => idx !== i))}
                              className="h-8 w-8 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setProdutos(prev => [...prev, { codProduto: '', produto: '', preco: '', metros: '' }])}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Produto
                    </Button>

                    {/* Prazo e Tipo de Entrega */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Prazo *</Label>
                        <Input
                          className="h-8 text-xs border-destructive/50"
                          placeholder="Ex: 30 dias"
                          value={prazo}
                          onChange={e => setPrazo(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Tipo de Entrega *</Label>
                        <Select value={tipoEntrega} onValueChange={setTipoEntrega}>
                          <SelectTrigger className="h-8 text-xs border-destructive/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Imediata">Imediata</SelectItem>
                            <SelectItem value="Programada">Programada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Descrição livre abaixo dos campos estruturados */}
                    <div className="pt-2 border-t">
                      <Label className="text-[10px] text-muted-foreground">Observações</Label>
                      <Textarea
                        className="mt-1 min-h-[80px] text-xs"
                        placeholder="Descrição adicional..."
                        value={descricaoTexto}
                        onChange={e => setDescricaoTexto(e.target.value)}
                      />
                    </div>
                  </div>
                ) : hasSpecialForm ? (
                  <div className="mt-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={specialFormFilled ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => {
                          if (isSD) {
                            const repNome = representantes.find(r => r.id === selectedRepresentante)?.nome || '';
                            setSdForm(p => ({ ...p, representante: repNome }));
                            setShowSDForm(true);
                          }
                          else if (isRNC) {
                            const repNome = representantes.find(r => r.id === selectedRepresentante)?.nome || '';
                            const clienteNome = clientes.find(c => c.id === selectedCliente)?.nome || '';
                            setRncForm(p => ({ ...p, representante: repNome, cliente: clienteNome }));
                            setShowRNCForm(true);
                          }
                          else if (isAmostras) setShowAmostrasForm(true);
                          else if (isBook) setShowBookForm(true);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {specialFormFilled ? '✓ ' : ''}Preencher Solicitação de {isSD ? 'SD' : isRNC ? 'RNC' : isAmostras ? 'Amostras' : 'Books'}
                      </Button>
                      {specialFormFilled && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Visualizar / Editar solicitação"
                          onClick={() => {
                            if (isSD) {
                              const repNome = representantes.find(r => r.id === selectedRepresentante)?.nome || '';
                              setSdForm(p => ({ ...p, representante: repNome }));
                              setShowSDForm(true);
                            }
                            else if (isRNC) {
                              const repNome = representantes.find(r => r.id === selectedRepresentante)?.nome || '';
                              const clienteNome = clientes.find(c => c.id === selectedCliente)?.nome || '';
                              setRncForm(p => ({ ...p, representante: repNome, cliente: clienteNome }));
                              setShowRNCForm(true);
                            }
                            else if (isAmostras) setShowAmostrasForm(true);
                            else if (isBook) setShowBookForm(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Observações</Label>
                      <Textarea
                        className="mt-1 min-h-[80px]"
                        placeholder="Descrição adicional..."
                        value={descricaoTexto}
                        onChange={e => setDescricaoTexto(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <Textarea
                    className="mt-1 min-h-[140px]"
                    placeholder="Descrição do chamado..."
                    value={descricaoTexto}
                    onChange={e => setDescricaoTexto(e.target.value)}
                  />
                )}
              </div>
              <div>
                <Label className="text-xs font-semibold">Anexos {hasSpecialForm && <span className="text-destructive">*</span>}</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={ACCEPT_STRING}
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const errors: string[] = [];
                    const valid: globalThis.File[] = [];
                    files.forEach(f => {
                      const config = ACCEPTED_TYPES[f.type];
                      if (!config) {
                        errors.push(`"${f.name}" — formato não suportado.`);
                      } else if (f.size > config.maxMB * 1024 * 1024) {
                        errors.push(`"${f.name}" excede ${config.maxMB} MB (limite para ${config.label}).`);
                      } else {
                        valid.push(f);
                      }
                    });
                    setFileErrors(errors);
                    setAnexos(prev => [...prev, ...valid]);
                    e.target.value = '';
                  }}
                />
                <div className="mt-1 border rounded-lg p-4 min-h-[140px] flex flex-col">
                  {anexos.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                      <p className="text-sm">Não há nada em anexo.</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {anexos.map((file, i) => {
                        const config = ACCEPTED_TYPES[file.type];
                        return (
                          <div key={i} className="flex items-center gap-1.5 bg-muted rounded-md px-2.5 py-1.5 text-xs">
                            {config?.icon}
                            <span className="max-w-[120px] truncate">{file.name}</span>
                            <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                            <button
                              type="button"
                              onClick={() => setAnexos(prev => prev.filter((_, idx) => idx !== i))}
                              className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {fileErrors.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {fileErrors.map((err, i) => (
                        <p key={i} className="text-xs text-destructive">{err}</p>
                      ))}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mx-auto mt-auto"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                    Anexar Arquivos
                  </Button>

                  <div className="mt-3 border-t pt-2">
                    <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                      <span className="font-semibold">Formatos e limites:</span>{' '}
                      PDF, DOCX, XLSX (até 10 MB) · MP4 (até 50 MB) · JPEG, PNG (até 5 MB) · MP3 (até 15 MB) · TXT (até 2 MB)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chamados Criados - only show status=aberto & etapa=THOR */}
          {chamadosCriados.filter(c => c.status === 'aberto' && c.etapa.toLowerCase() === 'thor').length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-semibold">Tickets Criados</h2>
                <Badge variant="secondary" className="ml-1">{chamadosCriados.filter(c => c.status === 'aberto' && c.etapa.toLowerCase() === 'thor').length}</Badge>
              </div>
              {chamadosCriados.filter(c => c.status === 'aberto' && c.etapa.toLowerCase() === 'thor').map(c => (
                <ChamadoCard
                  key={c.id}
                  chamado={c}
                  onUpdate={(updated) => {
                    setChamadosCriados(prev => prev.map(item => item.id === updated.id ? updated : item));
                  }}
                  onDelete={(id) => {
                    setChamadosCriados(prev => prev.filter(item => item.id !== id));
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="sticky bottom-0 bg-card border-t px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-1.5" />
              Início
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/historico')}>
              <Clock className="h-4 w-4 mr-1.5" />
              Histórico
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleLimpar}>
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Limpar
            </Button>
            <Button size="sm" onClick={handleCriarChamado} disabled={submitting}>
              {submitting ? 'Criando...' : 'Criar Chamado'}
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog Cadastrar Novo Cliente */}
      <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Nome do Cliente *</Label>
              <Input className="mt-1" value={newClientNome} onChange={e => setNewClientNome(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Código (opcional)</Label>
              <Input className="mt-1" type="number" value={newClientCodigo} onChange={e => setNewClientCodigo(e.target.value)} placeholder="Código numérico" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Rede (opcional)</Label>
                <button
                  type="button"
                  onClick={() => setShowNewRedeInput(true)}
                  className="text-primary hover:text-primary/80 transition-colors"
                  title="Cadastrar nova rede"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {showNewRedeInput ? (
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newRedeNome}
                    onChange={e => setNewRedeNome(e.target.value)}
                    placeholder="Nome da nova rede"
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    disabled={savingRede || !newRedeNome.trim()}
                    onClick={async () => {
                      setSavingRede(true);
                      try {
                        const { data, error } = await supabase.from('redes').insert({ nome: newRedeNome.trim() }).select('id, nome').single();
                        if (error) throw error;
                        setRedes(prev => [...prev, data as Rede]);
                        setNewClientRede(data.id);
                        setNewRedeNome('');
                        setShowNewRedeInput(false);
                        toast.success(`Rede "${data.nome}" cadastrada!`);
                      } catch (err: any) {
                        toast.error('Erro ao cadastrar rede: ' + (err.message || 'Erro desconhecido'));
                      } finally {
                        setSavingRede(false);
                      }
                    }}
                  >
                    {savingRede ? '...' : 'OK'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowNewRedeInput(false); setNewRedeNome(''); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <SearchableSelect
                  className="mt-1"
                  value={newClientRede}
                  onValueChange={setNewClientRede}
                  placeholder="Selecione a rede"
                  searchPlaceholder="Pesquisar rede..."
                  options={redes.map(r => ({ value: r.id, label: r.nome }))}
                />
              )}
            </div>
            {selectedSupervisor && (
              <div>
                <Label className="text-xs font-semibold">Supervisor</Label>
                <Input className="mt-1" value={supervisores.find(s => s.id === selectedSupervisor)?.nome || ''} disabled />
              </div>
            )}
            {selectedRepresentante && (
              <div>
                <Label className="text-xs font-semibold">Representante</Label>
                <Input className="mt-1" value={representantes.find(r => r.id === selectedRepresentante)?.nome || ''} disabled />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowNewClientDialog(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSaveNewClient} disabled={savingClient}>
              {savingClient ? 'Salvando...' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SD Form Dialog */}
      <Dialog open={showSDForm} onOpenChange={setShowSDForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <img src={romplasLogo} alt="Romplas" className="h-10 object-contain" />
            </div>
            <DialogTitle className="text-center">SDP - Solicitação de Desenvolvimento de Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cliente *</Label>
                <SearchableSelect
                  className="mt-1"
                  value={sdForm.cliente}
                  onValueChange={val => setSdForm(p => ({ ...p, cliente: val }))}
                  placeholder="Selecione o cliente"
                  searchPlaceholder="Pesquisar cliente..."
                  options={filteredClientes.map(c => ({ value: c.nome, label: c.nome }))}
                />
              </div>
              <div><Label className="text-xs">Representante *</Label><Input className="mt-1" value={sdForm.representante} disabled /></div>
            </div>
            <div><Label className="text-xs">Segmento de Mercado *</Label><Input className="mt-1" value={sdForm.segmentoMercado} onChange={e => setSdForm(p => ({ ...p, segmentoMercado: e.target.value }))} /></div>
            <div><Label className="text-xs">Aplicação do Produto *</Label><Input className="mt-1" value={sdForm.aplicacaoProduto} onChange={e => setSdForm(p => ({ ...p, aplicacaoProduto: e.target.value }))} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label className="text-xs">Estimativa de Consumo em Metros *</Label><Input className="mt-1" value={sdForm.estimativaConsumo} onChange={e => setSdForm(p => ({ ...p, estimativaConsumo: e.target.value }))} /></div>
              <div><Label className="text-xs">Preço Alvo *</Label><Input className="mt-1" value={sdForm.precoAlvo} onChange={e => setSdForm(p => ({ ...p, precoAlvo: e.target.value }))} /></div>
            </div>

            {/* Necessita de Amostra */}
            <div className="border rounded-lg p-3 space-y-2">
              <Label className="text-xs font-semibold">Necessita de Amostra?</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="necessitaAmostra" checked={sdForm.necessitaAmostra === 'nao'} onChange={() => setSdForm(p => ({ ...p, necessitaAmostra: 'nao', amostraTipo: '' }))} /> Não</label>
                <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="necessitaAmostra" checked={sdForm.necessitaAmostra === 'sim'} onChange={() => setSdForm(p => ({ ...p, necessitaAmostra: 'sim' }))} /> Sim</label>
                {sdForm.necessitaAmostra === 'sim' && (
                  <>
                    <span className="text-xs text-muted-foreground ml-2">—</span>
                    <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="amostraTipo" checked={sdForm.amostraTipo === 'placa'} onChange={() => setSdForm(p => ({ ...p, amostraTipo: 'placa' }))} /> Placa</label>
                    <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="amostraTipo" checked={sdForm.amostraTipo === 'metros'} onChange={() => setSdForm(p => ({ ...p, amostraTipo: 'metros' }))} /> Metros</label>
                  </>
                )}
              </div>
            </div>

            {/* Desenvolvimento */}
            <div className="border rounded-lg p-3 space-y-2">
              <Label className="text-xs font-semibold">Desenvolvimento *</Label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="desenvolvimento" checked={sdForm.desenvolvimento === 'nova_cor'} onChange={() => setSdForm(p => ({ ...p, desenvolvimento: 'nova_cor' }))} /> Nova Cor em Produto de Linha</label>
                <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="desenvolvimento" checked={sdForm.desenvolvimento === 'novo_produto'} onChange={() => setSdForm(p => ({ ...p, desenvolvimento: 'novo_produto' }))} /> Novo Produto / Cor</label>
                <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="desenvolvimento" checked={sdForm.desenvolvimento === 'extrusado'} onChange={() => setSdForm(p => ({ ...p, desenvolvimento: 'extrusado' }))} /> Extrusado</label>
                <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="desenvolvimento" checked={sdForm.desenvolvimento === 'espalmado'} onChange={() => setSdForm(p => ({ ...p, desenvolvimento: 'espalmado' }))} /> Espalmado</label>
              </div>
            </div>

            {/* No caso de novos produtos */}
            <div className="border rounded-lg p-3 space-y-2">
              <Label className="text-xs font-semibold">No caso de novos produtos</Label>
              <div className="space-y-2">
                <Label className="text-xs">Amostra Referência Anexa:</Label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="amostraRef" checked={sdForm.amostraReferenciaAnexa === 'nao'} onChange={() => setSdForm(p => ({ ...p, amostraReferenciaAnexa: 'nao', qualFabricante: '' }))} /> Não</label>
                  <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="amostraRef" checked={sdForm.amostraReferenciaAnexa === 'sim'} onChange={() => setSdForm(p => ({ ...p, amostraReferenciaAnexa: 'sim' }))} /> Sim</label>
                </div>
                {sdForm.amostraReferenciaAnexa === 'sim' && (
                  <div><Label className="text-xs">Qual Fabricante?</Label><Input className="mt-1" value={sdForm.qualFabricante} onChange={e => setSdForm(p => ({ ...p, qualFabricante: e.target.value }))} /></div>
                )}
              </div>
              {sdForm.amostraReferenciaAnexa !== 'sim' && (
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-[10px] text-muted-foreground italic">Se for SIM no caso acima, não é necessário especificar os campos abaixo:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><Label className="text-xs">Gramatura Total</Label><Input className="mt-1" value={sdForm.gramaturaTotal} onChange={e => setSdForm(p => ({ ...p, gramaturaTotal: e.target.value }))} /></div>
                    <div><Label className="text-xs">Espessura</Label><Input className="mt-1" value={sdForm.espessura} onChange={e => setSdForm(p => ({ ...p, espessura: e.target.value }))} /></div>
                    <div><Label className="text-xs">Substrato</Label><Input className="mt-1" value={sdForm.substrato} onChange={e => setSdForm(p => ({ ...p, substrato: e.target.value }))} /></div>
                    <div><Label className="text-xs">Gravação</Label><Input className="mt-1" value={sdForm.gravacao} onChange={e => setSdForm(p => ({ ...p, gravacao: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Aditivos:</Label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="aditivos" checked={sdForm.aditivos === 'nao'} onChange={() => setSdForm(p => ({ ...p, aditivos: 'nao', quaisAditivos: '' }))} /> Não</label>
                      <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="aditivos" checked={sdForm.aditivos === 'sim'} onChange={() => setSdForm(p => ({ ...p, aditivos: 'sim' }))} /> Sim</label>
                    </div>
                    {sdForm.aditivos === 'sim' && <Input placeholder="Quais?" value={sdForm.quaisAditivos} onChange={e => setSdForm(p => ({ ...p, quaisAditivos: e.target.value }))} />}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Cor Pantone:</Label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="corPantone" checked={sdForm.corPantone === 'nao'} onChange={() => setSdForm(p => ({ ...p, corPantone: 'nao', qualPantone: '' }))} /> Não</label>
                      <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="corPantone" checked={sdForm.corPantone === 'sim'} onChange={() => setSdForm(p => ({ ...p, corPantone: 'sim' }))} /> Sim</label>
                    </div>
                    {sdForm.corPantone === 'sim' && <Input placeholder="Qual?" value={sdForm.qualPantone} onChange={e => setSdForm(p => ({ ...p, qualPantone: e.target.value }))} />}
                  </div>
                </div>
              )}
            </div>

            {/* Observações Complementares */}
            <div><Label className="text-xs">Observações Complementares</Label><Textarea className="mt-1" value={sdForm.observacoesComplementares} onChange={e => setSdForm(p => ({ ...p, observacoesComplementares: e.target.value }))} /></div>

            {/* Aprovação */}
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-1.5 text-xs font-medium">
                  <input type="radio" name="statusAprovacao" checked={sdForm.statusAprovacao === 'aprovada'} onChange={() => setSdForm(p => ({ ...p, statusAprovacao: 'aprovada', motivoReprovacao: '' }))} />
                  APROVADA
                </label>
                <label className="flex items-center gap-1.5 text-xs font-medium">
                  <input type="radio" name="statusAprovacao" checked={sdForm.statusAprovacao === 'reprovada'} onChange={() => setSdForm(p => ({ ...p, statusAprovacao: 'reprovada' }))} />
                  REPROVADA, POR QUE?
                </label>
              </div>
              <div>
                <Label className="text-xs font-semibold text-center block">MOTIVO</Label>
                <Textarea className="mt-1" placeholder="Informe o motivo..." value={sdForm.motivoReprovacao} onChange={e => setSdForm(p => ({ ...p, motivoReprovacao: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowSDForm(false)}>Cancelar</Button>
            <Button variant="secondary" onClick={async () => {
              if (!sdForm.cliente || !sdForm.representante || !sdForm.segmentoMercado || !sdForm.aplicacaoProduto || !sdForm.estimativaConsumo || !sdForm.precoAlvo || !sdForm.desenvolvimento) {
                toast.error('Preencha todos os campos obrigatórios.');
                return;
              }
              // Generate PDF matching modal layout
              const doc = new jsPDF();
              const pageW = doc.internal.pageSize.getWidth();
              const margin = 15;
              const contentW = pageW - margin * 2;
              let y = 12;

              const checkPage = (needed: number) => { if (y + needed > 280) { doc.addPage(); y = 15; } };

              // Logo centralizada
              try {
                const logoImg = new window.Image();
                logoImg.crossOrigin = 'anonymous';
                await new Promise<void>((resolve, reject) => {
                  logoImg.onload = () => resolve();
                  logoImg.onerror = () => reject();
                  logoImg.src = '/images/romplas-logo-pdf.png';
                });
                const logoH = 12;
                const logoW = logoH * (logoImg.naturalWidth / logoImg.naturalHeight);
                doc.addImage(logoImg, 'PNG', (pageW - logoW) / 2, y, logoW, logoH);
                y += logoH + 4;
              } catch { /* fallback sem logo */ }

              // Header
              doc.setFontSize(13);
              doc.setFont('helvetica', 'bold');
              doc.text('Solicitação de Desenvolvimento de Produto', pageW / 2, y, { align: 'center' });
              y += 8;

              // Linha separadora
              doc.setDrawColor(180);
              doc.line(margin, y, pageW - margin, y);
              y += 8;

              // Campos em grid (label em bold + valor)
              const addField = (label: string, value: string) => {
                checkPage(12);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text(label, margin, y);
                doc.setFont('helvetica', 'normal');
                doc.text(value || '-', margin + doc.getTextWidth(label) + 3, y);
                y += 7;
              };

              const addFieldRow = (label1: string, val1: string, label2: string, val2: string) => {
                checkPage(12);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text(label1, margin, y);
                doc.setFont('helvetica', 'normal');
                doc.text(val1 || '-', margin + doc.getTextWidth(label1) + 3, y);
                const col2X = pageW / 2 + 5;
                doc.setFont('helvetica', 'bold');
                doc.text(label2, col2X, y);
                doc.setFont('helvetica', 'normal');
                doc.text(val2 || '-', col2X + doc.getTextWidth(label2) + 3, y);
                y += 7;
              };

              const addSectionBox = (title: string, contentFn: () => void) => {
                checkPage(25);
                const startY = y;
                y += 2;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text(title, margin + 3, y + 4);
                y += 9;
                doc.setFont('helvetica', 'normal');
                contentFn();
                y += 2;
                doc.setDrawColor(200);
                doc.roundedRect(margin, startY, contentW, y - startY, 2, 2, 'S');
                y += 6;
              };

              // Cliente / Representante
              addFieldRow('Cliente:', sdForm.cliente, 'Representante:', sdForm.representante);
              y += 2;
              addField('Segmento de Mercado:', sdForm.segmentoMercado);
              addField('Aplicação do Produto:', sdForm.aplicacaoProduto);
              addFieldRow('Estimativa de Consumo em Metros:', sdForm.estimativaConsumo, 'Preço Alvo:', sdForm.precoAlvo);
              y += 3;

              // Necessita de Amostra - boxed
              addSectionBox('Necessita de Amostra?', () => {
                const amostraText = sdForm.necessitaAmostra === 'sim'
                  ? `Sim — ${sdForm.amostraTipo === 'placa' ? 'Placa' : sdForm.amostraTipo === 'metros' ? 'Metros' : '-'}`
                  : 'Não';
                doc.text(amostraText, margin + 3, y);
                y += 5;
              });

              // Desenvolvimento - boxed
              const devLabels: Record<string, string> = { nova_cor: 'Nova Cor em Produto de Linha', novo_produto: 'Novo Produto/Cor', extrusado: 'Extrusado', espalmado: 'Espalmado' };
              addSectionBox('Desenvolvimento:', () => {
                doc.text(devLabels[sdForm.desenvolvimento] || sdForm.desenvolvimento, margin + 3, y);
                y += 5;
              });

              // No caso de novos produtos - boxed
              addSectionBox('No caso de novos produtos', () => {
                doc.setFont('helvetica', 'bold');
                doc.text('Amostra Referência Anexa:', margin + 3, y);
                doc.setFont('helvetica', 'normal');
                const refText = sdForm.amostraReferenciaAnexa === 'sim' ? `Sim — Fabricante: ${sdForm.qualFabricante}` : 'Não';
                doc.text(refText, margin + 3 + doc.getTextWidth('Amostra Referência Anexa: ') + 2, y);
                y += 7;

                if (sdForm.amostraReferenciaAnexa !== 'sim') {
                  doc.setFontSize(7);
                  doc.setTextColor(130);
                  doc.text('Se for SIM no caso acima, não é necessário especificar os campos abaixo:', margin + 3, y);
                  doc.setTextColor(0);
                  doc.setFontSize(9);
                  y += 6;

                  // Grid fields
                  const col2X = pageW / 2 + 5;
                  doc.setFont('helvetica', 'bold');
                  doc.text('Gramatura Total:', margin + 3, y);
                  doc.setFont('helvetica', 'normal');
                  doc.text(sdForm.gramaturaTotal || '-', margin + 3 + doc.getTextWidth('Gramatura Total: ') + 2, y);
                  doc.setFont('helvetica', 'bold');
                  doc.text('Espessura:', col2X, y);
                  doc.setFont('helvetica', 'normal');
                  doc.text(sdForm.espessura || '-', col2X + doc.getTextWidth('Espessura: ') + 2, y);
                  y += 7;

                  doc.setFont('helvetica', 'bold');
                  doc.text('Substrato:', margin + 3, y);
                  doc.setFont('helvetica', 'normal');
                  doc.text(sdForm.substrato || '-', margin + 3 + doc.getTextWidth('Substrato: ') + 2, y);
                  doc.setFont('helvetica', 'bold');
                  doc.text('Gravação:', col2X, y);
                  doc.setFont('helvetica', 'normal');
                  doc.text(sdForm.gravacao || '-', col2X + doc.getTextWidth('Gravação: ') + 2, y);
                  y += 7;

                  doc.setFont('helvetica', 'bold');
                  doc.text('Aditivos:', margin + 3, y);
                  doc.setFont('helvetica', 'normal');
                  doc.text(sdForm.aditivos === 'sim' ? `Sim — ${sdForm.quaisAditivos}` : 'Não', margin + 3 + doc.getTextWidth('Aditivos: ') + 2, y);
                  y += 7;

                  doc.setFont('helvetica', 'bold');
                  doc.text('Cor Pantone:', margin + 3, y);
                  doc.setFont('helvetica', 'normal');
                  doc.text(sdForm.corPantone === 'sim' ? `Sim — ${sdForm.qualPantone}` : 'Não', margin + 3 + doc.getTextWidth('Cor Pantone: ') + 2, y);
                  y += 5;
                }
              });

              // Observações
              if (sdForm.observacoesComplementares) {
                checkPage(15);
                doc.setFont('helvetica', 'bold');
                doc.text('Observações Complementares:', margin, y);
                y += 6;
                doc.setFont('helvetica', 'normal');
                const obsLines = doc.splitTextToSize(sdForm.observacoesComplementares, contentW);
                doc.text(obsLines, margin, y);
                y += obsLines.length * 5;
              }

              // Aprovação / Reprovação
              checkPage(25);
              y += 3;
              addSectionBox('', () => {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                const aprovadaLabel = '( ' + (sdForm.statusAprovacao === 'aprovada' ? 'X' : ' ') + ' ) APROVADA';
                const reprovadaLabel = '( ' + (sdForm.statusAprovacao === 'reprovada' ? 'X' : ' ') + ' ) REPROVADA, POR QUE?';
                doc.text(aprovadaLabel + '    ' + reprovadaLabel, margin + 3, y);
                y += 8;
                doc.setFont('helvetica', 'bold');
                doc.text('MOTIVO', pageW / 2, y, { align: 'center' });
                y += 6;
                doc.setDrawColor(0);
                doc.line(margin + 3, y, pageW - margin - 3, y);
                y += 3;
                doc.setFont('helvetica', 'normal');
                if (sdForm.motivoReprovacao) {
                  const motivoLines = doc.splitTextToSize(sdForm.motivoReprovacao, contentW - 6);
                  doc.text(motivoLines, margin + 3, y);
                  y += motivoLines.length * 5;
                } else {
                  doc.text('R:', margin + 3, y);
                  doc.line(margin + 10, y + 1, pageW - margin - 3, y + 1);
                  y += 5;
                }
              });
              const pdfBlob = doc.output('blob');
              const cleanName = (sdForm.cliente || 'solicitacao').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
              const pdfFile = new globalThis.File([pdfBlob], `SDP_${cleanName}.pdf`, { type: 'application/pdf' });
              setAnexos(prev => [...prev, pdfFile]);
              setSpecialFormFilled(true);
              setShowSDForm(false);
              toast.success('Formulário SDP salvo e PDF anexado!');
            }}>
              <FileText className="h-4 w-4 mr-1.5" /> Confirmar e Anexar PDF
            </Button>
            <Button onClick={() => {
              if (!sdForm.cliente || !sdForm.representante || !sdForm.segmentoMercado || !sdForm.aplicacaoProduto || !sdForm.estimativaConsumo || !sdForm.precoAlvo || !sdForm.desenvolvimento) {
                toast.error('Preencha todos os campos obrigatórios.');
                return;
              }
              setSpecialFormFilled(true);
              setShowSDForm(false);
            }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RNC Form Dialog */}
      <Dialog open={showRNCForm} onOpenChange={setShowRNCForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <img src={romplasLogo} alt="Romplas" className="h-10 object-contain" />
            </div>
            <DialogTitle className="text-center">RNC - Relatório de Não Conformidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Cliente / Representante */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label className="text-xs">Cliente *</Label><Input className="mt-1" value={rncForm.cliente} onChange={e => setRncForm(p => ({ ...p, cliente: e.target.value }))} /></div>
              <div><Label className="text-xs">Representante *</Label><Input className="mt-1" value={rncForm.representante} disabled /></div>
            </div>

            {/* Produtos dinâmicos */}
            {rncForm.produtos.map((prod, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
                <div><Label className="text-xs">Produto {idx === 0 ? '*' : idx + 1}</Label><Input className="mt-1" value={prod.produto} onChange={e => { const prods = [...rncForm.produtos]; prods[idx] = { ...prods[idx], produto: e.target.value }; setRncForm(p => ({ ...p, produtos: prods })); }} /></div>
                <div><Label className="text-xs">Cód.</Label><Input className="mt-1" value={prod.cod} onChange={e => { const prods = [...rncForm.produtos]; prods[idx] = { ...prods[idx], cod: e.target.value }; setRncForm(p => ({ ...p, produtos: prods })); }} /></div>
                <div><Label className="text-xs">Metros</Label><Input className="mt-1" value={prod.metros} onChange={e => { const prods = [...rncForm.produtos]; prods[idx] = { ...prods[idx], metros: e.target.value }; setRncForm(p => ({ ...p, produtos: prods })); }} /></div>
                <div className="flex gap-1 pb-0.5">
                  {idx === rncForm.produtos.length - 1 && (
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setRncForm(p => ({ ...p, produtos: [...p.produtos, { produto: '', cod: '', metros: '' }] }))}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                  {rncForm.produtos.length > 1 && (
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8 text-destructive" onClick={() => { const prods = rncForm.produtos.filter((_, i) => i !== idx); setRncForm(p => ({ ...p, produtos: prods })); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {/* Amostra Anexa + Imagens */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold">OBRIGATÓRIO - AMOSTRA ANEXA?</Label>
                  <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="rnc-amostraAnexa" checked={rncForm.amostraAnexa === 'nao'} onChange={() => setRncForm(p => ({ ...p, amostraAnexa: 'nao' }))} /> NÃO</label>
                  <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="rnc-amostraAnexa" checked={rncForm.amostraAnexa === 'sim'} onChange={() => setRncForm(p => ({ ...p, amostraAnexa: 'sim' }))} /> SIM</label>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-xs font-semibold">IMAGENS:</Label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={rncForm.imagensVideo} onChange={e => setRncForm(p => ({ ...p, imagensVideo: e.target.checked }))} /> VÍDEO
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={rncForm.imagensFotos} onChange={e => setRncForm(p => ({ ...p, imagensFotos: e.target.checked }))} /> FOTOS
                  </label>
                </div>
              </div>
            </div>

            {/* NF Venda */}
            <div><Label className="text-xs">Número da Nota Fiscal de Venda *</Label><Input className="mt-1" value={rncForm.nfVenda} onChange={e => setRncForm(p => ({ ...p, nfVenda: e.target.value }))} /></div>

            {/* Descrição da Não Conformidade */}
            <div>
              <Label className="text-xs font-semibold">DESCRIÇÃO DA NÃO CONFORMIDADE *</Label>
              <Textarea className="mt-1 min-h-[100px]" value={rncForm.descricaoNaoConformidade} onChange={e => setRncForm(p => ({ ...p, descricaoNaoConformidade: e.target.value }))} />
            </div>

            {/* Objetivo da RNC */}
            <div className="border rounded-lg p-3 space-y-2">
              <Label className="text-xs font-semibold text-center block">OBJETIVO DA RNC</Label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={rncForm.objetivoAlertarEmpresa} onChange={e => setRncForm(p => ({ ...p, objetivoAlertarEmpresa: e.target.checked }))} /> ALERTAR A EMPRESA (ROMPLAS)</label>
                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={rncForm.objetivoDevParcial} onChange={e => setRncForm(p => ({ ...p, objetivoDevParcial: e.target.checked }))} /> DEVOLUÇÃO PARCIAL</label>
                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={rncForm.objetivoDevTotal} onChange={e => setRncForm(p => ({ ...p, objetivoDevTotal: e.target.checked }))} /> DEVOLUÇÃO TOTAL</label>
                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={rncForm.objetivoNegociacao} onChange={e => setRncForm(p => ({ ...p, objetivoNegociacao: e.target.checked }))} /> NEGOCIAÇÃO</label>
              </div>
            </div>

            {/* Parecer da Fábrica */}
            <div className="border rounded-lg p-3 space-y-2">
              <Label className="text-xs font-semibold text-center block">PARECER DA FÁBRICA (ROMPLAS)</Label>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="rnc-parecer" checked={rncForm.parecerFabrica === 'procede'} onChange={() => setRncForm(p => ({ ...p, parecerFabrica: 'procede', autorizadoResposta: '' }))} /> PROCEDE</label>
                <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="rnc-parecer" checked={rncForm.parecerFabrica === 'nao_procede'} onChange={() => setRncForm(p => ({ ...p, parecerFabrica: 'nao_procede', autorizadoResposta: '' }))} /> NÃO PROCEDE, POR QUE?</label>
                <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="rnc-parecer" checked={rncForm.parecerFabrica === 'autorizado'} onChange={() => setRncForm(p => ({ ...p, parecerFabrica: 'autorizado' }))} /> AUTORIZADO</label>
              </div>
              {rncForm.parecerFabrica === 'autorizado' && (
                <div className="flex items-center gap-4 ml-6 pt-1">
                  <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="rnc-autorizado-resp" checked={rncForm.autorizadoResposta === 'sim'} onChange={() => setRncForm(p => ({ ...p, autorizadoResposta: 'sim' }))} /> SIM</label>
                  <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="rnc-autorizado-resp" checked={rncForm.autorizadoResposta === 'nao'} onChange={() => setRncForm(p => ({ ...p, autorizadoResposta: 'nao' }))} /> NÃO</label>
                </div>
              )}
            </div>

            {/* Motivo */}
            <div>
              <Label className="text-xs font-semibold text-center block">MOTIVO</Label>
              <Textarea className="mt-1 min-h-[80px]" placeholder="R:" value={rncForm.motivo} onChange={e => setRncForm(p => ({ ...p, motivo: e.target.value }))} />
            </div>

            {/* Fechamento da RNC */}
            <div>
              <Label className="text-xs font-semibold text-center block">FECHAMENTO DA RNC (COMERCIAL/FINANCEIRO)</Label>
              <Textarea className="mt-1 min-h-[80px]" placeholder="R:" value={rncForm.fechamentoRnc} onChange={e => setRncForm(p => ({ ...p, fechamentoRnc: e.target.value }))} />
            </div>

            {/* Assinaturas */}
            <div className="border rounded-lg p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Data Comercial</Label><Input type="date" className="mt-1" value={rncForm.dataComercial} onChange={e => setRncForm(p => ({ ...p, dataComercial: e.target.value }))} /></div>
                <div><Label className="text-xs">Assinatura Comercial</Label><Input className="mt-1" value={rncForm.assinaturaComercial} onChange={e => setRncForm(p => ({ ...p, assinaturaComercial: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Data Qualidade</Label><Input type="date" className="mt-1" value={rncForm.dataQualidade} onChange={e => setRncForm(p => ({ ...p, dataQualidade: e.target.value }))} /></div>
                <div><Label className="text-xs">Assinatura Qualidade</Label><Input className="mt-1" value={rncForm.assinaturaQualidade} onChange={e => setRncForm(p => ({ ...p, assinaturaQualidade: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Data Financeiro</Label><Input type="date" className="mt-1" value={rncForm.dataFinanceiro} onChange={e => setRncForm(p => ({ ...p, dataFinanceiro: e.target.value }))} /></div>
                <div><Label className="text-xs">Assinatura Financeiro</Label><Input className="mt-1" value={rncForm.assinaturaFinanceiro} onChange={e => setRncForm(p => ({ ...p, assinaturaFinanceiro: e.target.value }))} /></div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowRNCForm(false)}>Cancelar</Button>
            <Button variant="secondary" onClick={async () => {
              if (!rncForm.cliente || !rncForm.produtos[0]?.produto || !rncForm.nfVenda || !rncForm.descricaoNaoConformidade) {
                toast.error('Preencha os campos obrigatórios (Cliente, Produto, NF Venda, Descrição).');
                return;
              }
              const doc = new jsPDF();
              const pageW = doc.internal.pageSize.getWidth();
              const margin = 15;
              const contentW = pageW - margin * 2;
              let y = 12;
              const checkPage = (needed: number) => { if (y + needed > 280) { doc.addPage(); y = 15; } };

              // Logo
              try {
                const logoImg = new window.Image();
                logoImg.crossOrigin = 'anonymous';
                await new Promise<void>((resolve, reject) => { logoImg.onload = () => resolve(); logoImg.onerror = () => reject(); logoImg.src = '/images/romplas-logo-pdf.png'; });
                const logoH = 12; const logoW = logoH * (logoImg.naturalWidth / logoImg.naturalHeight);
                doc.addImage(logoImg, 'PNG', (pageW - logoW) / 2, y, logoW, logoH); y += logoH + 4;
              } catch { /* fallback */ }

              doc.setFontSize(13); doc.setFont('helvetica', 'bold');
              doc.text('RNC - Relatório de Não Conformidade', pageW / 2, y, { align: 'center' }); y += 8;
              doc.setDrawColor(180); doc.line(margin, y, pageW - margin, y); y += 8;

              const addField = (label: string, value: string) => { checkPage(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(label, margin, y); doc.setFont('helvetica', 'normal'); doc.text(value || '-', margin + doc.getTextWidth(label) + 3, y); y += 7; };
              const addFieldRow = (l1: string, v1: string, l2: string, v2: string) => { checkPage(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(l1, margin, y); doc.setFont('helvetica', 'normal'); doc.text(v1 || '-', margin + doc.getTextWidth(l1) + 3, y); const col2X = pageW / 2 + 5; doc.setFont('helvetica', 'bold'); doc.text(l2, col2X, y); doc.setFont('helvetica', 'normal'); doc.text(v2 || '-', col2X + doc.getTextWidth(l2) + 3, y); y += 7; };
              const addSectionBox = (title: string, contentFn: () => void) => { checkPage(25); const startY = y; y += 2; doc.setFont('helvetica', 'bold'); doc.setFontSize(9); if (title) doc.text(title, margin + 3, y + 4); y += title ? 9 : 4; doc.setFont('helvetica', 'normal'); contentFn(); y += 2; doc.setDrawColor(200); doc.roundedRect(margin, startY, contentW, y - startY, 2, 2, 'S'); y += 6; };

              addFieldRow('Cliente:', rncForm.cliente, 'Representante:', rncForm.representante); y += 2;

              // Produtos
              addSectionBox('Produtos', () => {
                rncForm.produtos.filter(p => p.produto).forEach((prod, i) => {
                  checkPage(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
                  doc.text(`Produto ${i + 1}:`, margin + 3, y); doc.setFont('helvetica', 'normal'); doc.text(prod.produto || '-', margin + 3 + doc.getTextWidth(`Produto ${i + 1}: `) + 2, y);
                  const col2X = pageW / 2 - 5;
                  doc.setFont('helvetica', 'bold'); doc.text('Cód:', col2X, y); doc.setFont('helvetica', 'normal'); doc.text(prod.cod || '-', col2X + doc.getTextWidth('Cód: ') + 2, y);
                  const col3X = pageW / 2 + 30;
                  doc.setFont('helvetica', 'bold'); doc.text('Metros:', col3X, y); doc.setFont('helvetica', 'normal'); doc.text(prod.metros || '-', col3X + doc.getTextWidth('Metros: ') + 2, y); y += 7;
                });
              });

              // Amostra + Imagens
              addSectionBox('Amostra / Imagens', () => {
                doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
                doc.text('Amostra Anexa:', margin + 3, y); doc.setFont('helvetica', 'normal'); doc.text(rncForm.amostraAnexa === 'sim' ? 'SIM' : 'NÃO', margin + 3 + doc.getTextWidth('Amostra Anexa: ') + 2, y);
                const imgX = pageW / 2;
                doc.setFont('helvetica', 'bold'); doc.text('Imagens:', imgX, y); doc.setFont('helvetica', 'normal');
                const imgs = [rncForm.imagensVideo ? 'Vídeo' : '', rncForm.imagensFotos ? 'Fotos' : ''].filter(Boolean).join(', ') || 'Nenhuma';
                doc.text(imgs, imgX + doc.getTextWidth('Imagens: ') + 2, y); y += 5;
              });

              addField('Número da Nota Fiscal de Venda:', rncForm.nfVenda); y += 2;

              // Descrição
              addSectionBox('Descrição da Não Conformidade', () => {
                doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
                const descLines = doc.splitTextToSize(rncForm.descricaoNaoConformidade, contentW - 6);
                doc.text(descLines, margin + 3, y); y += descLines.length * 5;
              });

              // Objetivo
              addSectionBox('Objetivo da RNC', () => {
                doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
                doc.text(`(${rncForm.objetivoAlertarEmpresa ? 'X' : ' '}) Alertar a Empresa    (${rncForm.objetivoDevParcial ? 'X' : ' '}) Devolução Parcial`, margin + 3, y); y += 6;
                doc.text(`(${rncForm.objetivoDevTotal ? 'X' : ' '}) Devolução Total    (${rncForm.objetivoNegociacao ? 'X' : ' '}) Negociação`, margin + 3, y); y += 5;
              });

              // Parecer
              addSectionBox('Parecer da Fábrica (Romplas)', () => {
                doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
                doc.text(`(${rncForm.parecerFabrica === 'procede' ? 'X' : ' '}) PROCEDE    (${rncForm.parecerFabrica === 'nao_procede' ? 'X' : ' '}) NÃO PROCEDE, POR QUE?    (${rncForm.parecerFabrica === 'autorizado' ? 'X' : ' '}) AUTORIZADO`, margin + 3, y); y += 6;
                if (rncForm.parecerFabrica === 'autorizado') {
                  doc.text(`    (${rncForm.autorizadoResposta === 'sim' ? 'X' : ' '}) SIM    (${rncForm.autorizadoResposta === 'nao' ? 'X' : ' '}) NÃO`, margin + 3, y); y += 5;
                }
              });

              // Motivo
              addSectionBox('Motivo', () => {
                doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
                if (rncForm.motivo) { const mLines = doc.splitTextToSize(rncForm.motivo, contentW - 6); doc.text(mLines, margin + 3, y); y += mLines.length * 5; } else { doc.text('R:', margin + 3, y); doc.line(margin + 10, y + 1, pageW - margin - 3, y + 1); y += 5; }
              });

              // Fechamento
              addSectionBox('Fechamento da RNC (Comercial/Financeiro)', () => {
                doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
                if (rncForm.fechamentoRnc) { const fLines = doc.splitTextToSize(rncForm.fechamentoRnc, contentW - 6); doc.text(fLines, margin + 3, y); y += fLines.length * 5; } else { doc.text('R:', margin + 3, y); doc.line(margin + 10, y + 1, pageW - margin - 3, y + 1); y += 5; }
              });

              // Assinaturas
              checkPage(30); doc.setDrawColor(180); doc.line(margin, y, pageW - margin, y); y += 5;
              doc.setFontSize(9);
              const sigCol1 = margin; const sigCol2 = pageW / 2 + 5;
              doc.setFont('helvetica', 'bold'); doc.text(`Data: ${rncForm.dataComercial || '___/___/___'}`, sigCol1, y); doc.text(`Assinatura Comercial: ${rncForm.assinaturaComercial || '________________'}`, sigCol2, y); y += 7;
              doc.text(`Data: ${rncForm.dataQualidade || '___/___/___'}`, sigCol1, y); doc.text(`Assinatura Qualidade: ${rncForm.assinaturaQualidade || '________________'}`, sigCol2, y); y += 7;
              doc.text(`Data: ${rncForm.dataFinanceiro || '___/___/___'}`, sigCol1, y); doc.text(`Assinatura Financeiro: ${rncForm.assinaturaFinanceiro || '________________'}`, sigCol2, y);

              const pdfBlob = doc.output('blob');
              const cleanName = (rncForm.cliente || 'rnc').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
              const pdfFile = new globalThis.File([pdfBlob], `RNC_${cleanName}.pdf`, { type: 'application/pdf' });
              setAnexos(prev => [...prev, pdfFile]);
              setSpecialFormFilled(true);
              setShowRNCForm(false);
              toast.success('Formulário RNC salvo e PDF anexado!');
            }}>
              <FileText className="h-4 w-4 mr-1.5" /> Confirmar e Anexar PDF
            </Button>
            <Button onClick={() => {
              if (!rncForm.cliente || !rncForm.produtos[0]?.produto || !rncForm.nfVenda || !rncForm.descricaoNaoConformidade) { toast.error('Preencha os campos obrigatórios.'); return; }
              setSpecialFormFilled(true); setShowRNCForm(false);
            }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Amostras Form Dialog */}
      <AmostrasCreationForm
        open={showAmostrasForm}
        onOpenChange={setShowAmostrasForm}
        clienteNome={clientes.find(c => c.id === selectedCliente)?.nome || ''}
        representanteNome={representantes.find(r => r.id === selectedRepresentante)?.nome || ''}
        codigoCliente={clientes.find(c => c.id === selectedCliente)?.codigo?.toString() || ''}
        formData={amostrasForm}
        onFormDataChange={setAmostrasForm}
        onConfirm={(data, pdfFile) => {
          setAmostrasForm(data);
          if (pdfFile) {
            setAnexos(prev => [...prev, pdfFile]);
            toast.success('Formulário Amostras salvo e PDF anexado!');
          }
          setSpecialFormFilled(true);
          setShowAmostrasForm(false);
        }}
      />

      {/* Book Form Dialog */}
      <Dialog open={showBookForm} onOpenChange={setShowBookForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <img src={romplasLogo} alt="Romplas" className="h-10 object-contain" />
            </div>
            <DialogTitle className="text-center">Solicitação de Books</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Tipo de Book *</Label><Input className="mt-1" value={bookForm.tipoBook} onChange={e => setBookForm(p => ({ ...p, tipoBook: e.target.value }))} /></div>
              <div><Label className="text-xs">Quantidade *</Label><Input className="mt-1" value={bookForm.quantidade} onChange={e => setBookForm(p => ({ ...p, quantidade: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Destino *</Label><Input className="mt-1" value={bookForm.destino} onChange={e => setBookForm(p => ({ ...p, destino: e.target.value }))} /></div>
            <div><Label className="text-xs">Observações</Label><Textarea className="mt-1" value={bookForm.observacoes} onChange={e => setBookForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowBookForm(false)}>Cancelar</Button>
            <Button variant="secondary" onClick={async () => {
              if (!bookForm.tipoBook || !bookForm.quantidade || !bookForm.destino) { toast.error('Preencha todos os campos obrigatórios.'); return; }
              const doc = new jsPDF();
              const pageW = doc.internal.pageSize.getWidth();
              const margin = 15;
              const contentW = pageW - margin * 2;
              let y = 12;
              const checkPage = (needed: number) => { if (y + needed > 280) { doc.addPage(); y = 15; } };
              try {
                const logoImg = new window.Image(); logoImg.crossOrigin = 'anonymous';
                await new Promise<void>((resolve, reject) => { logoImg.onload = () => resolve(); logoImg.onerror = () => reject(); logoImg.src = '/images/romplas-logo-pdf.png'; });
                const logoH = 12; const logoW = logoH * (logoImg.naturalWidth / logoImg.naturalHeight);
                doc.addImage(logoImg, 'PNG', (pageW - logoW) / 2, y, logoW, logoH); y += logoH + 4;
              } catch { /* fallback */ }
              doc.setFontSize(13); doc.setFont('helvetica', 'bold');
              doc.text('Solicitação de Books', pageW / 2, y, { align: 'center' }); y += 8;
              doc.setDrawColor(180); doc.line(margin, y, pageW - margin, y); y += 8;

              const addFieldRow = (l1: string, v1: string, l2: string, v2: string) => { checkPage(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(l1, margin, y); doc.setFont('helvetica', 'normal'); doc.text(v1 || '-', margin + doc.getTextWidth(l1) + 3, y); const col2X = pageW / 2 + 5; doc.setFont('helvetica', 'bold'); doc.text(l2, col2X, y); doc.setFont('helvetica', 'normal'); doc.text(v2 || '-', col2X + doc.getTextWidth(l2) + 3, y); y += 7; };
              const addSectionBox = (title: string, contentFn: () => void) => { checkPage(25); const startY = y; y += 2; doc.setFont('helvetica', 'bold'); doc.setFontSize(9); if (title) doc.text(title, margin + 3, y + 4); y += title ? 9 : 4; doc.setFont('helvetica', 'normal'); contentFn(); y += 2; doc.setDrawColor(200); doc.roundedRect(margin, startY, contentW, y - startY, 2, 2, 'S'); y += 6; };

              const clienteNome = clientes.find(c => c.id === selectedCliente)?.nome || '';
              const repNome = representantes.find(r => r.id === selectedRepresentante)?.nome || '';
              addFieldRow('Cliente:', clienteNome, 'Representante:', repNome); y += 2;

              addSectionBox('Dados do Book', () => {
                addFieldRow('Tipo de Book:', bookForm.tipoBook, 'Quantidade:', bookForm.quantidade);
                doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
                doc.text('Destino:', margin + 3, y); doc.setFont('helvetica', 'normal'); doc.text(bookForm.destino || '-', margin + 3 + doc.getTextWidth('Destino: ') + 2, y); y += 7;
              });

              if (bookForm.observacoes) {
                addSectionBox('Observações', () => {
                  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
                  const obsLines = doc.splitTextToSize(bookForm.observacoes, contentW - 6);
                  doc.text(obsLines, margin + 3, y); y += obsLines.length * 5;
                });
              }

              const pdfBlob = doc.output('blob');
              const cleanName = (clienteNome || 'book').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
              const pdfFile = new globalThis.File([pdfBlob], `Book_${cleanName}.pdf`, { type: 'application/pdf' });
              setAnexos(prev => [...prev, pdfFile]);
              setSpecialFormFilled(true); setShowBookForm(false);
              toast.success('Formulário Book salvo e PDF anexado!');
            }}>
              <FileText className="h-4 w-4 mr-1.5" /> Confirmar e Anexar PDF
            </Button>
            <Button onClick={() => {
              if (!bookForm.tipoBook || !bookForm.quantidade || !bookForm.destino) { toast.error('Preencha todos os campos obrigatórios.'); return; }
              setSpecialFormFilled(true); setShowBookForm(false);
            }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
