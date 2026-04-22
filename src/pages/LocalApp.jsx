import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TIPOS_ALERTA = [
  { tipo: 'seguridad', label: 'Seguridad', emoji: '🚨', color: 'bg-red-600' },
  { tipo: 'salud', label: 'Salud', emoji: '🏥', color: 'bg-orange-500' },
  { tipo: 'siniestro', label: 'Siniestro', emoji: '🔥', color: 'bg-yellow-500' },
  { tipo: 'mantenimiento', label: 'Mantenimiento', emoji: '🔧', color: 'bg-blue-500' },
  { tipo: 'asistencia', label: 'Asistencia', emoji: '🙋', color: 'bg-green-600' },
]

function guardarLocal(local) {
  localStorage.setItem('local_data', JSON.stringify(local))
}

function obtenerLocal() {
  try {
    const data = localStorage.getItem('local_data')
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export default function LocalApp() {
  const [paso, setPaso] = useState('cargando')
  const [localData, setLocalData] = useState(null)
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null)
  const [detalle, setDetalle] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    async function iniciar() {
      const params = new URLSearchParams(window.location.search)
      const token = params.get('token')

      if (token) {
        const { data, error } = await supabase
          .from('locales')
          .select('*')
          .eq('token', token)
          .eq('activo', true)
          .single()

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

  async function enviarAlerta() {
  setEnviando(true)

  const { data: localActivo } = await supabase
    .from('locales')
    .select('activo')
    .eq('token', localData.token)
    .single()

  if (!localActivo || !localActivo.activo) {
    localStorage.removeItem('local_data')
    setEnviando(false)
    setPaso('sin_acceso')
    return
  }

  const { error } = await supabase.from('alertas').insert({
    local_numero: localData.numero,
    local_nombre: localData.nombre,
    tipo: tipoSeleccionado.tipo,
    detalle: detalle,
    estado: 'pendiente',
  })
  setEnviando(false)
  if (error) {
    alert('Error al enviar. Intenta de nuevo.')
  } else {
    setPaso('confirmacion')
  }
}

  function reiniciar() {
    setPaso('inicio')
    setTipoSeleccionado(null)
    setDetalle('')
  }

  // Pantalla de carga
  if (paso === 'cargando') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Verificando acceso...</p>
      </div>
    )
  }

  // Sin token y sin local guardado
  if (paso === 'sin_acceso') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-white text-2xl font-bold mb-2 text-center">
          Acceso restringido
        </h2>
        <p className="text-gray-400 text-center">
          Esta app solo puede activarse escaneando el código QR
          asignado a tu local.
        </p>
        <p className="text-gray-500 text-sm text-center mt-4">
          Contacta al administrador del centro comercial.
        </p>
      </div>
    )
  }

  // Token inválido
  if (paso === 'invalido') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-white text-2xl font-bold mb-2 text-center">
          QR no válido
        </h2>
        <p className="text-gray-400 text-center">
          Este código QR no es válido o fue desactivado.
          Contacta al administrador.
        </p>
      </div>
    )
  }

  // Confirmación enviada
  if (paso === 'confirmacion') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-white text-2xl font-bold mb-2">Alerta enviada</h2>
        <p className="text-gray-400 text-center mb-2">
          Vigilancia ha sido notificada. Mantén la calma.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Local {localData.numero} — {localData.nombre}
        </p>
        <button
          onClick={reiniciar}
          className="bg-gray-700 text-white px-8 py-3 rounded-xl"
        >
          Nueva alerta
        </button>
      </div>
    )
  }

  // Detalle de alerta
  if (paso === 'detalle') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col p-6">
        <button onClick={() => setPaso('inicio')} className="text-gray-400 mb-6">
          ← Volver
        </button>
        <div className="text-4xl mb-2">{tipoSeleccionado.emoji}</div>
        <h2 className="text-white text-2xl font-bold mb-1">
          {tipoSeleccionado.label}
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Local {localData.numero} — {localData.nombre}
        </p>

        <label className="text-gray-400 text-sm mb-1">
          Detalle adicional (opcional)
        </label>
        <textarea
          className="bg-gray-800 text-white rounded-xl p-3 mb-6"
          placeholder="Describe brevemente la situación..."
          rows={4}
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
        />

        <button
          onClick={enviarAlerta}
          disabled={enviando}
          className={`${tipoSeleccionado.color} text-white text-xl font-bold py-4 rounded-2xl`}
        >
          {enviando ? 'Enviando...' : '🚨 Enviar Alerta'}
        </button>
      </div>
    )
  }

  // Pantalla principal con botones
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-2 mt-8">
          <p className="text-gray-400 text-sm">
            Etapa {localData.etapa} • Piso {localData.piso}
          </p>
          <h1 className="text-white text-xl font-bold">
            Local {localData.numero}
          </h1>
          <p className="text-gray-300 text-sm mb-8">{localData.nombre}</p>
        </div>
        <div className="flex flex-col gap-4">
          {TIPOS_ALERTA.map((item) => (
            <button
              key={item.tipo}
              onClick={() => {
                setTipoSeleccionado(item)
                setPaso('detalle')
              }}
              className={`${item.color} text-white text-xl font-bold py-5 rounded-2xl flex items-center justify-center gap-3`}
            >
              <span className="text-3xl">{item.emoji}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}