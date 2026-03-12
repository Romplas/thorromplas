import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { FileText, Plus, Trash2, Eye, CalendarIcon } from 'lucide-react';
import romplasLogo from '@/assets/romplas-logo.png';
import { format, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchableSelect } from '@/components/ui/searchable-select';
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
  silkCapa: string[]; // múltipla seleção: 'sim' | 'nao' | 'cor_unica' | 'colorido'
  adesivoPers: string; // 'sim' | 'nao'
  contraCapaFrente: boolean; contraCapaFundo: boolean;
  dataOrcamento: string;
  custosChecked: string[]; // ORCAMENTO_KEYS that are checked
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
  silkCapa: [], adesivoPers: '', contraCapaFrente: false, contraCapaFundo: false,
  dataOrcamento: '',
  custosChecked: [],
};

const MODELOS = [
  { key: 'A', label: 'A (20,5×11,5×5)', laminas: '60/70', img: '/images/book-model-a.png' },
  { key: 'B', label: 'B (21,5×14×5,5)', laminas: '70/80', img: '/images/book-model-b.png' },
  { key: 'C', label: 'C (24,5×17,5×4,5)', laminas: '60/70', img: '/images/book-model-c.png' },
  { key: 'D', label: 'D (22×28×5)', laminas: '90/100', img: '/images/book-model-d.png' },
  { key: 'E', label: 'E (40×21×6)', laminas: '150/165', img: '/images/book-model-e.png' },
];

// Custos indexed by book model key
const CUSTOS_PRICES: Record<string, Record<string, number>> = {
  A: { CAPA: 13.90, MAO_DE_OBRA: 0.40, MP_LAMINAS: 0.25, LAMINAS_NOME: 0.05, CODIGOS: 0.05, ARTE_CAPA: 75.00, SILK_1COR: 4.20, SILK_COLORIDO: 8.50, DIVISORIAS: 2.50, PLACA: 5.90, ADESIVOS: 3.90, ACRILICO: 7.50 },
  B: { CAPA: 19.90, MAO_DE_OBRA: 0.40, MP_LAMINAS: 0.30, LAMINAS_NOME: 0.05, CODIGOS: 0.05, ARTE_CAPA: 75.00, SILK_1COR: 4.20, SILK_COLORIDO: 8.50, DIVISORIAS: 2.50, PLACA: 5.90, ADESIVOS: 3.90, ACRILICO: 7.50 },
  C: { CAPA: 25.70, MAO_DE_OBRA: 0.40, MP_LAMINAS: 0.50, LAMINAS_NOME: 0.05, CODIGOS: 0.05, ARTE_CAPA: 75.00, SILK_1COR: 4.20, SILK_COLORIDO: 8.50, DIVISORIAS: 2.50, PLACA: 5.90, ADESIVOS: 3.90, ACRILICO: 7.50 },
  D: { CAPA: 37.70, MAO_DE_OBRA: 0.40, MP_LAMINAS: 0.35, LAMINAS_NOME: 0.05, CODIGOS: 0.05, ARTE_CAPA: 75.00, SILK_1COR: 4.20, SILK_COLORIDO: 8.50, DIVISORIAS: 2.50, PLACA: 5.90, ADESIVOS: 3.90, ACRILICO: 7.50 },
  E: { CAPA: 47.90, MAO_DE_OBRA: 0.40, MP_LAMINAS: 0.35, LAMINAS_NOME: 0.05, CODIGOS: 0.05, ARTE_CAPA: 75.00, SILK_1COR: 4.20, SILK_COLORIDO: 8.50, DIVISORIAS: 2.50, PLACA: 5.90, ADESIVOS: 3.90, ACRILICO: 7.50 },
};

const ORCAMENTO_KEYS = [
  'CAPA', 'MAO_DE_OBRA', 'MP_LAMINAS', 'LAMINAS_NOME', 'CODIGOS',
  'ARTE_CAPA', 'SILK_1COR', 'SILK_COLORIDO', 'DIVISORIAS', 'PLACA', 'ADESIVOS', 'ACRILICO',
] as const;

const ORCAMENTO_LABELS = [
  'CAPA (unidade)', 'MAO DE OBRA', 'MP P/ LAMINA (Unidade)',
  'LAMINAS - Nome cliente (Unidade)', 'CODIGOS - Codigo cliente (Unidade)',
  'ARTE CAPA (Pago 1x)', 'SILK CAPA - 1 COR (Unidade)',
  'SILK CAPA - COLORIDO (Unidade)', 'DIVISÓRIAS (Unidade)',
  'PLACA METALIZADA (6x4) (Unidade)', 'ADESIVOS (Unidade)',
  'ACRILICO - 3Modl. (Unidade)',
];

