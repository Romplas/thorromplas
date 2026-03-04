import { useState, useEffect } from 'react';
import { Save, Paperclip, Eye, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

function getFileUrl(path: string): string {
  const { data } = supabase.storage.from('chamado-anexos').getPublicUrl(path);
  return data.publicUrl;
}

export default function EditChamadoModal({ open, onOpenChange, chamado, onSaved, profileMap }: Props) {
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState('');
  const [etapa, setEtapa] = useState('');
  const [gestorId, setGestorId] = useState('');
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
    }
  }, [chamado, open]);

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

    setRepresentanteNome(c.representante_nome || '');

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
      const changes: { acao: string; descricao: string }[] = [];
      
      const statusLabels: Record<string, string> = { aberto: 'Aberto', em_progresso: 'Em Progresso', fechado: 'Fechado' };
      if (status !== chamado.status) {
        changes.push({
          acao: 'Alteração de Status',
          descricao: `Status alterado de "${statusLabels[chamado.status] || chamado.status}" para "${statusLabels[status] || status}"`,
        });
      }

      const oldEtapa = chamado.etapa || 'thor';
      if (etapa !== oldEtapa) {
        const oldEtapaLabel = etapas.find(e => e.nome === oldEtapa)?.label || oldEtapa;
        const newEtapaLabel = etapas.find(e => e.nome === etapa)?.label || etapa;
        changes.push({
          acao: 'Alteração de Etapa',
          descricao: `Etapa alterada de "${oldEtapaLabel}" para "${newEtapaLabel}"`,
        });
      }

      const oldGestorId = chamado.gestor_id || 'none';
      const newGestorId = gestorId;
      if (newGestorId !== oldGestorId) {
        const oldGestorNome = oldGestorId !== 'none' ? (profileMap.get(oldGestorId) || 'N/A') : 'Nenhum';
        const newGestorNome = newGestorId !== 'none' ? (gestorProfiles.find(g => g.id === newGestorId)?.nome || 'N/A') : 'Nenhum';
        changes.push({
          acao: 'Alteração de Gestor',
          descricao: `Gestor alterado de "${oldGestorNome}" para "${newGestorNome}"`,
        });
      }

      if ((descricao || '') !== (chamado.descricao || '')) {
        changes.push({
          acao: 'Alteração de Descrição',
          descricao: `Descrição atualizada`,
        });
      }

      // If no explicit changes detected, still log a generic update
      if (changes.length === 0) {
        changes.push({ acao: 'Atualização', descricao: 'Ticket atualizado sem alterações de campos' });
      }

      const { error } = await supabase.from('chamados').update({
        descricao: descricao || null,
        status: status as any,
        etapa,
        gestor_id: gestorId === 'none' ? null : gestorId,
      }).eq('id', chamado.id);
      if (error) throw error;

      // Insert all history entries
      const historyEntries = changes.map(c => ({
        chamado_id: chamado.id,
        user_id: userProfileId,
        acao: c.acao,
        descricao: c.descricao,
      }));
      const { error: histError } = await supabase.from('chamado_historico').insert(historyEntries);
      if (histError) console.error('Erro ao inserir histórico:', histError);

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

  const gestorNome = chamado.gestor_id ? profileMap.get(chamado.gestor_id) || chamado.gestor_nome || '' : '';
  const isEditable = chamado.status === 'aberto' && (chamado.etapa || '') === 'thor';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
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
                <ReadOnlyField label="Metros Totais" value="" />
                <ReadOnlyField label="Negociado com" value="" />
                <ReadOnlyField label="Nº NFE" value="" />
                <ReadOnlyField label="Tipo de Solicitação" value="" />
                {/* Gestor editable */}
                {isEditable ? (
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
                ) : (
                  <ReadOnlyField label="Gestor" value={gestorProfiles.find(g => g.id === gestorId)?.nome || gestorNome || 'Nenhum'} />
                )}
                <ReadOnlyField label="Status Agendamento" value="" />
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
                        <SelectItem value="aberto">Aberto</SelectItem>
                        <SelectItem value="em_progresso">Em Progresso</SelectItem>
                        <SelectItem value="fechado">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <ReadOnlyField label="Status Ticket" value={status === 'aberto' ? 'Aberto' : status === 'em_progresso' ? 'Em Progresso' : 'Fechado'} />
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
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Descrição</Label>
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
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Anexos</Label>
                  <div className="border border-border rounded-lg p-3 space-y-2 min-h-[140px] bg-muted/20">
                    {loadingAnexos ? (
                      <p className="text-xs text-muted-foreground animate-pulse">Carregando anexos...</p>
                    ) : anexos.length === 0 ? (
                      <p className="text-xs text-muted-foreground flex items-center justify-center h-full">Nenhum anexo encontrado.</p>
                    ) : (
                      anexos.map((anexo, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 p-2.5 bg-card border border-border rounded-lg hover:shadow-sm transition-shadow">
                          <div className="flex items-center gap-2 min-w-0">
                            <Paperclip className="h-4 w-4 text-primary flex-shrink-0" />
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
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{isEditable ? 'Cancelar' : 'Fechar'}</Button>
            {isEditable && (
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1.5" />{saving ? 'Salvando...' : 'Salvar'}
              </Button>
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
