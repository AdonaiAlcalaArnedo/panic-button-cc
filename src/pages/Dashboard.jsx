import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Login from '../components/Login'
import Locales from './Locales'
import Empleados from './Empleados'
import AlertaSonora, { desbloquearAudio } from '../components/AlertaSonora'
import Reportes from './Reportes'
import Operadores from './Operadores'
import Estadisticas from './Estadisticas'
import RespuestasRapidas from './RespuestasRapidas'
import Comunicados from './Comunicados'

const COLORES_TIPO = {
  seguridad:     { bg: 'rgba(239,68,68,0.08)',    border: '#EF4444', text: '#FCA5A5' },
  salud:         { bg: 'rgba(249,115,22,0.08)',   border: '#F97316', text: '#FDBA74' },
  siniestro:     { bg: 'rgba(234,179,8,0.08)',    border: '#EAB308', text: '#FDE047' },
  mantenimiento: { bg: 'rgba(59,130,246,0.08)',   border: '#3B82F6', text: '#93C5FD' },
  asistencia:    { bg: 'rgba(16,185,129,0.08)',   border: '#10B981', text: '#6EE7B7' },
}

const EMOJIS = {
  seguridad: '🚨', salud: '🏥', siniestro: '🔥',
  mantenimiento: '🔧', asistencia: '🙋',
}

