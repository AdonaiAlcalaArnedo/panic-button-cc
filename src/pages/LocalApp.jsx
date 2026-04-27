import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TIPOS_ALERTA = [
  { tipo: 'seguridad',     label: 'Seguridad',     emoji: '🚨', color: '#EF4444', bg: 'rgba(239,68,68,0.12)',    border: 'rgba(239,68,68,0.35)' },
  { tipo: 'salud',         label: 'Salud',          emoji: '🏥', color: '#F97316', bg: 'rgba(249,115,22,0.12)',   border: 'rgba(249,115,22,0.35)' },
  { tipo: 'siniestro',     label: 'Siniestro',      emoji: '🔥', color: '#EAB308', bg: 'rgba(234,179,8,0.12)',    border: 'rgba(234,179,8,0.35)' },
  { tipo: 'mantenimiento', label: 'Mantenimiento',  emoji: '🔧', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',   border: 'rgba(59,130,246,0.35)' },
  { tipo: 'asistencia',    label: 'Asistencia',     emoji: '🙋', color: '#10B981', bg: 'rgba(16,185,129,0.12)',   border: 'rgba(16,185,129,0.35)' },
]

function guardarLocal(local) {
  localStorage.setItem('local_data', JSON.stringify(local))
}

function obtenerLocal() {
  try {
    const data = localStorage.getItem('local_data')
    return data ? JSON.parse(data) : null
  } catch { return null }
}

export default function LocalApp() {
  const [paso, setPaso] = useState('cargando')
  const [localData, setLocalData] = useState(null)
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null)
  const [detalle, setDetalle] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [alertaEnviada, setAlertaEnviada] = useState(null)
  const [sinConexion, setSinConexion] = useState(false)
  const [comunicadoActivo, setComunicadoActivo] = useState(null)

  useEffect(() => {
    function actualizarConexion() { setSinConexion(!navigator.onLine) }
    window.addEventListener('online', actualizarConexion)
    window.addEventListener('offline', actualizarConexion)
    actualizarConexion()
    return () => {
      window.removeEventListener('online', actualizarConexion)
      window.removeEventListener('offline', actualizarConexion)
    }
  }, [])

  useEffect(() => {
    async function iniciar() {
      const params = new URLSearchParams(window.location.search)
      const token = params.get('token')

      if (token) {
        const { data, error } = await supabase
          .from('locales').select('*')
          .eq('token', token).eq('activo', true).single()

        if (!error && data) {
          guardarLocal(data)
          setLocalData(data)
          window.history.replaceState({}, '', '/')
          setPaso('inicio')
          return
        } else {
          setPaso('invalido')
          return
        }
      }

      const localGuardado = obtenerLocal()
      if (localGuardado) {
        setLocalData(localGuardado)
        setPaso('inicio')
        return
      }
      setPaso('sin_acceso')
    }
    iniciar()
  }, [])

  useEffect(() => {
    async function verificarComunicadoReciente() {
      const visto = localStorage.getItem('comunicado_visto_id')
      const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('comunicados').select('*')
        .gte('created_at', hace24h)
        .order('created_at', { ascending: false })
        .limit(1).single()
      if (data && data.id !== visto) setComunicadoActivo(data)
    }

    verificarComunicadoReciente()

    const canal = supabase
      .channel('comunicados-masivos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comunicados' },
        (payload) => setComunicadoActivo(payload.new))
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [])

  async function enviarAlerta() {
    setEnviando(true)
    const { data, error } = await supabase.rpc('insertar_alerta', {
      p_token: localData.token,
      p_tipo: tipoSeleccionado.tipo,
      p_detalle: detalle || null,
    })
    setEnviando(false)
    if (error || data?.error) {
      if (data?.mensaje === 'Token inválido o local inactivo') {
        localStorage.removeItem('local_data')
        setPaso('sin_acceso')
      } else {
        alert('Error al enviar. Intenta de nuevo.')
      }
      return
    }
    setAlertaEnviada({ id: data.id, created_at: data.created_at })
    setPaso('confirmacion')
    escucharRespuesta(data.id)
  }

  function escucharRespuesta(alertaId) {
    const canal = supabase
      .channel('respuesta-' + alertaId)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'alertas', filter: `id=eq.${alertaId}` },
        (payload) => {
          setAlertaEnviada(payload.new)
          if (payload.new.estado === 'atendida') supabase.removeChannel(canal)
        })
      .subscribe()
  }

  function reiniciar() {
    setPaso('inicio')
    setTipoSeleccionado(null)
    setDetalle('')
  }

  // Pantallas de estado
  const pantallaCentrada = (emoji, titulo, texto, subtexto = '') => (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: '1.5rem' }}>{emoji}</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.75rem', letterSpacing: '0.02em' }}>{titulo}</h2>
      <p style={{ color: 'var(--text-2)', maxWidth: 300, lineHeight: 1.6 }}>{texto}</p>
      {subtexto && <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: '1rem' }}>{subtexto}</p>}
    </div>
  )

  if (paso === 'cargando') return pantallaCentrada('⏳', 'Verificando acceso...', '')
  if (paso === 'sin_acceso') return pantallaCentrada('🔒', 'Acceso restringido', 'Esta app solo puede activarse escaneando el código QR asignado a su local.', 'Contacte al administrador del centro comercial.')
  if (paso === 'invalido') return pantallaCentrada('❌', 'QR no válido', 'Este código QR no es válido o fue desactivado.', 'Contacte al administrador.')

  if (paso === 'confirmacion') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="animate-bounce-in" style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: '1rem' }}>✅</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.5rem', letterSpacing: '0.03em' }}>
            ALERTA ENVIADA
          </h2>
          <p style={{ color: 'var(--text-2)', marginBottom: '0.5rem' }}>Vigilancia ha sido notificada.</p>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginBottom: '2rem', fontFamily: 'var(--font-mono)' }}>
            {localData.nombre} · Local {localData.numero}
          </p>

          {alertaEnviada?.respuesta && (
            <div className="animate-slide-in" style={{
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left',
            }}>
              <p style={{ color: '#6EE7B7', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                💬 Respuesta de vigilancia
              </p>
              <p style={{ color: 'var(--text-1)', fontSize: '0.95rem' }}>{alertaEnviada.respuesta}</p>
            </div>
          )}

          {!alertaEnviada?.respuesta && (
            <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
              Esperando respuesta de vigilancia...
            </p>
          )}

          <button onClick={reiniciar} style={{
            background: 'var(--bg-card)', color: 'var(--text-2)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
            padding: '0.8rem 2rem', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontWeight: 600,
          }}>
            Nueva alerta
          </button>
        </div>
      </div>
    )
  }

  if (paso === 'detalle') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <button onClick={() => setPaso('inicio')} style={{
          background: 'none', border: 'none', color: 'var(--text-2)',
          cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.9rem',
          marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          ← Volver
        </button>

        <div style={{ maxWidth: 400, margin: '0 auto', width: '100%', flex: 1 }}>
          <div style={{
            background: tipoSeleccionado.bg,
            border: `1px solid ${tipoSeleccionado.border}`,
            borderRadius: 'var(--radius-lg)', padding: '1.25rem',
            marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
          }}>
            <span style={{ fontSize: 36 }}>{tipoSeleccionado.emoji}</span>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: tipoSeleccionado.color, letterSpacing: '0.05em' }}>
                {tipoSeleccionado.label.toUpperCase()}
              </p>
              <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                {localData.nombre} · Local {localData.numero}
              </p>
            </div>
          </div>

          <label style={{
            display: 'block', fontSize: '0.78rem', fontWeight: 700,
            color: 'var(--text-2)', marginBottom: 8,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            Detalle adicional (opcional)
          </label>
          <textarea
            className="input-field"
            style={{ resize: 'none', minHeight: 100, marginBottom: '1.5rem' }}
            placeholder="Describe brevemente la situación..."
            rows={4}
            value={detalle}
            onChange={e => setDetalle(e.target.value)}
          />

          <button
            onClick={enviarAlerta}
            disabled={enviando}
            style={{
              width: '100%', padding: '1.1rem',
              background: enviando ? 'var(--border)' : tipoSeleccionado.color,
              color: 'white', border: 'none',
              borderRadius: 'var(--radius-lg)',
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '1.3rem', letterSpacing: '0.08em',
              cursor: enviando ? 'not-allowed' : 'pointer',
              boxShadow: enviando ? 'none' : `0 4px 20px ${tipoSeleccionado.color}44`,
              transition: 'all 0.15s',
            }}
          >
            {enviando ? 'ENVIANDO...' : `🚨 ENVIAR ALERTA`}
          </button>
        </div>
      </div>
    )
  }

  // Pantalla principal
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>

      {/* Comunicado activo */}
      {comunicadoActivo && (
        <div className="animate-fade-in" style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
        }}>
          <div className="animate-bounce-in" style={{
            width: '100%', maxWidth: 380,
            background: 'var(--bg-card)',
            border: '2px solid var(--info)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            boxShadow: '0 0 40px rgba(59,130,246,0.3)',
          }}>
            <div style={{ background: 'var(--info)', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📢</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'white', fontSize: '1rem', letterSpacing: '0.05em' }}>
                COMUNICADO OFICIAL
              </span>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ color: 'var(--text-1)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                {comunicadoActivo.mensaje}
              </p>
              <p style={{ color: 'var(--text-3)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginBottom: '1.25rem' }}>
                {new Date(comunicadoActivo.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} — Administración
              </p>
              <button
                onClick={() => {
                  localStorage.setItem('comunicado_visto_id', comunicadoActivo.id)
                  setComunicadoActivo(null)
                }}
                style={{
                  width: '100%', padding: '0.85rem',
                  background: 'var(--info)', color: 'white', border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-body)', fontWeight: 700,
                  fontSize: '0.95rem', cursor: 'pointer',
                }}
              >
                Entendido ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0A1628 0%, var(--bg-surface) 100%)',
        borderBottom: `3px solid var(--accent)`,
        padding: '1rem 1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.08em' }}>
              ALERTA PASEO!
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
              Sistema de Alertas
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: '0.9rem' }}>{localData.nombre}</p>
            <p style={{ color: 'var(--text-3)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
              {localData.etapa === 'empleado' ? localData.piso : `Etapa ${localData.etapa} · Piso ${localData.piso} · Local ${localData.numero}`}
            </p>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto', width: '100%' }}>

        {sinConexion && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem',
            color: '#FCA5A5', fontSize: '0.85rem', marginBottom: '1rem',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            ⚠️ Sin conexión — No es posible enviar alertas
          </div>
        )}

        <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Seleccione el tipo de alerta
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
          {TIPOS_ALERTA.map((item, i) => (
            <button
              key={item.tipo}
              onClick={() => { setTipoSeleccionado(item); setPaso('detalle') }}
              className="animate-slide-in"
              style={{
                background: item.bg,
                border: `1px solid ${item.border}`,
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: '1rem',
                cursor: 'pointer', width: '100%',
                transition: 'all 0.15s',
                animationDelay: `${i * 0.05}s`,
                boxShadow: `0 2px 12px ${item.color}18`,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = `0 4px 20px ${item.color}30` }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 2px 12px ${item.color}18` }}
            >
              <span style={{ fontSize: 32, flexShrink: 0 }}>{item.emoji}</span>
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: '1.8rem',
                fontWeight: 700, color: item.color, letterSpacing: '0.05em', flex: 1, textAlign: 'left',
              }}>
                {item.label.toUpperCase()}
              </span>
              <span style={{ color: item.border, fontSize: '1.2rem' }}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}