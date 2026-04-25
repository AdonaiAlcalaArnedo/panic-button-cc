import { useEffect, useRef, useState } from 'react'

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

  if (!alerta) return null

  const color = COLORES_BORDE[alerta.tipo] || '#ef4444'

  return (
    <div
      style={{
        backgroundColor: pulsando ? `${color}18` : `${color}08`,
        border: `3px solid ${color}`,
        borderRadius: '1.5rem',
        marginBottom: '1.5rem',
        overflow: 'hidden',
        transition: 'background-color 0.3s',
        boxShadow: `0 0 30px ${color}44`,
      }}
    >
      {/* Barra superior */}
      <div style={{ backgroundColor: color, height: 6 }} />

      <div style={{ padding: '1.5rem', backgroundColor: '#0f172a' }}>
        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: 36 }}>{EMOJIS[alerta.tipo]}</span>
            <div>
              <p style={{ color, fontWeight: 'bold', fontSize: '1.25rem', textTransform: 'uppercase', margin: 0 }}>
                {alerta.tipo}
              </p>
              <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>
                Alerta activa hace {formatTiempo(tiempoAlerta)}
              </p>
            </div>
          </div>
          <div style={{
            backgroundColor: pulsando ? color : 'transparent',
            color: pulsando ? '#fff' : color,
            border: `1px solid ${color}`,
            borderRadius: '9999px',
            padding: '2px 10px',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            transition: 'all 0.3s',
          }}>
            EN VIVO
          </div>
        </div>

        {/* Datos del local */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '1rem', marginBottom: '1rem' }}>
          <p style={{ color: 'white', fontWeight: 'bold', fontSize: '1rem', margin: '0 0 0.25rem' }}>
            Local {alerta.local_numero}
            {alerta.local_nombre && ` — ${alerta.local_nombre}`}
          </p>
          {alerta.telefono && (
            <p style={{ color: '#d1d5db', fontSize: '0.875rem', margin: '0.25rem 0' }}>
              📞 {alerta.telefono}
            </p>
          )}
          {alerta.detalle && (
            <div style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '0.75rem', marginTop: '0.5rem' }}>
              <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: '0 0 0.25rem' }}>Detalle:</p>
              <p style={{ color: '#e2e8f0', fontSize: '0.875rem', margin: 0 }}>{alerta.detalle}</p>
            </div>
          )}
        </div>

        {/* Hora */}
        <p style={{ color: '#6b7280', fontSize: '0.75rem', textAlign: 'center', marginBottom: '1rem' }}>
          Recibida a las {new Date(alerta.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>

        {/* Botones */}
        {mostrarRespuesta ? (
          <div>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Respuesta al local (opcional):
            </p>
            <textarea
              style={{ width: '100%', backgroundColor: '#1e293b', color: 'white', borderRadius: '0.75rem', padding: '0.75rem', border: 'none', fontSize: '0.875rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
              rows={3}
              placeholder="Ej: Guardia en camino, mantén la calma..."
              value={respuesta}
              onChange={e => setRespuesta(e.target.value)}
              autoFocus
            />
            <button
              onClick={confirmarAtender}
              style={{ width: '100%', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '1rem', padding: '1rem', fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.5rem', cursor: 'pointer' }}
            >
              ✅ Confirmar atención
            </button>
            <button
              onClick={() => setMostrarRespuesta(false)}
              style={{ width: '100%', backgroundColor: '#1e293b', color: '#94a3b8', border: 'none', borderRadius: '1rem', padding: '0.75rem', fontSize: '0.875rem', cursor: 'pointer' }}
            >
              ← Volver
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={handleAtender}
              style={{ width: '100%', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '1rem', padding: '1rem', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}
            >
              ✅ Atender alerta
            </button>
            <button
              onClick={handlePosponer}
              style={{ width: '100%', backgroundColor: '#1e293b', color: '#f59e0b', border: 'none', borderRadius: '1rem', padding: '1rem', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
            >
              ⏸️ Posponer sin responder
            </button>
          </div>
        )}
      </div>
    </div>
  )
}