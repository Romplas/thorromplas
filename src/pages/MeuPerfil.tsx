import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Camera, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { toast } from 'sonner';

export default function MeuPerfil() {
  const navigate = useNavigate();
  const { profile, user, role, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [supervisores, setSupervisores] = useState<{ id: string; nome: string }[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    usuario: '',
    telefone: '',
    supervisora: '',
  });

  useEffect(() => {
    const load = async () => {
      if (!profile) return;
      setFormData({
        nome: profile.nome || '',
        email: profile.email || '',
        usuario: profile.usuario || '',
        telefone: profile.telefone || '',
        supervisora: profile.supervisora || '',
      });
      const { data: sups } = await supabase.from('supervisores').select('id, nome').eq('status', 'ativo').order('nome');
      setSupervisores(sups || []);
      setLoading(false);
    };
    load();
  }, [profile]);

  const avatarUrl = profile?.avatar_url || null;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || !profile?.id) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      toast.error('Formato inválido. Use JPG, PNG, GIF ou WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2 MB.');
      return;
    }
    setUploadingPhoto(true);
    try {
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('user_id', user.id);
      if (updateError) throw updateError;
      await refreshProfile();
      toast.success('Foto atualizada com sucesso');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar foto');
    }
    setUploadingPhoto(false);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!user?.id || !profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nome: formData.nome,
          email: formData.email,
          usuario: formData.usuario || null,
          telefone: formData.telefone || null,
          supervisora: formData.supervisora || null,
        })
        .eq('user_id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Dados atualizados com sucesso');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
    setSaving(false);
  };

  if (loading || !profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[300px]">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </Layout>
    );
  }

  const userName = profile.nome || 'Usuário';
  const userInitial = userName.charAt(0).toUpperCase();
  const roleLabel = role === 'admin' ? 'Admin' : role === 'gestor' ? 'Gestor' : role === 'supervisor' ? 'Supervisora' : role === 'representante' ? 'Representante' : '';

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="touch-target shrink-0" onClick={() => navigate(-1)} title="Voltar">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <User className="h-8 w-8 text-primary" />
          <div>
              <h1 className="text-xl font-bold">Meu Perfil</h1>
              <p className="text-sm text-muted-foreground">Gerencie seus dados e foto de perfil</p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4 sm:p-6 space-y-6">
          {/* Foto do perfil */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl || undefined} alt={userName} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">{userInitial}</AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {uploadingPhoto ? 'Enviando...' : 'Clique no ícone para alterar a foto (máx. 2 MB)'}
            </p>
          </div>

          {/* Dados cadastrais */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados cadastrais</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usuario">Usuário (login)</Label>
                <Input
                  id="usuario"
                  value={formData.usuario}
                  onChange={(e) => setFormData((p) => ({ ...p, usuario: e.target.value }))}
                  placeholder="seu.usuario"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData((p) => ({ ...p, telefone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
              {role === 'representante' && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Supervisora</Label>
                  <Select
                    value={formData.supervisora || 'none'}
                    onValueChange={(val) => setFormData((p) => ({ ...p, supervisora: val === 'none' ? '' : val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a supervisora" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {supervisores.map((s) => (
                        <SelectItem key={s.id} value={s.nome}>
                          {s.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Info somente leitura */}
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Tipo:</span>
              {roleLabel && (
                <span className={`status-badge role-${role}`}>{roleLabel}</span>
              )}
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
