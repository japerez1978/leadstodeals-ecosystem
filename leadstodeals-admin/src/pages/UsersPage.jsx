import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, useApps } from 'core-saas' // Hooks e instancia del Core
import { Plus, Trash2, X, Shield, AppWindow } from 'lucide-react'

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState(null)
  const [accessModal, setAccessModal] = useState(null)
  const [form, setForm] = useState({ email: '', tenant_id: '', rol: 'user', app_slugs: [] })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [toggling, setToggling] = useState(null)

  // 1. CARGA DE DATOS INDUSTRIAL (React Query)
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['saas', 'users'],
    queryFn: async () => {
      const { data } = await supabase.from('tenant_users').select('*').order('created_at', { ascending: false });
      return data || [];
    }
  })

  const { data: tenants = [] } = useQuery({
    queryKey: ['saas', 'tenants'],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('*').order('nombre');
      return data || [];
    }
  })

  const { data: tenantApps = [] } = useQuery({
    queryKey: ['saas', 'tenant_apps'],
    queryFn: async () => {
      const { data } = await supabase.from('tenant_apps').select('*');
      return data || [];
    }
  })

  const { data: apps = [] } = useApps() // Usamos el hook centralizado

  const { data: allAccess = [] } = useQuery({
    queryKey: ['saas', 'all_access'],
    queryFn: async () => {
      const { data } = await supabase.from('user_app_access').select('*');
      return data || [];
    }
  })

  // Helpers
  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const tenantName = (id) => tenants.find(t => Number(t.id) === Number(id))?.nombre || '—'
  const getUserApps = (authUserUuid) => allAccess.filter(a => a.auth_user_id === authUserUuid)
  const tenantHasApp = (tenantId, appSlug) =>
    tenantApps.some((a) =>
      Number(a.tenant_id) === Number(tenantId)
      && a.app_slug === appSlug
      && a.activa === true
    )

  // ACCIONES
  async function handleInviteUser() {
    if (!form.email || !form.tenant_id) return
    setSaving(true)

    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: form.email,
          tenant_id: parseInt(form.tenant_id),
          rol: form.rol,
          app_slugs: form.app_slugs,
        }
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      showToast('✅ Invitación enviada a ' + form.email)
      queryClient.invalidateQueries({ queryKey: ['saas', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['saas', 'all_access'] })
      setModal(null)
    } catch (err) {
      showToast('❌ Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteUser(u) {
    if (!confirm(`¿Eliminar al usuario ${u.email}?`)) return
    try {
      if (u.auth_user_id) {
        await supabase
          .from('user_app_access')
          .delete()
          .eq('auth_user_id', u.auth_user_id)
          .eq('tenant_id', u.tenant_id)
      } else {
        // Fallback para posibles registros legacy.
        await supabase.from('user_app_access').delete().eq('tenant_user_id', u.id)
      }
      await supabase.from('tenant_users').delete().eq('id', u.id)
      showToast('✅ Usuario eliminado')
      queryClient.invalidateQueries({ queryKey: ['saas'] })
    } catch (err) {
      showToast('❌ Error al eliminar')
    }
  }

  async function toggleAppAccess(authUserUuid, appSlug, tenantId) {
    if (!authUserUuid) {
      alert('⚠️ Este usuario no tiene una cuenta de autenticación vinculada (Auth ID missing). Invítalo o créalo con contraseña para poder asignarle Apps.');
      setToggling(null);
      return;
    }

    setToggling(appSlug)
    if (!tenantHasApp(tenantId, appSlug)) {
      showToast('⚠️ Esta app no está contratada o activa para este tenant')
      setToggling(null)
      return
    }

    const existing = allAccess.find(a => a.auth_user_id === authUserUuid && a.app_slug === appSlug)
    const tenantUser = users.find(u => u.auth_user_id === authUserUuid && Number(u.tenant_id) === Number(tenantId))

    try {
      if (existing) {
        await supabase.from('user_app_access').delete().eq('id', existing.id)
      } else {
        await supabase.from('user_app_access').insert([{
          auth_user_id: authUserUuid,
          tenant_user_id: tenantUser?.id || null,
          app_slug: appSlug,
          tenant_id: tenantId
        }])
      }
      // INVALIDACIÓN MAGICA: Refresca el cache de acceso en todo el sistema
      await queryClient.invalidateQueries({ queryKey: ['saas', 'all_access'] })
      showToast('✅ Permisos actualizados')
    } catch (err) {
      console.error('Toggle error:', err)
      alert('Error al gestionar acceso: ' + err.message)
    } finally {
      setToggling(null)
    }
  }

  if (loadingUsers) return <div className="empty-state"><div className="empty-state-icon">⏳</div><p>Cargando usuarios...</p></div>

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Usuarios</h1>
          <p>Gestiona el acceso multi-tenant de tu equipo</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ email: '', password: '', tenant_id: '', rol: 'user' }); setModal('new') }}>
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3>Usuarios registrados</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Caché de seguridad activo</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Empresa</th>
              <th>Rol</th>
              <th>Apps con acceso</th>
              <th style={{ width: 120 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan="5"><div className="empty-state"><h3>Sin usuarios</h3></div></td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.email}</td>
                <td><span className="badge badge-info">{tenantName(u.tenant_id)}</span></td>
                <td>
                  <span className={`badge ${u.rol === 'superadmin' ? 'badge-accent' : u.rol === 'admin' ? 'badge-success' : 'badge-info'}`}>
                    {u.rol}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {getUserApps(u.auth_user_id).length === 0 ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Sin acceso</span>
                    ) : (
                      getUserApps(u.auth_user_id).map(a => {
                        const appInfo = apps.find(app => app.slug === a.app_slug)
                        return (
                          <span key={a.app_slug} className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {appInfo?.icon && <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{appInfo.icon}</span>}
                            {appInfo?.name || a.app_slug}
                          </span>
                        )
                      })
                    )}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setAccessModal(u)} title="Gestionar acceso">
                      <AppWindow size={14} />
                    </button>
                    {u.rol !== 'superadmin' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteUser(u)} style={{ color: 'var(--danger)' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite User Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✉️ Invitar usuario</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                Se enviará un email con un enlace para que el usuario cree su contraseña.
              </p>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="usuario@empresa.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Empresa</label>
                <select className="form-select" value={form.tenant_id} onChange={e => setForm({ ...form, tenant_id: e.target.value, app_slugs: [] })}>
                  <option value="">— Selecciona empresa —</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Rol</label>
                <select className="form-select" value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {form.tenant_id && (
                <div className="form-group">
                  <label className="form-label">Apps con acceso</label>
                  {apps.filter(app => tenantHasApp(form.tenant_id, app.slug)).length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Esta empresa no tiene apps contratadas.</p>
                  ) : (
                    apps.filter(app => tenantHasApp(form.tenant_id, app.slug)).map(app => {
                      const checked = form.app_slugs.includes(app.slug)
                      return (
                        <label key={app.slug} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setForm(f => ({
                              ...f,
                              app_slugs: checked
                                ? f.app_slugs.filter(s => s !== app.slug)
                                : [...f.app_slugs, app.slug]
                            }))}
                          />
                          <span>{app.icon} {app.name}</span>
                        </label>
                      )
                    })
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleInviteUser} disabled={saving || !form.email || !form.tenant_id}>
                {saving ? 'Enviando...' : '✉️ Enviar invitación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App Access Modal */}
      {accessModal && (
        <div className="modal-overlay" onClick={() => setAccessModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔐 Acceso a Apps — {accessModal.email}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setAccessModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Empresa: <strong>{tenantName(accessModal.tenant_id)}</strong>
              </p>
              {apps.map(app => {
                const hasAccess = allAccess.some(a => a.auth_user_id === accessModal.auth_user_id && a.app_slug === app.slug)
                const contracted = tenantHasApp(accessModal.tenant_id, app.slug)
                return (
                  <div key={app.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', background: hasAccess ? 'rgba(34,197,94,0.05)' : 'var(--bg-primary)',
                    borderRadius: 'var(--radius-sm)', marginBottom: 8, border: `1px solid ${hasAccess ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="material-symbols-outlined" style={{ opacity: 0.5 }}>{app.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{app.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {app.slug}</div>
                      </div>
                    </div>
                    <button
                      className={`btn ${hasAccess ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                      onClick={() => toggleAppAccess(accessModal.auth_user_id, app.slug, accessModal.tenant_id)}
                      disabled={toggling === app.slug || !contracted}
                      style={hasAccess ? { color: 'var(--danger)' } : {}}
                    >
                      {toggling === app.slug ? '...' : !contracted ? 'No contratada' : hasAccess ? 'Quitar' : 'Asignar'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
