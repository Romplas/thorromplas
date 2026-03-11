import { useState } from 'react';
import jsPDF from 'jspdf';
import { FileText } from 'lucide-react';
import romplasLogo from '@/assets/romplas-logo.png';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

// ──── Product Catalog Data ────
interface ProductEntry { name: string; numLam: number }

const LINHA_ORIGINAL_ESPALMADO: ProductEntry[] = [
  { name: 'AUTOPLAS', numLam: 48 }, { name: 'BLING', numLam: 9 }, { name: 'CABEDAL', numLam: 27 },
  { name: 'CASCO 1.0', numLam: 15 }, { name: 'DOLLARO', numLam: 17 }, { name: 'FLEX DUNE', numLam: 34 },
  { name: 'DUNEPLAS', numLam: 12 }, { name: 'LXR', numLam: 26 }, { name: 'NAUTIPLAS', numLam: 26 },
  { name: 'PERFECTO', numLam: 7 }, { name: 'URUGUAI 1.0', numLam: 52 }, { name: 'VÊNETO', numLam: 23 },
  { name: 'VINIL AUTO', numLam: 12 }, { name: 'DAYTONA', numLam: 21 }, { name: 'OLIMPO', numLam: 10 },
  { name: 'DISCOVERY', numLam: 17 }, { name: 'LINHA DIAMANTE', numLam: 21 }, { name: 'GRIFFE', numLam: 6 },
  { name: 'RÉVOR', numLam: 7 }, { name: 'TRAMAX', numLam: 16 }, { name: 'CALCEPLAS', numLam: 48 },
];

const LINHA_ORIGINAL_EXTRUSADO: ProductEntry[] = [
  { name: 'ANKARA', numLam: 30 }, { name: 'BAGUN ORIGINAL', numLam: 24 }, { name: 'BAGUN DIAMOND', numLam: 15 },
  { name: 'BANNER ORIGINAL', numLam: 26 }, { name: 'CORDEL', numLam: 5 }, { name: 'COROMIX', numLam: 16 },
  { name: 'COROPRIME', numLam: 34 }, { name: 'LISBOA', numLam: 7 }, { name: 'LUXE', numLam: 11 },
  { name: 'MATELASSE', numLam: 10 }, { name: 'MILANO PREMIUM', numLam: 8 }, { name: 'NAPA', numLam: 12 },
  { name: 'NAPA SAPUCAI', numLam: 2 }, { name: 'OMEGA NEW', numLam: 20 }, { name: 'PALHA', numLam: 4 },
  { name: 'PASSADEIRA', numLam: 8 }, { name: 'PROTECSOL', numLam: 10 }, { name: 'VERNIZ', numLam: 11 },
  { name: 'VERNIZ MARMORIZADO', numLam: 5 }, { name: 'VERNIZFLEX', numLam: 20 }, { name: 'STANDPLAS', numLam: 15 },
  { name: 'KORIPLAS CM', numLam: 1 },
];

const LINHA_PLUS_ESPALMADO: ProductEntry[] = [
  { name: 'BRESSER PLUS', numLam: 15 }, { name: 'CASCO PLUS', numLam: 11 }, { name: 'DOLLAROFLEX PLUS', numLam: 11 },
];

const LINHA_PLUS_EXTRUSADO: ProductEntry[] = [
  { name: 'BAGUN PLUS', numLam: 72 }, { name: 'BANNER PLUS', numLam: 14 }, { name: 'BUFALO PLUS', numLam: 16 },
  { name: 'CORINO PLUS', numLam: 10 }, { name: 'JUTA PLUS', numLam: 4 }, { name: 'KORIPLAS PLUS', numLam: 4 },
  { name: 'PASSADEIRA PLUS', numLam: 17 }, { name: 'PERNEIRA PLUS', numLam: 2 }, { name: 'VERNIZ PLUS', numLam: 4 },
  { name: 'LINHO PLUS', numLam: 5 }, { name: 'NAPA VR PLUS', numLam: 1 },
];

