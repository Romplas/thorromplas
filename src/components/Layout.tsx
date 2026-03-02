import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Clock, Users, Zap, LogOut, User, Columns3 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/kanban', label: 'Kanban', icon: Columns3 },
  { to: '/novo-chamado', label: 'Novo Chamado', icon: PlusCircle },
  { to: '/historico', label: 'Histórico', icon: Clock },
  { to: '/usuarios', label: 'Usuários', icon: Users },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userName = profile?.nome || 'Usuário';
  const userInitial = userName.charAt(0).toUpperCase();
  const roleLabel = role === 'admin' ? 'Admin' : role === 'gestor' ? 'Gestor' : role === 'supervisor' ? 'Supervisora' : role === 'representante' ? 'Representante' : '';
  const roleClass = role ? `role-${role}` : '';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/login');
  };

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
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
          >
            <Avatar className="h-7 w-7 bg-white/20">
              <AvatarFallback className="bg-white/20 text-primary-foreground text-xs">{userInitial}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{userName}</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-card border rounded-lg shadow-lg z-50 py-2">
              <div className="px-4 py-2 border-b">
                <p className="text-sm font-semibold">{userName}</p>
                {roleLabel && <span className={`status-badge ${roleClass} text-xs`}>{roleLabel}</span>}
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <User className="h-4 w-4" />
                Meu Perfil
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-destructive hover:bg-muted/50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
