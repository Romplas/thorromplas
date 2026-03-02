import { useState } from 'react';
import { UserPlus, Pencil, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { mockUsers } from '@/data/mockData';
import { User, UserRole } from '@/types';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
const roleClasses: Record<UserRole, string> = {
  admin: 'role-admin',
  gestor: 'role-gestor',
  supervisor: 'role-supervisor',
  representante: 'role-representante',
};

export default function Usuarios() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { role } = useAuth();
  const canManage = role === 'admin' || role === 'gestor';

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    usuario: '',
    senha: '',
    telefone: '',
    tipo: '' as UserRole,
  });

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      nome: user.nome,
      email: user.email,
      usuario: user.usuario || '',
      senha: '',
      telefone: user.telefone || '',
      tipo: user.tipo,
    });
    setSheetOpen(true);
  };

  const handleSave = () => {
    if (!editingUser) return;
    setUsers(prev =>
      prev.map(u =>
        u.id === editingUser.id
          ? { ...u, nome: formData.nome, email: formData.email, usuario: formData.usuario, telefone: formData.telefone, tipo: formData.tipo }
          : u
      )
    );
    setSheetOpen(false);
    setEditingUser(null);
  };

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
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        )}
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="p-4 w-10"><Checkbox /></th>
              <th className="text-left p-4 font-medium">Nome</th>
              <th className="text-left p-4 font-medium">Email</th>
              <th className="text-left p-4 font-medium">Tipo</th>
              <th className="text-left p-4 font-medium">Supervisora</th>
              <th className="text-left p-4 font-medium">Status</th>
              {canManage && <th className="text-right p-4 font-medium">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b hover:bg-muted/20">
                <td className="p-4"><Checkbox /></td>
                <td className="p-4 font-medium text-primary">{user.nome}</td>
                <td className="p-4 text-muted-foreground">{user.email}</td>
                <td className="p-4">
                  <span className={`status-badge ${roleClasses[user.tipo]}`}>
                    {user.tipo === 'admin' ? 'Admin' : user.tipo === 'gestor' ? 'Gestor' : user.tipo === 'supervisor' ? 'Supervisora' : 'Representante'}
                  </span>
                </td>
                <td className="p-4 text-muted-foreground">{user.supervisora || '-'}</td>
                <td className="p-4">
                  <span className="status-badge status-done">Ativo</span>
                </td>
                {canManage && (
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button className="text-destructive hover:text-destructive/80">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sheet de Edição */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Usuário</SheetTitle>
            <SheetDescription>Atualize os dados do usuário.</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome *</Label>
              <Input
                id="edit-nome"
                value={formData.nome}
                onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-usuario">Usuário</Label>
              <Input
                id="edit-usuario"
                value={formData.usuario}
                onChange={e => setFormData(prev => ({ ...prev, usuario: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-senha">Nova Senha (deixe vazio para manter)</Label>
              <Input
                id="edit-senha"
                type="password"
                value={formData.senha}
                onChange={e => setFormData(prev => ({ ...prev, senha: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-telefone">Telefone</Label>
              <Input
                id="edit-telefone"
                value={formData.telefone}
                onChange={e => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Usuário *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(val) => setFormData(prev => ({ ...prev, tipo: val as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="supervisor">Supervisora</SelectItem>
                  <SelectItem value="representante">Representante</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
