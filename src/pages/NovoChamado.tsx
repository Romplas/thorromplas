import { useState, useEffect, useRef } from 'react';
import { Paperclip, Home, Clock, RotateCcw, X, FileText, FileSpreadsheet, Film, Image, Music, File, CheckCircle2, Eye, Pencil } from 'lucide-react';
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
  const { profile } = useAuth();
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
  const [descricao, setDescricao] = useState('');

  // Created tickets
  const [chamadosCriados, setChamadosCriados] = useState<ChamadoCriado[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
        descricao: descricao || null,
        status: 'aberto',
        etapa: 'thor',
        supervisor_id: selectedSupervisor || null,
        representante_id: selectedRepresentante || null,
        prioridade: 'Média',
        gestor_id: gestor || null,
        data_contato: dataContato || null,
        data_retorno: dataRetorno || null,
      } as any).select('id').single();

      if (error) throw error;

      // Upload attachments to Supabase Storage
      const uploadedFiles: { nome: string; path: string }[] = [];
      for (const file of anexos) {
        const filePath = `${data.id}/${Date.now()}_${file.name}`;
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
        descricao,
        anexosNomes: anexos.map(f => f.name),
        anexos: uploadedFiles,
        criadoEm: new Date().toLocaleString('pt-BR'),
      };

      setChamadosCriados(prev => [novoChamado, ...prev]);

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
      const { error: histError } = await supabase.from('chamado_historico').insert({
        chamado_id: data.id,
        user_id: userProfileId,
        acao: 'Ticket Criado',
        descricao: `Ticket criado — Cliente: ${clienteObj?.nome || ''}, Motivo: ${motivoNome}${submotivoNome ? ', Objetivo: ' + submotivoNome : ''}, Status: Aberto, Etapa: THOR`,
        descricao_ticket: descricao || null,
      } as any);
      if (histError) console.error('Erro ao inserir histórico de criação:', histError);

      toast.success(`Chamado #${data.id} criado com sucesso!`);

      // Reset form
      setSelectedSupervisor('');
      setSelectedRepresentante('');
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
      setDescricao('');
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
    setSelectedSupervisor('');
    setSelectedRepresentante('');
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
    setDescricao('');
    setAnexos([]);
    setFileErrors([]);
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
                <Select value={selectedSupervisor} onValueChange={handleSupervisorChange}>
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
                <Select value={selectedRepresentante} onValueChange={handleRepresentanteChange}>
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
                <Label className="text-xs font-semibold text-destructive">* Clientes</Label>
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
                <Select onValueChange={v => { setSelectedMotivo(v); setSelectedSubmotivo(''); }} value={selectedMotivo}>
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
                <Label className="text-xs font-semibold">Metros Totais</Label>
                <Input className="mt-1" value={metrosTotais} onChange={e => setMetrosTotais(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold">Negociado com:</Label>
                <Select value={negociadoCom} onValueChange={setNegociadoCom}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
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


            {/* Row 4 - Descrição + Anexos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">Descrição</Label>
                <Textarea className="mt-1 min-h-[140px]" value={descricao} onChange={e => setDescricao(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold">Anexos</Label>
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

          {/* Chamados Criados */}
          {chamadosCriados.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-semibold">Tickets Criados</h2>
                <Badge variant="secondary" className="ml-1">{chamadosCriados.length}</Badge>
              </div>
              {chamadosCriados.map(c => (
                <ChamadoCard
                  key={c.id}
                  chamado={c}
                  onUpdate={(updated) => {
                    setChamadosCriados(prev => prev.map(item => item.id === updated.id ? updated : item));
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
    </Layout>
  );
}
