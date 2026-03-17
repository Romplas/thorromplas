import { useState, useEffect, useRef } from 'react';
import { Pencil, Save, X, Paperclip, Download, Eye, Trash2, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AnexoFile {
  nome: string;
  path: string;
}

export interface ChamadoCriado {
  id: number;
  status: string;
  etapa: string;
  supervisor: string;
  representante: string;
  cliente: string;
  codigoCliente: string;
  rede: string;
  dataContato: string;
  dataRetorno: string;
  motivo: string;
  submotivo: string;
  metrosTotais: string;
  negociadoCom: string;
  nfe: string;
  tipoSolicitacao: string;
  gestor: string;
  statusAgendamento: string;
  descricao: string;
  criadoEm: string;
  anexosNomes?: string[];
  anexos?: AnexoFile[];
}

interface ChamadoCardProps {
  chamado: ChamadoCriado;
  onUpdate: (updated: ChamadoCriado) => void;
  onDelete?: (id: number) => void;
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

function ReadOnlyField({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <div className="mt-1 px-3 py-2 border rounded-md bg-muted/50 text-sm min-h-[36px] flex items-center">
        {value || '—'}
      </div>
    </div>
  );
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [y, m, d] = dateStr.substring(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

function getFileUrl(path: string): string {
  const { data } = supabase.storage.from('chamado-anexos').getPublicUrl(path);
  return data.publicUrl;
}

function isPreviewable(nome: string): boolean {
  const ext = nome.toLowerCase().split('.').pop() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(ext);
}

function getPdfViewerUrl(url: string): string {
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
}

export default function ChamadoCard({ chamado, onUpdate, onDelete }: ChamadoCardProps) {
  const { role } = useAuth();
  const [editing, setEditing] = useState(false);
  const [showAnexos, setShowAnexos] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [draft, setDraft] = useState(chamado);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Anexos loaded from storage
  const [storageAnexos, setStorageAnexos] = useState<AnexoFile[]>([]);
  const [loadingAnexos, setLoadingAnexos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Representante só pode editar quando Status = Pendente E Etapa = Pendente
  const canEdit = chamado.status === 'pendente' && chamado.etapa?.toLowerCase() === 'pendente';
  const isAdmin = role === 'admin';

  // Load anexos from Supabase Storage
  useEffect(() => {
    loadAnexosFromStorage();
  }, [chamado.id]);

  const loadAnexosFromStorage = async () => {
    setLoadingAnexos(true);
    try {
      const { data, error } = await supabase.storage
        .from('chamado-anexos')
        .list(String(chamado.id));
      if (data && !error) {
        setStorageAnexos(data.map(f => ({ nome: f.name, path: `${chamado.id}/${f.name}` })));
      } else {
        setStorageAnexos([]);
      }
    } catch {
      setStorageAnexos([]);
    }
    setLoadingAnexos(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
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
        const filePath = `${chamado.id}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage
          .from('chamado-anexos')
          .upload(filePath, file, { contentType: file.type, upsert: true });
        if (error) {
          toast.error(`Erro ao enviar ${file.name}: ${error.message}`);
        } else {
          toast.success(`${file.name} anexado!`);
        }
      }
      await loadAnexosFromStorage();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAnexo = async (anexo: AnexoFile) => {
    const { error } = await supabase.storage
      .from('chamado-anexos')
      .remove([anexo.path]);
    if (error) {
      toast.error('Erro ao remover anexo');
    } else {
      toast.success('Anexo removido');
      await loadAnexosFromStorage();
    }
  };

  const handleEdit = () => {
    setDraft({ ...chamado });
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('chamados').update({
        motivo: draft.motivo,
        submotivo: draft.submotivo || null,
        descricao: draft.descricao || null,
        data_contato: draft.dataContato || null,
        data_retorno: draft.dataRetorno || null,
        metros_totais: draft.metrosTotais || null,
        negociado_com: draft.negociadoCom || null,
        nfe: draft.nfe || null,
        tipo_solicitacao: draft.tipoSolicitacao || null,
        status_agendamento: draft.statusAgendamento || null,
      } as any).eq('id', chamado.id);

      if (error) throw error;

      // Representante editando solicitação PENDENTE+PENDENTE: não criar nova etapa no histórico
      const skipHistory = role === 'representante'
        && chamado.status?.toLowerCase() === 'pendente'
        && chamado.etapa?.toLowerCase() === 'pendente';

      if (!skipHistory) {
        const changeParts: string[] = [];
        if (draft.motivo !== chamado.motivo) changeParts.push(`Motivo: "${chamado.motivo}" → "${draft.motivo}"`);
        if (draft.submotivo !== chamado.submotivo) changeParts.push(`Objetivo: "${chamado.submotivo || ''}" → "${draft.submotivo || ''}"`);
        if ((draft.descricao || '') !== (chamado.descricao || '')) changeParts.push('Descrição atualizada');
        if (draft.dataContato !== chamado.dataContato) changeParts.push('Data Contato atualizada');
        if (draft.dataRetorno !== chamado.dataRetorno) changeParts.push('Data Retorno atualizada');
        if (draft.metrosTotais !== chamado.metrosTotais) changeParts.push(`Metros Totais: "${chamado.metrosTotais}" → "${draft.metrosTotais}"`);
        if (draft.negociadoCom !== chamado.negociadoCom) changeParts.push(`Negociado com: "${chamado.negociadoCom || 'Nenhum'}" → "${draft.negociadoCom || 'Nenhum'}"`);
        if (draft.nfe !== chamado.nfe) changeParts.push(`Nº NFE: "${chamado.nfe}" → "${draft.nfe}"`);
        if (draft.tipoSolicitacao !== chamado.tipoSolicitacao) changeParts.push(`Tipo Solicitação: "${chamado.tipoSolicitacao || 'Nenhum'}" → "${draft.tipoSolicitacao || 'Nenhum'}"`);
        if (draft.statusAgendamento !== chamado.statusAgendamento) changeParts.push(`Status Agendamento: "${chamado.statusAgendamento || 'Nenhum'}" → "${draft.statusAgendamento || 'Nenhum'}"`);

        const { data: { user: currentUser } } = await supabase.auth.getUser();
        let userProfileId: string | null = null;
        if (currentUser) {
          const { data: prof } = await supabase.from('profiles').select('id').eq('user_id', currentUser.id).maybeSingle();
          userProfileId = prof?.id || null;
        }
        const acao = changeParts.length > 0 ? 'Atualização de Ticket' : 'Atualização';
        const descricaoHistorico = changeParts.length > 0 ? changeParts.join(' | ') : 'Ticket atualizado sem alterações de campos';
        await supabase.from('chamado_historico').insert({
          chamado_id: chamado.id,
          user_id: userProfileId,
          acao,
          descricao: descricaoHistorico,
          descricao_ticket: draft.descricao || null,
        } as any);
      }

      onUpdate(draft);
      setEditing(false);
      toast.success(`Chamado #${chamado.id} atualizado!`);
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('chamados').delete().eq('id', chamado.id);
      if (error) throw error;
      toast.success(`Chamado #${chamado.id} excluído!`);
      onDelete?.(chamado.id);
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setDeleting(false);
    }
  };

  const handleView = (anexo: AnexoFile) => {
    const url = getFileUrl(anexo.path);
    if (isPreviewable(anexo.nome)) {
      setPreviewName(anexo.nome);
      setPreviewUrl(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleDownload = (anexo: AnexoFile) => {
    const url = getFileUrl(anexo.path);
    const a = document.createElement('a');
    a.href = url;
    a.download = anexo.nome;
    // Força download no mesmo contexto da aba
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const statusColor = {
    pendente: 'bg-amber-100 text-amber-800 border-amber-300',
    aberto: 'bg-amber-100 text-amber-800 border-amber-300',
    em_progresso: 'bg-blue-100 text-blue-800 border-blue-300',
    fechado: 'bg-muted text-muted-foreground border-border',
  };

  const etapaColor = chamado.etapa.toLowerCase() === 'thor' ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground';

  const c = editing ? draft : chamado;
  const totalAnexos = storageAnexos.length;

  return (
    <>
      <div className="bg-card border rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-base">TicketID {chamado.id}</span>
            <Badge variant="outline" className={`text-xs ${statusColor[c.status as keyof typeof statusColor] || statusColor.aberto}`}>
              {c.status === 'pendente' ? 'Pendente' : c.status === 'aberto' ? 'Aberto' : c.status === 'em_progresso' ? 'Em Progresso' : 'Fechado'}
            </Badge>
            <Badge className={`text-xs ${etapaColor}`}>{c.etapa.toUpperCase()}</Badge>
            <span className="text-xs text-muted-foreground">Criado em {chamado.criadoEm}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAnexos(true)}>
              <Paperclip className="h-4 w-4 mr-1.5" />
              Anexos ({totalAnexos})
            </Button>
            {editing ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
                  <X className="h-4 w-4 mr-1.5" />Cancelar
                </Button>
                <Button type="button" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSave(); }} disabled={saving}>
                  <Save className="h-4 w-4 mr-1.5" />{saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleEdit} disabled={!canEdit} title={!canEdit ? 'Edição disponível apenas com Status Ticket = Pendente e Etapa Ticket = Pendente' : ''}>
                  <Pencil className="h-4 w-4 mr-1.5" />Editar
                </Button>
                {canEdit && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={deleting}>
                        <Trash2 className="h-4 w-4 mr-1.5" />Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Chamado #{chamado.id}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O chamado será removido permanentemente do sistema.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        {isAdmin && (
                          <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir Solicitação
                          </AlertDialogAction>
                        )}
                        {!isAdmin && (
                          <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        )}
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}
          </div>
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <ReadOnlyField label="Supervisor" value={c.supervisor} />
          <ReadOnlyField label="Representante" value={c.representante} />
          <ReadOnlyField label="Código do Cliente" value={c.codigoCliente} />
          <ReadOnlyField label="Cliente" value={c.cliente} />
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
          <ReadOnlyField label="Rede" value={c.rede} />
          {editing ? (
            <div>
              <Label className="text-xs font-semibold">Data Contato</Label>
              <Input type="date" className="mt-1" value={draft.dataContato} onChange={e => setDraft(d => ({ ...d, dataContato: e.target.value }))} />
            </div>
          ) : (
            <ReadOnlyField label="Data Contato" value={formatDateBR(c.dataContato)} />
          )}
          {editing ? (
            <div>
              <Label className="text-xs font-semibold">Data Retorno</Label>
              <Input type="date" className="mt-1" value={draft.dataRetorno} onChange={e => setDraft(d => ({ ...d, dataRetorno: e.target.value }))} />
            </div>
          ) : (
            <ReadOnlyField label="Data Retorno" value={formatDateBR(c.dataRetorno)} />
          )}
          {editing ? (
            <div>
              <Label className="text-xs font-semibold">Motivo</Label>
              <Input className="mt-1" value={draft.motivo} onChange={e => setDraft(d => ({ ...d, motivo: e.target.value }))} />
            </div>
          ) : (
            <ReadOnlyField label="Motivo" value={c.motivo} />
          )}
          {editing ? (
            <div>
              <Label className="text-xs font-semibold">Submotivo</Label>
              <Input className="mt-1" value={draft.submotivo} onChange={e => setDraft(d => ({ ...d, submotivo: e.target.value }))} />
            </div>
          ) : (
            <ReadOnlyField label="Submotivo" value={c.submotivo} />
          )}
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
          {editing ? (
            <div>
              <Label className="text-xs font-semibold">Metros Totais</Label>
              <Input className="mt-1" value={draft.metrosTotais} onChange={e => setDraft(d => ({ ...d, metrosTotais: e.target.value }))} />
            </div>
          ) : (
            <ReadOnlyField label="Metros Totais" value={c.metrosTotais} />
          )}
          {editing ? (
            <div>
              <Label className="text-xs font-semibold">Negociado com</Label>
              <Select value={draft.negociadoCom || 'none'} onValueChange={v => setDraft(d => ({ ...d, negociadoCom: v === 'none' ? '' : v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Selecione —</SelectItem>
                  <SelectItem value="André">André</SelectItem>
                  <SelectItem value="Douglas">Douglas</SelectItem>
                  <SelectItem value="Vinicius">Vinicius</SelectItem>
                  <SelectItem value="João Pedro">João Pedro</SelectItem>
                  <SelectItem value="Sr Ivo">Sr Ivo</SelectItem>
                  <SelectItem value="Tathy">Tathy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <ReadOnlyField label="Negociado com" value={c.negociadoCom} />
          )}
          {editing ? (
            <div>
              <Label className="text-xs font-semibold">Nº NFE</Label>
              <Input className="mt-1" value={draft.nfe} onChange={e => setDraft(d => ({ ...d, nfe: e.target.value }))} />
            </div>
          ) : (
            <ReadOnlyField label="Nº NFE" value={c.nfe} />
          )}
          {editing ? (
            <div>
              <Label className="text-xs font-semibold">Tipo de Solicitação</Label>
              <Select value={draft.tipoSolicitacao || 'none'} onValueChange={v => setDraft(d => ({ ...d, tipoSolicitacao: v === 'none' ? '' : v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Selecione —</SelectItem>
                  <SelectItem value="Interna">Interna</SelectItem>
                  <SelectItem value="Romplas">Romplas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <ReadOnlyField label="Tipo de Solicitação" value={c.tipoSolicitacao} />
          )}
          <ReadOnlyField label="Gestor" value={c.gestor} />
          {editing ? (
            <div>
              <Label className="text-xs font-semibold">Status Agendamento</Label>
              <Select value={draft.statusAgendamento || 'none'} onValueChange={v => setDraft(d => ({ ...d, statusAgendamento: v === 'none' ? '' : v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Selecione —</SelectItem>
                  <SelectItem value="Agendado">Agendado</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <ReadOnlyField label="Status Agendamento" value={c.statusAgendamento} />
          )}
        </div>

        {/* Controle do Ticket */}
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">Controle do Ticket</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReadOnlyField label="Status Ticket" value={c.status === 'pendente' ? 'Pendente' : c.status === 'aberto' ? 'Aberto' : c.status === 'em_progresso' ? 'Em Progresso' : 'Fechado'} />
            <ReadOnlyField label="Etapa Ticket" value={c.etapa.toUpperCase()} />
          </div>
        </div>

        {/* Row 4 - Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {editing ? (
            <div>
              <Label className="text-xs font-semibold">Descrição</Label>
              <Textarea className="mt-1 min-h-[100px]" value={draft.descricao} onChange={e => setDraft(d => ({ ...d, descricao: e.target.value }))} />
            </div>
          ) : (
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Descrição</Label>
              <div className="mt-1 px-3 py-2 border rounded-md bg-muted/50 text-sm min-h-[60px] whitespace-pre-wrap">
                {c.descricao || '—'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Anexos Dialog - with upload support */}
      <Dialog open={showAnexos} onOpenChange={setShowAnexos}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl overflow-x-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Anexos do Chamado #{chamado.id}</DialogTitle>
              <div className="flex items-center gap-2">
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
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-2">
            {loadingAnexos ? (
              <p className="text-xs text-muted-foreground animate-pulse">Carregando anexos...</p>
            ) : storageAnexos.length > 0 ? (
              storageAnexos.map((anexo, i) => (
                <div key={i} className="flex items-start justify-between gap-2 p-3 bg-muted rounded-md overflow-hidden">
                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm break-all">{anexo.nome}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(anexo)} title="Visualizar">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(anexo)} title="Baixar">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteAnexo(anexo)} title="Remover">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum anexo encontrado.</p>
            )}
          </div>
          <div className="border-t pt-2 mt-2">
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              <span className="font-semibold">Formatos e limites:</span>{' '}
              PDF, DOCX, XLSX (até 10 MB) · MP4 (até 50 MB) · JPEG, PNG (até 5 MB) · MP3 (até 15 MB) · TXT (até 2 MB)
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewName}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center overflow-auto max-h-[70vh]">
            {previewUrl && previewName.toLowerCase().endsWith('.pdf') ? (
              <iframe src={getPdfViewerUrl(previewUrl)} title={previewName} className="w-full h-[70vh] border-0 rounded" />
            ) : previewUrl ? (
              <img src={previewUrl} alt={previewName} className="max-w-full max-h-[70vh] object-contain rounded" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