const LINHA_ARTPLAS: ProductEntry[] = [
  { name: 'PALERMO', numLam: 6 }, { name: 'VALENCIA', numLam: 13 }, { name: 'DUNELLE', numLam: 13 },
  { name: 'RAVENA', numLam: 13 }, { name: 'LYON', numLam: 13 },
];

const LINHA_ARTPLAS_TOSCANA: ProductEntry[] = [
  { name: 'FLORENÇA', numLam: 15 }, { name: 'PIENZA', numLam: 5 }, { name: 'ROSSO', numLam: 4 },
  { name: 'VENEZA', numLam: 9 }, { name: 'AREZZO', numLam: 13 }, { name: 'URUGUAI', numLam: 12 },
  { name: 'URUGUAI GRANADA', numLam: 5 },
];

const IMPORTADO: ProductEntry[] = [
  { name: 'LAMIPLAS PO', numLam: 5 }, { name: 'SUPERCLEAN PAPEL', numLam: 5 },
];

const LINHA_HP_7_MARES: ProductEntry[] = [
  { name: 'ADRIÁTICO', numLam: 3 }, { name: 'ATLANTICO', numLam: 14 }, { name: 'BÁLTICO', numLam: 8 },
  { name: 'CARIBE', numLam: 3 }, { name: 'EGEU', numLam: 14 }, { name: 'PACIFICO', numLam: 4 },
  { name: 'URUGUAI', numLam: 13 },
];

const QUANTIDADES = ['1', '2', '5', '10', '15', '20', '30', '50'];
const QUANTIDADES_AUTORIZACAO = ['100', '150', '200'];

// ──── Form Data Interface ────
export interface AmostrasFullFormData {
  // Dados Gerais extras
  razaoSocial: string;
  endereco: string;
  cidade: string;
  uf: string;
  cep: string;
  contato: string;
  inscEstadual: string;
  fone: string;
  cnpj: string;
  email: string;
  // Transporte
  transportadora: boolean;
  transportadoraNome: string;
  correio: boolean;
  // Tipo de amostra
  amostraTipo: 'cartela' | 'metragem' | 'a4' | '';
  amostraQuantidade: string;
  // Produtos selecionados
  selectedProducts: Record<string, string>;
  // Metragem amostras
  metragems: Array<{ codigo: string; cor: string }>;
  // Comments
  finalidade: string;
  utilizacao: string;
  observacoes: string;
}

export const defaultAmostrasFullForm: AmostrasFullFormData = {
  razaoSocial: '',
  endereco: '',
  cidade: '',
  uf: '',
  cep: '',
  contato: '',
  inscEstadual: '',
  fone: '',
  cnpj: '',
  email: '',
  transportadora: false,
  transportadoraNome: '',
  correio: false,
  amostraTipo: '',
  amostraQuantidade: '',
  selectedProducts: {},
  metragems: [{ codigo: '', cor: '' }],
  finalidade: '',
  utilizacao: '',
  observacoes: '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteNome: string;
  representanteNome: string;
  codigoCliente: string;
  formData: AmostrasFullFormData;
  onFormDataChange: (data: AmostrasFullFormData) => void;
  onConfirm: (data: AmostrasFullFormData, pdfFile?: globalThis.File) => void;
}

