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

const COLORES = {
  seguridad: 'border-red-500 bg-red-950',
  salud: 'border-orange-500 bg-orange-950',
  siniestro: 'border-yellow-500 bg-yellow-950',
  mantenimiento: 'border-blue-500 bg-blue-950',
  asistencia: 'border-green-500 bg-green-950',
}

const EMOJIS = {
  seguridad: '🚨',
  salud: '🏥',
  siniestro: '🔥',
  mantenimiento: '🔧',
  asistencia: '🙋',
}

function tiempoTranscurrido(fecha) {
  const diff = Math.floor((new Date() - new Date(fecha)) / 1000)
  if (diff < 60) return `hace ${diff} seg`
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  return `hace ${Math.floor(diff / 3600)} h`
}

function obtenerOperador() {
  try {
    const data = sessionStorage.getItem('operador')
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

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
  const alertasAnteriores = useRef([])
  const cargaInicial = useRef(true)
  const [respondiendo, setRespondiendo] = useState(null)
  const [textoRespuesta, setTextoRespuesta] = useState('')

  async function cargarAlertas() {
    const { data, error } = await supabase
      .from('alertas')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) {
      const pendientesNuevas = data.filter((a) => a.estado === 'pendiente')
      if (cargaInicial.current) {
        alertasAnteriores.current = pendientesNuevas
        cargaInicial.current = false
      } else {
        const idsAnteriores = alertasAnteriores.current.map((a) => a.id)
        const nuevas = pendientesNuevas.filter(
          (a) => !idsAnteriores.includes(a.id)
        )
        if (nuevas.length > 0) {
          setAlertaActiva(nuevas[0])
        }
        alertasAnteriores.current = pendientesNuevas
      }
      setAlertas(data)
    }
    setCargando(false)
  }

  async function cambiarEstado(id, nuevoEstado, tiempoRespuesta = null, respuesta = null) {
  const operadorActual = operador || obtenerOperador()
  const ahora = new Date().toISOString()
  const alerta = alertas.find((a) => a.id === id)

  const tiempoCalculado = tiempoRespuesta !== null
    ? tiempoRespuesta
    : alerta
      ? Math.floor((new Date() - new Date(alerta.created_at)) / 1000)
      : null

  const actualizacion = {
    estado: nuevoEstado,
    atendida_at: nuevoEstado === 'atendida' ? ahora : null,
    atendida_por: operadorActual?.nombre || null,
    tiempo_respuesta_seg: tiempoCalculado,
  }

  if (respuesta !== null) {
    actualizacion.respuesta = respuesta
  }

  const { error } = await supabase
    .from('alertas')
    .update(actualizacion)
    .eq('id', id)
  if (!error) cargarAlertas()
}

  function cerrarSesion() {
    const confirmar = window.confirm('¿Cerrar sesión?')
    if (!confirmar) return
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

    const canal = supabase
      .channel('alertas-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alertas' },
        () => cargarAlertas()
      )
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [autenticado])

  useEffect(() => {
    if (audioActivado) desbloquearAudio()
  }, [audioActivado])

  if (!autenticado) {
    return (
      <Login
        onLogin={(data) => {
          setOperador(data)
          setAutenticado(true)
        }}
      />
    )
  }

  const esAdmin = operador?.rol === 'admin'
  const alertasFiltradas = alertas.filter((a) => a.estado === filtro)

  return (
    <div className="min-h-screen bg-gray-900 p-4">

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

      {/* Banner activación audio */}
      {!audioActivado && (
        <div
          onClick={() => setAudioActivado(true)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 cursor-pointer"
        >
          <div className="bg-yellow-500 text-gray-900 px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 shadow-xl animate-bounce">
            <span className="text-xl">🔔</span>
            Toca aquí para activar las alertas sonoras
            <span className="text-xl">🔔</span>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">

        {/* Encabezado */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-white text-xl font-bold">
                🖥️ Central de Monitoreo
              </h1>
              {operador && (
                <p className="text-gray-400 text-xs mt-1">
                  {operador.nombre} —{' '}
                  <span className={operador.rol === 'admin'
                    ? 'text-purple-400'
                    : 'text-blue-400'
                  }>
                    {operador.rol}
                  </span>
                </p>
              )}
            </div>
            <button
              onClick={cerrarSesion}
              className="px-3 py-2 rounded-xl text-sm bg-gray-800 text-red-400"
            >
              🚪 Salir
            </button>
          </div>

          {/* Pestañas en grid responsive */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              onClick={() => setVista('alertas')}
              className={`px-3 py-2 rounded-xl text-sm text-center ${
                vista === 'alertas'
                  ? 'bg-white text-gray-900'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              🚨 Alertas
              {alertas.filter((a) => a.estado === 'pendiente').length > 0 && (
                <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {alertas.filter((a) => a.estado === 'pendiente').length}
                </span>
              )}
            </button>

            {esAdmin && (
              <>
                <button
                  onClick={() => setVista('locales')}
                  className={`px-3 py-2 rounded-xl text-sm text-center ${
                    vista === 'locales'
                      ? 'bg-white text-gray-900'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  🏪 Marcas
                </button>
                <button
                  onClick={() => setVista('empleados')}
                  className={`px-3 py-2 rounded-xl text-sm text-center ${
                    vista === 'empleados'
                      ? 'bg-white text-gray-900'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  👷 Empleados
                </button>
                <button
                  onClick={() => setVista('operadores')}
                  className={`px-3 py-2 rounded-xl text-sm text-center ${
                    vista === 'operadores'
                      ? 'bg-white text-gray-900'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  👮 Operadores
                </button>
              </>
            )}

            <button
              onClick={() => setVista('respuestas')}
              className={`px-3 py-2 rounded-xl text-sm text-center ${
                vista === 'respuestas'
                  ? 'bg-white text-gray-900'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              💬 Respuestas
            </button>

            <button
              onClick={() => setVista('comunicados')}
              className={`px-3 py-2 rounded-xl text-sm text-center ${
                vista === 'comunicados'
                  ? 'bg-white text-gray-900'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              📢 Comunicados
            </button>

            <button
              onClick={() => setVista('reportes')}
              className={`px-3 py-2 rounded-xl text-sm text-center ${
                vista === 'reportes'
                  ? 'bg-white text-gray-900'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              📊 Reportes
            </button>
            <button
              onClick={() => setVista('estadisticas')}
              className={`px-3 py-2 rounded-xl text-sm text-center ${
                vista === 'estadisticas'
                  ? 'bg-white text-gray-900'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              📈 Estadísticas
            </button>
          </div>
        </div>

        {/* Vistas */}
        {vista === 'comunicados' && esAdmin ? (
        <Comunicados operadorNombre={operador?.nombre} />
        ) : vista === 'respuestas' && esAdmin ? (
          <RespuestasRapidas />
        ) : vista === 'estadisticas' ? (
          <Estadisticas />
        ) : vista === 'reportes' ? (
          <Reportes />        
        ) : vista === 'operadores' && esAdmin ? (
          <Operadores />
        ) : vista === 'empleados' && esAdmin ? (
          <Empleados />
        ) : vista === 'locales' && esAdmin ? (
          <Locales />
        ) : (
          <>
            {/* Filtros de alertas */}
            <div className="flex flex-wrap gap-2 mb-6">

              {['pendiente', 'atendida', 'pospuesta'].map((estado) => (
                <button
                  key={estado}
                  onClick={() => setFiltro(estado)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium capitalize ${
                    filtro === estado
                      ? 'bg-white text-gray-900'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {estado}
                  <span className="ml-2 text-xs">
                    ({alertas.filter((a) => a.estado === estado).length})
                  </span>
                </button>
              ))}
            </div>

            {/* Lista de alertas */}
            {cargando ? (
              <p className="text-gray-400 text-center py-12">Cargando...</p>
            ) : alertasFiltradas.length === 0 ? (
              <p className="text-gray-400 text-center py-12">
                No hay alertas {filtro}s
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {alertasFiltradas.map((alerta) => (
                  <div
                    key={alerta.id}
                    className={`border-l-4 rounded-xl p-4 ${
                      COLORES[alerta.tipo] || 'border-gray-500 bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-2xl mr-2">
                          {EMOJIS[alerta.tipo]}
                        </span>
                        <span className="text-white font-bold capitalize">
                          {alerta.tipo}
                        </span>
                      </div>
                      <span className="text-gray-400 text-xs">
                        {tiempoTranscurrido(alerta.created_at)}
                      </span>
                    </div>

                    <div className="mb-3">
                      <p className="text-white font-medium">
                        Local {alerta.local_numero}
                        {alerta.local_nombre && ` — ${alerta.local_nombre}`}
                      </p>
                      {alerta.telefono && (
                        <p className="text-gray-300 text-sm">
                          📞 {alerta.telefono}
                        </p>
                      )}
                      {alerta.detalle && (
                        <p className="text-gray-300 text-sm mt-1">
                          📝 {alerta.detalle}
                        </p>
                      )}
                      {alerta.tiempo_respuesta_seg != null && (
                        <p className="text-gray-400 text-xs mt-2">
                          ⏱️ Respondida en{' '}
                          {alerta.tiempo_respuesta_seg < 60
                            ? `${alerta.tiempo_respuesta_seg} seg`
                            : `${Math.floor(alerta.tiempo_respuesta_seg / 60)} min ${
                                alerta.tiempo_respuesta_seg % 60
                              } seg`}
                          {alerta.atendida_por && ` — por ${alerta.atendida_por}`}
                          {alerta.respuesta && (
                            <p className="text-green-400 text-xs mt-1">
                              💬 Respuesta: {alerta.respuesta}
                            </p>
                          )}
                        </p>
                      )}
                    </div>

                    {alerta.estado === 'pendiente' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => cambiarEstado(alerta.id, 'atendida')}
                          className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg"
                        >
                          ✅ Atender
                        </button>
                        <button
                          onClick={() => cambiarEstado(alerta.id, 'pospuesta')}
                          className="bg-yellow-600 text-white text-sm px-4 py-2 rounded-lg"
                        >
                          ⏸️ Posponer
                        </button>
                      </div>
                    )}

                    {alerta.estado === 'pospuesta' && (
                      <>

                        {respondiendo === alerta.id ? (
                          <div className="mt-2">
                            <textarea
                              className="w-full bg-gray-700 text-white rounded-xl p-3 text-sm mb-2"
                              rows={2}
                              placeholder="Respuesta al local (opcional)..."
                              value={textoRespuesta}
                              onChange={(e) => setTextoRespuesta(e.target.value)}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  await cambiarEstado(
                                    alerta.id,
                                    'atendida',
                                    null,
                                    textoRespuesta.trim() || null
                                  )
                                  setRespondiendo(null)
                                  setTextoRespuesta('')
                                }}
                                className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg"
                              >
                                ✅ Confirmar
                              </button>
                              <button
                                onClick={() => {
                                  setRespondiendo(null)
                                  setTextoRespuesta('')
                                }}
                                className="bg-gray-700 text-gray-400 text-sm px-4 py-2 rounded-lg"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRespondiendo(alerta.id)}
                            className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg"
                          >
                            ✅ Marcar como atendida
                          </button>
                        )}
                      </>
                    )}

                    {alerta.estado === 'atendida' && !alerta.falsa_alarma && (
                    <button
                      onClick={async () => {
                        const ok = window.confirm('¿Marcar esta alerta como falsa alarma?')
                        if (!ok) return
                        await supabase.from('alertas').update({ falsa_alarma: true }).eq('id', alerta.id)
                        cargarAlertas()
                      }}
                      className="bg-gray-700 text-orange-400 text-xs px-3 py-1 rounded-lg mt-2"
                    >
                      ⚠️ Marcar como falsa alarma
                    </button>
                  )}
                  {alerta.falsa_alarma && (
                    <span className="text-orange-400 text-xs mt-2 inline-block">
                      ⚠️ Falsa alarma registrada
                    </span>
                  )}
                    


                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}