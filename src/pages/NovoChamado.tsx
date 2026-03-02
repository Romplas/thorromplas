import { Paperclip } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motivoOptions, clienteOptions, mockUsers } from '@/data/mockData';
import Layout from '@/components/Layout';

export default function NovoChamado() {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto bg-card border rounded-lg p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <Label className="text-xs">Supervisor</Label>
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
            <Label className="text-xs">Representantes</Label>
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
            <Label className="text-xs">Código do Cliente Opcional</Label>
            <Select>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o Código" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="001">001</SelectItem>
                <SelectItem value="002">002</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-red-500">* Clientes</Label>
            <Select>
              <SelectTrigger className="mt-1 border-red-300"><SelectValue placeholder="Selecione o Cliente" /></SelectTrigger>
              <SelectContent>
                {clienteOptions.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div>
            <Label className="text-xs">Rede Opcional</Label>
            <Select>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a Rede" /></SelectTrigger>
              <SelectContent><SelectItem value="rede1">Rede 1</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Data Contato</Label>
            <Input type="date" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-red-500">* Data Retorno</Label>
            <Input type="date" className="mt-1 border-red-300" />
          </div>
          <div>
            <Label className="text-xs text-red-500">* Motivo Principal da Solicitação</Label>
            <Select>
              <SelectTrigger className="mt-1 border-red-300"><SelectValue placeholder="Selecione o Motivo" /></SelectTrigger>
              <SelectContent>
                {motivoOptions.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Objetivo Principal da Solicitação</Label>
            <Select>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione Submotivo" /></SelectTrigger>
              <SelectContent><SelectItem value="sub1">Submotivo 1</SelectItem></SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
          <div>
            <Label className="text-xs">Metros Totais</Label>
            <Input className="mt-1" placeholder="" />
          </div>
          <div>
            <Label className="text-xs">Negociado com:</Label>
            <Select>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
              <SelectContent><SelectItem value="item1">Item 1</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Nº NFE</Label>
            <Input className="mt-1" placeholder="" />
          </div>
          <div>
            <Label className="text-xs">Tipo de Solicitação</Label>
            <Select>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
              <SelectContent><SelectItem value="tipo1">Tipo 1</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Gestor</Label>
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
            <Label className="text-xs">Status Agendamentos</Label>
            <Select>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Localizar itens" /></SelectTrigger>
              <SelectContent><SelectItem value="agendado">Agendado</SelectItem></SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea className="mt-1 min-h-[120px]" />
          </div>
          <div>
            <Label className="text-xs">Anexos</Label>
            <div className="mt-1 border rounded-lg p-4 min-h-[120px] flex flex-col items-center justify-center text-muted-foreground">
              <p className="text-sm">Não há nada em anexo.</p>
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                <Paperclip className="h-3 w-3" />
                Anexar Arquivos no formato (.pdf /.docx /.xlsx /.mp4...)
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button>Criar Chamado</Button>
        </div>
      </div>
    </Layout>
  );
}