export default function AmostrasCreationForm({ open, onOpenChange, clienteNome, representanteNome, codigoCliente, formData, onFormDataChange, onConfirm }: Props) {
  const form = formData;
  const setForm = (updater: (prev: AmostrasFullFormData) => AmostrasFullFormData) => {
    onFormDataChange(updater(form));
  };

  const toggleProduct = (key: string, checked: boolean, numLam: number) => {
    setForm(prev => {
      const sp = { ...prev.selectedProducts };
      if (checked) sp[key] = String(numLam);
      else delete sp[key];
      return { ...prev, selectedProducts: sp };
    });
  };

  const updateMetragem = (index: number, field: 'codigo' | 'cor', value: string) => {
    setForm(prev => {
      const m = [...prev.metragems];
      m[index] = { ...m[index], [field]: value };
      return { ...prev, metragems: m };
    });
  };

  const renderProductSection = (title: string, products: ProductEntry[], lineKey: string, isFirstSection?: boolean) => (
    <div className="space-y-1">
      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1">
        {isFirstSection && (
          <div className="col-span-full flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
            <span className="w-[14px]" />
            <span className="font-medium pl-0 pr-0 flex flex-wrap -ml-[21px] -mr-[21px]">N° Lamina</span>
          </div>
        )}
        {products.map(p => {
          const key = `${lineKey}|${p.name}`;
          const checked = key in form.selectedProducts;
          return (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <Checkbox
                id={key}
                checked={checked}
                onCheckedChange={(c) => toggleProduct(key, !!c, p.numLam)}
                className="h-3.5 w-3.5 shrink-0"
              />
              <label htmlFor={key} className="cursor-pointer flex-1 truncate flex items-center gap-1">
                <span className="text-muted-foreground shrink-0">{p.numLam}</span>
                <span className="truncate">{p.name}</span>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );

  const generatePdf = async (): Promise<Blob> => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = 12;
    const checkPage = (needed: number) => { if (y + needed > 280) { doc.addPage(); y = 15; } };

    // Logo
    try {
      const logoImg = new window.Image(); logoImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => { logoImg.onload = () => resolve(); logoImg.onerror = () => reject(); logoImg.src = '/images/romplas-logo-pdf.png'; });
      const logoH = 12; const logoW = logoH * (logoImg.naturalWidth / logoImg.naturalHeight);
      doc.addImage(logoImg, 'PNG', (pageW - logoW) / 2, y, logoW, logoH); y += logoH + 4;
    } catch { /* fallback */ }

    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text('SOLICITAÇÃO DE AMOSTRAS', pageW / 2, y, { align: 'center' }); y += 8;
    doc.setDrawColor(180); doc.line(margin, y, pageW - margin, y); y += 8;

    const addField = (label: string, value: string) => { checkPage(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(label, margin, y); doc.setFont('helvetica', 'normal'); doc.text(value || '-', margin + doc.getTextWidth(label) + 3, y); y += 7; };
    const addFieldRow = (l1: string, v1: string, l2: string, v2: string) => { checkPage(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(l1, margin, y); doc.setFont('helvetica', 'normal'); doc.text(v1 || '-', margin + doc.getTextWidth(l1) + 3, y); const col2X = pageW / 2 + 5; doc.setFont('helvetica', 'bold'); doc.text(l2, col2X, y); doc.setFont('helvetica', 'normal'); doc.text(v2 || '-', col2X + doc.getTextWidth(l2) + 3, y); y += 7; };
    const addSectionBox = (title: string, contentFn: () => void) => { checkPage(25); const startY = y; y += 2; doc.setFont('helvetica', 'bold'); doc.setFontSize(9); if (title) doc.text(title, margin + 3, y + 4); y += title ? 9 : 4; doc.setFont('helvetica', 'normal'); contentFn(); y += 2; doc.setDrawColor(200); doc.roundedRect(margin, startY, contentW, y - startY, 2, 2, 'S'); y += 6; };

    addFieldRow('Representante:', representanteNome, 'Data:', new Date().toLocaleDateString('pt-BR'));
    addFieldRow('Cliente:', clienteNome, 'Código:', codigoCliente);
    y += 2;

    // Dados Gerais
    addSectionBox('Dados Gerais', () => {
      addFieldRow('Razão Social:', form.razaoSocial, 'Insc. Estadual:', form.inscEstadual);
      addFieldRow('Endereço:', form.endereco, 'Cidade:', form.cidade);
      addFieldRow('UF:', form.uf, 'CEP:', form.cep);
      addFieldRow('Contato:', form.contato, 'Fone:', form.fone);
      addFieldRow('CNPJ:', form.cnpj, 'E-mail:', form.email);
    });

    // Transporte
    addSectionBox('Transporte', () => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text(`(${form.transportadora ? 'X' : ' '}) Transportadora${form.transportadora && form.transportadoraNome ? ': ' + form.transportadoraNome : ''}    (${form.correio ? 'X' : ' '}) Correio`, margin + 3, y); y += 5;
    });

    // Tipo de Amostra
    const tipoLabel = form.amostraTipo === 'cartela' ? 'CARTELA' : form.amostraTipo === 'metragem' ? 'METRAGEM' : form.amostraTipo === 'a4' ? 'A4' : '-';
    addSectionBox('Tipo de Amostra e Quantidade', () => {
      addFieldRow('Tipo:', tipoLabel, 'Quantidade:', form.amostraQuantidade || '-');
    });

    // Cartelas selecionadas
    const selectedKeys = Object.keys(form.selectedProducts);
    if (selectedKeys.length > 0) {
      addSectionBox('Artigos Padrão Romplas - Cartelas Selecionadas', () => {
        doc.setFontSize(9);
        selectedKeys.forEach(key => {
          checkPage(6);
          const parts = key.split('|');
          const line = parts.slice(0, -1).join('|');
          const name = parts[parts.length - 1];
          const lam = form.selectedProducts[key];
          doc.setFont('helvetica', 'normal');
          doc.text(`${name} (${line}) - Nº Lam: ${lam || ''}`, margin + 3, y);
          y += 5;
        });
      });
    }

    // Metragem
    const metWithData = form.metragems.filter(m => m.codigo || m.cor);
    if (metWithData.length > 0) {
      addSectionBox('Amostra Metragem (Quantidade Máximo - 1 rolo)', () => {
        doc.setFontSize(9);
        metWithData.forEach(m => {
          checkPage(6);
          doc.setFont('helvetica', 'bold');
          doc.text('Código:', margin + 3, y);
          doc.setFont('helvetica', 'normal');
          doc.text(m.codigo || '-', margin + 22, y);
          doc.setFont('helvetica', 'bold');
          doc.text('Cor:', pageW / 2 + 5, y);
          doc.setFont('helvetica', 'normal');
          doc.text(m.cor || '-', pageW / 2 + 18, y);
          y += 6;
        });
      });
    }

    // Finalidade
    if (form.finalidade) {
      addSectionBox('Finalidade das Amostras / Comentários do Representante', () => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        const lines = doc.splitTextToSize(form.finalidade, contentW - 6);
        doc.text(lines, margin + 3, y); y += lines.length * 5;
      });
    }

    // Utilização
    if (form.utilizacao) {
      addSectionBox('Utilização', () => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        const lines = doc.splitTextToSize(form.utilizacao, contentW - 6);
        doc.text(lines, margin + 3, y); y += lines.length * 5;
      });
    }

    // Observações
    if (form.observacoes) {
      addSectionBox('Observação', () => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        const lines = doc.splitTextToSize(form.observacoes, contentW - 6);
        doc.text(lines, margin + 3, y); y += lines.length * 5;
      });
    }

    // Footer note
    checkPage(10);
    y += 5;
    doc.setFontSize(7); doc.setFont('helvetica', 'italic');
    doc.text('"Tempo máximo de retorno das amostras rolo - 30 dias após o faturamento"', pageW / 2, y, { align: 'center' });

    return doc.output('blob');
  };

  const handleConfirmWithPdf = async () => {
    if (!form.amostraTipo) { toast.error('Selecione o tipo de amostra.'); return; }
    if (!form.amostraQuantidade) { toast.error('Selecione a quantidade.'); return; }

    const pdfBlob = await generatePdf();
    const cleanName = (clienteNome || 'amostras').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
    const pdfFile = new globalThis.File([pdfBlob], `Amostras_${cleanName}.pdf`, { type: 'application/pdf' });
    onConfirm(form, pdfFile);
  };

  const handleConfirmOnly = () => {
    if (!form.amostraTipo) { toast.error('Selecione o tipo de amostra.'); return; }
    if (!form.amostraQuantidade) { toast.error('Selecione a quantidade.'); return; }
    onConfirm(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-5xl max-h-[92vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3">
          <div className="flex justify-center mb-2">
            <img src={romplasLogo} alt="Romplas" className="h-10 object-contain" />
          </div>
          <DialogTitle className="text-center text-lg">Solicitação de Amostras</DialogTitle>
        </DialogHeader>

        <ScrollArea className="px-6 max-h-[calc(92vh-160px)]">
          <div className="space-y-5 pb-4">

            {/* ── Dados Gerais ── */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-bold">Dados Gerais</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Representante</Label>
                  <p className="font-medium text-sm truncate">{representanteNome || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Cliente</Label>
                  <p className="font-medium text-sm truncate">{clienteNome || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Código</Label>
                  <p className="font-medium text-sm truncate">{codigoCliente || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Razão Social</Label>
                  <Input className="h-8 text-xs" value={form.razaoSocial} onChange={e => setForm(p => ({ ...p, razaoSocial: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Endereço</Label>
                  <Input className="h-8 text-xs" value={form.endereco} onChange={e => setForm(p => ({ ...p, endereco: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Cidade</Label>
                  <Input className="h-8 text-xs" value={form.cidade} onChange={e => setForm(p => ({ ...p, cidade: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">UF</Label>
                  <Input className="h-8 text-xs" maxLength={2} value={form.uf} onChange={e => setForm(p => ({ ...p, uf: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <Label className="text-xs">CEP</Label>
                  <Input className="h-8 text-xs" value={form.cep} onChange={e => setForm(p => ({ ...p, cep: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Contato</Label>
                  <Input className="h-8 text-xs" value={form.contato} onChange={e => setForm(p => ({ ...p, contato: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Insc. Estadual</Label>
                  <Input className="h-8 text-xs" value={form.inscEstadual} onChange={e => setForm(p => ({ ...p, inscEstadual: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Fone</Label>
                  <Input className="h-8 text-xs" value={form.fone} onChange={e => setForm(p => ({ ...p, fone: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">CNPJ</Label>
                  <Input className="h-8 text-xs" value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">E-mail</Label>
                  <Input className="h-8 text-xs" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="transportadora"
                    checked={form.transportadora}
                    onCheckedChange={c => setForm(p => ({ ...p, transportadora: !!c }))}
                  />
                  <Label htmlFor="transportadora" className="text-xs cursor-pointer">Transportadora</Label>
                  {form.transportadora && (
                    <Input
                      className="h-8 text-xs flex-1"
                      placeholder="Nome da transportadora"
                      value={form.transportadoraNome}
                      onChange={e => setForm(p => ({ ...p, transportadoraNome: e.target.value }))}
                    />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="correio"
                    checked={form.correio}
                    onCheckedChange={c => setForm(p => ({ ...p, correio: !!c }))}
                  />
                  <Label htmlFor="correio" className="text-xs cursor-pointer">Correio</Label>
                </div>
              </div>
            </div>

            {/* ── Tipo e Quantidade ── */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-bold">Tipo de Amostra e Quantidade *</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs mb-1 block">Tipo</Label>
                  <RadioGroup
                    value={form.amostraTipo}
                    onValueChange={v => setForm(p => ({ ...p, amostraTipo: v as any }))}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="cartela" id="tipo-cartela" />
                      <Label htmlFor="tipo-cartela" className="text-xs cursor-pointer">Cartela</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="metragem" id="tipo-metragem" />
                      <Label htmlFor="tipo-metragem" className="text-xs cursor-pointer">Metragem</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="a4" id="tipo-a4" />
                      <Label htmlFor="tipo-a4" className="text-xs cursor-pointer">A4</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Quantidade</Label>
                  <Select value={form.amostraQuantidade} onValueChange={v => setForm(p => ({ ...p, amostraQuantidade: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {QUANTIDADES.map(q => (
                        <SelectItem key={q} value={q}>{q}</SelectItem>
                      ))}
                      <SelectItem disabled value="_separator" className="text-muted-foreground text-[10px] italic">— Somente com autorização —</SelectItem>
                      {QUANTIDADES_AUTORIZACAO.map(q => (
                        <SelectItem key={q} value={q}>{q}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ── Cartelas Romplas ── */}
            <div className="rounded-lg border p-4 space-y-4">
              <h3 className="text-sm font-bold">Cartelas Romplas — Artigos Padrão</h3>
              <p className="text-xs text-muted-foreground">Selecione os produtos desejados. O número exibido é o N° Lamina.</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Linha Original */}
                <div className="space-y-4">
                  {renderProductSection('Linha Original — Espalmado', LINHA_ORIGINAL_ESPALMADO, 'ORIGINAL ESP', true)}
                  {renderProductSection('Linha Original — Extrusado', LINHA_ORIGINAL_EXTRUSADO, 'ORIGINAL EXT')}
                </div>
                {/* Linha Plus */}
                <div className="space-y-4">
                  {renderProductSection('Linha Plus — Espalmado', LINHA_PLUS_ESPALMADO, 'PLUS ESP')}
                  {renderProductSection('Linha Plus — Extrusado', LINHA_PLUS_EXTRUSADO, 'PLUS EXT')}
                  {renderProductSection('Linha Artplas', LINHA_ARTPLAS, 'ARTPLAS')}
                  {renderProductSection('Linha Artplas Toscana', LINHA_ARTPLAS_TOSCANA, 'TOSCANA')}
                  {renderProductSection('Importado', IMPORTADO, 'IMPORTADO')}
                  {renderProductSection('Linha HP 7 Mares', LINHA_HP_7_MARES, 'HP 7 MARES')}
                </div>
              </div>
            </div>

            {/* ── Amostra Metragem ── */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-bold">Amostra Metragem <span className="text-xs font-normal text-muted-foreground">(Quantidade Máximo - 1 rolo)</span></h3>
              <div className="space-y-2">
                {form.metragems.map((m, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Código</Label>
                      <Input className="mt-1 h-8 text-xs" value={m.codigo} onChange={e => updateMetragem(i, 'codigo', e.target.value)} />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">Cor</Label>
                      <Input className="mt-1 h-8 text-xs" value={m.cor} onChange={e => updateMetragem(i, 'cor', e.target.value)} />
                    </div>
                    {i === form.metragems.length - 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setForm(p => ({ ...p, metragems: [...p.metragems, { codigo: '', cor: '' }] }))}
                      >
                        <span className="text-lg leading-none">+</span>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Finalidade / Comentários ── */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-bold">Finalidade das Amostras / Comentários do Representante</h3>
              <Textarea
                className="text-xs"
                rows={3}
                value={form.finalidade}
                onChange={e => setForm(p => ({ ...p, finalidade: e.target.value }))}
              />
            </div>

            {/* ── Utilização ── */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-bold">Utilização</h3>
              <Input
                className="text-xs h-8"
                value={form.utilizacao}
                onChange={e => setForm(p => ({ ...p, utilizacao: e.target.value }))}
              />
            </div>

            {/* ── Observações ── */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-bold">Observação</h3>
              <Textarea
                className="text-xs"
                rows={2}
                value={form.observacoes}
                onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground italic">"Tempo máximo de retorno das amostras rolo - 30 dias após o faturamento"</p>
            </div>

          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-3 border-t flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="secondary" onClick={handleConfirmWithPdf}>
            <FileText className="h-4 w-4 mr-1.5" /> Confirmar e Anexar PDF
          </Button>
          <Button onClick={handleConfirmOnly}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
