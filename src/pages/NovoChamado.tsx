import { useState, useEffect, useRef } from 'react';
import { Paperclip, Home, Clock, RotateCcw, X, FileText, FileSpreadsheet, Film, Image, Music, File } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { mockUsers } from '@/data/mockData';
import Layout from '@/components/Layout';

interface Motivo { id: string; nome: string }
interface Submotivo { id: string; motivo_id: string; nome: string }

const ACCEPTED_TYPES: Record<string, { label: string; maxMB: number; icon: React.ReactNode }> = {
  'application/pdf': { label: 'PDF', maxMB: 10, icon: <FileText className="h-4 w-4" /> },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOCX', maxMB: 10, icon: <FileText className="h-4 w-4" /> },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { label: 'XLSX', maxMB: 10, icon: <FileSpreadsheet className="h-4 w-4" /> },
  'video/mp4': { label: 'MP4', maxMB: 50, icon: <Film className="h-4 w-4" /> },
  'image/jpeg': { label: 'JPEG', maxMB: 5, icon: <Image className="h-4 w-4" /> },
  'image/png': { label: 'PNG', maxMB: 5, icon: <Image className="h-4 w-4" /> },
  'audio/mpeg': { label: 'MP3', maxMB: 15, icon: <Music className="h-4 w-4" /> },
  'text/plain': { label: 'TXT', maxMB: 2, icon: <File className="h-4 w-4" /> },
};

