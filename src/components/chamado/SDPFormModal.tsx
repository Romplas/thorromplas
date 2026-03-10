import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { FileText } from 'lucide-react';
import romplasLogo from '@/assets/romplas-logo.png';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SDFormData {
  cliente: string; representante: string; segmentoMercado: string; aplicacaoProduto: string;
  estimativaConsumo: string; precoAlvo: string;
  necessitaAmostra: string; amostraTipo: string;
  desenvolvimento: string;
  amostraReferenciaAnexa: string; qualFabricante: string;
  gramaturaTotal: string; espessura: string; substrato: string; gravacao: string;
  aditivos: string; quaisAditivos: string;
  corPantone: string; qualPantone: string;
  observacoesComplementares: string;
  statusAprovacao: string; motivoReprovacao: string;
}

const defaultSdForm: SDFormData = {
  cliente: '', representante: '', segmentoMercado: '', aplicacaoProduto: '',
  estimativaConsumo: '', precoAlvo: '', necessitaAmostra: 'nao', amostraTipo: '',
  desenvolvimento: '', amostraReferenciaAnexa: 'nao', qualFabricante: '',
  gramaturaTotal: '', espessura: '', substrato: '', gravacao: '',
  aditivos: 'nao', quaisAditivos: '', corPantone: 'nao', qualPantone: '',
  observacoesComplementares: '', statusAprovacao: '', motivoReprovacao: '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chamadoId: number;
  clienteNome: string;
  representanteNome: string;
  initialData?: Partial<SDFormData> | null;
  onPdfUploaded?: () => void;
}

