import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { FileText, Plus, Trash2 } from 'lucide-react';
import romplasLogo from '@/assets/romplas-logo.png';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RNCProduto { produto: string; cod: string; metros: string }

interface RNCFormData {
  cliente: string; representante: string;
  produtos: RNCProduto[];
  amostraAnexa: string; imagensVideo: boolean; imagensFotos: boolean;
  nfVenda: string; descricaoNaoConformidade: string;
  objetivoAlertarEmpresa: boolean; objetivoDevParcial: boolean; objetivoDevTotal: boolean; objetivoNegociacao: boolean;
  parecerFabrica: string; autorizadoResposta: string; motivo: string; fechamentoRnc: string;
  dataComercial: string; assinaturaComercial: string;
  dataQualidade: string; assinaturaQualidade: string;
  dataFinanceiro: string; assinaturaFinanceiro: string;
}

const defaultForm: RNCFormData = {
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chamadoId: number;
  clienteNome: string;
  representanteNome: string;
  onPdfUploaded?: () => void;
}

export default function RNCFormModal({ open, onOpenChange, chamadoId, clienteNome, representanteNome, onPdfUploaded }: Props) {
  const [form, setForm] = useState<RNCFormData>({ ...defaultForm, cliente: clienteNome, representante: representanteNome });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data } = await supabase.from('chamados').select('sdp_data').eq('id', chamadoId).maybeSingle();
      const raw = data as any;
      if (raw?.sdp_data && typeof raw.sdp_data === 'object' && raw.sdp_data.formType === 'rnc') {
        const { formType, ...rest } = raw.sdp_data;
        setForm({ ...defaultForm, ...rest, cliente: clienteNome, representante: representanteNome });
      } else {
        setForm({ ...defaultForm, cliente: clienteNome, representante: representanteNome });
      }
    };
    load();
  }, [open, chamadoId, clienteNome, representanteNome]);

  const addProduto = () => setForm(p => ({ ...p, produtos: [...p.produtos, { produto: '', cod: '', metros: '' }] }));
  const removeProduto = (idx: number) => setForm(p => ({ ...p, produtos: p.produtos.filter((_, i) => i !== idx) }));

  const generateAndUploadPdf = async () => {
    if (!form.cliente || !form.produtos[0]?.produto || !form.nfVenda || !form.descricaoNaoConformidade) {
      toast.error('Preencha os campos obrigatórios (Cliente, Produto, NF Venda, Descrição).');
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

      try {
        const logoImg = new window.Image(); logoImg.crossOrigin = 'anonymous';
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

      addFieldRow('Cliente:', form.cliente, 'Representante:', form.representante); y += 2;

      addSectionBox('Produtos', () => {
        form.produtos.filter(p => p.produto).forEach((prod, i) => {
          checkPage(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
          doc.text(`Produto ${i + 1}:`, margin + 3, y); doc.setFont('helvetica', 'normal'); doc.text(prod.produto || '-', margin + 3 + doc.getTextWidth(`Produto ${i + 1}: `) + 2, y);
          const col2X = pageW / 2 - 5;
          doc.setFont('helvetica', 'bold'); doc.text('Cód:', col2X, y); doc.setFont('helvetica', 'normal'); doc.text(prod.cod || '-', col2X + doc.getTextWidth('Cód: ') + 2, y);
          const col3X = pageW / 2 + 30;
          doc.setFont('helvetica', 'bold'); doc.text('Metros:', col3X, y); doc.setFont('helvetica', 'normal'); doc.text(prod.metros || '-', col3X + doc.getTextWidth('Metros: ') + 2, y); y += 7;
        });
      });

      addSectionBox('Amostra / Imagens', () => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        doc.text('Amostra Anexa:', margin + 3, y); doc.setFont('helvetica', 'normal'); doc.text(form.amostraAnexa === 'sim' ? 'SIM' : 'NÃO', margin + 3 + doc.getTextWidth('Amostra Anexa: ') + 2, y);
        const imgX = pageW / 2;
        doc.setFont('helvetica', 'bold'); doc.text('Imagens:', imgX, y); doc.setFont('helvetica', 'normal');
        const imgs = [form.imagensVideo ? 'Vídeo' : '', form.imagensFotos ? 'Fotos' : ''].filter(Boolean).join(', ') || 'Nenhuma';
        doc.text(imgs, imgX + doc.getTextWidth('Imagens: ') + 2, y); y += 5;
      });

      addField('Número da Nota Fiscal de Venda:', form.nfVenda); y += 2;

      addSectionBox('Descrição da Não Conformidade', () => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        const descLines = doc.splitTextToSize(form.descricaoNaoConformidade, contentW - 6);
        doc.text(descLines, margin + 3, y); y += descLines.length * 5;
      });

      addSectionBox('Objetivo da RNC', () => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        doc.text(`(${form.objetivoAlertarEmpresa ? 'X' : ' '}) Alertar a Empresa    (${form.objetivoDevParcial ? 'X' : ' '}) Devolução Parcial`, margin + 3, y); y += 6;
        doc.text(`(${form.objetivoDevTotal ? 'X' : ' '}) Devolução Total    (${form.objetivoNegociacao ? 'X' : ' '}) Negociação`, margin + 3, y); y += 5;
      });

      addSectionBox('Parecer da Fábrica (Romplas)', () => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        doc.text(`(${form.parecerFabrica === 'procede' ? 'X' : ' '}) PROCEDE    (${form.parecerFabrica === 'nao_procede' ? 'X' : ' '}) NÃO PROCEDE, POR QUE?`, margin + 3, y); y += 5;
      });

      addSectionBox('Motivo', () => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        if (form.motivo) { const mLines = doc.splitTextToSize(form.motivo, contentW - 6); doc.text(mLines, margin + 3, y); y += mLines.length * 5; } else { doc.text('R:', margin + 3, y); doc.line(margin + 10, y + 1, pageW - margin - 3, y + 1); y += 5; }
      });

      addSectionBox('Fechamento da RNC (Comercial/Financeiro)', () => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        if (form.fechamentoRnc) { const fLines = doc.splitTextToSize(form.fechamentoRnc, contentW - 6); doc.text(fLines, margin + 3, y); y += fLines.length * 5; } else { doc.text('R:', margin + 3, y); doc.line(margin + 10, y + 1, pageW - margin - 3, y + 1); y += 5; }
      });

      checkPage(30); doc.setDrawColor(180); doc.line(margin, y, pageW - margin, y); y += 5;
      doc.setFontSize(9);
      const sigCol1 = margin; const sigCol2 = pageW / 2 + 5;
      doc.setFont('helvetica', 'bold');
      doc.text(`Data: ${form.dataComercial || '___/___/___'}`, sigCol1, y); doc.text(`Assinatura Comercial: ${form.assinaturaComercial || '________________'}`, sigCol2, y); y += 7;
      doc.text(`Data: ${form.dataQualidade || '___/___/___'}`, sigCol1, y); doc.text(`Assinatura Qualidade: ${form.assinaturaQualidade || '________________'}`, sigCol2, y); y += 7;
      doc.text(`Data: ${form.dataFinanceiro || '___/___/___'}`, sigCol1, y); doc.text(`Assinatura Financeiro: ${form.assinaturaFinanceiro || '________________'}`, sigCol2, y);

      const pdfBlob = doc.output('blob');
      const cleanName = (form.cliente || 'rnc').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${Date.now()}_RNC_${cleanName}.pdf`;
      const filePath = `${chamadoId}/${fileName}`;

      const { error } = await supabase.storage.from('chamado-anexos').upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });
      if (error) throw error;

      await supabase.from('chamados').update({ sdp_data: { ...form, formType: 'rnc' } as any } as any).eq('id', chamadoId);

      toast.success('PDF da RNC gerado e anexado ao ticket!');
      onPdfUploaded?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <img src={romplasLogo} alt="Romplas" className="h-10 object-contain" />
          </div>
          <DialogTitle className="text-center">RNC - Relatório de Não Conformidade</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label className="text-xs">Cliente *</Label><Input className="mt-1" value={form.cliente} onChange={e => setForm(p => ({ ...p, cliente: e.target.value }))} /></div>
            <div><Label className="text-xs">Representante *</Label><Input className="mt-1" value={form.representante} disabled /></div>
          </div>

          {/* Produtos dinâmicos */}
          <div className="border rounded-lg p-3 space-y-2">
            <Label className="text-xs font-semibold">Produtos *</Label>
            {form.produtos.map((prod, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                <div><Label className="text-[10px] text-muted-foreground">Produto</Label><Input className="mt-0.5 h-8 text-xs" value={prod.produto} onChange={e => { const u = [...form.produtos]; u[idx] = { ...u[idx], produto: e.target.value }; setForm(p => ({ ...p, produtos: u })); }} /></div>
                <div><Label className="text-[10px] text-muted-foreground">Cód.</Label><Input className="mt-0.5 h-8 text-xs" value={prod.cod} onChange={e => { const u = [...form.produtos]; u[idx] = { ...u[idx], cod: e.target.value }; setForm(p => ({ ...p, produtos: u })); }} /></div>
                <div><Label className="text-[10px] text-muted-foreground">Metros</Label><Input className="mt-0.5 h-8 text-xs" value={prod.metros} onChange={e => { const u = [...form.produtos]; u[idx] = { ...u[idx], metros: e.target.value }; setForm(p => ({ ...p, produtos: u })); }} /></div>
                <div className="flex gap-1">
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={addProduto}><Plus className="h-3.5 w-3.5" /></Button>
                  {form.produtos.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeProduto(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
              </div>
            ))}
          </div>

          {/* Amostra / Imagens */}
          <div className="border rounded-lg p-3 space-y-2">
            <Label className="text-xs font-semibold">Amostra Anexa:</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="rnc-amostra" checked={form.amostraAnexa === 'nao'} onChange={() => setForm(p => ({ ...p, amostraAnexa: 'nao' }))} /> Não</label>
              <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="rnc-amostra" checked={form.amostraAnexa === 'sim'} onChange={() => setForm(p => ({ ...p, amostraAnexa: 'sim' }))} /> Sim</label>
            </div>
            <div className="flex items-center gap-4 pt-1">
              <Label className="text-xs">Imagens:</Label>
              <label className="flex items-center gap-1.5 text-xs"><Checkbox checked={form.imagensVideo} onCheckedChange={v => setForm(p => ({ ...p, imagensVideo: !!v }))} /> Vídeo</label>
              <label className="flex items-center gap-1.5 text-xs"><Checkbox checked={form.imagensFotos} onCheckedChange={v => setForm(p => ({ ...p, imagensFotos: !!v }))} /> Fotos</label>
            </div>
          </div>

          <div><Label className="text-xs">Número da Nota Fiscal de Venda *</Label><Input className="mt-1" value={form.nfVenda} onChange={e => setForm(p => ({ ...p, nfVenda: e.target.value }))} /></div>
          <div><Label className="text-xs">Descrição da Não Conformidade *</Label><Textarea className="mt-1 min-h-[80px]" value={form.descricaoNaoConformidade} onChange={e => setForm(p => ({ ...p, descricaoNaoConformidade: e.target.value }))} /></div>

          {/* Objetivo */}
          <div className="border rounded-lg p-3 space-y-2">
            <Label className="text-xs font-semibold">Objetivo da RNC:</Label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-1.5 text-xs"><Checkbox checked={form.objetivoAlertarEmpresa} onCheckedChange={v => setForm(p => ({ ...p, objetivoAlertarEmpresa: !!v }))} /> Alertar a Empresa</label>
              <label className="flex items-center gap-1.5 text-xs"><Checkbox checked={form.objetivoDevParcial} onCheckedChange={v => setForm(p => ({ ...p, objetivoDevParcial: !!v }))} /> Devolução Parcial</label>
              <label className="flex items-center gap-1.5 text-xs"><Checkbox checked={form.objetivoDevTotal} onCheckedChange={v => setForm(p => ({ ...p, objetivoDevTotal: !!v }))} /> Devolução Total</label>
              <label className="flex items-center gap-1.5 text-xs"><Checkbox checked={form.objetivoNegociacao} onCheckedChange={v => setForm(p => ({ ...p, objetivoNegociacao: !!v }))} /> Negociação</label>
            </div>
          </div>

          {/* Parecer */}
          <div className="border rounded-lg p-3 space-y-2">
            <Label className="text-xs font-semibold">Parecer da Fábrica (Romplas):</Label>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="rnc-parecer" checked={form.parecerFabrica === 'procede'} onChange={() => setForm(p => ({ ...p, parecerFabrica: 'procede' }))} /> PROCEDE</label>
              <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="rnc-parecer" checked={form.parecerFabrica === 'nao_procede'} onChange={() => setForm(p => ({ ...p, parecerFabrica: 'nao_procede' }))} /> NÃO PROCEDE, POR QUE?</label>
              <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="rnc-parecer" checked={form.parecerFabrica === 'autorizado'} onChange={() => setForm(p => ({ ...p, parecerFabrica: 'autorizado' }))} /> AUTORIZADO</label>
              <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="rnc-parecer" checked={form.parecerFabrica === 'sim'} onChange={() => setForm(p => ({ ...p, parecerFabrica: 'sim' }))} /> SIM</label>
              <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="rnc-parecer" checked={form.parecerFabrica === 'nao'} onChange={() => setForm(p => ({ ...p, parecerFabrica: 'nao' }))} /> NÃO</label>
            </div>
          </div>

          <div><Label className="text-xs font-semibold text-center block">MOTIVO</Label><Textarea className="mt-1" placeholder="R:" value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))} /></div>

          <div><Label className="text-xs font-semibold text-center block">FECHAMENTO DA RNC (COMERCIAL/FINANCEIRO)</Label><Textarea className="mt-1 min-h-[80px]" placeholder="R:" value={form.fechamentoRnc} onChange={e => setForm(p => ({ ...p, fechamentoRnc: e.target.value }))} /></div>

          {/* Assinaturas */}
          <div className="border rounded-lg p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Data Comercial</Label><Input type="date" className="mt-1" value={form.dataComercial} onChange={e => setForm(p => ({ ...p, dataComercial: e.target.value }))} /></div>
              <div><Label className="text-xs">Assinatura Comercial</Label><Input className="mt-1" value={form.assinaturaComercial} onChange={e => setForm(p => ({ ...p, assinaturaComercial: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Data Qualidade</Label><Input type="date" className="mt-1" value={form.dataQualidade} onChange={e => setForm(p => ({ ...p, dataQualidade: e.target.value }))} /></div>
              <div><Label className="text-xs">Assinatura Qualidade</Label><Input className="mt-1" value={form.assinaturaQualidade} onChange={e => setForm(p => ({ ...p, assinaturaQualidade: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Data Financeiro</Label><Input type="date" className="mt-1" value={form.dataFinanceiro} onChange={e => setForm(p => ({ ...p, dataFinanceiro: e.target.value }))} /></div>
              <div><Label className="text-xs">Assinatura Financeiro</Label><Input className="mt-1" value={form.assinaturaFinanceiro} onChange={e => setForm(p => ({ ...p, assinaturaFinanceiro: e.target.value }))} /></div>
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
