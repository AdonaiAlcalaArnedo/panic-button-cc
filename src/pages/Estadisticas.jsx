import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'
import * as XLSX from 'xlsx'

const COLORES_TIPO = {
  seguridad: '#ef4444',
  salud: '#f97316',
  siniestro: '#eab308',
  mantenimiento: '#3b82f6',
  asistencia: '#22c55e',
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const COLORES_BARRAS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff']

function formatTiempo(seg) {
  if (!seg && seg !== 0) return '—'
  if (seg < 60) return `${seg} seg`
  return `${Math.floor(seg / 60)} min ${seg % 60} seg`
}

export default function Estadisticas() {
  const [alertas, setAlertas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [periodo, setPeriodo] = useState('7')

  useEffect(() => {
    cargarAlertas()
  }, [periodo])

  async function cargarAlertas() {
    setCargando(true)
    let query = supabase
      .from('alertas')
      .select('*')
      .order('created_at', { ascending: false })

    if (periodo !== 'todos') {
      const desde = new Date()
      desde.setDate(desde.getDate() - parseInt(periodo))
      query = query.gte('created_at', desde.toISOString())
    }

    const { data, error } = await query
    if (!error) setAlertas(data)
    setCargando(false)
  }

  // Turno actual — últimas 8 horas
  const ahora = new Date()
  const hace8h = new Date(ahora - 8 * 60 * 60 * 1000)
  const alertasTurno = alertas.filter(
    (a) => new Date(a.created_at) >= hace8h
  )
  const pendientesTurno = alertasTurno.filter((a) => a.estado === 'pendiente').length
  const atendidasTurno = alertasTurno.filter((a) => a.estado === 'atendida').length
  const tiempoPromedioTurno = (() => {
    const conTiempo = alertasTurno.filter((a) => a.tiempo_respuesta_seg != null)
    if (!conTiempo.length) return null
    return Math.round(conTiempo.reduce((acc, a) => acc + a.tiempo_respuesta_seg, 0) / conTiempo.length)
  })()

  // Ranking operadores
  const rankingOperadores = (() => {
    const mapa = {}
    alertas
      .filter((a) => a.atendida_por && a.tiempo_respuesta_seg != null)
      .forEach((a) => {
        if (!mapa[a.atendida_por]) {
          mapa[a.atendida_por] = { nombre: a.atendida_por, tiempos: [], total: 0 }
        }
        mapa[a.atendida_por].tiempos.push(a.tiempo_respuesta_seg)
        mapa[a.atendida_por].total++
      })
    return Object.values(mapa)
      .map((op) => ({
        ...op,
        promedio: Math.round(op.tiempos.reduce((a, b) => a + b, 0) / op.tiempos.length),
      }))
      .sort((a, b) => a.promedio - b.promedio)
  })()

  // Picos por hora
  const picosPorHora = (() => {
    const horas = Array.from({ length: 24 }, (_, i) => ({
      hora: `${i}:00`,
      total: 0,
    }))
    alertas.forEach((a) => {
      const hora = new Date(a.created_at).getHours()
      horas[hora].total++
    })
    return horas.filter((h) => h.total > 0)
  })()

  // Picos por día de semana
  const picosPorDia = (() => {
    const dias = DIAS.map((d) => ({ dia: d, total: 0 }))
    alertas.forEach((a) => {
      const dia = new Date(a.created_at).getDay()
      dias[dia].total++
    })
    return dias
  })()

  // Por tipo
  const porTipo = Object.keys(COLORES_TIPO).map((tipo) => ({
    name: tipo,
    value: alertas.filter((a) => a.tipo === tipo).length,
    color: COLORES_TIPO[tipo],
  })).filter((t) => t.value > 0)

    function exportarEstadisticas() {
    const libro = XLSX.utils.book_new()

    // Hoja 1 — Resumen del turno
    const turnoData = [
        ['Métrica', 'Valor'],
        ['Total alertas turno (8h)', alertasTurno.length],
        ['Atendidas en turno', atendidasTurno],
        ['Pendientes en turno', pendientesTurno],
        ['Tiempo promedio turno', formatTiempo(tiempoPromedioTurno)],
    ]
    const hojaTurno = XLSX.utils.aoa_to_sheet(turnoData)
    hojaTurno['!cols'] = [{ wch: 30 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(libro, hojaTurno, 'Turno Actual')

    // Hoja 2 — Ranking operadores
    const rankingData = [
        ['Posición', 'Operador', 'Alertas Atendidas', 'Tiempo Promedio'],
        ...rankingOperadores.map((op, i) => [
        i + 1,
        op.nombre,
        op.total,
        formatTiempo(op.promedio),
        ]),
    ]
    const hojaRanking = XLSX.utils.aoa_to_sheet(rankingData)
    hojaRanking['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 20 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(libro, hojaRanking, 'Ranking Operadores')

    // Hoja 3 — Picos por hora
    const horasData = [
        ['Hora', 'Total Alertas'],
        ...Array.from({ length: 24 }, (_, i) => {
        const total = alertas.filter(
            (a) => new Date(a.created_at).getHours() === i
        ).length
        return [`${i}:00`, total]
        }),
    ]
    const hojaHoras = XLSX.utils.aoa_to_sheet(horasData)
    hojaHoras['!cols'] = [{ wch: 10 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(libro, hojaHoras, 'Picos por Hora')

    // Hoja 4 — Picos por día
    const diasData = [
        ['Día', 'Total Alertas'],
        ...DIAS.map((dia, i) => [
        dia,
        alertas.filter((a) => new Date(a.created_at).getDay() === i).length,
        ]),
    ]
    const hojaDias = XLSX.utils.aoa_to_sheet(diasData)
    hojaDias['!cols'] = [{ wch: 10 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(libro, hojaDias, 'Picos por Día')

    // Hoja 5 — Por tipo
    const tipoData = [
        ['Tipo', 'Total Alertas', 'Porcentaje'],
        ...Object.keys(COLORES_TIPO).map((tipo) => {
        const total = alertas.filter((a) => a.tipo === tipo).length
        const pct = alertas.length
            ? ((total / alertas.length) * 100).toFixed(1) + '%'
            : '0%'
        return [tipo, total, pct]
        }),
    ]
    const hojaTipo = XLSX.utils.aoa_to_sheet(tipoData)
    hojaTipo['!cols'] = [{ wch: 16 }, { wch: 15 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(libro, hojaTipo, 'Por Tipo')

    // Hoja 6 — Datos crudos
    const crudosData = [
        ['Fecha', 'Local N°', 'Nombre Local', 'Tipo', 'Estado',
        'Detalle', 'Atendida Por', 'Tiempo Respuesta', 'Respuesta al Local'],
        ...alertas.map((a) => [
        new Date(a.created_at).toLocaleString('es-CO'),
        a.local_numero,
        a.local_nombre || '',
        a.tipo,
        a.estado,
        a.detalle || '',
        a.atendida_por || '',
        a.tiempo_respuesta_seg != null ? formatTiempo(a.tiempo_respuesta_seg) : '',
        a.respuesta || '',
        ]),
    ]
    const hojaCrudos = XLSX.utils.aoa_to_sheet(crudosData)
    hojaCrudos['!cols'] = [
        { wch: 18 }, { wch: 10 }, { wch: 25 }, { wch: 14 },
        { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 18 }, { wch: 30 },
    ]
    XLSX.utils.book_append_sheet(libro, hojaCrudos, 'Datos Completos')

    const fecha = new Date().toLocaleDateString('es-CO').replace(/\//g, '-')
    XLSX.writeFile(libro, `Estadisticas_AlertaPaseo_${fecha}.xlsx`)
    }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Cargando estadísticas...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Filtro de período */}
      <div className="flex justify-end">
        <select
          className="bg-gray-800 text-white rounded-xl px-4 py-2 text-sm"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
        >
          <option value="1">Últimas 24 horas</option>
          <option value="7">Últimos 7 días</option>
          <option value="30">Últimos 30 días</option>
          <option value="90">Últimos 90 días</option>
          <option value="todos">Todo el historial</option>
        </select>
        <button
            onClick={exportarEstadisticas}
            disabled={alertas.length === 0}
            className="bg-green-700 text-white text-sm px-4 py-2 rounded-xl disabled:opacity-40 whitespace-nowrap"
        >
            📥 Exportar Excel
        </button>
      </div>

      {/* Resumen del turno */}
      <div>
        <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-3">
          Turno actual — últimas 8 horas
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="bg-gray-800 rounded-2xl p-4">
            <p className="text-gray-400 text-xs mb-1">Total alertas</p>
            <p className="text-white text-3xl font-bold">{alertasTurno.length}</p>
          </div>
          <div className="bg-gray-800 rounded-2xl p-4">
            <p className="text-gray-400 text-xs mb-1">Atendidas</p>
            <p className="text-green-400 text-3xl font-bold">{atendidasTurno}</p>
          </div>
          <div className="bg-gray-800 rounded-2xl p-4">
            <p className="text-gray-400 text-xs mb-1">Pendientes</p>
            <p className="text-red-400 text-3xl font-bold">{pendientesTurno}</p>
          </div>
          <div className="bg-gray-800 rounded-2xl p-4">
            <p className="text-gray-400 text-xs mb-1">T. promedio turno</p>
            <p className="text-blue-400 text-xl font-bold">
              {formatTiempo(tiempoPromedioTurno)}
            </p>
          </div>
        </div>
      </div>

      {/* Ranking operadores */}
      {rankingOperadores.length > 0 && (
        <div>
          <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-3">
            🏆 Ranking de operadores — más rápidos primero
          </h2>
          <div className="flex flex-col gap-2">
            {rankingOperadores.map((op, i) => (
              <div
                key={op.nombre}
                className="bg-gray-800 rounded-2xl px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                  </span>
                  <div>
                    <p className="text-white font-medium">{op.nombre}</p>
                    <p className="text-gray-400 text-xs">
                      {op.total} alerta{op.total !== 1 ? 's' : ''} atendida{op.total !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-blue-400 font-bold text-sm">
                    {formatTiempo(op.promedio)}
                  </p>
                  <p className="text-gray-500 text-xs">promedio</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Picos por hora */}
      {picosPorHora.length > 0 && (
        <div>
          <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-3">
            ⏰ Picos por hora del día
          </h2>
          <div className="bg-gray-800 rounded-2xl p-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={picosPorHora} barSize={20}>
                <XAxis
                  dataKey="hora"
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={20}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: 12,
                    color: '#fff',
                    fontSize: 12,
                  }}
                  cursor={{ fill: '#374151' }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Picos por día de semana */}
      <div>
        <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-3">
          📅 Alertas por día de la semana
        </h2>
        <div className="bg-gray-800 rounded-2xl p-4">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={picosPorDia} barSize={30}>
              <XAxis
                dataKey="dia"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={20}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 12,
                }}
                cursor={{ fill: '#374151' }}
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {picosPorDia.map((_, i) => (
                  <Cell key={i} fill={COLORES_BARRAS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Por tipo */}
      {porTipo.length > 0 && (
        <div>
          <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-3">
            🎯 Distribución por tipo de alerta
          </h2>
          <div className="bg-gray-800 rounded-2xl p-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                    data={porTipo}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    >
                  {porTipo.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: 12,
                    color: '#fff',
                    fontSize: 12,
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: '#9ca3af', fontSize: 12 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {alertas.length === 0 && (
        <p className="text-gray-400 text-center py-12">
          No hay datos suficientes para mostrar estadísticas
        </p>
      )}

    </div>
  )
}