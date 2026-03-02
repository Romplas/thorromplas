import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, FileText, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import loginBg from '@/assets/login-bg.jpg';

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'entrar' | 'cadastrar'>('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: integrate with Supabase auth
    navigate('/');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - image + branding */}
      <div className="hidden lg:flex lg:w-1/2 relative items-end p-12">
        <img
          src={loginBg}
          alt="Business professional"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="relative z-10 text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">THOR</h2>
              <p className="text-sm text-white/80">Gerenciador de Chamados</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-6">
            Sistema completo para gestão de solicitações
          </h1>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-white/80" />
              <div>
                <p className="font-semibold text-sm">Chamados organizados</p>
                <p className="text-xs text-white/70">Crie, acompanhe e gerencie solicitações</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-white/80" />
              <div>
                <p className="font-semibold text-sm">Controle de acesso</p>
                <p className="text-xs text-white/70">Representantes, supervisores e admin</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - login form */}
      <div className="flex-1 flex items-center justify-center bg-muted/30 p-8">
        <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">Bem-vindo</h2>
            <p className="text-sm text-muted-foreground">Entre ou crie sua conta para continuar</p>
          </div>

          <div className="flex mb-6 border rounded-lg overflow-hidden">
            <button
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === 'entrar' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
              onClick={() => setTab('entrar')}
            >
              Entrar
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === 'cadastrar' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
              onClick={() => setTab('cadastrar')}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              {tab === 'entrar' ? 'Entrar' : 'Cadastrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
