import { useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCheck, Users, Upload } from 'lucide-react';
import SupervisoresTab from '@/components/configuracoes/SupervisoresTab';
import VinculosTab from '@/components/configuracoes/VinculosTab';
import ImportTab from '@/components/configuracoes/ImportTab';

export default function Configuracoes() {
  const { data: supervisores = [], isLoading: loadingSupervisores } = useQuery({
    queryKey: ['supervisores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('supervisores').select('*').order('nome');
      if (error) throw error;
      return data;
    },
  });

  const { data: representantes = [] } = useQuery({
    queryKey: ['representantes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('representantes').select('*').order('nome');
      if (error) throw error;
      return data;
    },
  });

  const { data: links = [] } = useQuery({
    queryKey: ['supervisor_representante'],
    queryFn: async () => {
      const { data, error } = await supabase.from('supervisor_representante').select('*');
      if (error) throw error;
      return data;
    },
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam === 'import' || tabParam === 'vinculos' ? tabParam : 'supervisores';

  const handleTabChange = (value: string) => {
    setSearchParams(value === 'supervisores' ? {} : { tab: value }, { replace: true });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList>
            <TabsTrigger value="supervisores" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Supervisores
            </TabsTrigger>
            <TabsTrigger value="vinculos" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Vínculos
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Importar
            </TabsTrigger>
          </TabsList>
          <TabsContent value="supervisores">
            <SupervisoresTab supervisores={supervisores} isLoading={loadingSupervisores} />
          </TabsContent>
          <TabsContent value="vinculos">
            <VinculosTab supervisores={supervisores} representantes={representantes} links={links} />
          </TabsContent>
          <TabsContent value="import">
            <ImportTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