function tiempoTranscurrido(fecha) {
  const diff = Math.floor((new Date() - new Date(fecha)) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h`
}

function obtenerOperador() {
  try {
    const data = sessionStorage.getItem('operador')
    return data ? JSON.parse(data) : null
  } catch { return null }
}

const TABS_ADMIN = [
  { id: 'alertas',    label: 'Alertas',       icon: '🚨' },
  { id: 'locales',    label: 'Marcas',        icon: '🏪' },
  { id: 'empleados',  label: 'Empleados',     icon: '👷' },
  { id: 'operadores', label: 'Operadores',    icon: '👮' },
  { id: 'respuestas', label: 'Respuestas',    icon: '💬' },
  { id: 'comunicados',label: 'Comunicados',   icon: '📢' },
  { id: 'reportes',   label: 'Reportes',      icon: '📊' },
  { id: 'estadisticas',label: 'Estadísticas', icon: '📈' },
]

const TABS_OPERADOR = [
  { id: 'alertas',  label: 'Alertas',  icon: '🚨' },
  { id: 'reportes', label: 'Reportes', icon: '📊' },
]

export default function Dashboard() {
  const [alertas, setAlertas] = useState([])
  const [filtro, setFiltro] = useState('pendiente')
  const [cargando, setCargando] = useState(true)
  const [vista, setVista] = useState('alertas')
  const [alertaActiva, setAlertaActiva] = useState(null)
  const [autenticado, setAutenticado] = useState(
    sessionStorage.getItem('dashboard_auth') === 'true'
  )
  const [operador, setOperador] = useState(obtenerOperador())
  const [audioActivado, setAudioActivado] = useState(false)
  const [respondiendo, setRespondiendo] = useState(null)
  const [textoRespuesta, setTextoRespuesta] = useState('')
  const alertasAnteriores = useRef([])
  const cargaInicial = useRef(true)

  async function cargarAlertas() {
    const { data, error } = await supabase
      .from('alertas').select('*')
      .order('created_at', { ascending: false })
    if (!error) {
      const pendientesNuevas = data.filter(a => a.estado === 'pendiente')
      if (cargaInicial.current) {
        alertasAnteriores.current = pendientesNuevas
        cargaInicial.current = false
      } else {
        const idsAnteriores = alertasAnteriores.current.map(a => a.id)
        const nuevas = pendientesNuevas.filter(a => !idsAnteriores.includes(a.id))
        if (nuevas.length > 0) setAlertaActiva(nuevas[0])
        alertasAnteriores.current = pendientesNuevas
      }
      setAlertas(data)
    }
    setCargando(false)
  }

  async function cambiarEstado(id, nuevoEstado, tiempoRespuesta = null, respuesta = null) {
    const operadorActual = operador || obtenerOperador()
    const ahora = new Date().toISOString()
    const alerta = alertas.find(a => a.id === id)
    const tiempoCalculado = tiempoRespuesta !== null
      ? tiempoRespuesta
      : alerta ? Math.floor((new Date() - new Date(alerta.created_at)) / 1000) : null

    const actualizacion = {
      estado: nuevoEstado,
      atendida_at: nuevoEstado === 'atendida' ? ahora : null,
      atendida_por: operadorActual?.nombre || null,
      tiempo_respuesta_seg: tiempoCalculado,
    }
    if (respuesta !== null) actualizacion.respuesta = respuesta

    const { error } = await supabase.from('alertas').update(actualizacion).eq('id', id)
    if (!error) cargarAlertas()
  }

  function cerrarSesion() {
    if (!window.confirm('¿Cerrar sesión?')) return
    sessionStorage.removeItem('dashboard_auth')
    sessionStorage.removeItem('operador')
    setAutenticado(false)
    setOperador(null)
    cargaInicial.current = true
  }

  useEffect(() => {
    if (!autenticado) return
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    cargarAlertas()
    const canal = supabase.channel('alertas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas' }, () => cargarAlertas())
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [autenticado])

  useEffect(() => {
    if (audioActivado) desbloquearAudio()
  }, [audioActivado])

  if (!autenticado) {
    return <Login onLogin={data => { setOperador(data); setAutenticado(true) }} />
  }

  const esAdmin = operador?.rol === 'admin'
  const tabs = esAdmin ? TABS_ADMIN : TABS_OPERADOR
  const alertasFiltradas = alertas.filter(a => a.estado === filtro)
  const pendientesCount = alertas.filter(a => a.estado === 'pendiente').length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>

      <AlertaSonora
        alerta={alertaActiva}
        onAtender={async (id, tiempoRespuesta, respuesta) => {
          setAlertaActiva(null)
          await cambiarEstado(id, 'atendida', tiempoRespuesta, respuesta)
        }}
        onPosponer={async (id, tiempoRespuesta) => {
          setAlertaActiva(null)
          await cambiarEstado(id, 'pospuesta', tiempoRespuesta)
        }}
      />

      {/* Banner audio */}
      {!audioActivado && (
        <div
          onClick={() => setAudioActivado(true)}
          style={{
            position: 'fixed', bottom: '1rem', left: '50%', transform: 'translateX(-50%)',
            zIndex: 40, cursor: 'pointer',
            background: 'var(--accent)', color: '#000',
            padding: '0.6rem 1.25rem', borderRadius: 999,
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.82rem',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 20px rgba(245,196,0,0.4)',
            animation: 'pulse-ring 2s infinite',
            whiteSpace: 'nowrap',
          }}
        >
          🔔 Toca para activar alertas sonoras
        </div>
      )}

      {/* Header */}
      <header style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 60, flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-glow) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>🚨</div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.06em', lineHeight: 1 }}>
              ALERTA PASEO!
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
              {operador?.nombre} · <span style={{ color: operador?.rol === 'admin' ? '#C4B5FD' : '#93C5FD' }}>{operador?.rol}</span>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {pendientesCount > 0 && (
            <div style={{
              background: 'var(--danger)', color: 'white',
              borderRadius: 999, padding: '2px 10px',
              fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem',
              animation: 'pulse-ring 2s infinite',
            }}>
              {pendientesCount} pendiente{pendientesCount !== 1 ? 's' : ''}
            </div>
          )}
          <button
            onClick={cerrarSesion}
            style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-3)',
              padding: '0.4rem 0.75rem', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '0.8rem',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = '#FCA5A5' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' }}
          >
            Salir
          </button>
        </div>
      </header>

      {/* Nav tabs */}
      <nav style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 1rem',
        overflowX: 'auto',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 2, minWidth: 'max-content' }}>
          {tabs.map(tab => {
            const isActive = vista === tab.id
            const isPendiente = tab.id === 'alertas' && pendientesCount > 0
            return (
              <button
                key={tab.id}
                onClick={() => setVista(tab.id)}
                style={{
                  padding: '0.7rem 1rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  color: isActive ? 'var(--text-1)' : 'var(--text-3)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: 14 }}>{tab.icon}</span>
                {tab.label}
                {isPendiente && (
                  <span style={{
                    background: 'var(--danger)', color: 'white',
                    borderRadius: 999, padding: '1px 7px',
                    fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 700,
                  }}>
                    {pendientesCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Contenido */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          {vista === 'estadisticas' ? <Estadisticas /> :
           vista === 'reportes' ? <Reportes /> :
           vista === 'comunicados' && esAdmin ? <Comunicados operadorNombre={operador?.nombre} /> :
           vista === 'respuestas' && esAdmin ? <RespuestasRapidas /> :
           vista === 'operadores' && esAdmin ? <Operadores /> :
           vista === 'empleados' && esAdmin ? <Empleados /> :
           vista === 'locales' && esAdmin ? <Locales /> :
           (
            <>
              {/* Filtros */}
              <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
                {['pendiente', 'atendida', 'pospuesta'].map(estado => {
                  const count = alertas.filter(a => a.estado === estado).length
                  const isActive = filtro === estado
                  return (
                    <button
                      key={estado}
                      onClick={() => setFiltro(estado)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: isActive ? 'var(--primary)' : 'var(--bg-card)',
                        border: `1px solid ${isActive ? 'var(--primary-glow)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)',
                        color: isActive ? 'white' : 'var(--text-2)',
                        fontFamily: 'var(--font-body)', fontWeight: 600,
                        fontSize: '0.82rem', cursor: 'pointer',
                        transition: 'all 0.15s', textTransform: 'capitalize',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      {estado}
                      <span style={{
                        background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-surface)',
                        borderRadius: 999, padding: '1px 8px',
                        fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                      }}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Lista alertas */}
              {cargando ? (
                <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: '3rem 0' }}>
                  Cargando...
                </p>
              ) : alertasFiltradas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                  <p style={{ fontSize: 48, marginBottom: '1rem' }}>
                    {filtro === 'pendiente' ? '✅' : filtro === 'atendida' ? '📋' : '⏸️'}
                  </p>
                  <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>
                    No hay alertas {filtro}s
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {alertasFiltradas.map((alerta, i) => {
                    const c = COLORES_TIPO[alerta.tipo] || { bg: 'var(--bg-card)', border: 'var(--border)', text: 'var(--text-1)' }
                    return (
                      <div
                        key={alerta.id}
                        className="animate-slide-in"
                        style={{
                          background: c.bg,
                          border: `1px solid ${c.border}44`,
                          borderLeft: `4px solid ${c.border}`,
                          borderRadius: 'var(--radius-lg)',
                          padding: '1rem 1.25rem',
                          animationDelay: `${i * 0.03}s`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 22 }}>{EMOJIS[alerta.tipo]}</span>
                            <div>
                              <span style={{
                                fontFamily: 'var(--font-display)', fontSize: '1rem',
                                fontWeight: 700, color: c.text, letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                              }}>
                                {alerta.tipo}
                              </span>
                              {alerta.falsa_alarma && (
                                <span className="badge badge-orange" style={{ marginLeft: 8 }}>
                                  Falsa alarma
                                </span>
                              )}
                            </div>
                          </div>
                          <span style={{
                            color: 'var(--text-3)', fontSize: '0.72rem',
                            fontFamily: 'var(--font-mono)',
                          }}>
                            {tiempoTranscurrido(alerta.created_at)}
                          </span>
                        </div>

                        <div style={{ marginBottom: '0.75rem' }}>
                          <p style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: '0.9rem' }}>
                            {alerta.local_nombre || `Local ${alerta.local_numero}`}
                            <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', marginLeft: 8 }}>
                              #{alerta.local_numero}
                            </span>
                          </p>
                          {alerta.telefono && (
                            <p style={{ color: 'var(--text-2)', fontSize: '0.82rem', marginTop: 2 }}>
                              📞 {alerta.telefono}
                            </p>
                          )}
                          {alerta.detalle && (
                            <p style={{
                              color: 'var(--text-2)', fontSize: '0.82rem', marginTop: 4,
                              background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '4px 8px',
                              display: 'inline-block',
                            }}>
                              {alerta.detalle}
                            </p>
                          )}
                          {alerta.tiempo_respuesta_seg != null && (
                            <p style={{ color: 'var(--text-3)', fontSize: '0.75rem', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                              ⏱ {alerta.tiempo_respuesta_seg < 60
                                ? `${alerta.tiempo_respuesta_seg}s`
                                : `${Math.floor(alerta.tiempo_respuesta_seg / 60)}m ${alerta.tiempo_respuesta_seg % 60}s`}
                              {alerta.atendida_por && ` · ${alerta.atendida_por}`}
                            </p>
                          )}
                          {alerta.respuesta && (
                            <p style={{
                              color: '#6EE7B7', fontSize: '0.78rem', marginTop: 4,
                              fontStyle: 'italic',
                            }}>
                              💬 "{alerta.respuesta}"
                            </p>
                          )}
                        </div>

                        {/* Botones de acción */}
                        {alerta.estado === 'pendiente' && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => cambiarEstado(alerta.id, 'atendida')}
                              style={{
                                background: 'rgba(16,185,129,0.15)',
                                border: '1px solid rgba(16,185,129,0.3)',
                                color: '#6EE7B7', borderRadius: 'var(--radius-sm)',
                                padding: '0.45rem 1rem', cursor: 'pointer',
                                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.8rem',
                                transition: 'all 0.15s',
                              }}
                            >
                              ✅ Atender
                            </button>
                            <button
                              onClick={() => cambiarEstado(alerta.id, 'pospuesta')}
                              style={{
                                background: 'rgba(245,158,11,0.12)',
                                border: '1px solid rgba(245,158,11,0.3)',
                                color: '#FCD34D', borderRadius: 'var(--radius-sm)',
                                padding: '0.45rem 1rem', cursor: 'pointer',
                                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.8rem',
                              }}
                            >
                              ⏸️ Posponer
                            </button>
                          </div>
                        )}

                        {alerta.estado === 'pospuesta' && (
                          <>
                            {respondiendo === alerta.id ? (
                              <div>
                                <textarea
                                  className="input-field"
                                  style={{ resize: 'none', marginBottom: 8, fontSize: '0.85rem' }}
                                  rows={2}
                                  placeholder="Respuesta al local (opcional)..."
                                  value={textoRespuesta}
                                  onChange={e => setTextoRespuesta(e.target.value)}
                                  autoFocus
                                />
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button
                                    onClick={async () => {
                                      await cambiarEstado(alerta.id, 'atendida', null, textoRespuesta.trim() || null)
                                      setRespondiendo(null)
                                      setTextoRespuesta('')
                                    }}
                                    style={{
                                      background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                                      color: '#6EE7B7', borderRadius: 'var(--radius-sm)',
                                      padding: '0.45rem 1rem', cursor: 'pointer',
                                      fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.8rem',
                                    }}
                                  >
                                    ✅ Confirmar
                                  </button>
                                  <button
                                    onClick={() => { setRespondiendo(null); setTextoRespuesta('') }}
                                    style={{
                                      background: 'var(--bg-surface)', border: '1px solid var(--border)',
                                      color: 'var(--text-3)', borderRadius: 'var(--radius-sm)',
                                      padding: '0.45rem 1rem', cursor: 'pointer',
                                      fontFamily: 'var(--font-body)', fontSize: '0.8rem',
                                    }}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setRespondiendo(alerta.id)}
                                style={{
                                  background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                                  color: '#6EE7B7', borderRadius: 'var(--radius-sm)',
                                  padding: '0.45rem 1rem', cursor: 'pointer',
                                  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.8rem',
                                }}
                              >
                                ✅ Marcar como atendida
                              </button>
                            )}
                          </>
                        )}

                        {alerta.estado === 'atendida' && !alerta.falsa_alarma && (
                          <button
                            onClick={async () => {
                              if (!window.confirm('¿Marcar esta alerta como falsa alarma?')) return
                              await supabase.from('alertas').update({ falsa_alarma: true }).eq('id', alerta.id)
                              cargarAlertas()
                            }}
                            style={{
                              background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)',
                              color: '#FDBA74', borderRadius: 'var(--radius-sm)',
                              padding: '0.35rem 0.85rem', cursor: 'pointer',
                              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.75rem',
                              marginTop: 4,
                            }}
                          >
                            ⚠️ Marcar como falsa alarma
                          </button>
                        )}
                        {alerta.falsa_alarma && (
                          <span style={{ color: '#FDBA74', fontSize: '0.75rem', marginTop: 4, display: 'inline-block' }}>
                            ⚠️ Falsa alarma registrada
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}