const ACCEPT_STRING = Object.keys(ACCEPTED_TYPES).join(',');

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NovoChamado() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [motivos, setMotivos] = useState<Motivo[]>([]);
  const [submotivos, setSubmotivos] = useState<Submotivo[]>([]);
  const [selectedMotivo, setSelectedMotivo] = useState<string>('');
  const [filteredSubmotivos, setFilteredSubmotivos] = useState<Submotivo[]>([]);
  const [anexos, setAnexos] = useState<globalThis.File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mRes, sRes] = await Promise.all([
          supabase.from('motivos').select('id, nome').order('nome'),
          supabase.from('submotivos').select('id, motivo_id, nome').order('nome'),
        ]);
        if (mRes.data) setMotivos(mRes.data);
        if (sRes.data) setSubmotivos(sRes.data);
      } catch (error) {
        console.error('Erro ao carregar motivos/submotivos:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedMotivo) {
      setFilteredSubmotivos(submotivos.filter(s => s.motivo_id === selectedMotivo));
    } else {
      setFilteredSubmotivos([]);
    }
  }, [selectedMotivo, submotivos]);

  return (
    <Layout>
      <div className="flex flex-col min-h-[calc(100vh-3rem-3rem)] -m-6">
        <div className="flex-1 p-6">
          <div className="bg-card border rounded-lg p-6">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <div>
                <Label className="text-xs font-semibold">Supervisor</Label>
                <Select>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {mockUsers.filter(u => u.tipo === 'supervisor').map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Representantes</Label>
                <Select>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {mockUsers.filter(u => u.tipo === 'representante').map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Código do Cliente Opcional</Label>
                <Select>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o Código" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="001">001</SelectItem>
                    <SelectItem value="002">002</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-destructive">* Clientes</Label>
                <Select>
                  <SelectTrigger className="mt-1 border-destructive/50"><SelectValue placeholder="Selecione o Cliente" /></SelectTrigger>
                  <SelectContent>
                    {mockUsers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
              <div>
                <Label className="text-xs font-semibold">Rede Opcional</Label>
                <Select>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a Rede" /></SelectTrigger>
                  <SelectContent><SelectItem value="rede1">Rede 1</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Data Contato</Label>
                <Input type="date" className="mt-1" placeholder="Selecione uma data..." />
              </div>
              <div>
                <Label className="text-xs font-semibold text-destructive">* Data Retorno</Label>
                <Input type="date" className="mt-1 border-destructive/50" placeholder="Selecione uma data..." />
              </div>
              <div>
                <Label className="text-xs font-semibold text-destructive">* Motivo Principal da Solicitação</Label>
                <Select onValueChange={setSelectedMotivo} value={selectedMotivo}>
                  <SelectTrigger className="mt-1 border-destructive/50"><SelectValue placeholder="Selecione o Motivo" /></SelectTrigger>
                  <SelectContent>
                    {motivos.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Objetivo Principal da Solicitação</Label>
                <Select disabled={!selectedMotivo}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={selectedMotivo ? "Selecione o Objetivo" : "Selecione um motivo primeiro"} /></SelectTrigger>
                  <SelectContent>
                    {filteredSubmotivos.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
              <div>
                <Label className="text-xs font-semibold">Metros Totais</Label>
                <Input className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Negociado com:</Label>
                <Select>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="andre">André</SelectItem>
                    <SelectItem value="douglas">Douglas</SelectItem>
                    <SelectItem value="vinicius">Vinicius</SelectItem>
                    <SelectItem value="joao_pedro">João Pedro</SelectItem>
                    <SelectItem value="sr_ivo">Sr Ivo</SelectItem>
                    <SelectItem value="tathy">Tathy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Nº NFE</Label>
                <Input className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Tipo de Solicitação</Label>
                <Select>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interna">Interna</SelectItem>
                    <SelectItem value="romplas">Romplas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Gestor</Label>
                <Select>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="andre">André</SelectItem>
                    <SelectItem value="douglas">Douglas</SelectItem>
                    <SelectItem value="tathy">Tathy</SelectItem>
                    <SelectItem value="vinicius">Vinicius</SelectItem>
                    <SelectItem value="marcelo">Marcelo</SelectItem>
                    <SelectItem value="juliane">Juliane</SelectItem>
                    <SelectItem value="ivan">Ivan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Status Agendamentos</Label>
                <Select>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 4 - Descrição + Anexos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">Descrição</Label>
                <Textarea className="mt-1 min-h-[140px]" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Anexos</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={ACCEPT_STRING}
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const errors: string[] = [];
                    const valid: globalThis.File[] = [];
                    files.forEach(f => {
                      const config = ACCEPTED_TYPES[f.type];
                      if (!config) {
                        errors.push(`"${f.name}" — formato não suportado.`);
                      } else if (f.size > config.maxMB * 1024 * 1024) {
                        errors.push(`"${f.name}" excede ${config.maxMB} MB (limite para ${config.label}).`);
                      } else {
                        valid.push(f);
                      }
                    });
                    setFileErrors(errors);
                    setAnexos(prev => [...prev, ...valid]);
                    e.target.value = '';
                  }}
                />
                <div className="mt-1 border rounded-lg p-4 min-h-[140px] flex flex-col">
                  {anexos.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                      <p className="text-sm">Não há nada em anexo.</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {anexos.map((file, i) => {
                        const config = ACCEPTED_TYPES[file.type];
                        return (
                          <div key={i} className="flex items-center gap-1.5 bg-muted rounded-md px-2.5 py-1.5 text-xs">
                            {config?.icon}
                            <span className="max-w-[120px] truncate">{file.name}</span>
                            <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                            <button
                              type="button"
                              onClick={() => setAnexos(prev => prev.filter((_, idx) => idx !== i))}
                              className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {fileErrors.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {fileErrors.map((err, i) => (
                        <p key={i} className="text-xs text-destructive">{err}</p>
                      ))}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mx-auto mt-auto"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                    Anexar Arquivos
                  </Button>

                  <div className="mt-3 border-t pt-2">
                    <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                      <span className="font-semibold">Formatos e limites:</span>{' '}
                      PDF, DOCX, XLSX (até 10 MB) · MP4 (até 50 MB) · JPEG, PNG (até 5 MB) · MP3 (até 15 MB) · TXT (até 2 MB)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="sticky bottom-0 bg-card border-t px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-1.5" />
              Início
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/historico')}>
              <Clock className="h-4 w-4 mr-1.5" />
              Histórico
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Limpar
            </Button>
            <Button size="sm">
              Criar Chamado
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
