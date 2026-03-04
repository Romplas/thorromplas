import { useState, useEffect } from 'react';
import { Save, Paperclip, Eye, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
    <div>
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <div className="mt-1 px-3 py-2 border rounded-md bg-muted/50 text-sm min-h-[36px] flex items-center">
        {value || '—'}
      </div>
    </div>
  );
}

function getFileUrl(path: string): string {
  const { data } = supabase.storage.from('chamado-anexos').getPublicUrl(path);
  return data.publicUrl;
}

export default function EditChamadoModal({ open, onOpenChange, chamado, onSaved, profileMap }: Props) {
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState('');
  const [etapa, setEtapa] = useState('');
  const [saving, setSaving] = useState(false);
  const [anexos, setAnexos] = useState<AnexoFile[]>([]);
  const [loadingAnexos, setLoadingAnexos] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');

  // Reference data
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [gestorProfiles, setGestorProfiles] = useState<GestorProfile[]>([]);

  // Extra resolved names
  const [supervisorNome, setSupervisorNome] = useState('');
  const [representanteNome, setRepresentanteNome] = useState('');
  const [clienteCodigo, setClienteCodigo] = useState('');
  const [redeNome, setRedeNome] = useState('');
  const [gestorNome, setGestorNome] = useState('');

  useEffect(() => {
    // Load etapas and gestor profiles once
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
      loadAnexos(chamado.id);
      resolveNames(chamado);
    }
  }, [chamado, open]);

  const resolveNames = async (c: ChamadoFull) => {
    // Supervisor: look up in supervisores table or profileMap
    setSupervisorNome(c.supervisor_id ? profileMap.get(c.supervisor_id) || '' : '');
    setRepresentanteNome(c.representante_nome || '');
    setGestorNome(c.gestor_nome || (c.gestor_id ? profileMap.get(c.gestor_id) || '' : ''));

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
      const { error } = await supabase.from('chamados').update({
        descricao: descricao || null,
        status: status as any,
        etapa,
      }).eq('id', chamado.id);
      if (error) throw error;
      toast.success(`Chamado #${chamado.id} atualizado!`);
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

  if (!chamado) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Editar Chamado #{chamado.id}</DialogTitle>
          </DialogHeader>

          {/* Row 1 - Supervisor, Representante, Código Cliente, Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <ReadOnlyField label="Supervisor" value={supervisorNome} />
            <ReadOnlyField label="Representantes" value={representanteNome} />
            <ReadOnlyField label="Código do Cliente Opcional" value={clienteCodigo} />
            <ReadOnlyField label="Cliente" value={chamado.cliente_nome} />
          </div>

          {/* Row 2 - Rede, Data Contato, Data Retorno, Motivo, Submotivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <ReadOnlyField label="Rede Opcional" value={redeNome} />
            <ReadOnlyField label="Data Contato" value="" />
            <ReadOnlyField label="Data Retorno" value="" />
            <ReadOnlyField label="Motivo Principal da Solicitação" value={chamado.motivo} />
            <ReadOnlyField label="Objetivo Principal da Solicitação" value={chamado.submotivo || ''} />
          </div>

          {/* Row 3 - Metros, Negociado, NFE, Tipo, Gestor, Status Agendamento */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            <ReadOnlyField label="Metros Totais" value="" />
            <ReadOnlyField label="Negociado com" value="" />
            <ReadOnlyField label="Nº NFE" value="" />
            <ReadOnlyField label="Tipo de Solicitação" value="" />
            <ReadOnlyField label="Gestor" value={gestorNome} />
            <ReadOnlyField label="Status Agendamentos" value="" />
          </div>

          {/* Row 4 - Status Ticket + Etapa Ticket (editable) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <Label className="text-xs font-semibold">Status Ticket</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_progresso">Em Progresso</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Etapa Ticket</Label>
              <Select value={etapa} onValueChange={setEtapa}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {etapas.map(e => (
                    <SelectItem key={e.id} value={e.nome.toLowerCase()}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ReadOnlyField label="Criado em" value={new Date(chamado.created_at).toLocaleString('pt-BR')} />
            <ReadOnlyField label="Atualizado em" value={new Date(chamado.updated_at).toLocaleString('pt-BR')} />
          </div>

          {/* Row 5 - Descrição + Anexos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-xs font-semibold">Descrição</Label>
              <Textarea className="mt-1 min-h-[140px]" value={descricao} onChange={e => setDescricao(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Anexos</Label>
              <div className="mt-1 border rounded-md p-3 space-y-2 min-h-[140px]">
                {loadingAnexos ? (
                  <p className="text-xs text-muted-foreground">Carregando anexos...</p>
                ) : anexos.length === 0 ? (
                  <p className="text-xs text-muted-foreground flex items-center justify-center h-full">Nenhum anexo encontrado.</p>
                ) : (
                  anexos.map((anexo, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md">
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
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1.5" />{saving ? 'Salvando...' : 'Salvar'}
            </Button>
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
