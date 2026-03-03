import { useState, useEffect } from 'react';
import { Paperclip, Home, Clock, RotateCcw } from 'lucide-react';
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

export default function NovoChamado() {
  const navigate = useNavigate();
  const [motivos, setMotivos] = useState<Motivo[]>([]);
  const [submotivos, setSubmotivos] = useState<Submotivo[]>([]);
  const [selectedMotivo, setSelectedMotivo] = useState<string>('');
  const [filteredSubmotivos, setFilteredSubmotivos] = useState<Submotivo[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [mRes, sRes] = await Promise.all([
        supabase.from('motivos').select('id, nome').order('nome'),
        supabase.from('submotivos' as any).select('id, motivo_id, nome').order('nome'),
      ]);
      if (mRes.data) setMotivos(mRes.data);
      if (sRes.data) setSubmotivos(sRes.data as any);
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
                  <SelectContent><SelectItem value="item1">Item 1</SelectItem></SelectContent>
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
                  <SelectContent><SelectItem value="tipo1">Tipo 1</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Gestor</Label>
                <Select>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
                  <SelectContent>
                    {mockUsers.filter(u => u.tipo === 'gestor').map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Status Agendamentos</Label>
                <Select>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
                  <SelectContent><SelectItem value="agendado">Agendado</SelectItem></SelectContent>
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
                <div className="mt-1 border rounded-lg p-4 min-h-[140px] flex flex-col items-center justify-center text-muted-foreground">
                  <p className="text-sm">Não há nada em anexo.</p>
                  <div className="flex items-center gap-1.5 mt-2 text-xs">
                    <Paperclip className="h-3 w-3" />
                    Anexar Arquivos no formato (.pdf /.docx /.xlsx /.mp4...)
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
