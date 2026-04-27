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
  const [alertaEnviada, setAlertaEnviada] = useState(null)
  const [sinConexion, setSinConexion] = useState(false)
  const [comunicadoActivo, setComunicadoActivo] = useState(null)

  useEffect(() => {
  function actualizarConexion() {
    setSinConexion(!navigator.onLine)
  }
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

    useEffect(() => {
    const canal = supabase
      .channel('comunicados-masivos')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comunicados' },
        (payload) => {
          setComunicadoActivo(payload.new)
        }
      )
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
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'alertas',
            filter: `id=eq.${alertaId}`,
          },
          (payload) => {
            setAlertaEnviada(payload.new)
            if (payload.new.estado === 'atendida') {
              supabase.removeChannel(canal)
            }
          }
        )
        .subscribe()
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
            Central de Monitoreo ha sido notificada. Mantén la calma.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Local {localData.numero} — {localData.nombre}
          </p>

          {alertaEnviada?.respuesta && (
            <div className="bg-green-900 border border-green-600 rounded-2xl p-4 mb-8 w-full max-w-sm">
              <p className="text-green-400 text-sm font-bold mb-1">
                💬 Respuesta de Central de Monitoreo:
              </p>
              <p className="text-white text-sm">{alertaEnviada.respuesta}</p>
            </div>
          )}

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
        {comunicadoActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="bg-gray-900 rounded-3xl overflow-hidden w-full max-w-sm border-2 border-blue-500"
            style={{ boxShadow: '0 0 40px #3b82f644' }}>
            <div className="bg-blue-600 px-4 py-2 flex items-center gap-2">
              <span className="text-white font-bold text-sm">
                📢 Comunicado del Centro Comercial
              </span>
            </div>
            <div className="p-6">
              <p className="text-white text-lg font-medium mb-6 leading-relaxed">
                {comunicadoActivo.mensaje}
              </p>
              <p className="text-gray-400 text-xs mb-6">
                {new Date(comunicadoActivo.created_at).toLocaleTimeString('es-CO', {
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
              <button
                onClick={() => setComunicadoActivo(null)}
                className="w-full bg-blue-600 text-white py-3 rounded-2xl font-bold"
              >
                Entendido ✓
              </button>
            </div>
          </div>
        </div>
      )}

  {sinConexion && (
    <div className="bg-red-900 border border-red-600 rounded-2xl p-4 mb-4 text-center">
      <p className="text-red-400 font-bold text-sm">⚠️ Sin conexión a internet</p>
      <p className="text-red-300 text-xs mt-1">
        No es posible enviar alertas. Verifica tu WiFi o datos móviles.
      </p>
    </div>
  )}
        <div className="text-center mb-2 mt-8">
          {localData.etapa === 'empleado' ? (
        <>
          <p className="text-gray-400 text-sm">{localData.piso}</p>
          <h1 className="text-white text-xl font-bold mb-8">
            {localData.nombre}
          </h1>
        </>
      ) : (
        <>
          <p className="text-gray-400 text-sm">
            Etapa {localData.etapa} • Piso {localData.piso}
          </p>
          <h1 className="text-white text-xl font-bold">
            Local {localData.numero}
          </h1>
          <p className="text-gray-300 text-sm mb-8">{localData.nombre}</p>
        </>
      )}
          
          
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