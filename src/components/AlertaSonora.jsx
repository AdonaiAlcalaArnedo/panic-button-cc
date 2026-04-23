import { useEffect, useRef, useState } from 'react'

const EMOJIS = {
  seguridad: '🚨',
  salud: '🏥',
  siniestro: '🔥',
  mantenimiento: '🔧',
  asistencia: '🙋',
}

const COLORES_BORDE = {
  seguridad: '#ef4444',
  salud: '#f97316',
  siniestro: '#eab308',
  mantenimiento: '#3b82f6',
  asistencia: '#22c55e',
}

function crearSonidoAlerta(audioCtx, tipo) {
  const frecuencias = {
    seguridad: [880, 660, 880, 660],
    salud: [523, 659, 784, 659],
    siniestro: [440, 554, 440, 554],
    mantenimiento: [392, 494, 392, 494],
    asistencia: [523, 587, 659, 587],
  }
  const freqs = frecuencias[tipo] || frecuencias.seguridad

  freqs.forEach((freq, i) => {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.frequency.value = freq
    osc.type = 'sine'
    const inicio = audioCtx.currentTime + i * 0.25
    gain.gain.setValueAtTime(0, inicio)
    gain.gain.linearRampToValueAtTime(0.3, inicio + 0.05)
    gain.gain.linearRampToValueAtTime(0, inicio + 0.2)
    osc.start(inicio)
    osc.stop(inicio + 0.25)
  })
}

export default function AlertaSonora({ alerta, onAtender, onPosponer }) {
  const audioCtxRef = useRef(null)
  const intervaloRef = useRef(null)
  const [pulsando, setPulsando] = useState(true)
  const [tiempoAlerta, setTiempoAlerta] = useState(0)

  useEffect(() => {
    if (!alerta) return

    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()

    function tocarSonido() {
      if (audioCtxRef.current) {
        crearSonidoAlerta(audioCtxRef.current, alerta.tipo)
      }
    }

    tocarSonido()
    intervaloRef.current = setInterval(tocarSonido, 3000)

    const intervaloTiempo = setInterval(() => {
      setTiempoAlerta((t) => t + 1)
    }, 1000)

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 Nueva alerta — Centro Comercial', {
        body: `${alerta.tipo.toUpperCase()} — Local ${alerta.local_numero} ${
          alerta.local_nombre ? `(${alerta.local_nombre})` : ''
        }`,
        icon: '/icons/icon-192.png',
        requireInteraction: true,
      })
    }

    const intervaloParpadeo = setInterval(() => {
      setPulsando((p) => !p)
    }, 600)

    return () => {
      clearInterval(intervaloRef.current)
      clearInterval(intervaloTiempo)
      clearInterval(intervaloParpadeo)
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
      }
    }
  }, [alerta])

  function detenerSonido() {
    clearInterval(intervaloRef.current)
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
  }

  function handleAtender() {
  detenerSonido()
  onAtender(alerta.id, tiempoAlerta)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>

      {/* Fondo pulsante */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          backgroundColor: color,
          opacity: pulsando ? 0.08 : 0.03,
        }}
      />

      {/* Modal principal */}
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          backgroundColor: '#0f172a',
          border: `3px solid ${color}`,
          boxShadow: `0 0 60px ${color}55`,
        }}
      >
        {/* Barra superior de color */}
        <div style={{ backgroundColor: color, height: 6 }} />

        {/* Cabecera */}
        <div className="p-6 pb-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 40 }}>{EMOJIS[alerta.tipo]}</span>
              <div>
                <p
                  className="text-3xl font-bold uppercase tracking-wide"
                  style={{ color }}
                >
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
        <div className="px-6 mb-6">
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: '#1e293b' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🏪</span>
              <p className="text-white font-bold text-lg">
                Local {alerta.local_numero}
              </p>
            </div>
            {alerta.local_nombre && (
              <p className="text-gray-300 text-sm mb-2">
                {alerta.local_nombre}
              </p>
            )}
            {alerta.telefono && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gray-400 text-sm">📞</span>
                <p className="text-gray-300 text-sm">{alerta.telefono}</p>
              </div>
            )}
            {alerta.detalle && (
              <div
                className="mt-3 p-3 rounded-xl"
                style={{ backgroundColor: '#0f172a' }}
              >
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
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
        </div>

        {/* Botones de acción */}
        <div className="p-6 pt-0 flex flex-col gap-3">
          <button
            onClick={handleAtender}
            className="w-full py-4 rounded-2xl font-bold text-white text-lg transition-all"
            style={{ backgroundColor: '#16a34a' }}
          >
            ✅ Atender alerta
          </button>
          <button
            onClick={handlePosponer}
            className="w-full py-4 rounded-2xl font-bold text-lg transition-all"
            style={{ backgroundColor: '#1e293b', color: '#f59e0b' }}
          >
            ⏸️ Posponer
          </button>
        </div>
      </div>
    </div>
  )
}