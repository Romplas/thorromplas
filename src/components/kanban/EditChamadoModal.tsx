import { useState, useEffect, useRef } from 'react';
import { Save, Paperclip, Eye, Download, Upload, X, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SDPFormModal from '@/components/chamado/SDPFormModal';
import RNCFormModal from '@/components/chamado/RNCFormModal';
import AmostrasFormModal from '@/components/chamado/AmostrasFormModal';
import BookFormModal from '@/components/chamado/BookFormModal';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AnexoFile { nome: string; path: string }

interface Etapa { id: string; nome: string; label: string; cor: string; ordem: number }

interface GestorProfile { id: string; nome: string }

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
  representante_nome?: string;
  gestor_nome?: string;
  supervisor_nome?: string;
  cliente_codigo?: string;
  rede_nome?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chamado: ChamadoFull | null;
  onSaved: () => void;
  profileMap: Map<string, string>;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</Label>
      <div className="px-3 py-2.5 border border-border rounded-lg bg-muted/40 text-sm min-h-[40px] flex items-center font-medium">
        {value || '—'}
      </div>
    </div>
  );
}

const ACCEPTED_TYPES: Record<string, { label: string; maxMB: number }> = {
  'application/pdf': { label: 'PDF', maxMB: 10 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOCX', maxMB: 10 },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { label: 'XLSX', maxMB: 10 },
  'video/mp4': { label: 'MP4', maxMB: 50 },
  'video/quicktime': { label: 'MOV', maxMB: 50 },
  'video/x-msvideo': { label: 'AVI', maxMB: 50 },
  'video/webm': { label: 'WEBM', maxMB: 50 },
  'image/jpeg': { label: 'JPEG', maxMB: 5 },
  'image/png': { label: 'PNG', maxMB: 5 },
  'audio/mpeg': { label: 'MP3', maxMB: 15 },
  'text/plain': { label: 'TXT', maxMB: 2 },
};
const ACCEPT_STRING = Object.keys(ACCEPTED_TYPES).join(',');

function getFileUrl(path: string): string {
  const { data } = supabase.storage.from('chamado-anexos').getPublicUrl(path);
  return data.publicUrl;
}

export default function EditChamadoModal({ open, onOpenChange, chamado, onSaved, profileMap }: Props) {
  const { role } = useAuth();
  const canUpload = role === 'admin' || role === 'gestor' || role === 'supervisor';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState('');
  const [etapa, setEtapa] = useState('');
  const [gestorId, setGestorId] = useState('');
  const [metrosTotais, setMetrosTotais] = useState('');
  const [negociadoCom, setNegociadoCom] = useState('');
  const [nfe, setNfe] = useState('');
  const [tipoSolicitacao, setTipoSolicitacao] = useState('');
  const [statusAgendamento, setStatusAgendamento] = useState('');
  const [saving, setSaving] = useState(false);
  const [anexos, setAnexos] = useState<AnexoFile[]>([]);
  const [loadingAnexos, setLoadingAnexos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [showSDPModal, setShowSDPModal] = useState(false);
  const [showRNCModal, setShowRNCModal] = useState(false);
  const [showAmostrasModal, setShowAmostrasModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);

  // Reference data
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [gestorProfiles, setGestorProfiles] = useState<GestorProfile[]>([]);

  // Extra resolved names
  const [supervisorNome, setSupervisorNome] = useState('');
  const [representanteNome, setRepresentanteNome] = useState('');
  const [clienteCodigo, setClienteCodigo] = useState('');
  const [redeNome, setRedeNome] = useState('');
  const [dataContato, setDataContato] = useState('');
  const [dataRetorno, setDataRetorno] = useState('');

  useEffect(() => {
    const loadRef = async () => {
      const [etapasRes, rolesRes, profilesRes] = await Promise.all([
        supabase.from('etapas').select('*').order('ordem'),
        supabase.from('user_roles').select('user_id, role').in('role', ['gestor', 'admin']),
        supabase.from('profiles').select('id, nome, user_id, status').eq('status', 'ativo'),
      ]);
      if (etapasRes.data) setEtapas(etapasRes.data);
      const gestorUserIds = new Set((rolesRes?.data || []).map((r: any) => r.user_id));
      const gestores = (profilesRes?.data || [])
        .filter((p: any) => gestorUserIds.has(p.user_id))
        .map((p: any) => ({ id: p.id, nome: p.nome }));
      setGestorProfiles(gestores);
    };
    loadRef();
  }, []);

  useEffect(() => {
    if (chamado && open) {
      setDescricao(chamado.descricao || '');
      setStatus(chamado.status);
      setEtapa(chamado.etapa || 'thor');
      setGestorId(chamado.gestor_id || 'none');
      loadAnexos(chamado.id);
      resolveNames(chamado);
      // Load extra fields
      loadExtraFields(chamado.id);
    }
  }, [chamado, open]);

  const loadExtraFields = async (chamadoId: number) => {
    const { data } = await supabase
      .from('chamados')
      .select('*')
      .eq('id', chamadoId)
      .maybeSingle();
    const raw = data as any;
    setMetrosTotais(raw?.metros_totais || '');
    setNegociadoCom(raw?.negociado_com || '');
    setNfe(raw?.nfe || '');
    setTipoSolicitacao(raw?.tipo_solicitacao || '');
    setStatusAgendamento(raw?.status_agendamento || '');
  };

  const resolveNames = async (c: ChamadoFull) => {
    // Supervisor: look up in supervisores table
    if (c.supervisor_id) {
      const { data: sup } = await supabase
        .from('supervisores')
        .select('nome')
        .eq('id', c.supervisor_id)
        .maybeSingle();
      setSupervisorNome(sup?.nome || profileMap.get(c.supervisor_id) || '');
    } else {
      setSupervisorNome('');
    }

    if (c.representante_id) {
      const { data: rep } = await supabase
        .from('representantes')
        .select('nome')
        .eq('id', c.representante_id)
        .maybeSingle();
      setRepresentanteNome(rep?.nome || profileMap.get(c.representante_id) || '');
    } else {
      setRepresentanteNome('');
    }

    // Resolve cliente code and rede
    if (c.cliente_id) {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('codigo, rede_id')
        .eq('id', c.cliente_id)
        .maybeSingle();
      setClienteCodigo(cliente?.codigo?.toString() || '');
      if (cliente?.rede_id) {
        const { data: rede } = await supabase
          .from('redes')
          .select('nome')
          .eq('id', cliente.rede_id)
          .maybeSingle();
        setRedeNome(rede?.nome || '');
      } else {
        setRedeNome('');
      }
    } else {
      setClienteCodigo('');
      setRedeNome('');
    }

    // Resolve dates
    const { data: chamadoData } = await supabase
      .from('chamados')
      .select('*')
      .eq('id', c.id)
      .maybeSingle();
    
    const raw = chamadoData as any;
    setDataContato(raw?.data_contato ? new Date(raw.data_contato).toLocaleDateString('pt-BR') : '');
    setDataRetorno(raw?.data_retorno ? new Date(raw.data_retorno).toLocaleDateString('pt-BR') : '');
  };

  const loadAnexos = async (chamadoId: number) => {
    setLoadingAnexos(true);
    try {
      const { data, error } = await supabase.storage
        .from('chamado-anexos')
        .list(String(chamadoId));
      if (data && !error) {
        setAnexos(data.map(f => ({ nome: f.name, path: `${chamadoId}/${f.name}` })));
      } else {
        setAnexos([]);
      }
    } catch {
      setAnexos([]);
    }
    setLoadingAnexos(false);
  };

  const handleSave = async () => {
    if (!chamado) return;
    setSaving(true);
    try {
      // Get current user profile for history
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      let userProfileId: string | null = null;
      if (currentUser) {
        const { data: prof } = await supabase.from('profiles').select('id').eq('user_id', currentUser.id).maybeSingle();
        userProfileId = prof?.id || null;
      }

      // Build list of changes for history
      const changeParts: string[] = [];
      
      const statusLabels: Record<string, string> = { pendente: 'Pendente', aberto: 'Aberto', em_progresso: 'Em Progresso', fechado: 'Fechado' };
      if (status !== chamado.status) {
        changeParts.push(`Status: "${statusLabels[chamado.status] || chamado.status}" → "${statusLabels[status] || status}"`);
      }

      const oldEtapa = chamado.etapa || 'thor';
      if (etapa !== oldEtapa) {
        const oldEtapaLabel = etapas.find(e => e.nome === oldEtapa)?.label || oldEtapa;
        const newEtapaLabel = etapas.find(e => e.nome === etapa)?.label || etapa;
        changeParts.push(`Etapa: "${oldEtapaLabel}" → "${newEtapaLabel}"`);
      }

      const oldGestorId = chamado.gestor_id || 'none';
      const newGestorId = gestorId;
      if (newGestorId !== oldGestorId) {
        const oldGestorNome = oldGestorId !== 'none' ? (profileMap.get(oldGestorId) || 'N/A') : 'Nenhum';
        const newGestorNome = newGestorId !== 'none' ? (gestorProfiles.find(g => g.id === newGestorId)?.nome || 'N/A') : 'Nenhum';
        changeParts.push(`Gestor: "${oldGestorNome}" → "${newGestorNome}"`);
      }

      if ((descricao || '') !== (chamado.descricao || '')) {
        changeParts.push('Descrição atualizada');
      }

      const acao = changeParts.length > 0 ? 'Atualização de Ticket' : 'Atualização';
      const descricaoHistorico = changeParts.length > 0 ? changeParts.join(' | ') : 'Ticket atualizado sem alterações de campos';

      const { error } = await supabase.from('chamados').update({
        descricao: descricao || null,
        status: status as any,
        etapa,
        gestor_id: gestorId === 'none' ? null : gestorId,
        metros_totais: metrosTotais || null,
        negociado_com: negociadoCom || null,
        nfe: nfe || null,
        tipo_solicitacao: tipoSolicitacao || null,
        status_agendamento: statusAgendamento || null,
      } as any).eq('id', chamado.id);
      if (error) throw error;

      // Representante editando PENDENTE+PENDENTE: não criar nova etapa no histórico
      const skipHistory = role === 'representante'
        && chamado.status?.toLowerCase() === 'pendente'
        && (chamado.etapa || 'pendente').toLowerCase() === 'pendente';

      if (!skipHistory) {
        const { error: histError } = await supabase.from('chamado_historico').insert({
          chamado_id: chamado.id,
          user_id: userProfileId,
          acao,
          descricao: descricaoHistorico,
          descricao_ticket: descricao || null,
        } as any);
        if (histError) console.error('Erro ao inserir histórico:', histError);
      }

      toast.success(`Ticket ${chamado.id} atualizado!`);
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const handleView = (anexo: AnexoFile) => {
    const url = getFileUrl(anexo.path);
    const ext = anexo.nome.toLowerCase().split('.').pop() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(ext)) {
      setPreviewName(anexo.nome);
      setPreviewUrl(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const pdfViewerUrl = previewUrl && previewName.toLowerCase().endsWith('.pdf')
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(previewUrl || '')}&embedded=true`
    : null;

  const handleDownload = (anexo: AnexoFile) => {
    const url = getFileUrl(anexo.path);
    const a = document.createElement('a');
    a.href = url;
    a.download = anexo.nome;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!chamado || !e.target.files?.length) return;
    const files = Array.from(e.target.files);
    setUploading(true);
    try {
      for (const file of files) {
        const typeInfo = ACCEPTED_TYPES[file.type];
        if (!typeInfo) {
          toast.error(`Tipo não suportado: ${file.name}`);
          continue;
        }
        if (file.size > typeInfo.maxMB * 1024 * 1024) {
          toast.error(`${file.name} excede ${typeInfo.maxMB}MB`);
          continue;
        }
        const filePath = `${chamado.id}/${file.name}`;
        const { error } = await supabase.storage
          .from('chamado-anexos')
          .upload(filePath, file, { contentType: file.type, upsert: true });
        if (error) {
          toast.error(`Erro ao enviar ${file.name}: ${error.message}`);
        } else {
          toast.success(`${file.name} anexado!`);
        }
      }
      await loadAnexos(chamado.id);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAnexo = async (anexo: AnexoFile) => {
    if (!chamado) return;
    const { error } = await supabase.storage
      .from('chamado-anexos')
      .remove([anexo.path]);
    if (error) {
      toast.error('Erro ao remover anexo');
    } else {
      toast.success('Anexo removido');
      await loadAnexos(chamado.id);
    }
  };

  if (!chamado) return null;

  const gestorNome = chamado.gestor_id ? profileMap.get(chamado.gestor_id) || chamado.gestor_nome || '' : '';
  const isEditable = true;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-5xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-0">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-card border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Editar Ticket {chamado.id}</DialogTitle>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Section 1 - Identification */}
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Identificação</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ReadOnlyField label="Supervisor" value={supervisorNome} />
                <ReadOnlyField label="Representante" value={representanteNome} />
                <ReadOnlyField label="Código do Cliente" value={clienteCodigo} />
                <ReadOnlyField label="Cliente" value={chamado.cliente_nome} />
              </div>
            </div>

            {/* Section 2 - Details */}
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Detalhes da Solicitação</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <ReadOnlyField label="Rede" value={redeNome} />
                <ReadOnlyField label="Data Contato" value={dataContato} />
                <ReadOnlyField label="Data Retorno" value={dataRetorno} />
                <ReadOnlyField label="Motivo Principal" value={chamado.motivo} />
                <ReadOnlyField label="Objetivo Principal" value={chamado.submotivo || ''} />
              </div>
            </div>

            {/* Section 3 - Additional Info */}
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Informações Adicionais</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Metros Totais</Label>
                  <input className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm h-[40px]" value={metrosTotais} onChange={e => setMetrosTotais(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Negociado com</Label>
                  <Select value={negociadoCom || 'none'} onValueChange={v => setNegociadoCom(v === 'none' ? '' : v)}>
                    <SelectTrigger className="h-[40px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Nenhum —</SelectItem>
                      <SelectItem value="André">André</SelectItem>
                      <SelectItem value="Douglas">Douglas</SelectItem>
                      <SelectItem value="Vinicius">Vinicius</SelectItem>
                      <SelectItem value="João Pedro">João Pedro</SelectItem>
                      <SelectItem value="Sr Ivo">Sr Ivo</SelectItem>
                      <SelectItem value="Tathy">Tathy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Nº NFE</Label>
                  <input className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm h-[40px]" value={nfe} onChange={e => setNfe(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Tipo de Solicitação</Label>
                  <Select value={tipoSolicitacao || 'none'} onValueChange={v => setTipoSolicitacao(v === 'none' ? '' : v)}>
                    <SelectTrigger className="h-[40px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Nenhum —</SelectItem>
                      <SelectItem value="Interna">Interna</SelectItem>
                      <SelectItem value="Romplas">Romplas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Gestor editable */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Gestor</Label>
                  <Select value={gestorId} onValueChange={setGestorId}>
                    <SelectTrigger className="h-[40px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Nenhum —</SelectItem>
                      {gestorProfiles.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Status Agendamento</Label>
                  <Select value={statusAgendamento || 'none'} onValueChange={v => setStatusAgendamento(v === 'none' ? '' : v)}>
                    <SelectTrigger className="h-[40px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Nenhum —</SelectItem>
                      <SelectItem value="Agendado">Agendado</SelectItem>
                      <SelectItem value="Concluído">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 4 - Ticket Control */}
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Controle do Ticket</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {isEditable ? (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Status Ticket</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="h-[40px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="aberto">Aberto</SelectItem>
                        <SelectItem value="em_progresso">Em Progresso</SelectItem>
                        <SelectItem value="fechado">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <ReadOnlyField label="Status Ticket" value={status === 'pendente' ? 'Pendente' : status === 'aberto' ? 'Aberto' : status === 'em_progresso' ? 'Em Progresso' : 'Fechado'} />
                )}
                {isEditable ? (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Etapa Ticket</Label>
                    <Select value={etapa} onValueChange={setEtapa}>
                      <SelectTrigger className="h-[40px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {etapas.map(e => (
                          <SelectItem key={e.id} value={e.nome}>
                            {e.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <ReadOnlyField label="Etapa Ticket" value={etapas.find(e => e.nome === etapa)?.label || etapa} />
                )}
                <ReadOnlyField label="Criado em" value={new Date(chamado.created_at).toLocaleString('pt-BR')} />
                <ReadOnlyField label="Atualizado em" value={new Date(chamado.updated_at).toLocaleString('pt-BR')} />
              </div>
            </div>

            {/* Section 5 - Description & Attachments */}
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Descrição e Anexos</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isEditable ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Descrição</Label>
                      {chamado && (chamado.motivo.toLowerCase().includes('sd') || chamado.motivo.toLowerCase().includes('solicitação de desenvolvimento')) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => setShowSDPModal(true)}
                          title="Preencher / Editar Solicitação de SD"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          SDP
                        </Button>
                      )}
                      {chamado && chamado.motivo.toLowerCase() === 'rnc' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => setShowRNCModal(true)}
                          title="Preencher / Editar RNC"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          RNC
                        </Button>
                      )}
                      {chamado && chamado.motivo.toLowerCase() === 'amostras' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => setShowAmostrasModal(true)}
                          title="Preencher / Editar Amostras"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Amostras
                        </Button>
                      )}
                      {chamado && chamado.motivo.toLowerCase() === 'book' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => setShowBookModal(true)}
                          title="Preencher / Editar Book"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Book
                        </Button>
                      )}
                    </div>
                    <Textarea className="min-h-[140px] resize-y" value={descricao} onChange={e => setDescricao(e.target.value)} />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Descrição</Label>
                    <div className="px-3 py-2.5 border border-border rounded-lg bg-muted/40 text-sm min-h-[140px] whitespace-pre-wrap font-medium">
                      {descricao || '—'}
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Anexos</Label>
                    {canUpload && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept={ACCEPT_STRING}
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {uploading ? 'Enviando...' : 'Anexar'}
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="border border-border rounded-lg p-3 space-y-2 min-h-[140px] bg-muted/20">
                    {loadingAnexos ? (
                      <p className="text-xs text-muted-foreground animate-pulse">Carregando anexos...</p>
                    ) : anexos.length === 0 ? (
                      <p className="text-xs text-muted-foreground flex items-center justify-center h-full">Nenhum anexo encontrado.</p>
                    ) : (
                      anexos.map((anexo, i) => (
                        <div key={i} className="flex items-start justify-between gap-2 p-2.5 bg-card border border-border rounded-lg hover:shadow-sm transition-shadow overflow-hidden">
                          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                            <Paperclip className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="text-sm break-words">{anexo.nome}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(anexo)} title="Visualizar">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(anexo)} title="Baixar">
                              <Download className="h-4 w-4" />
                            </Button>
                            {canUpload && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteAnexo(anexo)} title="Remover">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{isEditable ? 'Cancelar' : 'Fechar'}</Button>
            {isEditable && (
              <Button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSave(); }} disabled={saving}>
                <Save className="h-4 w-4 mr-1.5" />{saving ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center">
            {pdfViewerUrl ? (
              <iframe src={pdfViewerUrl} title={previewName} className="w-full min-h-[70vh] border-0 rounded flex-1" style={{ minHeight: '500px' }} />
            ) : previewUrl ? (
              <img src={previewUrl} alt={previewName} className="max-w-full max-h-[70vh] object-contain rounded" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* SDP Form Modal */}
      {chamado && (
        <SDPFormModal
          open={showSDPModal}
          onOpenChange={setShowSDPModal}
          chamadoId={chamado.id}
          clienteNome={chamado.cliente_nome}
          representanteNome={representanteNome}
          onPdfUploaded={() => loadAnexos(chamado.id)}
        />
      )}

      {/* RNC Form Modal */}
      {chamado && (
        <RNCFormModal
          open={showRNCModal}
          onOpenChange={setShowRNCModal}
          chamadoId={chamado.id}
          clienteNome={chamado.cliente_nome}
          representanteNome={representanteNome}
          onPdfUploaded={() => loadAnexos(chamado.id)}
        />
      )}

      {/* Amostras Form Modal */}
      {chamado && (
        <AmostrasFormModal
          open={showAmostrasModal}
          onOpenChange={setShowAmostrasModal}
          chamadoId={chamado.id}
          clienteNome={chamado.cliente_nome}
          representanteNome={representanteNome}
          onPdfUploaded={() => loadAnexos(chamado.id)}
        />
      )}

      {/* Book Form Modal */}
      {chamado && (
        <BookFormModal
          open={showBookModal}
          onOpenChange={setShowBookModal}
          chamadoId={chamado.id}
          clienteNome={chamado.cliente_nome}
          codigoCliente={clienteCodigo}
          representanteNome={representanteNome}
          onPdfUploaded={() => loadAnexos(chamado.id)}
        />
      )}
    </>
  );
}
