import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

let audioCtxGlobal = null

export function desbloquearAudio() {
  if (!audioCtxGlobal) {
    audioCtxGlobal = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtxGlobal.state === 'suspended') {
    audioCtxGlobal.resume()
  }
}

document.addEventListener('click', desbloquearAudio, { once: false })
document.addEventListener('keydown', desbloquearAudio, { once: false })

const EMOJIS = {
  seguridad: '🚨', salud: '🏥', siniestro: '🔥',
  mantenimiento: '🔧', asistencia: '🙋',
}

const COLORES_BORDE = {
  seguridad: '#ef4444', salud: '#f97316', siniestro: '#eab308',
  mantenimiento: '#3b82f6', asistencia: '#22c55e',
}

function crearSonidoAlerta(audioCtx, tipo) {
  const ahora = audioCtx.currentTime

  if (tipo === 'seguridad') {
    for (let i = 0; i < 3; i++) {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain); gain.connect(audioCtx.destination)
      osc.type = 'sine'
      const t = ahora + i * 0.4
      osc.frequency.setValueAtTime(600, t)
      osc.frequency.linearRampToValueAtTime(900, t + 0.2)
      osc.frequency.linearRampToValueAtTime(600, t + 0.4)
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.35, t + 0.05)
      gain.gain.linearRampToValueAtTime(0.35, t + 0.35)
      gain.gain.linearRampToValueAtTime(0, t + 0.4)
      osc.start(t); osc.stop(t + 0.4)
    }
  } else if (tipo === 'salud') {
    for (let i = 0; i < 2; i++) {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain); gain.connect(audioCtx.destination)
      osc.type = 'sine'; osc.frequency.value = 880
      const t = ahora + i * 0.6
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.3, t + 0.05)
      gain.gain.linearRampToValueAtTime(0.3, t + 0.15)
      gain.gain.linearRampToValueAtTime(0, t + 0.25)
      osc.start(t); osc.stop(t + 0.3)
    }
  } else if (tipo === 'siniestro') {
    for (let i = 0; i < 6; i++) {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain); gain.connect(audioCtx.destination)
      osc.type = 'square'; osc.frequency.value = i % 2 === 0 ? 660 : 440
      const t = ahora + i * 0.2
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.35, t + 0.02)
      gain.gain.linearRampToValueAtTime(0.35, t + 0.15)
      gain.gain.linearRampToValueAtTime(0, t + 0.18)
      osc.start(t); osc.stop(t + 0.2)
    }
  } else if (tipo === 'mantenimiento') {
    for (let i = 0; i < 2; i++) {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain); gain.connect(audioCtx.destination)
      osc.type = 'sine'; osc.frequency.value = 520
      const t = ahora + i * 0.3
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.25, t + 0.03)
      gain.gain.linearRampToValueAtTime(0.25, t + 0.18)
      gain.gain.linearRampToValueAtTime(0, t + 0.22)
      osc.start(t); osc.stop(t + 0.3)
    }
  } else {
    const notas = [523, 659, 784, 1047]
    notas.forEach((freq, i) => {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain); gain.connect(audioCtx.destination)
      osc.type = 'sine'; osc.frequency.value = freq
      const t = ahora + i * 0.18
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.25, t + 0.04)
      gain.gain.linearRampToValueAtTime(0.25, t + 0.14)
      gain.gain.linearRampToValueAtTime(0, t + 0.18)
      osc.start(t); osc.stop(t + 0.2)
    })
  }
}

