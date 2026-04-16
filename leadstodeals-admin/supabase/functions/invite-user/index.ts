import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, tenant_id, rol, app_slugs = [] } = await req.json()

    if (!email || !tenant_id) {
      return new Response(JSON.stringify({ error: 'email y tenant_id son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Cliente admin con service_role (solo disponible en Edge Functions)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Enviar invitación — Supabase envía el email con el link
    const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: Deno.env.get('INVITE_REDIRECT_URL') || 'https://app.leadstodeals.com',
    })
    if (inviteErr) throw inviteErr

    const auth_user_id = inviteData.user.id

    // 2. Crear fila en tenant_users (ya con auth_user_id, no hace falta auto-vinculación)
    const { error: tuErr } = await supabaseAdmin.from('tenant_users').insert({
      auth_user_id,
      tenant_id: Number(tenant_id),
      email,
      rol: rol || 'user',
    })
    if (tuErr) throw tuErr

    // 3. Crear accesos a apps si se especificaron
    if (app_slugs.length > 0) {
      const accessRows = app_slugs.map((slug: string) => ({
        auth_user_id,
        tenant_id: Number(tenant_id),
        app_slug: slug,
      }))
      const { error: accessErr } = await supabaseAdmin.from('user_app_access').insert(accessRows)
      if (accessErr) throw accessErr
    }

    return new Response(JSON.stringify({ ok: true, user_id: auth_user_id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