export default function SDPFormModal({ open, onOpenChange, chamadoId, clienteNome, representanteNome, initialData, onPdfUploaded }: Props) {
  const [sdForm, setSdForm] = useState<SDFormData>({ ...defaultSdForm, cliente: clienteNome, representante: representanteNome });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load initial data from DB when opening
  useEffect(() => {
    if (!open) { setLoaded(false); return; }
    const loadData = async () => {
      if (initialData && Object.keys(initialData).length > 0) {
        setSdForm({ ...defaultSdForm, ...initialData, cliente: clienteNome, representante: representanteNome });
        setLoaded(true);
        return;
      }
      // Try loading from DB
      const { data } = await supabase.from('chamados').select('sdp_data').eq('id', chamadoId).maybeSingle();
      const raw = data as any;
      if (raw?.sdp_data && typeof raw.sdp_data === 'object' && (!raw.sdp_data.formType || raw.sdp_data.formType === 'sdp')) {
        const { formType, ...rest } = raw.sdp_data;
        setSdForm({ ...defaultSdForm, ...rest, cliente: clienteNome, representante: representanteNome });
      } else {
        setSdForm({ ...defaultSdForm, cliente: clienteNome, representante: representanteNome });
      }
      setLoaded(true);
    };
    loadData();
  }, [open, chamadoId, clienteNome, representanteNome]);

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v);
  };

  const generateAndUploadPdf = async () => {
    if (!sdForm.cliente || !sdForm.representante || !sdForm.segmentoMercado || !sdForm.aplicacaoProduto || !sdForm.estimativaConsumo || !sdForm.precoAlvo || !sdForm.desenvolvimento) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    setSaving(true);
    try {
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
        await new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = () => reject();
          logoImg.src = '/images/romplas-logo-pdf.png';
        });
        const logoH = 12;
        const logoW = logoH * (logoImg.naturalWidth / logoImg.naturalHeight);
        doc.addImage(logoImg, 'PNG', (pageW - logoW) / 2, y, logoW, logoH);
        y += logoH + 4;
      } catch { /* fallback */ }

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Solicitação de Desenvolvimento de Produto', pageW / 2, y, { align: 'center' });
      y += 8;
      doc.setDrawColor(180);
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      const addField = (label: string, value: string) => {
        checkPage(12);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        doc.text(label, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value || '-', margin + doc.getTextWidth(label) + 3, y);
        y += 7;
      };

      const addFieldRow = (l1: string, v1: string, l2: string, v2: string) => {
        checkPage(12);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        doc.text(l1, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(v1 || '-', margin + doc.getTextWidth(l1) + 3, y);
        const col2X = pageW / 2 + 5;
        doc.setFont('helvetica', 'bold');
        doc.text(l2, col2X, y);
        doc.setFont('helvetica', 'normal');
        doc.text(v2 || '-', col2X + doc.getTextWidth(l2) + 3, y);
        y += 7;
      };

      const addSectionBox = (title: string, contentFn: () => void) => {
        checkPage(25);
        const startY = y; y += 2;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        if (title) doc.text(title, margin + 3, y + 4);
        y += title ? 9 : 4;
        doc.setFont('helvetica', 'normal');
        contentFn();
        y += 2;
        doc.setDrawColor(200);
        doc.roundedRect(margin, startY, contentW, y - startY, 2, 2, 'S');
        y += 6;
      };

      addFieldRow('Cliente:', sdForm.cliente, 'Representante:', sdForm.representante);
      y += 2;
      addField('Segmento de Mercado:', sdForm.segmentoMercado);
      addField('Aplicação do Produto:', sdForm.aplicacaoProduto);
      addFieldRow('Estimativa de Consumo em Metros:', sdForm.estimativaConsumo, 'Preço Alvo:', sdForm.precoAlvo);
      y += 3;

      addSectionBox('Necessita de Amostra?', () => {
        const t = sdForm.necessitaAmostra === 'sim' ? `Sim — ${sdForm.amostraTipo === 'placa' ? 'Placa' : sdForm.amostraTipo === 'metros' ? 'Metros' : '-'}` : 'Não';
        doc.text(t, margin + 3, y); y += 5;
      });

      const devLabels: Record<string, string> = { nova_cor: 'Nova Cor em Produto de Linha', novo_produto: 'Novo Produto/Cor', extrusado: 'Extrusado', espalmado: 'Espalmado' };
      addSectionBox('Desenvolvimento:', () => {
        doc.text(devLabels[sdForm.desenvolvimento] || sdForm.desenvolvimento, margin + 3, y); y += 5;
      });

      addSectionBox('No caso de novos produtos', () => {
        doc.setFont('helvetica', 'bold');
        doc.text('Amostra Referência Anexa:', margin + 3, y);
        doc.setFont('helvetica', 'normal');
        const refText = sdForm.amostraReferenciaAnexa === 'sim' ? `Sim — Fabricante: ${sdForm.qualFabricante}` : 'Não';
        doc.text(refText, margin + 3 + doc.getTextWidth('Amostra Referência Anexa: ') + 2, y);
        y += 7;
        if (sdForm.amostraReferenciaAnexa !== 'sim') {
          doc.setFontSize(7); doc.setTextColor(130);
          doc.text('Se for SIM no caso acima, não é necessário especificar os campos abaixo:', margin + 3, y);
          doc.setTextColor(0); doc.setFontSize(9); y += 6;
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

      if (sdForm.observacoesComplementares) {
        checkPage(15);
        doc.setFont('helvetica', 'bold');
        doc.text('Observações Complementares:', margin, y); y += 6;
        doc.setFont('helvetica', 'normal');
        const obsLines = doc.splitTextToSize(sdForm.observacoesComplementares, contentW);
        doc.text(obsLines, margin, y); y += obsLines.length * 5;
      }

      checkPage(25); y += 3;
      addSectionBox('', () => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        const aprovadaLabel = '( ' + (sdForm.statusAprovacao === 'aprovada' ? 'X' : ' ') + ' ) APROVADA';
        const reprovadaLabel = '( ' + (sdForm.statusAprovacao === 'reprovada' ? 'X' : ' ') + ' ) REPROVADA, POR QUE?';
        doc.text(aprovadaLabel + '    ' + reprovadaLabel, margin + 3, y); y += 8;
        doc.setFont('helvetica', 'bold');
        doc.text('MOTIVO', pageW / 2, y, { align: 'center' }); y += 6;
        doc.setDrawColor(0);
        doc.line(margin + 3, y, pageW - margin - 3, y); y += 3;
        doc.setFont('helvetica', 'normal');
        if (sdForm.motivoReprovacao) {
          const motivoLines = doc.splitTextToSize(sdForm.motivoReprovacao, contentW - 6);
          doc.text(motivoLines, margin + 3, y); y += motivoLines.length * 5;
        } else {
          doc.text('R:', margin + 3, y);
          doc.line(margin + 10, y + 1, pageW - margin - 3, y + 1); y += 5;
        }
      });

      const pdfBlob = doc.output('blob');
      const cleanName = (sdForm.cliente || 'solicitacao').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${Date.now()}_SDP_${cleanName}.pdf`;
      const filePath = `${chamadoId}/${fileName}`;

      const { error } = await supabase.storage
        .from('chamado-anexos')
        .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });

      if (error) throw error;

      // Save form data to DB
      await supabase.from('chamados').update({ sdp_data: sdForm as any } as any).eq('id', chamadoId);

      toast.success('PDF da SDP gerado e anexado ao ticket!');
      onPdfUploaded?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <img src={romplasLogo} alt="Romplas" className="h-10 object-contain" />
          </div>
          <DialogTitle className="text-center">SDP - Solicitação de Desenvolvimento de Produto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label className="text-xs">Cliente *</Label><Input className="mt-1" value={sdForm.cliente} onChange={e => setSdForm(p => ({ ...p, cliente: e.target.value }))} /></div>
            <div><Label className="text-xs">Representante *</Label><Input className="mt-1" value={sdForm.representante} disabled /></div>
          </div>
          <div><Label className="text-xs">Segmento de Mercado *</Label><Input className="mt-1" value={sdForm.segmentoMercado} onChange={e => setSdForm(p => ({ ...p, segmentoMercado: e.target.value }))} /></div>
          <div><Label className="text-xs">Aplicação do Produto *</Label><Input className="mt-1" value={sdForm.aplicacaoProduto} onChange={e => setSdForm(p => ({ ...p, aplicacaoProduto: e.target.value }))} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label className="text-xs">Estimativa de Consumo em Metros *</Label><Input className="mt-1" value={sdForm.estimativaConsumo} onChange={e => setSdForm(p => ({ ...p, estimativaConsumo: e.target.value }))} /></div>
            <div><Label className="text-xs">Preço Alvo *</Label><Input className="mt-1" value={sdForm.precoAlvo} onChange={e => setSdForm(p => ({ ...p, precoAlvo: e.target.value }))} /></div>
          </div>

          <div className="border rounded-lg p-3 space-y-2">
            <Label className="text-xs font-semibold">Necessita de Amostra?</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="sdp-necessitaAmostra" checked={sdForm.necessitaAmostra === 'nao'} onChange={() => setSdForm(p => ({ ...p, necessitaAmostra: 'nao', amostraTipo: '' }))} /> Não</label>
              <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="sdp-necessitaAmostra" checked={sdForm.necessitaAmostra === 'sim'} onChange={() => setSdForm(p => ({ ...p, necessitaAmostra: 'sim' }))} /> Sim</label>
              {sdForm.necessitaAmostra === 'sim' && (
                <>
                  <span className="text-xs text-muted-foreground ml-2">—</span>
                  <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="sdp-amostraTipo" checked={sdForm.amostraTipo === 'placa'} onChange={() => setSdForm(p => ({ ...p, amostraTipo: 'placa' }))} /> Placa</label>
                  <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="sdp-amostraTipo" checked={sdForm.amostraTipo === 'metros'} onChange={() => setSdForm(p => ({ ...p, amostraTipo: 'metros' }))} /> Metros</label>
                </>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-3 space-y-2">
            <Label className="text-xs font-semibold">Desenvolvimento *</Label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="sdp-desenvolvimento" checked={sdForm.desenvolvimento === 'nova_cor'} onChange={() => setSdForm(p => ({ ...p, desenvolvimento: 'nova_cor' }))} /> Nova Cor em Produto de Linha</label>
              <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="sdp-desenvolvimento" checked={sdForm.desenvolvimento === 'novo_produto'} onChange={() => setSdForm(p => ({ ...p, desenvolvimento: 'novo_produto' }))} /> Novo Produto / Cor</label>
              <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="sdp-desenvolvimento" checked={sdForm.desenvolvimento === 'extrusado'} onChange={() => setSdForm(p => ({ ...p, desenvolvimento: 'extrusado' }))} /> Extrusado</label>
              <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="sdp-desenvolvimento" checked={sdForm.desenvolvimento === 'espalmado'} onChange={() => setSdForm(p => ({ ...p, desenvolvimento: 'espalmado' }))} /> Espalmado</label>
            </div>
          </div>

          <div className="border rounded-lg p-3 space-y-2">
            <Label className="text-xs font-semibold">No caso de novos produtos</Label>
            <div className="space-y-2">
              <Label className="text-xs">Amostra Referência Anexa:</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="sdp-amostraRef" checked={sdForm.amostraReferenciaAnexa === 'nao'} onChange={() => setSdForm(p => ({ ...p, amostraReferenciaAnexa: 'nao', qualFabricante: '' }))} /> Não</label>
                <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="sdp-amostraRef" checked={sdForm.amostraReferenciaAnexa === 'sim'} onChange={() => setSdForm(p => ({ ...p, amostraReferenciaAnexa: 'sim' }))} /> Sim</label>
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
                    <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="sdp-aditivos" checked={sdForm.aditivos === 'nao'} onChange={() => setSdForm(p => ({ ...p, aditivos: 'nao', quaisAditivos: '' }))} /> Não</label>
                    <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="sdp-aditivos" checked={sdForm.aditivos === 'sim'} onChange={() => setSdForm(p => ({ ...p, aditivos: 'sim' }))} /> Sim</label>
                  </div>
                  {sdForm.aditivos === 'sim' && <Input placeholder="Quais?" value={sdForm.quaisAditivos} onChange={e => setSdForm(p => ({ ...p, quaisAditivos: e.target.value }))} />}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Cor Pantone:</Label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="sdp-corPantone" checked={sdForm.corPantone === 'nao'} onChange={() => setSdForm(p => ({ ...p, corPantone: 'nao', qualPantone: '' }))} /> Não</label>
                    <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="sdp-corPantone" checked={sdForm.corPantone === 'sim'} onChange={() => setSdForm(p => ({ ...p, corPantone: 'sim' }))} /> Sim</label>
                  </div>
                  {sdForm.corPantone === 'sim' && <Input placeholder="Qual?" value={sdForm.qualPantone} onChange={e => setSdForm(p => ({ ...p, qualPantone: e.target.value }))} />}
                </div>
              </div>
            )}
          </div>

          <div><Label className="text-xs">Observações Complementares</Label><Textarea className="mt-1" value={sdForm.observacoesComplementares} onChange={e => setSdForm(p => ({ ...p, observacoesComplementares: e.target.value }))} /></div>

          <div className="border rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-1.5 text-xs font-medium">
                <input type="radio" name="sdp-statusAprovacao" checked={sdForm.statusAprovacao === 'aprovada'} onChange={() => setSdForm(p => ({ ...p, statusAprovacao: 'aprovada', motivoReprovacao: '' }))} />
                APROVADA
              </label>
              <label className="flex items-center gap-1.5 text-xs font-medium">
                <input type="radio" name="sdp-statusAprovacao" checked={sdForm.statusAprovacao === 'reprovada'} onChange={() => setSdForm(p => ({ ...p, statusAprovacao: 'reprovada' }))} />
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={generateAndUploadPdf} disabled={saving}>
            <FileText className="h-4 w-4 mr-1.5" />{saving ? 'Gerando...' : 'Confirmar e Anexar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