export default function AlertaSonora({ alerta, onAtender, onPosponer }) {
  const audioCtxRef = useRef(null)
  const intervaloRef = useRef(null)
  const [pulsando, setPulsando] = useState(true)
  const [tiempoAlerta, setTiempoAlerta] = useState(0)
  const [mostrarRespuesta, setMostrarRespuesta] = useState(false)
  const [respuesta, setRespuesta] = useState('')
  const [respuestasRapidas, setRespuestasRapidas] = useState([])

  // Cargar respuestas rápidas — siempre, sin condición
  useEffect(() => {
    async function cargarRespuestas() {
      const { data } = await supabase
        .from('respuestas_rapidas')
        .select('*')
        .eq('activo', true)
        .order('orden')
      if (data) setRespuestasRapidas(data)
    }
    cargarRespuestas()
  }, [])

  // Activar alerta sonora
  useEffect(() => {
    if (!alerta) return
    setMostrarRespuesta(false)
    setRespuesta('')
    setTiempoAlerta(0)

    try {
      if (audioCtxGlobal && audioCtxGlobal.state !== 'closed') {
        audioCtxRef.current = audioCtxGlobal
      } else {
        audioCtxGlobal = new (window.AudioContext || window.webkitAudioContext)()
        audioCtxRef.current = audioCtxGlobal
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume()
      }
    } catch (e) { console.log('Audio no disponible') }

    function tocarSonido() {
      try {
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
          crearSonidoAlerta(audioCtxRef.current, alerta.tipo)
        }
      } catch (e) {}
    }

    tocarSonido()
    intervaloRef.current = setInterval(tocarSonido, 3000)

    const intervaloTiempo = setInterval(() => setTiempoAlerta(t => t + 1), 1000)
    const intervaloParpadeo = setInterval(() => setPulsando(p => !p), 600)

    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Nueva alerta - Centro Comercial', {
          body: `${alerta.tipo.toUpperCase()} - Local ${alerta.local_numero}`,
          icon: '/icons/icon-192.png',
        })
      }
    } catch (e) {}

    return () => {
      clearInterval(intervaloRef.current)
      clearInterval(intervaloTiempo)
      clearInterval(intervaloParpadeo)
    }
  }, [alerta])

  function detenerSonido() {
    clearInterval(intervaloRef.current)
    try {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close()
        audioCtxGlobal = null
        audioCtxRef.current = null
      }
    } catch (e) {}
  }

  function handleAtender() {
    detenerSonido()
    setMostrarRespuesta(true)
  }

  function confirmarAtender() {
    onAtender(alerta.id, tiempoAlerta, respuesta.trim() || null)
  }

  function handlePosponer() {
    detenerSonido()
    onPosponer(alerta.id, tiempoAlerta)
  }

  function formatTiempo(seg) {
    if (seg < 60) return `${seg} seg`
    return `${Math.floor(seg / 60)} min ${seg % 60} seg`
  }

  // Este return null va DESPUÉS de todos los hooks
  if (!alerta) return null

  const color = COLORES_BORDE[alerta.tipo] || '#ef4444'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>

      {/* Fondo pulsante */}
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: color,
          opacity: pulsando ? 0.08 : 0.03,
          transition: 'opacity 0.3s',
          zIndex: 49,
          pointerEvents: 'none',
        }}
      />

      {/* Modal principal */}
      <div
        style={{ position: 'relative', zIndex: 51, width: '100%', maxWidth: '28rem', borderRadius: '1.5rem', overflow: 'hidden', backgroundColor: '#0f172a', border: `3px solid ${color}`, boxShadow: `0 0 60px ${color}55` }}
      >
        {/* Barra superior */}
        <div style={{ backgroundColor: color, height: 6 }} />

        {/* Cabecera */}
        <div className="p-6 pb-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 40 }}>{EMOJIS[alerta.tipo]}</span>
              <div>
                <p className="text-3xl font-bold uppercase tracking-wide"
                  style={{ color }}>
                  {alerta.tipo}
                </p>
                <p className="text-gray-400 text-sm">
                  Alerta activa hace {formatTiempo(tiempoAlerta)}
                </p>
              </div>
            </div>
            <div
              className="rounded-full px-3 py-1 text-xs font-bold"
              style={{
                backgroundColor: pulsando ? color : 'transparent',
                color: pulsando ? '#fff' : color,
                border: `1px solid ${color}`,
                transition: 'all 0.3s',
              }}
            >
              ● EN VIVO
            </div>
          </div>
        </div>

        {/* Separador */}
        <div className="mx-6 my-4" style={{ height: 1, backgroundColor: '#1e293b' }} />

        {/* Datos del local */}
        <div className="px-6 mb-4">
          <div className="rounded-2xl p-4" style={{ backgroundColor: '#1e293b' }}>
            <p className="text-white font-bold text-lg mb-1">
              🏪 Local {alerta.local_numero}
              {alerta.local_nombre && ` — ${alerta.local_nombre}`}
            </p>
            {alerta.telefono && (
              <p className="text-gray-300 text-sm">📞 {alerta.telefono}</p>
            )}
            {alerta.detalle && (
              <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: '#0f172a' }}>
                <p className="text-gray-400 text-xs mb-1">Detalle:</p>
                <p className="text-gray-200 text-sm">{alerta.detalle}</p>
              </div>
            )}
          </div>
        </div>

        {/* Hora */}
        <div className="px-6 mb-4 text-center">
          <p className="text-gray-500 text-xs">
            Recibida a las{' '}
            {new Date(alerta.created_at).toLocaleTimeString('es-CO', {
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            })}
          </p>
        </div>

        {/* Botones */}
        <div className="p-6 pt-0 flex flex-col gap-3">
          {mostrarRespuesta ? (
            <>
              <p className="text-gray-400 text-sm mb-1">
                Respuesta al local (opcional):
              </p>

              {/* Respuestas rápidas */}
              {respuestasRapidas.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {respuestasRapidas.map((rr) => (
                    <button
                      key={rr.id}
                      onClick={() => setRespuesta(rr.texto)}
                      style={{
                        backgroundColor: respuesta === rr.texto ? '#1d4ed8' : '#1e293b',
                        color: respuesta === rr.texto ? '#fff' : '#94a3b8',
                        border: `1px solid ${respuesta === rr.texto ? '#3b82f6' : '#374151'}`,
                        borderRadius: '0.75rem',
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {rr.texto}
                    </button>
                  ))}
                </div>
              )}

              <textarea
                className="w-full rounded-xl p-3 text-sm"
                style={{ backgroundColor: '#1e293b', color: 'white', border: 'none', resize: 'vertical' }}
                rows={3}
                placeholder="Escribe o selecciona una respuesta rapida..."
                value={respuesta}
                onChange={e => setRespuesta(e.target.value)}
                autoFocus
              />
              <button
                onClick={confirmarAtender}
                className="w-full py-4 rounded-2xl font-bold text-white text-lg"
                style={{ backgroundColor: '#16a34a' }}
              >
                ✅ Confirmar atención
              </button>
              <button
                onClick={() => setMostrarRespuesta(false)}
                className="w-full py-3 rounded-2xl text-sm"
                style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}
              >
                ← Volver
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleAtender}
                className="w-full py-4 rounded-2xl font-bold text-white text-lg"
                style={{ backgroundColor: '#16a34a' }}
              >
                ✅ Atender alerta
              </button>
              <button
                onClick={handlePosponer}
                className="w-full py-4 rounded-2xl font-bold text-lg"
                style={{ backgroundColor: '#1e293b', color: '#f59e0b' }}
              >
                ⏸️ Posponer sin responder
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}