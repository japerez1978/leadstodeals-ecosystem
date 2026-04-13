import { useQuery } from '@tanstack/react-query';
import { supabase } from '../api/supabaseClient.js'; // Con extensión .js

/**
 * Hook para obtener el catálogo de aplicaciones disponibles en el ecosistema.
 */
export function useApps() {
  return useQuery({
    queryKey: ['saas', 'apps_catalog'],
    staleTime: 1000 * 60 * 60, // 1 hora de caché
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .order('id');

      if (error) throw error;
      return data || [];
    }
  });
}
