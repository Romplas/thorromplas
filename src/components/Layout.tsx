import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Clock, Users, Zap, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/novo-chamado', label: 'Novo Chamado', icon: PlusCircle },
  { to: '/historico', label: 'Histórico', icon: Clock },
  { to: '/usuarios', label: 'Usuários', icon: Users },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="nav-header h-12 flex items-center justify-between px-6 shadow-md">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 font-bold text-lg cursor-pointer" onClick={() => navigate('/')}>
            <Zap className="h-5 w-5" />
            THOR
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/20 text-primary-foreground'
                      : 'text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground'
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-7 w-7 bg-white/20">
            <AvatarFallback className="bg-white/20 text-primary-foreground text-xs">A</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">Administrador</span>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
