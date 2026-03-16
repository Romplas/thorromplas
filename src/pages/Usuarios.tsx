import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Pencil, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProfileWithRole {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  usuario: string | null;
  telefone: string | null;
  supervisora: string | null;
  status: string;
  role: UserRole | null;
}

const roleClasses: Record<UserRole, string> = {
  admin: 'role-admin',
  gestor: 'role-gestor',
  supervisor: 'role-supervisor',
  representante: 'role-representante',
};

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  gestor: 'Gestor',
  supervisor: 'Supervisora',
  representante: 'Representante',
};

export default function Usuarios() {
  const [users, setUsers] = useState<ProfileWithRole[]>([]);
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [supervisores, setSupervisores] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<ProfileWithRole | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ProfileWithRole | null>(null);
  const [saving, setSaving] = useState(false);
  const { role, session } = useAuth();
  const canManage = role === 'admin' || role === 'gestor';

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    usuario: '',
    senha: '',
    telefone: '',
    tipo: '' as UserRole,
    supervisora: '',
  });

  const fetchUsers = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: sups }] = await Promise.all([
      supabase.from('profiles').select('*').order('nome'),
      supabase.from('user_roles').select('*'),
      supabase.from('supervisores').select('id, nome').eq('status', 'ativo').order('nome'),
    ]);

    if (profiles) {
      const merged: ProfileWithRole[] = profiles.map(p => ({
        ...p,
        role: roles?.find(r => r.user_id === p.user_id)?.role as UserRole | null ?? null,
      }));
      setUsers(merged);
    }
    setSupervisores(sups || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEdit = (user: ProfileWithRole) => {
    setEditingUser(user);
    setFormData({
      nome: user.nome,
      email: user.email,
      usuario: user.usuario || '',
      senha: '',
      telefone: user.telefone || '',
      tipo: user.role || 'representante',
      supervisora: user.supervisora || '',
    });
    setSheetOpen(true);
  };

  const openCreate = () => {
    setFormData({ nome: '', email: '', usuario: '', senha: '', telefone: '', tipo: 'representante', supervisora: '' });
    setCreateOpen(true);
  };

  const handleSave = async () => {
    if (!editingUser || !session) return;
    setSaving(true);
    try {
      const res = await supabase.functions.invoke('update-user', {
        body: {
          user_id: editingUser.user_id,
          nome: formData.nome,
          email: formData.email,
          usuario: formData.usuario,
          senha: formData.senha || undefined,
          telefone: formData.telefone,
          tipo: formData.tipo,
          supervisora: formData.supervisora,
        },
      });
      if (res.error) throw new Error(res.error.message);
      const data = res.data as { error?: string };
      if (data?.error) throw new Error(data.error);
      toast.success('Usuário atualizado com sucesso');
      setSheetOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar usuário');
    }
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!session) return;
    if (!formData.nome || !formData.email || !formData.senha || !formData.tipo) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const res = await supabase.functions.invoke('create-user', {
        body: {
          nome: formData.nome,
          email: formData.email,
          usuario: formData.usuario,
          senha: formData.senha,
          telefone: formData.telefone,
          tipo: formData.tipo,
          supervisora: formData.supervisora,
        },
      });
      if (res.error) throw new Error(res.error.message);
      const data = res.data as { error?: string };
      if (data?.error) throw new Error(data.error);
      toast.success('Usuário criado com sucesso');
      setCreateOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar usuário');
    }
    setSaving(false);
  };

  const handleToggleStatus = async (user: ProfileWithRole, active: boolean) => {
    const newStatus = active ? 'ativo' : 'inativo';
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', user.id);
    if (error) {
      toast.error('Erro ao alterar status');
    } else {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      toast.success(`Usuário ${active ? 'ativado' : 'desativado'}`);
    }
  };

  const confirmDelete = (user: ProfileWithRole) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete || !session) return;
    setSaving(true);
    try {
      const res = await supabase.functions.invoke('delete-user', {
        body: { user_id: userToDelete.user_id },
      });
      if (res.error) throw new Error(res.error.message);
      const data = res.data as { error?: string };
      if (data?.error) throw new Error(data.error);
      toast.success('Usuário excluído com sucesso');
      setDeleteDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir usuário');
    }
    setSaving(false);
  };

  const filteredUsers = users.filter(u => roleFilter === 'all' || u.role === roleFilter);

  const handleExportPdf = () => {
    if (!canManage || filteredUsers.length === 0) return;
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    const rows = filteredUsers.map((u, idx) => {
      const tipo = u.role ? roleLabels[u.role] : '';
      const supervisora = u.supervisora || '';
      return `<tr>
        <td>${idx + 1}</td>
        <td>${u.nome || ''}</td>
        <td>${u.email || ''}</td>
        <td>${u.usuario || ''}</td>
        <td>${tipo}</td>
        <td>${supervisora}</td>
      </tr>`;
    }).join('');
    printWin.document.write(`
      <html>
        <head>
          <title>Usuários filtrados</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 16px; font-size: 12px; }
            h2 { text-align: center; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #444; padding: 4px 6px; text-align: left; }
            th { background: #1d4ed8; color: #fff; font-size: 11px; }
            tr:nth-child(even) { background: #f9fafb; }
            @page { size: landscape; margin: 12mm; }
          </style>
        </head>
        <body>
          <h2>Relatório de Usuários</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nome</th>
                <th>Email</th>
                <th>Usuário</th>
                <th>Tipo</th>
                <th>Supervisora</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 500);
  };

  const renderFormFields = (isCreate: boolean) => (
    <div className="space-y-4 py-6">
      <div className="space-y-2">
        <Label>Nome *</Label>
        <Input value={formData.nome} onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Email *</Label>
        <Input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Usuário</Label>
        <Input value={formData.usuario} onChange={e => setFormData(p => ({ ...p, usuario: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>{isCreate ? 'Senha *' : 'Nova Senha (deixe vazio para manter)'}</Label>
        <Input type="password" value={formData.senha} onChange={e => setFormData(p => ({ ...p, senha: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Telefone</Label>
        <Input value={formData.telefone} onChange={e => setFormData(p => ({ ...p, telefone: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Supervisora</Label>
        <Select value={formData.supervisora || 'none'} onValueChange={(val) => setFormData(p => ({ ...p, supervisora: val === 'none' ? '' : val }))}>
          <SelectTrigger><SelectValue placeholder="Selecione a supervisora" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            {supervisores.map(s => (
              <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Tipo de Usuário *</Label>
        <Select value={formData.tipo} onValueChange={(val) => setFormData(p => ({ ...p, tipo: val as UserRole }))}>
          <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="gestor">Gestor</SelectItem>
            <SelectItem value="supervisor">Supervisora</SelectItem>
            <SelectItem value="representante">Representante</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Gerenciar Usuários</h1>
            <p className="text-sm text-muted-foreground">Configure roles e vínculos de usuários</p>
          </div>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Filtros:</span>
        </div>
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground">Tipo de usuário</Label>
            <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val as UserRole | 'all')}>
              <SelectTrigger className="h-9 w-48">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="supervisor">Supervisora</SelectItem>
                <SelectItem value="representante">Representante</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {canManage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={handleExportPdf}
              disabled={filteredUsers.length === 0}
            >
              Exportar PDF
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="p-4 w-10"><Checkbox /></th>
              <th className="text-left p-4 font-medium">Nome</th>
              <th className="text-left p-4 font-medium">Email</th>
              <th className="text-left p-4 font-medium">Usuário</th>
              <th className="text-left p-4 font-medium">Tipo</th>
              <th className="text-left p-4 font-medium">Supervisora</th>
              <th className="text-left p-4 font-medium">Status</th>
              {canManage && <th className="text-right p-4 font-medium">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum usuário encontrado</td></tr>
            ) : (
            filteredUsers.map((user) => (
                <tr key={user.id} className="border-b hover:bg-muted/20">
                  <td className="p-4"><Checkbox /></td>
                  <td className="p-4 font-medium text-primary">{user.nome}</td>
                  <td className="p-4 text-muted-foreground">{user.email}</td>
                  <td className="p-4 text-muted-foreground">{user.usuario || '-'}</td>
                  <td className="p-4">
                    {user.role && (
                      <span className={`status-badge ${roleClasses[user.role]}`}>
                        {roleLabels[user.role]}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-muted-foreground">{user.supervisora || '-'}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={user.status === 'ativo'}
                        onCheckedChange={(checked) => handleToggleStatus(user, checked)}
                        disabled={!canManage}
                      />
                      <span className={`text-xs font-medium ${user.status === 'ativo' ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {user.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </td>
                  {canManage && (
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-muted-foreground hover:text-foreground" onClick={() => openEdit(user)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="text-destructive hover:text-destructive/80" onClick={() => confirmDelete(user)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Usuário</SheetTitle>
            <SheetDescription>Atualize os dados do usuário.</SheetDescription>
          </SheetHeader>
          {renderFormFields(false)}
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Create Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Novo Usuário</SheetTitle>
            <SheetDescription>Preencha os dados para criar um novo usuário.</SheetDescription>
          </SheetHeader>
          {renderFormFields(true)}
          <SheetFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Criando...' : 'Criar'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{userToDelete?.nome}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
