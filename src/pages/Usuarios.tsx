import { useState } from 'react';
import { UserPlus, Pencil, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { mockUsers } from '@/data/mockData';
import { UserRole } from '@/types';
import Layout from '@/components/Layout';

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  gestor: 'Gestor',
  supervisor: 'Representante',
  representante: 'Representante',
};

const roleClasses: Record<UserRole, string> = {
  admin: 'role-admin',
  gestor: 'role-gestor',
  supervisor: 'role-supervisor',
  representante: 'role-representante',
};

export default function Usuarios() {
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
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
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
              <th className="text-right p-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {mockUsers.map((user) => (
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
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="text-muted-foreground hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
