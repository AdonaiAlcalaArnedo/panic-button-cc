import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Login from '../components/Login'
import Locales from './Locales'
import Empleados from './Empleados'

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

export default function Dashboard() {
  const [alertas, setAlertas] = useState([])
  const [filtro, setFiltro] = useState('pendiente')
  const [cargando, setCargando] = useState(true)
  const [vista, setVista] = useState('alertas')
  const [autenticado, setAutenticado] = useState(
    sessionStorage.getItem('dashboard_auth') === 'true'
  )

  async function cargarAlertas() {
    const { data, error } = await supabase
      .from('alertas')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setAlertas(data)
    setCargando(false)
  }

  useEffect(() => {
    if (!autenticado) return

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

  async function cambiarEstado(id, nuevoEstado) {
    const { error } = await supabase
      .from('alertas')
      .update({
        estado: nuevoEstado,
        atendida_at:
          nuevoEstado === 'atendida' ? new Date().toISOString() : null,
      })
      .eq('id', id)
    if (!error) cargarAlertas()
  }

  if (!autenticado) {
    return <Login onLogin={() => setAutenticado(true)} />
  }

  const alertasFiltradas = alertas.filter((a) => a.estado === filtro)

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">

        {/* Encabezado */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-2xl font-bold">
            🖥️ Central de Monitoreo
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setVista('alertas')}
              className={`px-4 py-2 rounded-xl text-sm ${
                vista === 'alertas'
                  ? 'bg-white text-gray-900'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              🚨 Alertas
            </button>
            <button
              onClick={() => setVista('locales')}
              className={`px-4 py-2 rounded-xl text-sm ${
                vista === 'locales'
                  ? 'bg-white text-gray-900'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              🏪 Marcas
            </button>
            <button
              onClick={() => setVista('empleados')}
              className={`px-4 py-2 rounded-xl text-sm ${
                vista === 'empleados'
                  ? 'bg-white text-gray-900'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              👷 Empleados
            </button>
          </div>
        </div>

        {/* Vistas */}
        {vista === 'empleados' ? (
          <Empleados />
        ) : vista === 'locales' ? (
          <Locales />
        ) : (
          <>
            {/* Filtros de alertas */}
            <div className="flex gap-2 mb-6">
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
                      <button
                        onClick={() => cambiarEstado(alerta.id, 'atendida')}
                        className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg"
                      >
                        ✅ Marcar como atendida
                      </button>
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