function calcOrcamento(form: BookFullFormData) {
  const selectedBook = form.bookEscolhido.length > 0 ? form.bookEscolhido[0] : null;
  const prices = selectedBook ? CUSTOS_PRICES[selectedBook] : null;
  const qtdBook = parseFloat(form.quantidadeBook) || 0;
  const nLaminas = parseFloat(form.nLaminas) || 0;
  const checked = form.custosChecked || [];

  const rows = ORCAMENTO_KEYS.map((key) => {
    // Only calculate if the item is checked in Custos
    if (!checked.includes(key)) {
      return { qty: 0, unitPrice: 0, total: 0, checked: false };
    }

    const unitPrice = prices ? prices[key] : 0;
    let qty = 0;

    if (key === 'MP_LAMINAS' || key === 'LAMINAS_NOME' || key === 'CODIGOS') {
      qty = qtdBook * nLaminas;
    } else if (key === 'ARTE_CAPA') {
      qty = qtdBook > 0 ? 1 : 0;
    } else {
      qty = qtdBook;
    }

    const total = qty * unitPrice;
    return { qty, unitPrice, total, checked: true };
  });

  const totalGeral = rows.reduce((sum, r) => sum + r.total, 0);
  const valorUnitario = qtdBook > 0 ? totalGeral / qtdBook : 0;

  return { rows, totalGeral, valorUnitario };
}

const formatDatePdf = (d: string) => {
  if (!d) return '-';
  try {
    const parsed = parse(d, 'yyyy-MM-dd', new Date());
    return isValid(parsed) ? format(parsed, 'dd/MM/yyyy', { locale: ptBR }) : d;
  } catch { return d; }
};

