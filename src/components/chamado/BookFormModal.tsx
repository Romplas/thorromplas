import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { FileText, Plus, Trash2, Eye } from 'lucide-react';
import romplasLogo from '@/assets/romplas-logo.png';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SequenciaRow { linhas: string; quantidade: string }

export interface BookFullFormData {
  razaoSocial: string; codigo: string;
  representante: string;
  dataEntregaNegociada: string;
  envio: string; // 'com_pedido' | 'sem_pedido'
  transportadora: string;
  modeloBook: string[]; // ['A','B','C','D','E']
  quantidadeBook: string;
  quantidadeLinhas: string;
  nLaminas: string;
  materialCorCapa: string; codigoCapa: string;
  descricaoCapa: string;
  aprovacaoArte: string; // 'sim' | 'nao'
  bonecoAprovacao: string; // 'sim' | 'nao'
  bookEscolhido: string[]; // ['A','B','C','D','E']
  colunaA: SequenciaRow[];
  colunaB: SequenciaRow[];
  colunaC: SequenciaRow[];
  observacao: string;
  // Personalização
  arteCapa: boolean; logoCliente: string; nomeProjeto: boolean;
  acrilico: boolean; placaMetalica: boolean; divisoria: string;
  laminasNomeCliente: boolean; codigosCliente: boolean;
  silkCapa: string; // 'cor_unica' | 'colorido'
  adesivoPers: string; // 'sim' | 'nao'
  contraCapaFrente: boolean; contraCapaFundo: boolean;
}

export const defaultBookFullForm: BookFullFormData = {
  razaoSocial: '', codigo: '', representante: '', dataEntregaNegociada: '',
  envio: '', transportadora: '',
  modeloBook: [],
  quantidadeBook: '', quantidadeLinhas: '', nLaminas: '',
  materialCorCapa: '', codigoCapa: '', descricaoCapa: '',
  aprovacaoArte: '', bonecoAprovacao: '',
  bookEscolhido: [],
  colunaA: [{ linhas: '', quantidade: '' }],
  colunaB: [{ linhas: '', quantidade: '' }],
  colunaC: [{ linhas: '', quantidade: '' }],
  observacao: '',
  arteCapa: false, logoCliente: '', nomeProjeto: false,
  acrilico: false, placaMetalica: false, divisoria: '',
  laminasNomeCliente: false, codigosCliente: false,
  silkCapa: '', adesivoPers: '', contraCapaFrente: false, contraCapaFundo: false,
};

const MODELOS = [
  { key: 'A', label: 'A (20,5×11,5×5)', laminas: '60/70', img: '/images/book-model-a.png' },
  { key: 'B', label: 'B (21,5×14×5,5)', laminas: '70/80', img: '/images/book-model-b.png' },
  { key: 'C', label: 'C (24,5×17,5×4,5)', laminas: '60/70', img: '/images/book-model-c.png' },
  { key: 'D', label: 'D (22×28×5)', laminas: '90/100', img: '/images/book-model-d.png' },
  { key: 'E', label: 'E (40×21×6)', laminas: '150/165', img: '/images/book-model-e.png' },
];

