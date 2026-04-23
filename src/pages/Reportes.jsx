import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'

const COLORES_TIPO = {
  seguridad: '#ef4444',
  salud: '#f97316',
  siniestro: '#eab308',
  mantenimiento: '#3b82f6',
  asistencia: '#22c55e',
}

const EMOJIS = {
  seguridad: '🚨',
  salud: '🏥',
  siniestro: '🔥',
  mantenimiento: '🔧',
  asistencia: '🙋',
}

function formatTiempo(seg) {
  if (!seg && seg !== 0) return '—'
  if (seg < 60) return `${seg} seg`
  return `${Math.floor(seg / 60)} min ${seg % 60} seg`
}

function formatFecha(fecha) {
  return new Date(fecha).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Reportes() {
  const [alertas, setAlertas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroFecha, setFiltroFecha] = useState('7')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    cargarAlertas()
  }, [])

  async function cargarAlertas() {
    const { data, error } = await supabase
      .from('alertas')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setAlertas(data)
    setCargando(false)
  }

  const ahora = new Date()
  const diasAtras = new Date(ahora)
  diasAtras.setDate(ahora.getDate() - parseInt(filtroFecha))

  const alertasFiltradas = alertas.filter((a) => {
    const fecha = new Date(a.created_at)
    const coincideFecha = filtroFecha === 'todos' || fecha >= diasAtras
    const coincideTipo = filtroTipo === 'todos' || a.tipo === filtroTipo
    const coincideEstado = filtroEstado === 'todos' || a.estado === filtroEstado
    const coincideBusqueda =
      busqueda === '' ||
      a.local_numero?.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.local_nombre?.toLowerCase().includes(busqueda.toLowerCase())
    return coincideFecha && coincideTipo && coincideEstado && coincideBusqueda
  })

  const totalAlertas = alertasFiltradas.length
  const atendidas = alertasFiltradas.filter((a) => a.estado === 'atendida').length
  const pendientes = alertasFiltradas.filter((a) => a.estado === 'pendiente').length
  const conTiempo = alertasFiltradas.filter((a) => a.tiempo_respuesta_seg != null)
  const promedioRespuesta = conTiempo.length
    ? Math.round(conTiempo.reduce((acc, a) => acc + a.tiempo_respuesta_seg, 0) / conTiempo.length)
    : null

  const datosPorTipo = Object.keys(COLORES_TIPO).map((tipo) => ({
    tipo,
    total: alertasFiltradas.filter((a) => a.tipo === tipo).length,
    color: COLORES_TIPO[tipo],
  })).filter((d) => d.total > 0)

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Cargando reportes...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          className="bg-gray-800 text-white rounded-xl px-4 py-2 text-sm"
          value={filtroFecha}
          onChange={(e) => setFiltroFecha(e.target.value)}
        >
          <option value="1">Hoy</option>
          <option value="7">Últimos 7 días</option>
          <option value="30">Últimos 30 días</option>
          <option value="90">Últimos 90 días</option>
          <option value="todos">Todo el historial</option>
        </select>
        <select
          className="bg-gray-800 text-white rounded-xl px-4 py-2 text-sm"
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="todos">Todos los tipos</option>
          {Object.keys(COLORES_TIPO).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          className="bg-gray-800 text-white rounded-xl px-4 py-2 text-sm"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="atendida">Atendidas</option>
          <option value="pospuesta">Pospuestas</option>
        </select>
        <input
          className="bg-gray-800 text-white rounded-xl px-4 py-2 text-sm flex-1"
          placeholder="Buscar por local..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-4">
        <div className="bg-gray-800 rounded-2xl p-4">
          <p className="text-gray-400 text-xs mb-1">Total alertas</p>
          <p className="text-white text-3xl font-bold">{totalAlertas}</p>
        </div>
        <div className="bg-gray-800 rounded-2xl p-4">
          <p className="text-gray-400 text-xs mb-1">Atendidas</p>
          <p className="text-green-400 text-3xl font-bold">{atendidas}</p>
        </div>
        <div className="bg-gray-800 rounded-2xl p-4">
          <p className="text-gray-400 text-xs mb-1">Pendientes</p>
          <p className="text-red-400 text-3xl font-bold">{pendientes}</p>
        </div>
        <div className="bg-gray-800 rounded-2xl p-4">
          <p className="text-gray-400 text-xs mb-1">Tiempo prom. respuesta</p>
          <p className="text-blue-400 text-xl font-bold">
            {formatTiempo(promedioRespuesta)}
          </p>
        </div>
      </div>

      {/* Gráfica por tipo */}
      {datosPorTipo.length > 0 && (
        <div className="bg-gray-800 rounded-2xl p-4 mb-6">
          <p className="text-gray-400 text-sm mb-4">Alertas por tipo</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={datosPorTipo} barSize={40}>
              <XAxis
                dataKey="tipo"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: 12,
                  color: '#fff',
                }}
                cursor={{ fill: '#374151' }}
              />
              <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                {datosPorTipo.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla historial */}
      <div className="bg-gray-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <p className="text-gray-400 text-sm">
            {alertasFiltradas.length} registros
          </p>
        </div>
        {alertasFiltradas.length === 0 ? (
          <p className="text-gray-400 text-center py-12">
            No hay alertas en este período
          </p>
        ) : (
          <div className="divide-y divide-gray-700">
            {alertasFiltradas.map((alerta) => (
              <div key={alerta.id} className="px-4 py-3">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span>{EMOJIS[alerta.tipo]}</span>
                    <span
                      className="text-sm font-bold capitalize"
                      style={{ color: COLORES_TIPO[alerta.tipo] }}
                    >
                      {alerta.tipo}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        alerta.estado === 'atendida'
                          ? 'bg-green-900 text-green-400'
                          : alerta.estado === 'pospuesta'
                          ? 'bg-yellow-900 text-yellow-400'
                          : 'bg-red-900 text-red-400'
                      }`}
                    >
                      {alerta.estado}
                    </span>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {formatFecha(alerta.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm">
                      Local {alerta.local_numero}
                      {alerta.local_nombre && ` — ${alerta.local_nombre}`}
                    </p>
                    {alerta.detalle && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        {alerta.detalle}
                      </p>
                    )}
                  </div>
                  {alerta.tiempo_respuesta_seg != null && (
                    <span className="text-gray-400 text-xs">
                      ⏱️ {formatTiempo(alerta.tiempo_respuesta_seg)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}