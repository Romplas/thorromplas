import { useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Users, UserCheck } from 'lucide-react';

export default function Configuracoes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch supervisores
  const { data: supervisores = [], isLoading: loadingSupervisores } = useQuery({
    queryKey: ['supervisores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supervisores')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  // Fetch representantes
  const { data: representantes = [], isLoading: loadingRepresentantes } = useQuery({
    queryKey: ['representantes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('representantes')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  // Fetch supervisor_representante links
  const { data: links = [] } = useQuery({
    queryKey: ['supervisor_representante'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supervisor_representante')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  // Toggle supervisor status
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

  // Add link
  const addLink = useMutation({
    mutationFn: async ({ supervisor_id, representante_id }: { supervisor_id: string; representante_id: string }) => {
      const { error } = await supabase
        .from('supervisor_representante')
        .insert({ supervisor_id, representante_id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor_representante'] });
      toast({ title: 'Vínculo criado com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar vínculo', variant: 'destructive' });
    },
  });

  // Remove link
  const removeLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('supervisor_representante')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor_representante'] });
      toast({ title: 'Vínculo removido' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover vínculo', variant: 'destructive' });
    },
  });

  // Assignment form state
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [selectedRepresentante, setSelectedRepresentante] = useState('');

  const activeSupervisores = supervisores.filter((s: any) => s.status === 'ativo');

  const handleAddLink = () => {
    if (!selectedSupervisor || !selectedRepresentante) {
      toast({ title: 'Selecione supervisor e representante', variant: 'destructive' });
      return;
    }
    // Check if link already exists
    const exists = links.some(
      (l: any) => l.supervisor_id === selectedSupervisor && l.representante_id === selectedRepresentante
    );
    if (exists) {
      toast({ title: 'Este vínculo já existe', variant: 'destructive' });
      return;
    }
    addLink.mutate({ supervisor_id: selectedSupervisor, representante_id: selectedRepresentante });
    setSelectedSupervisor('');
    setSelectedRepresentante('');
  };

  const getSupervisorName = (id: string) => supervisores.find((s: any) => s.id === id)?.nome || id;
  const getRepresentanteName = (id: string) => representantes.find((r: any) => r.id === id)?.nome || id;

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Configurações</h1>

        <Tabs defaultValue="supervisores" className="w-full">
          <TabsList>
            <TabsTrigger value="supervisores" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Supervisores
            </TabsTrigger>
            <TabsTrigger value="vinculos" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Vínculos
            </TabsTrigger>
          </TabsList>

          {/* Tab: Supervisores */}
          <TabsContent value="supervisores">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Supervisores</CardTitle>
                <CardDescription>Ative ou desative supervisores no sistema.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSupervisores ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead className="w-32 text-center">Status</TableHead>
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Vínculos */}
          <TabsContent value="vinculos">
            <Card>
              <CardHeader>
                <CardTitle>Atribuir Supervisor a Representante</CardTitle>
                <CardDescription>Gerencie os vínculos entre supervisores ativos e representantes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add new link */}
                <div className="flex items-end gap-4 flex-wrap">
                  <div className="space-y-1.5 min-w-[200px] flex-1">
                    <label className="text-sm font-medium">Supervisor</label>
                    <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o supervisor" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeSupervisores.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 min-w-[200px] flex-1">
                    <label className="text-sm font-medium">Representante</label>
                    <Select value={selectedRepresentante} onValueChange={setSelectedRepresentante}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o representante" />
                      </SelectTrigger>
                      <SelectContent>
                        {representantes.map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddLink} disabled={addLink.isPending}>
                    <Plus className="h-4 w-4 mr-1" />
                    Vincular
                  </Button>
                </div>

                {/* Existing links */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supervisor</TableHead>
                      <TableHead>Representante</TableHead>
                      <TableHead className="w-20 text-center">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          Nenhum vínculo cadastrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      links.map((link: any) => (
                        <TableRow key={link.id}>
                          <TableCell>{getSupervisorName(link.supervisor_id)}</TableCell>
                          <TableCell>{getRepresentanteName(link.representante_id)}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLink.mutate(link.id)}
                              disabled={removeLink.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
