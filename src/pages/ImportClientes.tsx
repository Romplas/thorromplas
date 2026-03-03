import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface RawRow {
  codSupervisor: number;
  supervisor: string;
  codRepresentante: number;
  representante: string;
  rede: string;
  codigoCliente: number;
  cliente: string;
}

export default function ImportClientes() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'importing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Record<string, number> | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setStatus('idle');
      setMessage('');
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      setStatus('parsing');
      setMessage('Lendo planilha...');
      setProgress(10);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const rows: RawRow[] = jsonData.map((row: any) => ({
        codSupervisor: Number(row['CodSupervisor'] || row['codSupervisor'] || 0),
        supervisor: String(row['Supervisor'] || row['supervisor'] || '').trim(),
        codRepresentante: Number(row['CodRepresentante'] || row['codRepresentante'] || 0),
        representante: String(row['Representantes'] || row['representante'] || row['Representante'] || '').trim(),
        rede: String(row['Rede'] || row['rede'] || '').trim(),
        codigoCliente: Number(row['Codigo do Cliente'] || row['codigoCliente'] || row['Codigo'] || 0),
        cliente: String(row['Cliente'] || row['cliente'] || '').trim(),
      }));

      if (rows.length === 0) {
        setStatus('error');
        setMessage('Nenhuma linha encontrada na planilha.');
        return;
      }

      setProgress(30);
      setStatus('importing');
      setMessage(`Enviando ${rows.length} registros para importação...`);

      // Send in chunks of 1000 to avoid payload limits
      const chunkSize = 1000;
      let totalResult = { supervisores: 0, representantes: 0, redes: 0, sr_links: 0, clientes: 0 };

      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const pct = 30 + Math.round((i / rows.length) * 60);
        setProgress(pct);
        setMessage(`Importando lote ${Math.floor(i / chunkSize) + 1} de ${Math.ceil(rows.length / chunkSize)}...`);

        const { data: resp, error } = await supabase.functions.invoke('import-clients', {
          body: { rows: chunk },
        });

        if (error) throw new Error(error.message);
        if (resp?.error) throw new Error(resp.error);

        if (resp) {
          totalResult.supervisores = Math.max(totalResult.supervisores, resp.supervisores || 0);
          totalResult.representantes = Math.max(totalResult.representantes, resp.representantes || 0);
          totalResult.redes = Math.max(totalResult.redes, resp.redes || 0);
          totalResult.sr_links = Math.max(totalResult.sr_links, resp.sr_links || 0);
          totalResult.clientes += resp.clientes || 0;
        }
      }

      setProgress(100);
      setStatus('success');
      setMessage('Importação concluída com sucesso!');
      setResult(totalResult);
    } catch (err: any) {
      setStatus('error');
      setMessage(`Erro: ${err.message}`);
      setProgress(0);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Clientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Selecione o arquivo XLSX com as colunas: CodSupervisor, Supervisor, CodRepresentante, Representantes, Rede, Codigo do Cliente, Cliente.
            </p>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Selecionar arquivo
              </Button>
              {file && <span className="text-sm text-muted-foreground">{file.name}</span>}
            </div>

            {file && status !== 'importing' && status !== 'parsing' && (
              <Button onClick={handleImport} disabled={!file}>
                Iniciar Importação
              </Button>
            )}

            {(status === 'parsing' || status === 'importing') && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{message}</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">{message}</span>
                </div>
                {result && (
                  <div className="bg-muted rounded-lg p-4 text-sm space-y-1">
                    <p>Supervisores: {result.supervisores}</p>
                    <p>Representantes: {result.representantes}</p>
                    <p>Redes: {result.redes}</p>
                    <p>Vínculos Sup-Rep: {result.sr_links}</p>
                    <p>Clientes: {result.clientes}</p>
                  </div>
                )}
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{message}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
