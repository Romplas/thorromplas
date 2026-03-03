import { useState } from 'react';
import { Pencil, Save, X, Paperclip } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
}

interface ChamadoCardProps {
  chamado: ChamadoCriado;
  onUpdate: (updated: ChamadoCriado) => void;
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

export default function ChamadoCard({ chamado, onUpdate }: ChamadoCardProps) {
  const [editing, setEditing] = useState(false);
  const [showAnexos, setShowAnexos] = useState(false);
  const [draft, setDraft] = useState(chamado);
  const [saving, setSaving] = useState(false);

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
        status: draft.status as any,
        etapa: draft.etapa,
      }).eq('id', chamado.id);

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

  const statusColor = {
    aberto: 'bg-amber-100 text-amber-800 border-amber-300',
    em_progresso: 'bg-blue-100 text-blue-800 border-blue-300',
    fechado: 'bg-muted text-muted-foreground border-border',
  };

  const etapaColor = chamado.etapa === 'THOR' ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground';

  const c = editing ? draft : chamado;

  return (
    <>
      <div className="bg-card border rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-base">#{chamado.id}</span>
            <Badge variant="outline" className={`text-xs ${statusColor[c.status as keyof typeof statusColor] || statusColor.aberto}`}>
              {c.status === 'aberto' ? 'Aberto' : c.status === 'em_progresso' ? 'Em Progresso' : 'Fechado'}
            </Badge>
            <Badge className={`text-xs ${etapaColor}`}>{c.etapa}</Badge>
            <span className="text-xs text-muted-foreground">Criado em {chamado.criadoEm}</span>
          </div>
          <div className="flex items-center gap-2">
            {chamado.anexosNomes && chamado.anexosNomes.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowAnexos(true)}>
                <Paperclip className="h-4 w-4 mr-1.5" />
                Anexos ({chamado.anexosNomes.length})
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
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Pencil className="h-4 w-4 mr-1.5" />Editar
              </Button>
            )}
          </div>
        </div>

        {/* Row 1 - same layout as creation form */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <ReadOnlyField label="Supervisor" value={c.supervisor} />
          <ReadOnlyField label="Representante" value={c.representante} />
          <ReadOnlyField label="Código do Cliente" value={c.codigoCliente} />
          <ReadOnlyField label="Cliente" value={c.cliente} />
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
          <ReadOnlyField label="Rede" value={c.rede} />
          <ReadOnlyField label="Data Contato" value={c.dataContato} />
          <ReadOnlyField label="Data Retorno" value={c.dataRetorno} />
          {editing ? (
            <div>
              <Label className="text-xs font-semibold">Status</Label>
              <Select value={draft.status} onValueChange={v => setDraft(d => ({ ...d, status: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_progresso">Em Progresso</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <ReadOnlyField label="Motivo" value={c.motivo} />
          )}
          <ReadOnlyField label="Submotivo" value={c.submotivo} />
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
          <ReadOnlyField label="Metros Totais" value={c.metrosTotais} />
          <ReadOnlyField label="Negociado com" value={c.negociadoCom} />
          <ReadOnlyField label="Nº NFE" value={c.nfe} />
          <ReadOnlyField label="Tipo de Solicitação" value={c.tipoSolicitacao} />
          <ReadOnlyField label="Gestor" value={c.gestor} />
          <ReadOnlyField label="Status Agendamento" value={c.statusAgendamento} />
        </div>

        {/* Row 4 - Descrição */}
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
          {editing && (
            <div>
              <Label className="text-xs font-semibold">Etapa</Label>
              <Input className="mt-1" value={draft.etapa} onChange={e => setDraft(d => ({ ...d, etapa: e.target.value }))} />
            </div>
          )}
        </div>
      </div>

      {/* Anexos Dialog */}
      <Dialog open={showAnexos} onOpenChange={setShowAnexos}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anexos do Chamado #{chamado.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {chamado.anexosNomes && chamado.anexosNomes.length > 0 ? (
              chamado.anexosNomes.map((nome, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span>{nome}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum anexo.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
