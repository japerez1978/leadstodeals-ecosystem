import { useQuery } from '@tanstack/react-query';
import { supabase } from '../api/supabaseClient.js'; // Con extensión .js

/**
 * Hook para obtener los permisos de aplicaciones de un usuario específico.
 * @param {number} tenantId - ID de la empresa (tenant).
 */
export function useUserAccess(tenantId) {
  return useQuery({
    queryKey: ['saas', 'access', tenantId],
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 minutos de caché
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_app_access')
        .select('app_slug')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return data?.map(a => a.app_slug) || [];
    }
  });
}