export function generateBookPdf(form: BookFullFormData, clienteNome: string, representanteNome: string): Blob {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 12;
  const checkPage = (needed: number) => { if (y + needed > 280) { doc.addPage(); y = 15; } };

  const addFieldRow = (l1: string, v1: string, l2: string, v2: string) => {
    checkPage(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(l1, margin, y); doc.setFont('helvetica', 'normal');
    doc.text(v1 || '-', margin + doc.getTextWidth(l1) + 3, y);
    const col2X = pageW / 2 + 5; doc.setFont('helvetica', 'bold');
    doc.text(l2, col2X, y); doc.setFont('helvetica', 'normal');
    doc.text(v2 || '-', col2X + doc.getTextWidth(l2) + 3, y); y += 7;
  };
  const addSectionBox = (title: string, contentFn: () => void) => {
    checkPage(25); const startY = y; y += 2;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    if (title) doc.text(title, margin + 3, y + 4); y += title ? 9 : 4;
    doc.setFont('helvetica', 'normal'); contentFn(); y += 2;
    doc.setDrawColor(200); doc.roundedRect(margin, startY, contentW, y - startY, 2, 2, 'S'); y += 6;
  };
  const addField = (label: string, value: string) => {
    checkPage(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(label, margin + 3, y); doc.setFont('helvetica', 'normal');
    doc.text(value || '-', margin + 3 + doc.getTextWidth(label) + 3, y); y += 7;
  };

  // Logo
  try {
    // Logo loaded externally before calling; skip in pure function
  } catch { /* */ }

  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text("Formulário Book's Personalizados", pageW / 2, y, { align: 'center' }); y += 8;
  doc.setDrawColor(180); doc.line(margin, y, pageW - margin, y); y += 8;

  // Dados gerais
  addFieldRow('Razão Social:', form.razaoSocial || clienteNome, 'Cod:', form.codigo);
  addFieldRow('Representante:', form.representante || representanteNome, 'Data Entrega:', form.dataEntregaNegociada);
  const envioText = form.envio === 'com_pedido' ? 'Com Pedido' : form.envio === 'sem_pedido' ? 'Sem Pedido' : '-';
  addFieldRow('Envio:', envioText, 'Transportadora:', form.transportadora);
  y += 2;

  // Modelo Book
  addSectionBox('Modelo Book', () => {
    const selected = MODELOS.map(m => `(${form.modeloBook.includes(m.key) ? 'X' : ' '}) ${m.label} - Laminas ${m.laminas}`);
    selected.forEach(s => { doc.text(s, margin + 3, y); y += 6; });
  });

  // Dados do Book
  addSectionBox('Dados do Book', () => {
    addField('Quantidade Book:', form.quantidadeBook);
    addField('Quantidade de Linhas:', form.quantidadeLinhas);
    addField('Nº Laminas:', form.nLaminas);
    addFieldRow('Material/Cor Capa:', form.materialCorCapa, 'Código:', form.codigoCapa);
    addField('Descrição Capa:', form.descricaoCapa);
    doc.text(`Aprovação Arte: (${form.aprovacaoArte === 'sim' ? 'X' : ' '}) SIM  (${form.aprovacaoArte === 'nao' ? 'X' : ' '}) NÃO`, margin + 3, y); y += 6;
    doc.text(`Boneco Aprovação: (${form.bonecoAprovacao === 'sim' ? 'X' : ' '}) SIM  (${form.bonecoAprovacao === 'nao' ? 'X' : ' '}) NÃO`, margin + 3, y); y += 5;
  });

  // Sequência
  addSectionBox('Sequência do Book', () => {
    const sel = MODELOS.map(m => `(${form.bookEscolhido.includes(m.key) ? 'X' : ' '})${m.key}`).join('  ');
    doc.setFont('helvetica', 'bold'); doc.text('Book Escolhido: ' + sel, margin + 3, y); y += 8;
    doc.setFont('helvetica', 'normal');

    const drawCol = (title: string, rows: SequenciaRow[], x: number, w: number) => {
      const savedY = y;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      doc.text(title, x, savedY); doc.setFontSize(7);
      doc.text('Linhas', x, savedY + 5); doc.text('Qtd', x + w / 2, savedY + 5);
      doc.setFont('helvetica', 'normal');
      let rowY = savedY + 10;
      rows.forEach(r => { doc.text(r.linhas || '-', x, rowY); doc.text(r.quantidade || '-', x + w / 2, rowY); rowY += 5; });
      return rowY;
    };
    const colW = (contentW - 6) / 3;
    const y1 = drawCol('Coluna A (Todos)', form.colunaA, margin + 3, colW);
    const y2 = drawCol('Coluna B (Book D/E)', form.colunaB, margin + 3 + colW, colW);
    const y3 = drawCol('Coluna C (Book E)', form.colunaC, margin + 3 + colW * 2, colW);
    y = Math.max(y1, y2, y3);
  });

  // Observação
  if (form.observacao) {
    addSectionBox('Observação', () => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      const lines = doc.splitTextToSize(form.observacao, contentW - 6);
      doc.text(lines, margin + 3, y); y += lines.length * 5;
    });
  }

  // Personalização
  addSectionBox('Personalização', () => {
    doc.setFontSize(8);
    doc.text(`(${form.arteCapa ? 'X' : ' '}) ARTE CAPA`, margin + 3, y);
    doc.text(`SILK CAPA: (${form.silkCapa === 'cor_unica' ? 'X' : ' '}) COR ÚNICA  (${form.silkCapa === 'colorido' ? 'X' : ' '}) COLORIDO`, margin + 60, y); y += 5;
    doc.text(`(${form.logoCliente === 'sim' ? 'X' : ' '}) LOGO CLIENTE  SIM(${form.logoCliente === 'sim' ? 'X' : ' '})  NÃO(${form.logoCliente === 'nao' ? 'X' : ' '})`, margin + 3, y); y += 5;
    doc.text(`(${form.nomeProjeto ? 'X' : ' '}) NOME PROJETO`, margin + 3, y); y += 5;
    doc.text(`(${form.acrilico ? 'X' : ' '}) ACRÍLICO TRANSP.`, margin + 3, y);
    doc.text(`ADESIVO PERS.: (${form.adesivoPers === 'sim' ? 'X' : ' '}) SIM  (${form.adesivoPers === 'nao' ? 'X' : ' '}) NÃO`, margin + 60, y); y += 5;
    doc.text(`(${form.placaMetalica ? 'X' : ' '}) PLACA METÁLICA (4X6)`, margin + 3, y); y += 5;
    doc.text(`(${form.divisoria === 'sim' ? 'X' : ' '}) DIVISÓRIA  SIM(${form.divisoria === 'sim' ? 'X' : ' '})  NÃO(${form.divisoria === 'nao' ? 'X' : ' '})`, margin + 3, y); y += 5;
    doc.text(`(${form.laminasNomeCliente ? 'X' : ' '}) LAMINAS (Nome cliente)`, margin + 3, y);
    doc.text(`(${form.contraCapaFrente ? 'X' : ' '}) CONTRA CAPA FRENTE`, margin + 80, y); y += 5;
    doc.text(`(${form.codigosCliente ? 'X' : ' '}) CODIGOS (Cod cliente)`, margin + 3, y);
    doc.text(`(${form.contraCapaFundo ? 'X' : ' '}) CONTRA CAPA FUNDO`, margin + 80, y); y += 3;
  });

  return doc.output('blob');
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chamadoId: number;
  clienteNome: string;
  representanteNome: string;
  onPdfUploaded?: () => void;
}

export default function BookFormModal({ open, onOpenChange, chamadoId, clienteNome, representanteNome, onPdfUploaded }: Props) {
  const [form, setForm] = useState<BookFullFormData>({ ...defaultBookFullForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data } = await supabase.from('chamados').select('sdp_data').eq('id', chamadoId).maybeSingle();
      const raw = data as any;
      if (raw?.sdp_data && typeof raw.sdp_data === 'object' && raw.sdp_data.formType === 'book') {
        const { formType, ...rest } = raw.sdp_data;
        setForm({ ...defaultBookFullForm, ...rest });
      } else {
        setForm({ ...defaultBookFullForm });
      }
    };
    load();
  }, [open, chamadoId]);

  const toggleModel = (key: string) => setForm(p => ({
    ...p, modeloBook: p.modeloBook.includes(key) ? p.modeloBook.filter(k => k !== key) : [...p.modeloBook, key]
  }));

  const toggleBookEscolhido = (key: string) => setForm(p => ({
    ...p, bookEscolhido: p.bookEscolhido.includes(key) ? p.bookEscolhido.filter(k => k !== key) : [...p.bookEscolhido, key]
  }));

  const updateSeqRow = (col: 'colunaA' | 'colunaB' | 'colunaC', idx: number, field: 'linhas' | 'quantidade', value: string) => {
    setForm(p => {
      const rows = [...p[col]];
      rows[idx] = { ...rows[idx], [field]: value };
      return { ...p, [col]: rows };
    });
  };

  const addSeqRow = (col: 'colunaA' | 'colunaB' | 'colunaC') => {
    setForm(p => ({ ...p, [col]: [...p[col], { linhas: '', quantidade: '' }] }));
  };

  const removeSeqRow = (col: 'colunaA' | 'colunaB' | 'colunaC', idx: number) => {
    setForm(p => ({ ...p, [col]: p[col].filter((_, i) => i !== idx) }));
  };

  const generateAndUploadPdf = async () => {
    if (!form.razaoSocial && !clienteNome) { toast.error('Informe a Razão Social.'); return; }
    setSaving(true);
    try {
      const pdfBlob = generateBookPdf(form, clienteNome, representanteNome);
      const cleanName = (form.razaoSocial || clienteNome || 'book').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${Date.now()}_Book_${cleanName}.pdf`;
      const filePath = `${chamadoId}/${fileName}`;

      const { error } = await supabase.storage.from('chamado-anexos').upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });
      if (error) throw error;

      await supabase.from('chamados').update({ sdp_data: { ...form, formType: 'book' } as any } as any).eq('id', chamadoId);

      toast.success('PDF de Book gerado e anexado ao ticket!');
      onPdfUploaded?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const SeqTable = ({ col, label }: { col: 'colunaA' | 'colunaB' | 'colunaC'; label: string }) => (
    <div className="space-y-1">
      <Label className="text-[10px] font-semibold">{label}</Label>
      {form[col].map((row, i) => (
        <div key={i} className="flex gap-1 items-center">
          <Input className="h-7 text-xs flex-1" placeholder="Linhas" value={row.linhas} onChange={e => updateSeqRow(col, i, 'linhas', e.target.value)} />
          <Input className="h-7 text-xs flex-1" placeholder="Qtd" value={row.quantidade} onChange={e => updateSeqRow(col, i, 'quantidade', e.target.value)} />
          {form[col].length > 1 && (
            <button type="button" onClick={() => removeSeqRow(col, i)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-3 w-3" /></button>
          )}
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" className="w-full h-6 text-[10px]" onClick={() => addSeqRow(col)}>
        <Plus className="h-3 w-3 mr-1" /> Linha
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex justify-center mb-2">
            <img src={romplasLogo} alt="Romplas" className="h-10 object-contain" />
          </div>
          <DialogTitle className="text-center">Formulário Book's Personalizados</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 pb-4">
            {/* Dados Gerais */}
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Razão Social *</Label><Input className="mt-1" value={form.razaoSocial} onChange={e => setForm(p => ({ ...p, razaoSocial: e.target.value }))} /></div>
              <div><Label className="text-xs">Código</Label><Input className="mt-1" value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Representante</Label><Input className="mt-1" value={form.representante} disabled /></div>
              <div><Label className="text-xs">Data Entrega Negociada</Label><Input type="date" className="mt-1" value={form.dataEntregaNegociada} onChange={e => setForm(p => ({ ...p, dataEntregaNegociada: e.target.value }))} /></div>
            </div>
            <div className="border rounded-lg p-3 space-y-2">
              <Label className="text-xs font-semibold">Envio</Label>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="book-envio" checked={form.envio === 'com_pedido'} onChange={() => setForm(p => ({ ...p, envio: 'com_pedido' }))} /> Com Pedido</label>
                <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="book-envio" checked={form.envio === 'sem_pedido'} onChange={() => setForm(p => ({ ...p, envio: 'sem_pedido' }))} /> Sem Pedido</label>
                <div className="flex-1 min-w-[150px]">
                  <Input className="h-7 text-xs" placeholder="Transportadora" value={form.transportadora} onChange={e => setForm(p => ({ ...p, transportadora: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Modelo Book */}
            <div className="border rounded-lg p-3 space-y-2">
              <Label className="text-xs font-semibold">Modelo Book</Label>
              <div className="grid grid-cols-5 gap-3">
                {MODELOS.map(m => (
                  <div key={m.key} className="flex flex-col items-start gap-1">
                    <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                      <input type="checkbox" checked={form.modeloBook.includes(m.key)} onChange={() => toggleModel(m.key)} />
                      <span className="font-medium">{m.label}</span>
                    </label>
                    <span className="text-muted-foreground text-[10px] ml-5">Lâminas {m.laminas}</span>
                    <button type="button" className="ml-5 flex items-center gap-1 text-[10px] text-primary hover:underline" onClick={() => window.open(m.img, '_blank')}>
                      <Eye className="h-3 w-3" /> Ver foto
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Dados do Book */}
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Quantidade Book</Label><Input className="mt-1" value={form.quantidadeBook} onChange={e => setForm(p => ({ ...p, quantidadeBook: e.target.value }))} /></div>
              <div><Label className="text-xs">Qtd de Linhas</Label><Input className="mt-1" value={form.quantidadeLinhas} onChange={e => setForm(p => ({ ...p, quantidadeLinhas: e.target.value }))} /></div>
              <div><Label className="text-xs">Nº Laminas</Label><Input className="mt-1" value={form.nLaminas} onChange={e => setForm(p => ({ ...p, nLaminas: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Material/Cor Capa</Label><Input className="mt-1" value={form.materialCorCapa} onChange={e => setForm(p => ({ ...p, materialCorCapa: e.target.value }))} /></div>
              <div><Label className="text-xs">Código Capa</Label><Input className="mt-1" value={form.codigoCapa} onChange={e => setForm(p => ({ ...p, codigoCapa: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Descrição Capa</Label><Input className="mt-1" value={form.descricaoCapa} onChange={e => setForm(p => ({ ...p, descricaoCapa: e.target.value }))} /></div>

            {/* Aprovações */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold">Aprovação Arte:</Label>
                  <label className="flex items-center gap-1 text-xs"><input type="radio" name="book-aprovArte" checked={form.aprovacaoArte === 'sim'} onChange={() => setForm(p => ({ ...p, aprovacaoArte: 'sim' }))} /> SIM</label>
                  <label className="flex items-center gap-1 text-xs"><input type="radio" name="book-aprovArte" checked={form.aprovacaoArte === 'nao'} onChange={() => setForm(p => ({ ...p, aprovacaoArte: 'nao' }))} /> NÃO</label>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold">Boneco Aprovação:</Label>
                  <label className="flex items-center gap-1 text-xs"><input type="radio" name="book-boneco" checked={form.bonecoAprovacao === 'sim'} onChange={() => setForm(p => ({ ...p, bonecoAprovacao: 'sim' }))} /> SIM</label>
                  <label className="flex items-center gap-1 text-xs"><input type="radio" name="book-boneco" checked={form.bonecoAprovacao === 'nao'} onChange={() => setForm(p => ({ ...p, bonecoAprovacao: 'nao' }))} /> NÃO</label>
                </div>
              </div>
            </div>

            {/* Sequência do Book */}
            <div className="border rounded-lg p-3 space-y-3">
              <Label className="text-xs font-semibold text-center block">SEQUÊNCIA DO BOOK</Label>
              <div className="flex items-center gap-3 flex-wrap">
                <Label className="text-xs">Book Escolhido:</Label>
                {MODELOS.map(m => (
                  <label key={m.key} className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={form.bookEscolhido.includes(m.key)} onChange={() => toggleBookEscolhido(m.key)} /> {m.key}
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <SeqTable col="colunaA" label="Coluna A (Todos os book's)" />
                <SeqTable col="colunaB" label="Coluna B (Somente book D/E)" />
                <SeqTable col="colunaC" label="Coluna C (Somente book E)" />
              </div>
            </div>

            {/* Observação */}
            <div>
              <Label className="text-xs font-semibold">Observação</Label>
              <Textarea className="mt-1" value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} />
            </div>

            {/* Personalização */}
            <div className="border rounded-lg p-3 space-y-2">
              <Label className="text-xs font-semibold text-center block">PERSONALIZAÇÃO</Label>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.arteCapa} onChange={e => setForm(p => ({ ...p, arteCapa: e.target.checked }))} /> ARTE CAPA</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">SILK CAPA:</span>
                  <label className="flex items-center gap-1 text-xs"><input type="radio" name="book-silk" checked={form.silkCapa === 'cor_unica'} onChange={() => setForm(p => ({ ...p, silkCapa: 'cor_unica' }))} /> COR ÚNICA</label>
                  <label className="flex items-center gap-1 text-xs"><input type="radio" name="book-silk" checked={form.silkCapa === 'colorido'} onChange={() => setForm(p => ({ ...p, silkCapa: 'colorido' }))} /> COLORIDO</label>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.logoCliente === 'sim'} onChange={e => setForm(p => ({ ...p, logoCliente: e.target.checked ? 'sim' : 'nao' }))} /> LOGO CLIENTE</label>
                  <span className="text-xs text-muted-foreground">{form.logoCliente === 'sim' ? 'SIM' : form.logoCliente === 'nao' ? 'NÃO' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">ADESIVO PERS.:</span>
                  <label className="flex items-center gap-1 text-xs"><input type="radio" name="book-adesivo" checked={form.adesivoPers === 'sim'} onChange={() => setForm(p => ({ ...p, adesivoPers: 'sim' }))} /> SIM</label>
                  <label className="flex items-center gap-1 text-xs"><input type="radio" name="book-adesivo" checked={form.adesivoPers === 'nao'} onChange={() => setForm(p => ({ ...p, adesivoPers: 'nao' }))} /> NÃO</label>
                </div>

                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.nomeProjeto} onChange={e => setForm(p => ({ ...p, nomeProjeto: e.target.checked }))} /> NOME PROJETO</label>
                <div />

                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.acrilico} onChange={e => setForm(p => ({ ...p, acrilico: e.target.checked }))} /> ACRÍLICO TRANSP.</label>
                <div />

                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.placaMetalica} onChange={e => setForm(p => ({ ...p, placaMetalica: e.target.checked }))} /> PLACA METÁLICA (4X6)</label>
                <div />

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.divisoria === 'sim'} onChange={e => setForm(p => ({ ...p, divisoria: e.target.checked ? 'sim' : 'nao' }))} /> DIVISÓRIA</label>
                  <span className="text-xs text-muted-foreground">{form.divisoria === 'sim' ? 'SIM' : form.divisoria === 'nao' ? 'NÃO' : ''}</span>
                </div>
                <div />

                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.laminasNomeCliente} onChange={e => setForm(p => ({ ...p, laminasNomeCliente: e.target.checked }))} /> LAMINAS (Nome cliente)</label>
                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.contraCapaFrente} onChange={e => setForm(p => ({ ...p, contraCapaFrente: e.target.checked }))} /> CONTRA CAPA FRENTE</label>

                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.codigosCliente} onChange={e => setForm(p => ({ ...p, codigosCliente: e.target.checked }))} /> CODIGOS (Cod cliente)</label>
                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.contraCapaFundo} onChange={e => setForm(p => ({ ...p, contraCapaFundo: e.target.checked }))} /> CONTRA CAPA FUNDO</label>
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="px-6 pb-6 pt-2 flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={generateAndUploadPdf} disabled={saving}>
            <FileText className="h-4 w-4 mr-1.5" />{saving ? 'Gerando...' : 'Confirmar e Anexar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
