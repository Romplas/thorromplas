import { useState } from 'react';
import { Pencil, Save, X, Paperclip, Download, Eye, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
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
  // If already in dd/mm/yyyy format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  // If in yyyy-mm-dd format
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

export default function ChamadoCard({ chamado, onUpdate, onDelete }: ChamadoCardProps) {
  const [editing, setEditing] = useState(false);
  const [showAnexos, setShowAnexos] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [draft, setDraft] = useState(chamado);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editable only when status=aberto AND etapa=THOR (case-insensitive)
  const canEdit = chamado.status === 'aberto' && chamado.etapa.toLowerCase() === 'thor';

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
      } as any).eq('id', chamado.id);

      if (error) throw error;

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
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const statusColor = {
    aberto: 'bg-amber-100 text-amber-800 border-amber-300',
    em_progresso: 'bg-blue-100 text-blue-800 border-blue-300',
    fechado: 'bg-muted text-muted-foreground border-border',
  };

  const etapaColor = chamado.etapa.toLowerCase() === 'thor' ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground';

  const c = editing ? draft : chamado;
  const hasAnexos = (chamado.anexos && chamado.anexos.length > 0) || (chamado.anexosNomes && chamado.anexosNomes.length > 0);

  return (
    <>
      <div className="bg-card border rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-base">TicketID {chamado.id}</span>
            <Badge variant="outline" className={`text-xs ${statusColor[c.status as keyof typeof statusColor] || statusColor.aberto}`}>
              {c.status === 'aberto' ? 'Aberto' : c.status === 'em_progresso' ? 'Em Progresso' : 'Fechado'}
            </Badge>
            <Badge className={`text-xs ${etapaColor}`}>{c.etapa.toUpperCase()}</Badge>
            <span className="text-xs text-muted-foreground">Criado em {chamado.criadoEm}</span>
          </div>
          <div className="flex items-center gap-2">
            {hasAnexos && (
              <Button variant="outline" size="sm" onClick={() => setShowAnexos(true)}>
                <Paperclip className="h-4 w-4 mr-1.5" />
                Anexos ({chamado.anexos?.length || chamado.anexosNomes?.length || 0})
              </Button>
            )}
            {editing ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
                  <X className="h-4 w-4 mr-1.5" />Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-1.5" />{saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleEdit} disabled={!canEdit} title={!canEdit ? 'Edição disponível apenas com Status Aberto e Etapa THOR' : ''}>
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
                        <AlertDialogDescription>Esta ação não pode ser desfeita. O chamado será removido permanentemente.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Excluir
                        </AlertDialogAction>
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
              <Input className="mt-1" value={draft.negociadoCom} onChange={e => setDraft(d => ({ ...d, negociadoCom: e.target.value }))} />
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
              <Input className="mt-1" value={draft.tipoSolicitacao} onChange={e => setDraft(d => ({ ...d, tipoSolicitacao: e.target.value }))} />
            </div>
          ) : (
            <ReadOnlyField label="Tipo de Solicitação" value={c.tipoSolicitacao} />
          )}
          {editing ? (
            <div>
              <Label className="text-xs font-semibold">Gestor</Label>
              <Input className="mt-1" value={draft.gestor} onChange={e => setDraft(d => ({ ...d, gestor: e.target.value }))} />
            </div>
          ) : (
            <ReadOnlyField label="Gestor" value={c.gestor} />
          )}
          {editing ? (
            <div>
              <Label className="text-xs font-semibold">Status Agendamento</Label>
              <Input className="mt-1" value={draft.statusAgendamento} onChange={e => setDraft(d => ({ ...d, statusAgendamento: e.target.value }))} />
            </div>
          ) : (
            <ReadOnlyField label="Status Agendamento" value={c.statusAgendamento} />
          )}
        </div>

        {/* Controle do Ticket */}
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">Controle do Ticket</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReadOnlyField label="Status Ticket" value={c.status === 'aberto' ? 'Aberto' : c.status === 'em_progresso' ? 'Em Progresso' : 'Fechado'} />
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

      {/* Anexos Dialog */}
      <Dialog open={showAnexos} onOpenChange={setShowAnexos}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Anexos do Chamado #{chamado.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {chamado.anexos && chamado.anexos.length > 0 ? (
              chamado.anexos.map((anexo, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{anexo.nome}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(anexo)} title="Visualizar">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(anexo)} title="Baixar">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : chamado.anexosNomes && chamado.anexosNomes.length > 0 ? (
              chamado.anexosNomes.map((nome, i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-muted rounded-md text-sm">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span>{nome}</span>
                  <span className="text-xs text-muted-foreground ml-auto">(sem link)</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum anexo.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewName}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center overflow-auto max-h-[70vh]">
            {previewUrl && previewName.toLowerCase().endsWith('.pdf') ? (
              <iframe src={previewUrl} className="w-full h-[70vh] border-0 rounded" />
            ) : previewUrl ? (
              <img src={previewUrl} alt={previewName} className="max-w-full max-h-[70vh] object-contain rounded" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
