import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Clock, Users, LogOut, User, Columns3, Upload, Settings, RefreshCw, Menu } from 'lucide-react';
import logoThor from '@/assets/logo-thor.png';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

const allNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'gestor', 'supervisor', 'representante'] },
  { to: '/kanban', label: 'Kanban', icon: Columns3, roles: ['admin', 'gestor', 'supervisor'] },
  { to: '/novo-chamado', label: 'Novo Chamado', icon: PlusCircle, roles: ['admin', 'gestor', 'supervisor', 'representante'] },
  { to: '/historico', label: 'Histórico', icon: Clock, roles: ['admin', 'gestor', 'supervisor', 'representante'] },
  { to: '/usuarios', label: 'Usuários', icon: Users, roles: ['admin', 'gestor'] },
  { to: '/import-clientes', label: 'Importar', icon: Upload, roles: ['admin', 'gestor'] },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, roles: ['admin', 'gestor'] },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userName = profile?.nome || 'Usuário';
  const userInitial = userName.charAt(0).toUpperCase();
  const roleLabel = role === 'admin' ? 'Admin' : role === 'gestor' ? 'Gestor' : role === 'supervisor' ? 'Supervisora' : role === 'representante' ? 'Representante' : '';
  const roleClass = role ? `role-${role}` : '';

  const navItems = allNavItems.filter(item => !role || item.roles.includes(role));

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

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 rounded text-sm font-medium transition-colors ${
      isActive
        ? 'bg-white/20 text-primary-foreground'
        : 'text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground'
    }`;

  return (
    <div className="min-h-screen bg-background">
      <header
        className="nav-header flex items-center justify-between px-4 sm:px-6 shadow-md"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          height: 'calc(3rem + env(safe-area-inset-top))',
        }}
      >
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-2 font-bold text-lg cursor-pointer shrink-0" onClick={() => navigate('/')}>
            <img src={logoThor} alt="THOR" className="h-7 w-7 rounded" />
            THOR
          </div>
          {isMobile ? (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <button
                  className="flex items-center justify-center min-h-[44px] min-w-[44px] -m-2 rounded text-primary-foreground hover:bg-white/10 transition-colors"
                  aria-label="Abrir menu"
                >
                  <Menu className="h-6 w-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full max-w-[280px] p-0 nav-header border-0 bg-primary">
                <nav
                  className="flex flex-col px-4 pb-4"
                  style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top))' }}
                >
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSheetOpen(false)}
                      className={({ isActive }) =>
                        `${navLinkClass({ isActive })} py-3 px-4 -mx-4 rounded-md`
                      }
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {item.label}
                    </NavLink>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          ) : (
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
          >
            <Avatar className="h-7 w-7 bg-white/20">
              <AvatarImage src={profile?.avatar_url || undefined} alt={userName} />
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
                onClick={() => { setMenuOpen(false); navigate('/meu-perfil'); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors text-left"
              >
                <User className="h-4 w-4" />
                Meu Perfil
              </button>
              <button
                onClick={() => { setMenuOpen(false); window.location.reload(); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar App
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
      <main className="p-4 sm:p-6">{children}</main>
    </div>
  );
}
