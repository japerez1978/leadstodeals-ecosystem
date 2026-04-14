import { useQuery } from '@tanstack/react-query';
import { supabase } from '../api/supabaseClient.js'; // Con extensión .js

/**
 * Hook para obtener los permisos de aplicaciones de un usuario específico.
 * @param {number} tenantId - ID de la empresa (tenant).
 * @param {string} authUserId - UUID del usuario autenticado.
 */
export function useUserAccess(tenantId, authUserId) {
  return useQuery({
    queryKey: ['saas', 'access', tenantId, authUserId || 'any-user'],
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 minutos de caché
    queryFn: async () => {
      const accessQuery = supabase
        .from('user_app_access')
        .select('app_slug')
        .eq('tenant_id', tenantId);

      if (authUserId) {
        accessQuery.eq('auth_user_id', authUserId);
      }

      const [{ data: userAccessRows, error: accessError }, { data: tenantAppsRows, error: tenantAppsError }] = await Promise.all([
        accessQuery,
        supabase.from('tenant_apps').select('app_slug').eq('tenant_id', tenantId).eq('activa', true),
      ]);

      if (accessError) throw accessError;
      if (tenantAppsError) throw tenantAppsError;

      const allowedByTenant = new Set((tenantAppsRows || []).map((row) => row.app_slug));
      return (userAccessRows || [])
        .map((row) => row.app_slug)
        .filter((slug) => allowedByTenant.has(slug));
    }
  });
}
