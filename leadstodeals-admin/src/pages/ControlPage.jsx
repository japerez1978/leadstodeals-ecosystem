import { useQuery } from '@tanstack/react-query'
import { supabase } from 'core-saas'
import { useState } from 'react'

export default function ControlPage() {
  const [filter, setFilter] = useState('')

  const { data: tenants = [] } = useQuery({
    queryKey: ['saas', 'tenants'],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('*').order('nombre')
      return data || []
    }
  })

  const { data: tenantApps = [] } = useQuery({
    queryKey: ['saas', 'tenant_apps'],
    queryFn: async () => {
      const { data } = await supabase.from('tenant_apps').select('*')
      return data || []
    }
  })

  const { data: users = [] } = useQuery({
    queryKey: ['saas', 'users'],
    queryFn: async () => {
      const { data } = await supabase.from('tenant_users').select('*')
      return data || []
    }
  })

  const { data: allAccess = [] } = useQuery({
    queryKey: ['saas', 'all_access'],
    queryFn: async () => {
      const { data } = await supabase.from('user_app_access').select('*')
      return data || []
    }
  })

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['saas', 'subscriptions'],
    queryFn: async () => {
      const { data } = await supabase.from('subscriptions').select('*')
      return data || []
    }
  })

  const filtered = tenants.filter(t =>
    !filter || t.nombre.toLowerCase().includes(filter.toLowerCase())
  )

  function getTenantApps(tenantId) {
    return tenantApps.filter(a => Number(a.tenant_id) === Number(tenantId))
  }

  function getTenantUsers(tenantId) {
    return users.filter(u => Number(u.tenant_id) === Number(tenantId))
  }

  function getUserApps(authUserId) {
    return allAccess.filter(a => a.auth_user_id === authUserId).map(a => a.app_slug)
  }

  function getSubscription(tenantId, appSlug) {
    return subscriptions.find(s => Number(s.tenant_id) === Number(tenantId) && s.app_slug === appSlug)
  }

  function subStatus(tenantId, appSlug) {
    const sub = getSubscription(tenantId, appSlug)
    if (!sub) return null
    return sub.estado // 'active', 'canceled', 'past_due', etc.
  }

  const statusColor = {
    active: 'badge-success',
    canceled: 'badge-warning',
    past_due: 'badge-accent',
    trialing: 'badge-info',
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Control Central</h1>
          <p>Vista completa: empresas → apps → usuarios</p>
        </div>
        <input
          className="form-input"
          style={{ width: 240 }}
          placeholder="Filtrar empresa..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🏢</div>
            <p>No hay empresas</p>
          </div>
        )}
        {filtered.map(tenant => {
          const apps = getTenantApps(tenant.id)
          const tenantUsers = getTenantUsers(tenant.id)

          return (
            <div key={tenant.id} className="table-container" style={{ marginBottom: 0 }}>
              {/* Header empresa */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-secondary)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                    background: 'var(--accent)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 14
                  }}>
                    {tenant.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{tenant.nombre}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      <code>{tenant.subdominio}</code>
                      {tenant.stripe_customer_id && <span style={{ marginLeft: 8 }}>· Stripe ✓</span>}
                      {tenant.hubspot_access_token && <span style={{ marginLeft: 8 }}>· HubSpot ✓</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {tenantUsers.length} usuario{tenantUsers.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>·</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {apps.filter(a => a.activa).length} app{apps.filter(a => a.activa).length !== 1 ? 's' : ''} activa{apps.filter(a => a.activa).length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Apps contratadas */}
              {apps.length === 0 ? (
                <div style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-muted)' }}>
                  Sin apps contratadas
                </div>
              ) : (
                <div style={{ padding: '12px 20px', display: 'flex', flexWrap: 'wrap', gap: 8, borderBottom: tenantUsers.length > 0 ? '1px solid var(--border)' : 'none' }}>
                  {apps.map(a => {
                    const estado = subStatus(tenant.id, a.app_slug)
                    return (
                      <div key={a.app_slug} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '4px 10px',
                        background: a.activa ? 'rgba(34,197,94,0.07)' : 'var(--bg-primary)',
                        border: `1px solid ${a.activa ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)', fontSize: 12
                      }}>
                        <span style={{ fontWeight: 600 }}>{a.app_slug}</span>
                        <span className={`badge ${a.activa ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                          {a.activa ? 'activa' : 'inactiva'}
                        </span>
                        {estado && (
                          <span className={`badge ${statusColor[estado] || 'badge-info'}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                            {estado}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Usuarios */}
              {tenantUsers.length > 0 && (
                <div style={{ padding: '0' }}>
                  <table style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ paddingLeft: 20 }}>Usuario</th>
                        <th>Rol</th>
                        <th>Apps con acceso</th>
                        <th>Auth ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenantUsers.map(u => {
                        const userApps = getUserApps(u.auth_user_id)
                        return (
                          <tr key={u.id}>
                            <td style={{ paddingLeft: 20, fontSize: 13 }}>{u.email}</td>
                            <td>
                              <span className={`badge ${u.rol === 'admin' ? 'badge-success' : 'badge-info'}`} style={{ fontSize: 11 }}>
                                {u.rol}
                              </span>
                            </td>
                            <td>
                              {userApps.length === 0 ? (
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin acceso</span>
                              ) : (
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {userApps.map(slug => {
                                    const appActive = apps.find(a => a.app_slug === slug)?.activa
                                    return (
                                      <span key={slug} className={`badge ${appActive ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 11 }}>
                                        {slug}
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                            </td>
                            <td>
                              {u.auth_user_id ? (
                                <code style={{ fontSize: 10, color: 'var(--text-muted)' }}>{u.auth_user_id.slice(0, 8)}…</code>
                              ) : (
                                <span className="badge badge-accent" style={{ fontSize: 10 }}>sin auth</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
