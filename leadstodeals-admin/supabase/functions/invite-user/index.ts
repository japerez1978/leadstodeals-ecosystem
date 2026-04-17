import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendInviteEmail({ to, tenantName, inviteLink, appNames }: {
  to: string; tenantName: string; inviteLink: string; appNames: string[]
}) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) { console.warn('[resend] no key'); return }

  const appsHtml = appNames.length > 0
    ? `<p style="color:#6b7280;font-size:14px;margin:0 0 24px">Tendrás acceso a: <strong>${appNames.join(', ')}</strong></p>`
    : ''

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f9fafb;font-family:sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
        <tr><td style="background:#1e1e2e;padding:32px 40px;text-align:center">
          <div style="font-size:28px;font-weight:800;color:#fff">L2D</div>
          <div style="font-size:13px;color:#9ca3af;letter-spacing:2px">LEADSTODEALS</div>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 8px;color:#111827">¡Bienvenido/a a ${tenantName}!</h2>
          <p style="color:#6b7280;margin:0 0 24px">Has sido invitado/a al portal de <strong>${tenantName}</strong>.</p>
          ${appsHtml}
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td align="center" style="padding:8px 0 32px">
              <a href="${inviteLink}" style="background:#6366f1;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;display:inline-block">Acceder al portal →</a>
            </td>
          </tr></table>
          <p style="color:#9ca3af;font-size:12px;border-top:1px solid #f3f4f6;padding-top:24px">El enlace expira en 24 horas.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px">LeadsToDeals · noreply@leadstodeals.es</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  console.log('[resend] sending to:', to)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'LeadsToDeals <noreply@leadstodeals.es>',
      to: [to],
      subject: `Invitación a ${tenantName} — LeadsToDeals`,
      html,
    }),
  })
  const body = await res.text()
  console.log('[resend] status:', res.status, 'body:', body)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, tenant_id, rol, app_slugs = [] } = await req.json()
    if (!email || !tenant_id) return new Response(JSON.stringify({ error: 'email y tenant_id son requeridos' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: tenantRow } = await supabaseAdmin.from('tenants').select('nombre').eq('id', Number(tenant_id)).single()
    const tenantName = tenantRow?.nombre || 'tu empresa'

    let appNames: string[] = []
    if (app_slugs.length > 0) {
      const { data: appsData } = await supabaseAdmin.from('apps').select('name,slug').in('slug', app_slugs)
      appNames = (appsData || []).map((a: any) => a.name)
    }

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email)
    console.log('[invite] existingUser:', !!existingUser, 'email:', email)

    let auth_user_id: string

    if (existingUser) {
      auth_user_id = existingUser.id
      // Usuario ya confirmado: usar magiclink
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: Deno.env.get('INVITE_REDIRECT_URL') || 'https://leadtodealsadmin.netlify.app' }
      })
      console.log('[invite] magiclink error:', linkErr?.message, 'hasLink:', !!linkData?.properties?.action_link)
      const link = linkData?.properties?.action_link
      if (link) await sendInviteEmail({ to: email, tenantName, inviteLink: link, appNames })
    } else {
      // Usuario nuevo: usar invite
      const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: { redirectTo: Deno.env.get('INVITE_REDIRECT_URL') || 'https://leadtodealsadmin.netlify.app' }
      })
      if (inviteErr) throw inviteErr
      auth_user_id = inviteData.user.id
      await sendInviteEmail({ to: email, tenantName, inviteLink: inviteData.properties.action_link, appNames })
    }

    const { data: existingTU } = await supabaseAdmin.from('tenant_users').select('id')
      .eq('auth_user_id', auth_user_id).eq('tenant_id', Number(tenant_id)).maybeSingle()

    if (existingTU) return new Response(JSON.stringify({ ok: true, user_id: auth_user_id, note: 'ya existía' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

    const { data: tuData, error: tuErr } = await supabaseAdmin.from('tenant_users').insert({
      auth_user_id, tenant_id: Number(tenant_id), email, rol: rol || 'user',
    }).select('id').single()
    if (tuErr) throw tuErr

    if (app_slugs.length > 0) {
      const accessRows = app_slugs.map((slug: string) => ({
        auth_user_id, tenant_user_id: tuData.id, tenant_id: Number(tenant_id), app_slug: slug,
      }))
      const { error: accessErr } = await supabaseAdmin.from('user_app_access').insert(accessRows)
      if (accessErr) throw accessErr
    }

    return new Response(JSON.stringify({ ok: true, user_id: auth_user_id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('[invite] error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
