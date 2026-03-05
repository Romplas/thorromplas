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

interface AmostrasFormData {
  produto: string; referencia: string; cor: string; quantidade: string; tamanho: string; destino: string; observacoes: string;
}

const defaultForm: AmostrasFormData = { produto: '', referencia: '', cor: '', quantidade: '', tamanho: '', destino: '', observacoes: '' };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chamadoId: number;
  clienteNome: string;
  representanteNome: string;
  onPdfUploaded?: () => void;
}

export default function AmostrasFormModal({ open, onOpenChange, chamadoId, clienteNome, representanteNome, onPdfUploaded }: Props) {
  const [form, setForm] = useState<AmostrasFormData>({ ...defaultForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data } = await supabase.from('chamados').select('sdp_data').eq('id', chamadoId).maybeSingle();
      const raw = data as any;
      if (raw?.sdp_data && typeof raw.sdp_data === 'object' && raw.sdp_data.formType === 'amostras') {
        const { formType, ...rest } = raw.sdp_data;
        setForm({ ...defaultForm, ...rest });
      } else {
        setForm({ ...defaultForm });
      }
    };
    load();
  }, [open, chamadoId]);

  const generateAndUploadPdf = async () => {
    if (!form.produto || !form.referencia || !form.cor || !form.quantidade || !form.tamanho || !form.destino) {
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

      try {
        const logoImg = new window.Image(); logoImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => { logoImg.onload = () => resolve(); logoImg.onerror = () => reject(); logoImg.src = '/images/romplas-logo-pdf.png'; });
        const logoH = 12; const logoW = logoH * (logoImg.naturalWidth / logoImg.naturalHeight);
        doc.addImage(logoImg, 'PNG', (pageW - logoW) / 2, y, logoW, logoH); y += logoH + 4;
      } catch { /* fallback */ }

      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text('Solicitação de Amostras', pageW / 2, y, { align: 'center' }); y += 8;
      doc.setDrawColor(180); doc.line(margin, y, pageW - margin, y); y += 8;

      const addFieldRow = (l1: string, v1: string, l2: string, v2: string) => { checkPage(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(l1, margin, y); doc.setFont('helvetica', 'normal'); doc.text(v1 || '-', margin + doc.getTextWidth(l1) + 3, y); const col2X = pageW / 2 + 5; doc.setFont('helvetica', 'bold'); doc.text(l2, col2X, y); doc.setFont('helvetica', 'normal'); doc.text(v2 || '-', col2X + doc.getTextWidth(l2) + 3, y); y += 7; };
      const addSectionBox = (title: string, contentFn: () => void) => { checkPage(25); const startY = y; y += 2; doc.setFont('helvetica', 'bold'); doc.setFontSize(9); if (title) doc.text(title, margin + 3, y + 4); y += title ? 9 : 4; doc.setFont('helvetica', 'normal'); contentFn(); y += 2; doc.setDrawColor(200); doc.roundedRect(margin, startY, contentW, y - startY, 2, 2, 'S'); y += 6; };

      addFieldRow('Cliente:', clienteNome, 'Representante:', representanteNome); y += 2;

      addSectionBox('Dados da Amostra', () => {
        addFieldRow('Produto:', form.produto, 'Referência:', form.referencia);
        addFieldRow('Cor:', form.cor, 'Quantidade:', form.quantidade);
        addFieldRow('Tamanho:', form.tamanho, 'Destino:', form.destino);
      });

      if (form.observacoes) {
        addSectionBox('Observações', () => {
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
          const obsLines = doc.splitTextToSize(form.observacoes, contentW - 6);
          doc.text(obsLines, margin + 3, y); y += obsLines.length * 5;
        });
      }

      const pdfBlob = doc.output('blob');
      const cleanName = (clienteNome || 'amostras').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${Date.now()}_Amostras_${cleanName}.pdf`;
      const filePath = `${chamadoId}/${fileName}`;

      const { error } = await supabase.storage.from('chamado-anexos').upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });
      if (error) throw error;

      await supabase.from('chamados').update({ sdp_data: { ...form, formType: 'amostras' } as any } as any).eq('id', chamadoId);

      toast.success('PDF de Amostras gerado e anexado ao ticket!');
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <img src={romplasLogo} alt="Romplas" className="h-10 object-contain" />
          </div>
          <DialogTitle className="text-center">Solicitação de Amostras</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Produto *</Label><Input className="mt-1" value={form.produto} onChange={e => setForm(p => ({ ...p, produto: e.target.value }))} /></div>
            <div><Label className="text-xs">Referência *</Label><Input className="mt-1" value={form.referencia} onChange={e => setForm(p => ({ ...p, referencia: e.target.value }))} /></div>
            <div><Label className="text-xs">Cor *</Label><Input className="mt-1" value={form.cor} onChange={e => setForm(p => ({ ...p, cor: e.target.value }))} /></div>
            <div><Label className="text-xs">Quantidade *</Label><Input className="mt-1" value={form.quantidade} onChange={e => setForm(p => ({ ...p, quantidade: e.target.value }))} /></div>
            <div><Label className="text-xs">Tamanho *</Label><Input className="mt-1" value={form.tamanho} onChange={e => setForm(p => ({ ...p, tamanho: e.target.value }))} /></div>
            <div><Label className="text-xs">Destino *</Label><Input className="mt-1" value={form.destino} onChange={e => setForm(p => ({ ...p, destino: e.target.value }))} /></div>
          </div>
          <div><Label className="text-xs">Observações</Label><Textarea className="mt-1" value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
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
