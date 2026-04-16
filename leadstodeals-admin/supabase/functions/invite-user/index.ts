import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendInviteEmail({
  to,
  tenantName,
  inviteLink,
  appNames,
}: {
  to: string
  tenantName: string
  inviteLink: string
  appNames: string[]
}) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.warn('[invite-user] RESEND_API_KEY no configurado, saltando email branded')
    return
  }

  const appsHtml = appNames.length > 0
    ? `<p style="color:#6b7280;font-size:14px;margin:0 0 24px">Tendrás acceso a: <strong>${appNames.join(', ')}</strong></p>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e1e2e 0%,#2d2d44 100%);padding:32px 40px;text-align:center">
            <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">L2D</div>
            <div style="font-size:13px;color:#9ca3af;margin-top:4px;letter-spacing:2px;text-transform:uppercase">LeadsToDeals</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px">
            <h2 style="margin:0 0 8px;font-size:22px;color:#111827">¡Bienvenido/a a ${tenantName}!</h2>
            <p style="color:#6b7280;font-size:15px;margin:0 0 24px;line-height:1.6">
              Has sido invitado/a a acceder al portal de <strong>${tenantName}</strong>.
              Haz clic en el botón para crear tu contraseña y empezar.
            </p>
            ${appsHtml}
            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:8px 0 32px">
                  <a href="${inviteLink}"
                     style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;letter-spacing:0.3px">
                    Crear contraseña y acceder →
                  </a>
                </td>
              </tr>
            </table>
            <p style="color:#9ca3af;font-size:12px;margin:0;border-top:1px solid #f3f4f6;padding-top:24px">
              Si no esperabas esta invitación, puedes ignorar este correo.<br>
              El enlace expira en 24 horas.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;text-align:center">
            <p style="margin:0;color:#9ca3af;font-size:12px">LeadsToDeals · Plataforma SaaS</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'LeadsToDeals <onboarding@resend.dev>',
      to: [to],
      subject: `Invitación a ${tenantName} — LeadsToDeals`,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[invite-user] Resend error:', err)
  } else {
    console.log('[invite-user] Email enviado via Resend a', to)
  }
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Obtener nombre de la empresa
    const { data: tenantRow } = await supabaseAdmin
      .from('tenants')
      .select('nombre')
      .eq('id', Number(tenant_id))
      .single()
    const tenantName = tenantRow?.nombre || 'tu empresa'

    // Obtener nombres de las apps
    let appNames: string[] = []
    if (app_slugs.length > 0) {
      const { data: appsData } = await supabaseAdmin
        .from('apps')
        .select('name, slug')
        .in('slug', app_slugs)
      appNames = (appsData || []).map((a: any) => a.name)
    }

    // Comprobar si el usuario ya existe en auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email)

    let auth_user_id: string

    if (existingUser) {
      auth_user_id = existingUser.id
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          redirectTo: Deno.env.get('INVITE_REDIRECT_URL') || 'https://leadtodealsadmin.netlify.app',
        }
      })
      if (!linkErr && linkData?.properties?.action_link) {
        await sendInviteEmail({ to: email, tenantName, inviteLink: linkData.properties.action_link, appNames })
      }
    } else {
      const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          redirectTo: Deno.env.get('INVITE_REDIRECT_URL') || 'https://leadtodealsadmin.netlify.app',
        }
      })
      if (inviteErr) throw inviteErr
      auth_user_id = inviteData.user.id
      await sendInviteEmail({ to: email, tenantName, inviteLink: inviteData.properties.action_link, appNames })
    }

    // Comprobar si ya existe en tenant_users para este tenant
    const { data: existingTU } = await supabaseAdmin
      .from('tenant_users')
      .select('id')
      .eq('auth_user_id', auth_user_id)
      .eq('tenant_id', Number(tenant_id))
      .maybeSingle()

    if (existingTU) {
      return new Response(JSON.stringify({ ok: true, user_id: auth_user_id, note: 'Usuario ya existía, se reenvió la invitación' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Crear fila en tenant_users
    const { data: tuData, error: tuErr } = await supabaseAdmin.from('tenant_users').insert({
      auth_user_id,
      tenant_id: Number(tenant_id),
      email,
      rol: rol || 'user',
    }).select('id').single()
    if (tuErr) throw tuErr

    // Crear accesos a apps
    if (app_slugs.length > 0) {
      const accessRows = app_slugs.map((slug: string) => ({
        auth_user_id,
        tenant_user_id: tuData.id,
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
