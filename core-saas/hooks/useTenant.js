import { useQuery } from '@tanstack/react-query';
import { supabase } from '../api/supabaseClient.js'; // Con extensión .js

/**
 * Hook para obtener la información del Tenant (empresa) y el rol del usuario actual.
 * Incluye lógica de auto-vinculación por email si es necesario.
 */
export function useTenant(userId, userEmail) {
  return useQuery({
    queryKey: ['saas', 'tenant', userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 30, // 30 minutos de caché
    queryFn: async () => {
      // 1. Intentar buscar por auth_user_id (usuario ya vinculado)
      let { data, error } = await supabase
        .from('tenant_users')
        .select(`
          id,
          tenant_id,
          rol,
          tenants (
            id,
            nombre,
            subdominio,
            plan
          )
        `)
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (error) throw error;

      // 2. Si no hay vínculo pero tenemos email, intentamos auto-vinculación
      if (!data && userEmail) {
        console.log('CoreSaaS: Buscando invitación para', userEmail);
        const { data: invite, error: inviteErr } = await supabase
          .from('tenant_users')
          .select('id, tenant_id, rol')
          .eq('email', userEmail)
          .is('auth_user_id', null)
          .maybeSingle();

        if (inviteErr) console.warn('CoreSaaS: Invite lookup error:', inviteErr);

        if (invite) {
          console.log('CoreSaaS: Vinculando usuario...');
          const { error: updateErr } = await supabase
            .from('tenant_users')
            .update({ auth_user_id: userId })
            .eq('id', invite.id);

          if (!updateErr) {
            // Re-reintentamos la carga tras vincular
            const { data: linkedData } = await supabase
              .from('tenant_users')
              .select('id, tenant_id, rol, tenants(id, nombre, subdominio, plan)')
              .eq('id', invite.id)
              .single();
            return linkedData;
          }
        }
      }

      return data || null;
    }
  });
}
