import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState(false)
  const [cargando, setCargando] = useState(false)

  async function handleLogin() {
    if (!usuario || !clave) return
    setCargando(true)
    setError(false)

    const { data, error } = await supabase
      .from('operadores')
      .select('*')
      .eq('usuario', usuario.trim())
      .eq('clave', clave.trim())
      .eq('activo', true)
      .single()

    setCargando(false)

    if (error || !data) {
      setError(true)
      return
    }

    sessionStorage.setItem('dashboard_auth', 'true')
    sessionStorage.setItem('operador', JSON.stringify({
      id: data.id, nombre: data.nombre,
      usuario: data.usuario, rol: data.rol,
    }))
    onLogin(data)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Fondo decorativo */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(27,63,139,0.18) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-10%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,196,0,0.08) 0%, transparent 70%)',
        }} />
        {/* Grid lines */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94A3B8" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Card de login */}
      <div className="animate-bounce-in" style={{
        width: '100%', maxWidth: 400, position: 'relative',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 16, marginBottom: '1rem',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-glow) 100%)',
            boxShadow: '0 8px 32px rgba(27,63,139,0.4)',
          }}>
            <span style={{ fontSize: 28 }}>🚨</span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem', fontWeight: 800,
            color: 'var(--text-1)', letterSpacing: '0.05em',
            marginBottom: 4,
          }}>
            ALERTA PASEO!
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>
            Central de Monitoreo — Acceso restringido
          </p>
        </div>

        {/* Form card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block', fontSize: '0.78rem', fontWeight: 700,
              color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              Usuario
            </label>
            <input
              className="input-field"
              placeholder="Ingrese su usuario"
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="username"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block', fontSize: '0.78rem', fontWeight: 700,
              color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              Contraseña
            </label>
            <input
              className="input-field"
              type="password"
              placeholder="Ingrese su contraseña"
              value={clave}
              onChange={e => setClave(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem',
              color: '#FCA5A5', fontSize: '0.85rem', textAlign: 'center',
              marginBottom: '1rem',
            }}>
              ⚠️ Usuario o contraseña incorrectos
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={cargando}
            style={{
              width: '100%', padding: '0.9rem',
              background: cargando
                ? 'var(--border)'
                : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-glow) 100%)',
              color: 'white', border: 'none',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)', fontWeight: 700,
              fontSize: '1rem', cursor: cargando ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s', letterSpacing: '0.03em',
              boxShadow: cargando ? 'none' : '0 4px 16px rgba(37,87,199,0.35)',
            }}
          >
            {cargando ? 'Verificando...' : 'Ingresar al sistema →'}
          </button>
        </div>

        <p style={{
          textAlign: 'center', marginTop: '1.5rem',
          color: 'var(--text-3)', fontSize: '0.75rem',
        }}>
          Centro Comercial Paseo de la Castellana
        </p>
      </div>
    </div>
  )
}