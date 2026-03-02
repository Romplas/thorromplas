import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, FileText, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';


export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<'entrar' | 'cadastrar'>('entrar');
  const [usuario, setUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !senha) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      // Buscar email pelo username
      const { data: emailResult, error: lookupError } = await supabase.rpc('get_email_by_username', {
        _username: usuario
      });

      if (lookupError || !emailResult) {
        toast({ title: 'Usuário não encontrado', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: emailResult as string,
        password: senha
      });

      if (error) {
        toast({ title: 'Credenciais inválidas', description: error.message, variant: 'destructive' });
      } else {
        navigate('/');
      }
    } catch {
      toast({ title: 'Erro ao fazer login', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !usuario || !senha) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          emailRedirectTo: window.location.origin,
          data: { nome, usuario }
        }
      });

      if (error) {
        toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Conta criada!', description: 'Verifique seu email para confirmar.' });
        setTab('entrar');
      }
    } catch {
      toast({ title: 'Erro ao cadastrar', variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - image + branding */}
      <div className="hidden lg:flex lg:w-1/2 relative items-end p-12 bg-primary/10">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-primary/10 to-transparent" />
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
          <h1 className="text-2xl font-bold mb-6">Sistema completo para gestão de solicitações</h1>
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
              tab === 'entrar' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`
              }
              onClick={() => setTab('entrar')}>
              
              Entrar
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'cadastrar' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`
              }
              onClick={() => setTab('cadastrar')}>
              
              Cadastrar
            </button>
          </div>

          {tab === 'entrar' ?
          <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="usuario">Usuário</Label>
                <Input
                id="usuario"
                placeholder="seu.usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)} />
              
              </div>
              <div>
                <Label htmlFor="senha">Senha</Label>
                <Input
                id="senha"
                type="password"
                placeholder="••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)} />
              
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form> :

          <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="signup-usuario">Usuário</Label>
                <Input id="signup-usuario" placeholder="seu.usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="signup-senha">Senha</Label>
                <Input id="signup-senha" type="password" placeholder="••••••" value={senha} onChange={(e) => setSenha(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Cadastrando...' : 'Cadastrar'}
              </Button>
            </form>
          }
        </div>
      </div>
    </div>);

}