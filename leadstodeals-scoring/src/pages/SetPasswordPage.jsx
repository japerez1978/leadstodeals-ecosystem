import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from 'core-saas'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase procesa el token del hash automáticamente al cargar
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        if (session) setReady(true)
      }
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      navigate('/ofertas')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary, #0f1117)', fontFamily: 'sans-serif'
    }}>
      <div style={{
        background: 'var(--bg-secondary, #1a1d27)', borderRadius: 12, padding: 40,
        width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 4 }}>L2D</div>
          <h2 style={{ color: '#fff', margin: 0, fontSize: 20 }}>Crea tu contraseña</h2>
          <p style={{ color: '#9ca3af', fontSize: 14, marginTop: 8 }}>
            Elige una contraseña para acceder al portal
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 6 }}>
              Nueva contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2d2d44',
                background: '#0f1117', color: '#fff', fontSize: 14, boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 6 }}>
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2d2d44',
                background: '#0f1117', color: '#fff', fontSize: 14, boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{ color: '#f87171', fontSize: 13, background: 'rgba(248,113,113,0.1)', padding: '8px 12px', borderRadius: 6 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8,
              padding: '12px', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, marginTop: 8
            }}
          >
            {loading ? 'Guardando...' : 'Guardar contraseña y entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
