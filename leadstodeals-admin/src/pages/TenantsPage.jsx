import { useState, useEffect } from 'react'
import { supabase } from 'core-saas'
import { Plus, Edit2, Trash2, X, AppWindow } from 'lucide-react'

export default function TenantsPage() {
  const [tenants, setTenants] = useState([])
  const [tenantApps, setTenantApps] = useState([])
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'new' | tenant object
  const [appsModal, setAppsModal] = useState(null) // tenant object
  const [form, setForm] = useState({ nombre: '', subdominio: '' })
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [tRes, taRes, cRes] = await Promise.all([
      supabase.from('tenants').select('*').order('id'),
      supabase.from('tenant_apps').select('*'),
      supabase.from('apps').select('*').order('name'),
    ])
    setTenants(tRes.data || [])
    setTenantApps(taRes.data || [])
    setCatalog(cRes.data || [])
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const getApps = (tenantId) => tenantApps.filter(a => a.tenant_id === tenantId)

  async function toggleTenantApp(tenant, appSlug) {
    setToggling(appSlug)
    const existing = tenantApps.find(a => a.tenant_id === tenant.id && a.app_slug === appSlug)
    try {
      if (existing) {
        await supabase.from('tenant_apps').update({ activa: !existing.activa }).eq('id', existing.id)
      } else {
        await supabase.from('tenant_apps').insert({ tenant_id: tenant.id, app_slug: appSlug, activa: true })
      }
      // Refresh only tenant_apps to keep modal open
      const { data } = await supabase.from('tenant_apps').select('*')
      setTenantApps(data || [])
      showToast('✅ Acceso actualizado')
    } catch (err) {
      showToast('❌ Error: ' + err.message)
    } finally {
      setToggling(null)
    }
  }

  function openNew() {
    setForm({ nombre: '', subdominio: '', hubspot_access_token: '' })
    setModal('new')
  }

  function openEdit(t) {
    setForm({ nombre: t.nombre, subdominio: t.subdominio || '', hubspot_access_token: t.hubspot_access_token || '' })
    setModal(t)
  }

  async function handleSave() {
    if (!form.nombre.trim()) return
    setSaving(true)
    const payload = {
      nombre: form.nombre,
      subdominio: form.subdominio || form.nombre.toLowerCase().replace(/\s+/g, '-'),
      ...(form.hubspot_access_token ? { hubspot_access_token: form.hubspot_access_token } : {}),
    }
    if (modal === 'new') {
      const { error } = await supabase.from('tenants').insert(payload)
      if (error) showToast('❌ Error: ' + error.message)
      else showToast('✅ Empresa creada')
    } else {
      const { error } = await supabase.from('tenants').update(payload).eq('id', modal.id)
      if (error) showToast('❌ Error: ' + error.message)
      else showToast('✅ Empresa actualizada')
    }
    setSaving(false)
    setModal(null)
    loadData()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta empresa? Esto eliminará todos sus datos.')) return
    const { error } = await supabase.from('tenants').delete().eq('id', id)
    if (error) showToast('❌ ' + error.message)
    else { showToast('✅ Empresa eliminada'); loadData() }
  }

  if (loading) return <div className="empty-state"><div className="empty-state-icon">⏳</div><p>Cargando...</p></div>

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Empresas</h1>
          <p>Gestiona los tenants de tu plataforma</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Nueva empresa</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Subdominio</th>
              <th>Apps contratadas</th>
              <th>Stripe</th>
              <th style={{ width: 100 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 ? (
              <tr><td colSpan="6"><div className="empty-state"><div className="empty-state-icon">🏢</div><h3>Sin empresas</h3><p>Crea tu primera empresa</p></div></td></tr>
            ) : tenants.map(t => (
              <tr key={t.id}>
                <td style={{ color: 'var(--text-muted)' }}>#{t.id}</td>
                <td style={{ fontWeight: 600 }}>{t.nombre}</td>
                <td><span className="badge badge-accent">{t.subdominio}</span></td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {getApps(t.id).length === 0
                      ? <span style={{ color: 'var(--text-muted)' }}>—</span>
                      : getApps(t.id).map(a => (
                        <span key={a.app_slug} className={`badge ${a.activa ? 'badge-success' : 'badge-warning'}`}>
                          {a.app_slug === 'ofertas_hubspot' ? '📊 Ofertas' : a.app_slug === 'sat_gestion' ? '🔧 SAT' : a.app_slug === 'ltd_score' ? '📈 Score' : a.app_slug}
                        </span>
                      ))
                    }
                  </div>
                </td>
                <td>{t.stripe_customer_id ? <span className="badge badge-success">✓</span> : <span className="badge badge-warning">—</span>}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setAppsModal(t)} title="Gestionar apps"><AppWindow size={14} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)} title="Editar"><Edit2 size={14} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(t.id)} title="Eliminar" style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal === 'new' ? '➕ Nueva empresa' : '✏️ Editar empresa'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Saltoki" />
              </div>
              <div className="form-group">
                <label className="form-label">Subdominio (slug)</label>
                <input className="form-input" value={form.subdominio} onChange={e => setForm({ ...form, subdominio: e.target.value })} placeholder="Ej: saltoki" />
              </div>
              <div className="form-group">
                <label className="form-label">Token HubSpot</label>
                <input className="form-input" value={form.hubspot_access_token} onChange={e => setForm({ ...form, hubspot_access_token: e.target.value })} placeholder="pat-eu1-..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Apps per Tenant Modal */}
      {appsModal && (
        <div className="modal-overlay" onClick={() => setAppsModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📦 Apps — {appsModal.nombre}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setAppsModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Activa o desactiva el acceso de esta empresa a cada producto. Independiente de Stripe.
              </p>
              {catalog.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay productos en el catálogo.</p>
              ) : catalog.map(app => {
                const entry = tenantApps.find(a => a.tenant_id === appsModal.id && a.app_slug === app.slug)
                const isActive = entry?.activa === true
                return (
                  <div key={app.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: isActive ? 'rgba(34,197,94,0.05)' : 'var(--bg-primary)',
                    borderRadius: 'var(--radius-sm)', marginBottom: 8,
                    border: `1px solid ${isActive ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="material-symbols-outlined" style={{ opacity: 0.6 }}>{app.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{app.name}</div>
                        <code style={{ fontSize: 11, color: 'var(--text-muted)' }}>{app.slug}</code>
                      </div>
                    </div>
                    <button
                      className={`btn ${isActive ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                      style={isActive ? { color: 'var(--danger)' } : {}}
                      disabled={toggling === app.slug}
                      onClick={() => toggleTenantApp(appsModal, app.slug)}
                    >
                      {toggling === app.slug ? '...' : isActive ? 'Desactivar' : 'Activar'}
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
