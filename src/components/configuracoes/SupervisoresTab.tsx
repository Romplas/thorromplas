import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil } from 'lucide-react';

interface SupervisoresTabProps {
  supervisores: any[];
  isLoading: boolean;
}

export default function SupervisoresTab({ supervisores, isLoading }: SupervisoresTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === 'ativo' ? 'inativo' : 'ativo';
      const { error } = await supabase
        .from('supervisores')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisores'] });
      toast({ title: 'Status atualizado com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    },
  });

  const saveSupervisor = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error('Nome obrigatório');
      if (editingId) {
        const { error } = await supabase
          .from('supervisores')
          .update({ nome: nome.trim() })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('supervisores')
          .insert({ nome: nome.trim(), status: 'ativo' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisores'] });
      toast({ title: editingId ? 'Supervisora atualizada' : 'Supervisora criada com sucesso' });
      setDialogOpen(false);
      setEditingId(null);
      setNome('');
    },
    onError: () => {
      toast({ title: 'Erro ao salvar supervisora', variant: 'destructive' });
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setNome('');
    setDialogOpen(true);
  };

  const openEdit = (sup: any) => {
    setEditingId(sup.id);
    setNome(sup.nome);
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gerenciar Supervisores</CardTitle>
          <CardDescription>Ative ou desative supervisores no sistema.</CardDescription>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Nova Supervisora
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="w-32 text-center">Status</TableHead>
                <TableHead className="w-20 text-center">Editar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supervisores.map((sup: any) => (
                <TableRow key={sup.id}>
                  <TableCell className="font-medium">{sup.nome}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={sup.status === 'ativo'}
                        onCheckedChange={() => toggleStatus.mutate({ id: sup.id, status: sup.status })}
                      />
                      <span className={`text-xs font-medium ${sup.status === 'ativo' ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {sup.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(sup)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Supervisora' : 'Nova Supervisora'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome da supervisora"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveSupervisor.mutate()} disabled={saveSupervisor.isPending || !nome.trim()}>
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
