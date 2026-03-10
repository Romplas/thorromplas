import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';

interface VinculosTabProps {
  supervisores: any[];
  representantes: any[];
  links: any[];
}

export default function VinculosTab({ supervisores, representantes, links }: VinculosTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [selectedRepresentantes, setSelectedRepresentantes] = useState<string[]>([]);
  const [filterSupervisor, setFilterSupervisor] = useState('');

  const activeSupervisores = supervisores.filter((s: any) => s.status === 'ativo');

  const toggleRepresentante = (id: string) => {
    setSelectedRepresentantes((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedRepresentantes.length === representantes.length) {
      setSelectedRepresentantes([]);
    } else {
      setSelectedRepresentantes(representantes.map((r: any) => r.id));
    }
  };

  // Filter out representantes already linked to the selected supervisor
  const alreadyLinkedIds = selectedSupervisor
    ? links.filter((l: any) => l.supervisor_id === selectedSupervisor).map((l: any) => l.representante_id)
    : [];

  const availableRepresentantes = representantes;

  const addLinks = useMutation({
    mutationFn: async () => {
      const toInsert = selectedRepresentantes
        .filter((rid) => !alreadyLinkedIds.includes(rid))
        .map((representante_id) => ({
          supervisor_id: selectedSupervisor,
          representante_id,
        }));
      if (toInsert.length === 0) throw new Error('Nenhum vínculo novo');
      const { error } = await supabase
        .from('supervisor_representante')
        .insert(toInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor_representante'] });
      toast({ title: `${selectedRepresentantes.length} vínculo(s) criado(s) com sucesso` });
      setSelectedRepresentantes([]);
    },
    onError: (err: any) => {
      toast({ title: err.message || 'Erro ao criar vínculos', variant: 'destructive' });
    },
  });

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

  const handleAddLinks = () => {
    if (!selectedSupervisor) {
      toast({ title: 'Selecione uma supervisora', variant: 'destructive' });
      return;
    }
    if (selectedRepresentantes.length === 0) {
      toast({ title: 'Selecione pelo menos um representante', variant: 'destructive' });
      return;
    }
    addLinks.mutate();
  };

  const getSupervisorName = (id: string) => supervisores.find((s: any) => s.id === id)?.nome || id;
  const getRepresentanteName = (id: string) => representantes.find((r: any) => r.id === id)?.nome || id;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atribuir Supervisor a Representantes</CardTitle>
        <CardDescription>Selecione a supervisora e marque os representantes para vincular em massa.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Supervisor select + bulk action button */}
        <div className="flex items-end gap-4 flex-wrap">
          <div className="space-y-1.5 min-w-[250px] flex-1">
            <label className="text-sm font-medium">Supervisor</label>
            <Select value={selectedSupervisor} onValueChange={(v) => { setSelectedSupervisor(v); setSelectedRepresentantes([]); }}>
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
          <Button onClick={handleAddLinks} disabled={addLinks.isPending || !selectedSupervisor || selectedRepresentantes.length === 0}>
            <Plus className="h-4 w-4 mr-1" />
            Vincular ({selectedRepresentantes.length})
          </Button>
        </div>

        {/* Representantes checklist */}
        {selectedSupervisor && (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={availableRepresentantes.filter((r: any) => !alreadyLinkedIds.includes(r.id)).length > 0 && selectedRepresentantes.length === availableRepresentantes.filter((r: any) => !alreadyLinkedIds.includes(r.id)).length}
                      onCheckedChange={() => {
                        const unlinkable = availableRepresentantes.filter((r: any) => !alreadyLinkedIds.includes(r.id));
                        if (selectedRepresentantes.length === unlinkable.length) {
                          setSelectedRepresentantes([]);
                        } else {
                          setSelectedRepresentantes(unlinkable.map((r: any) => r.id));
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Representante</TableHead>
                  <TableHead className="w-24 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableRepresentantes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      Nenhum representante cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  availableRepresentantes.map((r: any) => {
                    const isLinked = alreadyLinkedIds.includes(r.id);
                    return (
                      <TableRow key={r.id} className={isLinked ? 'opacity-60' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={isLinked || selectedRepresentantes.includes(r.id)}
                            disabled={isLinked}
                            onCheckedChange={() => toggleRepresentante(r.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{r.nome}</TableCell>
                        <TableCell className="text-center">
                          {isLinked ? (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Vinculado</span>
                          ) : (
                            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">Disponível</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Vínculos existentes</h3>
            <div className="min-w-[200px]">
              <Select value={filterSupervisor} onValueChange={setFilterSupervisor}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Filtrar por supervisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {supervisores.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supervisor</TableHead>
                <TableHead>Representante</TableHead>
                <TableHead className="w-20 text-center">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(filterSupervisor && filterSupervisor !== 'todos' ? links.filter((l: any) => l.supervisor_id === filterSupervisor) : links).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Nenhum vínculo encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                (filterSupervisor && filterSupervisor !== 'todos' ? links.filter((l: any) => l.supervisor_id === filterSupervisor) : links).map((link: any) => (
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
        </div>
      </CardContent>
    </Card>
  );
}