export async function generateBookPdf(form: BookFullFormData, clienteNome: string, representanteNome: string): Promise<Blob> {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 12;
  const checkPage = (needed: number) => { if (y + needed > 270) { doc.addPage(); y = 15; } };

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
    const logoImg = new window.Image(); logoImg.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => { logoImg.onload = () => resolve(); logoImg.onerror = () => reject(); logoImg.src = '/images/romplas-logo-pdf.png'; });
    const logoH = 16; const logoW = logoH * (logoImg.naturalWidth / logoImg.naturalHeight);
    doc.addImage(logoImg, 'PNG', (pageW - logoW) / 2, y, logoW, logoH); y += logoH + 5;
  } catch { /* fallback sem logo */ }

  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text("Formulário Book's Personalizados", pageW / 2, y, { align: 'center' }); y += 8;
  doc.setDrawColor(180); doc.line(margin, y, pageW - margin, y); y += 8;

  // Dados gerais
  addFieldRow('Razão Social:', form.razaoSocial || clienteNome, 'Cod:', form.codigo);
  addFieldRow('Representante:', form.representante || representanteNome, 'Data Entrega:', formatDatePdf(form.dataEntregaNegociada));
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
  addSectionBox('Observação', () => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const obsText = form.observacao || 'Enviar junto com esse formulário, os códigos selecionados no ANEXO 01 para incluir no Book do cliente';
    const lines = doc.splitTextToSize(obsText, contentW - 6);
    doc.text(lines, margin + 3, y); y += lines.length * 5;
  });

  // Personalização
  addSectionBox('Personalização', () => {
    doc.setFontSize(8);
    doc.text(`(${form.arteCapa ? 'X' : ' '}) ARTE CAPA`, margin + 3, y); y += 5;
    const sc = form.silkCapa || [];
    doc.text(`SILK CAPA: (${sc.includes('sim') ? 'X' : ' '}) SIM  (${sc.includes('nao') ? 'X' : ' '}) NÃO  (${sc.includes('cor_unica') ? 'X' : ' '}) COR ÚNICA  (${sc.includes('colorido') ? 'X' : ' '}) COLORIDO`, margin + 3, y); y += 5;
    doc.text(`(${form.logoCliente === 'sim' ? 'X' : ' '}) LOGO CLIENTE`, margin + 3, y); y += 5;
    doc.text(`(${form.nomeProjeto ? 'X' : ' '}) NOME PROJETO`, margin + 3, y); y += 5;
    doc.text(`(${form.acrilico ? 'X' : ' '}) ACRÍLICO TRANSP.`, margin + 3, y);
    doc.text(`ADESIVO PERS.: (${form.adesivoPers === 'sim' ? 'X' : ' '}) SIM  (${form.adesivoPers === 'nao' ? 'X' : ' '}) NÃO`, margin + 60, y); y += 5;
    doc.text(`(${form.placaMetalica ? 'X' : ' '}) PLACA METÁLICA (4X6)`, margin + 3, y); y += 5;
    doc.text(`(${form.divisoria === 'sim' ? 'X' : ' '}) DIVISÓRIA`, margin + 3, y); y += 5;
    doc.text(`(${form.laminasNomeCliente ? 'X' : ' '}) LAMINAS (Nome cliente)`, margin + 3, y);
    doc.text(`(${form.contraCapaFrente ? 'X' : ' '}) CONTRA CAPA FRENTE`, margin + 80, y); y += 5;
    doc.text(`(${form.codigosCliente ? 'X' : ' '}) CODIGOS (Cod cliente)`, margin + 3, y);
    doc.text(`(${form.contraCapaFundo ? 'X' : ' '}) CONTRA CAPA FUNDO`, margin + 80, y); y += 3;
  });

  // Custos (tabela completa)
  checkPage(80);
  const allCustosRows = [
    ['CAPA', 'R$ 13,90', 'R$ 19,90', 'R$ 25,70', 'R$ 37,70', 'R$ 47,90'],
    ['MAO DE OBRA', 'R$ 0,40', 'R$ 0,40', 'R$ 0,40', 'R$ 0,40', 'R$ 0,40'],
    ['MP P/ LAMINAS', 'R$ 0,25', 'R$ 0,30', 'R$ 0,50', 'R$ 0,35', 'R$ 0,35'],
    ['LAMINAS (Nome cliente)', 'R$ 0,05', 'R$ 0,05', 'R$ 0,05', 'R$ 0,05', 'R$ 0,05'],
    ['CODIGOS (Codigo cliente)', 'R$ 0,05', 'R$ 0,05', 'R$ 0,05', 'R$ 0,05', 'R$ 0,05'],
    ['ARTE CAPA', 'R$ 75,00', 'R$ 75,00', 'R$ 75,00', 'R$ 75,00', 'R$ 75,00'],
    ['SILK CAPA - 1 COR', 'R$ 4,20', 'R$ 4,20', 'R$ 4,20', 'R$ 4,20', 'R$ 4,20'],
    ['SILK CAPA - COLORIDO', 'R$ 8,50', 'R$ 8,50', 'R$ 8,50', 'R$ 8,50', 'R$ 8,50'],
    ['DIVISÓRIAS', 'R$ 2,50', 'R$ 2,50', 'R$ 2,50', 'R$ 2,50', 'R$ 2,50'],
    ['PLACA METALIZADA (6x4)', 'R$ 5,90', 'R$ 5,90', 'R$ 5,90', 'R$ 5,90', 'R$ 5,90'],
    ['ADESIVOS', 'R$ 3,90', 'R$ 3,90', 'R$ 3,90', 'R$ 3,90', 'R$ 3,90'],
    ['ACRILICO - 3 Modelos (Unid.)', 'R$ 7,50', 'R$ 7,50', 'R$ 7,50', 'R$ 7,50', 'R$ 7,50'],
  ];
  addSectionBox('Custos', () => {
    doc.setFontSize(7);
    const colPositions = [margin + 55, margin + 75, margin + 95, margin + 115, margin + 135];
    // Header
    doc.setFont('helvetica', 'bold');
    doc.text('BOOK ESCOLHIDO:', margin + 3, y);
    ['A', 'B', 'C', 'D', 'E'].forEach((k, i) => {
      doc.text(`(${form.bookEscolhido.includes(k) ? 'X' : ' '}) BOOK ${k}`, colPositions[i], y);
    });
    y += 5;
    // Sub-header
    doc.text('', margin + 3, y);
    ['VALOR', 'VALOR', 'VALOR', 'VALOR', 'VALOR'].forEach((v, i) => {
      doc.text(v, colPositions[i] + 3, y);
    });
    y += 5;
    doc.setFont('helvetica', 'normal');
    // Rows
    allCustosRows.forEach(r => {
      checkPage(8);
      doc.text(r[0], margin + 3, y);
      for (let j = 1; j <= 5; j++) doc.text(r[j], colPositions[j - 1], y);
      y += 5;
    });
  });

  // Orçamento (tabela com valores calculados)
  const orc = calcOrcamento(form);
  const fmtNum = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  checkPage(100);
  addSectionBox('Orçamento', () => {
    doc.setFontSize(7);
    const sel = MODELOS.map(m => `(${form.bookEscolhido.includes(m.key) ? 'X' : ' '})${m.key}`).join('  ');
    doc.setFont('helvetica', 'bold');
    doc.text('BOOK ESCOLHIDO: ' + sel, margin + 3, y); y += 6;
    doc.text(`QUANTIDADE: ${form.quantidadeBook || '-'}`, margin + 3, y); y += 6;

    const colOrcX = { item: margin + 3, qtd: margin + 85, unitario: margin + 115, total: margin + 145 };
    doc.setFontSize(7);
    doc.text('ITEM', colOrcX.item, y);
    doc.text('QUANTIDADE', colOrcX.qtd, y);
    doc.text('VALOR UNIT.', colOrcX.unitario, y);
    doc.text('VALOR TOTAL', colOrcX.total, y);
    y += 2;
    doc.setDrawColor(200); doc.line(margin + 3, y, pageW - margin - 3, y); y += 4;

    doc.setFont('helvetica', 'normal');
    ORCAMENTO_LABELS.forEach((label, i) => {
      checkPage(8);
      const row = orc.rows[i];
      doc.text(label, colOrcX.item, y);
      doc.text(row.qty > 0 ? fmtNum(row.qty) : '-', colOrcX.qtd, y);
      doc.text(row.unitPrice > 0 ? `R$ ${fmtNum(row.unitPrice)}` : '-', colOrcX.unitario, y);
      doc.text(row.total > 0 ? `R$ ${fmtNum(row.total)}` : '-', colOrcX.total, y);
      y += 5;
    });

    y += 3;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(`TOTAL R$: ${orc.totalGeral > 0 ? `R$ ${fmtNum(orc.totalGeral)}` : '-'}`, pageW - margin - 60, y); y += 6;
    doc.text(`VALOR UNITÁRIO R$: ${orc.valorUnitario > 0 ? `R$ ${fmtNum(orc.valorUnitario)}` : '-'}`, pageW - margin - 75, y); y += 6;
    doc.text('DESCONTO: _______________', pageW - margin - 55, y); y += 8;

    doc.setDrawColor(180); doc.line(margin + 3, y, pageW - margin - 3, y); y += 5;
    doc.setFontSize(8);
    doc.text('PRAZO NEGOCIADO: _______________', margin + 3, y); y += 6;
    doc.text(`DATA: ${formatDatePdf(form.dataOrcamento)}`, margin + 3, y);
    doc.text('ASSINATURA: _______________', margin + 80, y); y += 2;
  });

  return doc.output('blob');
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chamadoId?: number | null;
  clienteNome: string;
  codigoCliente?: string;
  representanteNome: string;
  /** Modo criação (NovoChamado): dados iniciais e callback ao confirmar */
  initialFormData?: BookFullFormData;
  onFormDataChange?: (form: BookFullFormData) => void;
  onConfirmCreate?: (form: BookFullFormData, pdfFile?: File) => void;
  /** Modo edição: callback após upload do PDF */
  onPdfUploaded?: () => void;
}

interface ProdutoCatalogo { cod_produto: string; produto: string }

export default function BookFormModal({ open, onOpenChange, chamadoId, clienteNome, codigoCliente = '', representanteNome, initialFormData, onFormDataChange, onConfirmCreate, onPdfUploaded }: Props) {
  const isCreateMode = !chamadoId;
  const [form, setForm] = useState<BookFullFormData>({ ...defaultBookFullForm });
  const [saving, setSaving] = useState(false);
  const [fotoModal, setFotoModal] = useState<{ open: boolean; img: string; label: string }>({ open: false, img: '', label: '' });
  const [catalogoProdutos, setCatalogoProdutos] = useState<ProdutoCatalogo[]>([]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const all: ProdutoCatalogo[] = [];
      let offset = 0;
      const pageSize = 1000;
      while (true) {
        const { data } = await supabase.from('produtos').select('cod_produto, produto').order('produto').range(offset, offset + pageSize - 1);
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
        offset += pageSize;
      }
      setCatalogoProdutos(all);
    };
    load();
  }, [open]);

  // Modo criação: sincronizar com dados iniciais do pai (cliente/código da solicitação)
  useEffect(() => {
    if (open && isCreateMode && initialFormData) {
      const sc = Array.isArray(initialFormData.silkCapa) ? initialFormData.silkCapa : (initialFormData.silkCapa ? [initialFormData.silkCapa] : []);
      const merged = {
        ...defaultBookFullForm,
        ...initialFormData,
        silkCapa: sc,
        razaoSocial: initialFormData.razaoSocial || clienteNome,
        codigo: initialFormData.codigo || codigoCliente,
      } as BookFullFormData;
      setForm(merged);
    }
  }, [open, isCreateMode, initialFormData, clienteNome, codigoCliente]);

  // Modo edição: carregar do banco
  useEffect(() => {
    if (!open || isCreateMode || !chamadoId) return;
    const load = async () => {
      const { data } = await supabase.from('chamados').select('sdp_data').eq('id', chamadoId).maybeSingle();
      const raw = data as any;
      if (raw?.sdp_data && typeof raw.sdp_data === 'object' && raw.sdp_data.formType === 'book') {
        const { formType, silkCapa: scRaw, ...rest } = raw.sdp_data;
        const silkCapa = Array.isArray(scRaw) ? scRaw : (scRaw ? [scRaw] : []);
        setForm({ ...defaultBookFullForm, ...rest, silkCapa });
      } else {
        setForm({ ...defaultBookFullForm });
      }
    };
    load();
  }, [open, chamadoId, isCreateMode]);

  const setFormWithSync = (updater: (prev: BookFullFormData) => BookFullFormData) => {
    setForm(prev => {
      const next = updater(prev);
      if (isCreateMode && onFormDataChange) onFormDataChange(next);
      return next;
    });
  };

  const toggleModel = (key: string) => setFormWithSync(p => ({
    ...p, modeloBook: p.modeloBook.includes(key) ? p.modeloBook.filter(k => k !== key) : [...p.modeloBook, key]
  }));

  const toggleBookEscolhido = (key: string) => setFormWithSync(p => ({
    ...p, bookEscolhido: p.bookEscolhido.includes(key) ? p.bookEscolhido.filter(k => k !== key) : [...p.bookEscolhido, key]
  }));

  const toggleCustoCheck = (orcKey: string) => setFormWithSync(p => ({
    ...p, custosChecked: (p.custosChecked || []).includes(orcKey) ? p.custosChecked.filter(k => k !== orcKey) : [...(p.custosChecked || []), orcKey]
  }));

  const updateSeqRow = (col: 'colunaA' | 'colunaB' | 'colunaC', idx: number, field: 'linhas' | 'quantidade', value: string) => {
    setFormWithSync(p => {
      const rows = [...p[col]];
      rows[idx] = { ...rows[idx], [field]: value };
      return { ...p, [col]: rows };
    });
  };

  const addSeqRow = (col: 'colunaA' | 'colunaB' | 'colunaC') => {
    setFormWithSync(p => ({ ...p, [col]: [...p[col], { linhas: '', quantidade: '' }] }));
  };

  const removeSeqRow = (col: 'colunaA' | 'colunaB' | 'colunaC', idx: number) => {
    setFormWithSync(p => ({ ...p, [col]: p[col].filter((_, i) => i !== idx) }));
  };

  const generateAndUploadPdf = async () => {
    if (!form.razaoSocial && !clienteNome) { toast.error('Informe a Razão Social.'); return; }
    setSaving(true);
    try {
      const pdfBlob = await generateBookPdf(form, clienteNome, representanteNome);
      const cleanName = (form.razaoSocial || clienteNome || 'book').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${Date.now()}_Book_${cleanName}.pdf`;

      if (isCreateMode && onConfirmCreate) {
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
        onConfirmCreate(form, pdfFile);
        onOpenChange(false);
      } else if (chamadoId) {
        const filePath = `${chamadoId}/${fileName}`;
        const { error } = await supabase.storage.from('chamado-anexos').upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });
        if (error) throw error;
        await supabase.from('chamados').update({ sdp_data: { ...form, formType: 'book' } as any } as any).eq('id', chamadoId);
        toast.success('PDF de Book gerado e anexado ao ticket!');
        onPdfUploaded?.();
        onOpenChange(false);
      }
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
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
          <div className="flex justify-center mb-2">
            <img src={romplasLogo} alt="Romplas" className="h-10 object-contain" />
          </div>
          <DialogTitle className="text-center">Formulário Book's Personalizados</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-4 pb-4">
            {/* Dados Gerais - Razão Social e Código preenchidos do cliente da solicitação */}
            <div className="border rounded-lg p-3 space-y-3">
              <Label className="text-xs font-semibold">Dados Gerais</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Razão Social *</Label><Input className="mt-1 h-9 text-sm" value={form.razaoSocial || clienteNome} onChange={e => setFormWithSync(p => ({ ...p, razaoSocial: e.target.value }))} placeholder={clienteNome || 'Nome do cliente'} /></div>
                <div><Label className="text-xs text-muted-foreground">Código</Label><Input className="mt-1 h-9 text-sm" value={form.codigo || codigoCliente} onChange={e => setFormWithSync(p => ({ ...p, codigo: e.target.value }))} placeholder={codigoCliente || 'Código do cliente'} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Representante</Label><Input className="mt-1 h-9 text-sm" value={form.representante} disabled /></div>
              <div>
                <Label className="text-xs text-muted-foreground">Data Entrega Negociada</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "mt-1 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        !form.dataEntregaNegociada && "text-muted-foreground"
                      )}
                    >
                      <span>
                        {form.dataEntregaNegociada ? (() => {
                          const d = parse(form.dataEntregaNegociada, 'yyyy-MM-dd', new Date());
                          return isValid(d) ? format(d, 'dd/MM/yyyy', { locale: ptBR }) : form.dataEntregaNegociada;
                        })() : 'Selecione a data'}
                      </span>
                      <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.dataEntregaNegociada ? (() => { const d = parse(form.dataEntregaNegociada, 'yyyy-MM-dd', new Date()); return isValid(d) ? d : undefined; })() : undefined}
                      onSelect={(d) => d && setFormWithSync(p => ({ ...p, dataEntregaNegociada: format(d, 'yyyy-MM-dd') }))}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              </div>
            </div>
            <div className="border rounded-lg p-3 space-y-2">
              <Label className="text-xs font-semibold">Envio</Label>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="book-envio" checked={form.envio === 'com_pedido'} onChange={() => setFormWithSync(p => ({ ...p, envio: 'com_pedido' }))} /> Com Pedido</label>
                <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="book-envio" checked={form.envio === 'sem_pedido'} onChange={() => setFormWithSync(p => ({ ...p, envio: 'sem_pedido' }))} /> Sem Pedido</label>
                <div className="flex-1 min-w-[150px]">
                  <Input className="h-7 text-xs" placeholder="Transportadora" value={form.transportadora} onChange={e => setFormWithSync(p => ({ ...p, transportadora: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Modelo Book */}
            <div className="border rounded-lg p-3 space-y-2">
              <Label className="text-xs font-semibold">Modelo Book</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {MODELOS.map(m => (
                  <div key={m.key} className="flex flex-col items-start gap-1">
                    <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                      <input type="checkbox" checked={form.modeloBook.includes(m.key)} onChange={() => toggleModel(m.key)} />
                      <span className="font-medium">{m.label}</span>
                    </label>
                    <span className="text-muted-foreground text-[10px] ml-5">Lâminas {m.laminas}</span>
                    <button type="button" className="ml-5 flex items-center gap-1 text-[10px] text-primary hover:underline" onClick={() => setFotoModal({ open: true, img: m.img, label: `Book ${m.key}` })}>
                      <Eye className="h-3 w-3" /> Ver foto
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal de foto do Book */}
            <Dialog open={fotoModal.open} onOpenChange={(v) => setFotoModal(p => ({ ...p, open: v }))}>
              <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg p-4">
                <DialogHeader>
                  <DialogTitle className="text-center">{fotoModal.label}</DialogTitle>
                </DialogHeader>
                <div className="flex justify-center">
                  <img src={fotoModal.img} alt={fotoModal.label} className="max-h-[70vh] w-auto rounded-lg object-contain" />
                </div>
              </DialogContent>
            </Dialog>

            {/* Dados do Book */}
            <div className="border rounded-lg p-3 space-y-3">
              <Label className="text-xs font-semibold">Dados do Book</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label className="text-xs">Quantidade Book</Label><Input className="mt-1" value={form.quantidadeBook} onChange={e => setFormWithSync(p => ({ ...p, quantidadeBook: e.target.value }))} /></div>
              <div><Label className="text-xs">Qtd de Linhas</Label><Input className="mt-1" value={form.quantidadeLinhas} onChange={e => setFormWithSync(p => ({ ...p, quantidadeLinhas: e.target.value }))} /></div>
              <div><Label className="text-xs">Nº Laminas</Label><Input className="mt-1" value={form.nLaminas} onChange={e => setFormWithSync(p => ({ ...p, nLaminas: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(() => {
                const opcoesCod = catalogoProdutos.map(p => ({ value: p.cod_produto, label: p.cod_produto }));
                const opcoesMaterial = catalogoProdutos.map(p => ({ value: p.cod_produto, label: p.produto }));
                const handleSelectCapa = (cod: string) => {
                  const item = catalogoProdutos.find(x => x.cod_produto === cod);
                  if (item) setFormWithSync(p => ({ ...p, codigoCapa: item.cod_produto, materialCorCapa: item.produto }));
                };
                return (
                  <>
                    <div>
                      <Label className="text-xs">Código Capa</Label>
                      {catalogoProdutos.length > 0 ? (
                        <SearchableSelect options={opcoesCod} value={form.codigoCapa} onValueChange={handleSelectCapa} placeholder="Pesquisar ou selecionar código" searchPlaceholder="Pesquisar código..." className="h-9 mt-1" />
                      ) : (
                        <Input className="mt-1" value={form.codigoCapa} onChange={e => setFormWithSync(p => ({ ...p, codigoCapa: e.target.value }))} />
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">Material/Cor Capa</Label>
                      {catalogoProdutos.length > 0 ? (
                        <SearchableSelect options={opcoesMaterial} value={form.codigoCapa} onValueChange={handleSelectCapa} placeholder="Pesquisar ou selecionar produto" searchPlaceholder="Pesquisar produto..." className="h-9 mt-1" />
                      ) : (
                        <Input className="mt-1" value={form.materialCorCapa} onChange={e => setFormWithSync(p => ({ ...p, materialCorCapa: e.target.value }))} />
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
            <div><Label className="text-xs">Descrição Capa</Label><Input className="mt-1" value={form.descricaoCapa} onChange={e => setFormWithSync(p => ({ ...p, descricaoCapa: e.target.value }))} /></div>
            </div>

            {/* Aprovações */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold">Aprovação Arte:</Label>
                  <label className="flex items-center gap-1 text-xs"><input type="radio" name="book-aprovArte" checked={form.aprovacaoArte === 'sim'} onChange={() => setFormWithSync(p => ({ ...p, aprovacaoArte: 'sim' }))} /> SIM</label>
                  <label className="flex items-center gap-1 text-xs"><input type="radio" name="book-aprovArte" checked={form.aprovacaoArte === 'nao'} onChange={() => setFormWithSync(p => ({ ...p, aprovacaoArte: 'nao' }))} /> NÃO</label>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold">Boneco Aprovação:</Label>
                  <label className="flex items-center gap-1 text-xs"><input type="radio" name="book-boneco" checked={form.bonecoAprovacao === 'sim'} onChange={() => setFormWithSync(p => ({ ...p, bonecoAprovacao: 'sim' }))} /> SIM</label>
                  <label className="flex items-center gap-1 text-xs"><input type="radio" name="book-boneco" checked={form.bonecoAprovacao === 'nao'} onChange={() => setFormWithSync(p => ({ ...p, bonecoAprovacao: 'nao' }))} /> NÃO</label>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <SeqTable col="colunaA" label="Coluna A (Todos os book's)" />
                <SeqTable col="colunaB" label="Coluna B (Somente book D/E)" />
                <SeqTable col="colunaC" label="Coluna C (Somente book E)" />
              </div>
            </div>

            {/* Observação */}
            <div>
              <Label className="text-xs font-semibold text-center block">Observação</Label>
              <div className="mt-1 rounded-md border border-input bg-muted/50 px-3 py-2 text-xs text-muted-foreground text-center italic">
                Enviar junto com esse formulário, os códigos selecionados no ANEXO 01 para incluir no Book do cliente
              </div>
            </div>

            {/* Personalização */}
            <div className="border rounded-lg p-3 space-y-2">
              <Label className="text-xs font-semibold text-center block">PERSONALIZAÇÃO</Label>
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Coluna esquerda - checkboxes e radios */}
                <div className="flex-1 space-y-1">
                  <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.arteCapa} onChange={e => setFormWithSync(p => ({ ...p, arteCapa: e.target.checked }))} /> ARTE CAPA</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.logoCliente === 'sim'} onChange={e => setFormWithSync(p => ({ ...p, logoCliente: e.target.checked ? 'sim' : 'nao' }))} /> LOGO CLIENTE</label>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.nomeProjeto} onChange={e => setFormWithSync(p => ({ ...p, nomeProjeto: e.target.checked }))} /> NOME PROJETO</label>
                  <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.acrilico} onChange={e => setFormWithSync(p => ({ ...p, acrilico: e.target.checked }))} /> ACRÍLICO TRANSP.</label>
                  <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.placaMetalica} onChange={e => setFormWithSync(p => ({ ...p, placaMetalica: e.target.checked }))} /> PLACA METÁLICA (4X6)</label>
                  <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.divisoria === 'sim'} onChange={e => setFormWithSync(p => ({ ...p, divisoria: e.target.checked ? 'sim' : 'nao' }))} /> DIVISÓRIA</label>
                  <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.laminasNomeCliente} onChange={e => setFormWithSync(p => ({ ...p, laminasNomeCliente: e.target.checked }))} /> LAMINAS (Nome cliente)</label>
                  <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.codigosCliente} onChange={e => setFormWithSync(p => ({ ...p, codigosCliente: e.target.checked }))} /> CODIGOS (Cod cliente)</label>

                  <div className="pt-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">SILK CAPA:</span>
                      {(['sim', 'nao', 'cor_unica', 'colorido'] as const).map(k => (
                        <label key={k} className="flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={(form.silkCapa || []).includes(k)} onChange={() => setFormWithSync(p => ({ ...p, silkCapa: (p.silkCapa || []).includes(k) ? (p.silkCapa || []).filter(x => x !== k) : [...(p.silkCapa || []), k] }))} />
                          {k === 'sim' ? 'SIM' : k === 'nao' ? 'NÃO' : k === 'cor_unica' ? 'COR ÚNICA' : 'COLORIDO'}
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">ADESIVO PERS.:</span>
                      <label className="flex items-center gap-1 text-xs"><input type="radio" name="book-adesivo" checked={form.adesivoPers === 'sim'} onChange={() => setFormWithSync(p => ({ ...p, adesivoPers: 'sim' }))} /> SIM</label>
                      <label className="flex items-center gap-1 text-xs"><input type="radio" name="book-adesivo" checked={form.adesivoPers === 'nao'} onChange={() => setFormWithSync(p => ({ ...p, adesivoPers: 'nao' }))} /> NÃO</label>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.contraCapaFrente} onChange={e => setFormWithSync(p => ({ ...p, contraCapaFrente: e.target.checked }))} /> CONTRA CAPA FRENTE</label>
                    <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.contraCapaFundo} onChange={e => setFormWithSync(p => ({ ...p, contraCapaFundo: e.target.checked }))} /> CONTRA CAPA FUNDO</label>
                  </div>
                </div>

                {/* Coluna direita - imagem do book personalizado */}
                <div className="flex-shrink-0 flex flex-col items-center">
                  <img src="/images/book-personalizado.png" alt="Book Personalizado" className="w-48 h-auto rounded-lg border object-contain" />
                  <span className="text-[10px] text-muted-foreground mt-1">Referência Book Personalizado</span>
                </div>
              </div>
            </div>

            {/* Custos */}
            <div className="border rounded-lg p-3 space-y-2">
              <Label className="text-xs font-semibold text-center block">CUSTOS</Label>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 px-2 font-semibold">BOOK ESCOLHIDO:</th>
                      {['A', 'B', 'C', 'D', 'E'].map(k => (
                        <th key={k} className="text-center py-1 px-2 font-semibold">
                          <label className="inline-flex items-center justify-center gap-1 cursor-pointer">
                            <input type="checkbox" className="accent-primary h-3 w-3" checked={form.bookEscolhido.includes(k)} onChange={() => toggleBookEscolhido(k)} />
                            BOOK {k}
                          </label>
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <th className="text-left py-1 px-2"></th>
                      <th className="text-center py-1 px-2 text-muted-foreground font-medium">VALOR</th>
                      <th className="text-center py-1 px-2 text-muted-foreground font-medium">VALOR</th>
                      <th className="text-center py-1 px-2 text-muted-foreground font-medium">VALOR</th>
                      <th className="text-center py-1 px-2 text-muted-foreground font-medium">VALOR</th>
                      <th className="text-center py-1 px-2 text-muted-foreground font-medium">VALOR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'CAPA', key: 'CAPA', values: ['R$ 13,90', 'R$ 19,90', 'R$ 25,70', 'R$ 37,70', 'R$ 47,90'] },
                      { label: 'MAO DE OBRA', key: 'MAO_DE_OBRA', values: ['R$ 0,40', 'R$ 0,40', 'R$ 0,40', 'R$ 0,40', 'R$ 0,40'] },
                      { label: 'MP P/ LAMINAS', key: 'MP_LAMINAS', values: ['R$ 0,25', 'R$ 0,30', 'R$ 0,50', 'R$ 0,35', 'R$ 0,35'] },
                      { label: 'LAMINAS (Nome cliente)', key: 'LAMINAS_NOME', values: ['R$ 0,05', 'R$ 0,05', 'R$ 0,05', 'R$ 0,05', 'R$ 0,05'] },
                      { label: 'CODIGOS (Codigo cliente)', key: 'CODIGOS', values: ['R$ 0,05', 'R$ 0,05', 'R$ 0,05', 'R$ 0,05', 'R$ 0,05'] },
                      { label: 'ARTE CAPA', key: 'ARTE_CAPA', values: ['R$ 75,00', 'R$ 75,00', 'R$ 75,00', 'R$ 75,00', 'R$ 75,00'] },
                      { label: 'SILK CAPA - 1 COR', key: 'SILK_1COR', values: ['R$ 4,20', 'R$ 4,20', 'R$ 4,20', 'R$ 4,20', 'R$ 4,20'] },
                      { label: 'SILK CAPA - COLORIDO', key: 'SILK_COLORIDO', values: ['R$ 8,50', 'R$ 8,50', 'R$ 8,50', 'R$ 8,50', 'R$ 8,50'] },
                      { label: 'DIVISÓRIAS', key: 'DIVISORIAS', values: ['R$ 2,50', 'R$ 2,50', 'R$ 2,50', 'R$ 2,50', 'R$ 2,50'] },
                      { label: 'PLACA METALIZADA (6x4)', key: 'PLACA', values: ['R$ 5,90', 'R$ 5,90', 'R$ 5,90', 'R$ 5,90', 'R$ 5,90'] },
                      { label: 'ADESIVOS', key: 'ADESIVOS', values: ['R$ 3,90', 'R$ 3,90', 'R$ 3,90', 'R$ 3,90', 'R$ 3,90'] },
                      { label: 'ACRILICO - 3 Modelos (Unid.)', key: 'ACRILICO', values: ['R$ 7,50', 'R$ 7,50', 'R$ 7,50', 'R$ 7,50', 'R$ 7,50'] },
                    ].map((row, i) => {
                      const bookKeys = ['A', 'B', 'C', 'D', 'E'];
                      const isChecked = (form.custosChecked || []).includes(row.key);
                      return (
                        <tr key={i} className="border-b last:border-b-0">
                          <td className="py-1 px-2 font-medium">{row.label}</td>
                          {row.values.map((v, j) => {
                            const isSelectedBook = form.bookEscolhido.includes(bookKeys[j]);
                            return (
                              <td key={j} className="text-center py-1 px-1">
                                <label className="inline-flex items-center gap-1 cursor-pointer whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    className="accent-primary h-3 w-3 flex-shrink-0"
                                    checked={isSelectedBook && isChecked}
                                    onChange={() => { if (isSelectedBook) toggleCustoCheck(row.key); }}
                                    disabled={!isSelectedBook}
                                  />
                                  <span className={cn("whitespace-nowrap", !isSelectedBook && "text-muted-foreground/50")}>{v}</span>
                                </label>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Orçamento */}
            {(() => {
              const orc = calcOrcamento(form);
              const fmtNum = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              return (
                <div className="border rounded-lg p-3 space-y-2">
                  <Label className="text-xs font-semibold text-center block">ORÇAMENTO</Label>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium">BOOK ESCOLHIDO:</span>
                      {['A', 'B', 'C', 'D', 'E'].map(k => (
                        <label key={k} className="inline-flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" className="accent-primary h-3 w-3" checked={form.bookEscolhido.includes(k)} onChange={() => toggleBookEscolhido(k)} />
                          {k}
                        </label>
                      ))}
                    </div>
                    <p className="font-medium">QUANTIDADE: {form.quantidadeBook || '-'}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse border">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left py-1 px-2 font-semibold border-r w-2/5"></th>
                          <th className="text-center py-1 px-2 font-semibold border-r">QUANTIDADE</th>
                          <th className="text-center py-1 px-2 font-semibold border-r">VALORES UNITÁRIO</th>
                          <th className="text-center py-1 px-2 font-semibold">VALOR TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orc.rows.map((row, i) => (
                          <tr key={i} className="border-b last:border-b-0">
                            <td className="py-1 px-2 font-medium border-r">{ORCAMENTO_LABELS[i]}</td>
                            <td className="py-1 px-2 border-r text-center">{row.checked && row.qty > 0 ? fmtNum(row.qty) : ''}</td>
                            <td className="py-1 px-2 border-r text-center">{row.checked ? `R$ ${fmtNum(row.unitPrice)}` : ''}</td>
                            <td className="py-1 px-2 text-center font-medium">{row.checked && row.total > 0 ? `R$ ${fmtNum(row.total)}` : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs pt-2">
                    <div className="flex items-center gap-2"><span className="font-semibold">TOTAL R$:</span><span className="font-bold text-sm">{orc.totalGeral > 0 ? `R$ ${fmtNum(orc.totalGeral)}` : '-'}</span></div>
                    <div className="flex items-center gap-2"><span className="font-semibold">VALOR UNITÁRIO R$:</span><span className="font-bold text-sm">{orc.valorUnitario > 0 ? `R$ ${fmtNum(orc.valorUnitario)}` : '-'}</span></div>
                    <div className="flex items-center gap-2"><span className="font-semibold">DESCONTO:</span><Input className="h-6 text-xs w-32" /></div>
                  </div>
                  <div className="border-t pt-2 mt-2 space-y-1 text-xs">
                    <div className="flex items-center gap-2"><span className="font-semibold">PRAZO NEGOCIADO:</span><Input className="h-6 text-xs flex-1" /></div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">DATA:</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "flex h-8 flex-1 items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-left text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              !form.dataOrcamento && "text-muted-foreground"
                            )}
                          >
                            <span>
                              {form.dataOrcamento ? (() => {
                                const d = parse(form.dataOrcamento, 'yyyy-MM-dd', new Date());
                                return isValid(d) ? format(d, 'dd/MM/yyyy', { locale: ptBR }) : form.dataOrcamento;
                              })() : 'Selecione a data'}
                            </span>
                            <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={form.dataOrcamento ? (() => { const d = parse(form.dataOrcamento, 'yyyy-MM-dd', new Date()); return isValid(d) ? d : undefined; })() : undefined}
                            onSelect={(d) => d && setFormWithSync(p => ({ ...p, dataOrcamento: format(d, 'yyyy-MM-dd') }))}
                            locale={ptBR}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex items-center gap-2"><span className="font-semibold">ASSINATURA:</span><Input className="h-6 text-xs flex-1" /></div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        <DialogFooter className="px-6 pb-6 pt-2 flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {isCreateMode && onConfirmCreate && (
            <Button variant="secondary" onClick={() => { onConfirmCreate(form); onOpenChange(false); }}>
              Confirmar
            </Button>
          )}
          <Button onClick={generateAndUploadPdf} disabled={saving}>
            <FileText className="h-4 w-4 mr-1.5" />{saving ? 'Gerando...' : isCreateMode ? 'Confirmar e Anexar PDF' : 'Confirmar e Anexar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
