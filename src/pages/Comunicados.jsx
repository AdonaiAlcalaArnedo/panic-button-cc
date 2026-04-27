import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

const MENSAJES_RAPIDOS = [
  'Simulacro de evacuación en 5 minutos. Por favor prepárense.',
  'Evacuen el centro comercial de forma ordenada por las salidas de emergencia.',
  'Fin del simulacro. Pueden retomar sus actividades con normalidad.',
  'Corte de energía programado en 10 minutos. Aseguren sus equipos.',
  'El centro comercial cerrará en 30 minutos. Por favor preparen el cierre.',
  'Reunión de propietarios hoy a las 6:00 PM en la administración.',
]

function formatFecha(fecha) {
  return new Date(fecha).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Comunicados({ operadorNombre }) {
  const [comunicados, setComunicados] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function cargarComunicados() {
    const { data } = await supabase
      .from('comunicados')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setComunicados(data)
  }

  useEffect(() => {
    cargarComunicados()
  }, [])

  async function enviarComunicado() {
    if (!mensaje.trim()) return
    setEnviando(true)
    const { error } = await supabase.from('comunicados').insert({
      mensaje: mensaje.trim(),
      enviado_por: operadorNombre || 'Administrador',
    })
    setEnviando(false)
    if (error) {
      alert('Error al enviar el comunicado.')
    } else {
      setMensaje('')
      setEnviado(true)
      setTimeout(() => setEnviado(false), 3000)
      cargarComunicados()
    }
  }


  function exportarComunicados() {
  const filas = [
    ['Fecha', 'Enviado por', 'Mensaje'],
    ...comunicados.map((c) => [
      formatFecha(c.created_at),
      c.enviado_por,
      c.mensaje,
    ]),
  ]
  const hoja = XLSX.utils.aoa_to_sheet(filas)
  hoja['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 60 }]
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Comunicados')
  const fecha = new Date().toLocaleDateString('es-CO').replace(/\//g, '-')
  XLSX.writeFile(libro, `Comunicados_AlertaPaseo_${fecha}.xlsx`)
}

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-xl font-bold">
          📢 Comunicados Masivos
        </h2>
      </div>

      {/* Redactar comunicado */}
      <div className="bg-gray-800 rounded-2xl p-5 mb-6">
        <label className="text-gray-400 text-sm mb-2 block font-medium">
          Mensaje para todos los locales
        </label>

        {/* Mensajes rápidos */}
        <div className="flex flex-wrap gap-2 mb-3">
          {MENSAJES_RAPIDOS.map((m, i) => (
            <button
              key={i}
              onClick={() => setMensaje(m)}
              className="bg-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-xl hover:bg-gray-600 text-left"
            >
              {m.length > 40 ? m.slice(0, 40) + '...' : m}
            </button>
          ))}
        </div>

        <textarea
          className="bg-gray-700 text-white rounded-xl p-3 w-full text-sm mb-3"
          rows={4}
          placeholder="Escribe el comunicado o selecciona uno rápido arriba..."
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-gray-500 text-xs">
            Se enviará a todos los locales con la app abierta
          </p>
          <button
            onClick={enviarComunicado}
            disabled={enviando || !mensaje.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-40 whitespace-nowrap"
          >
            {enviando ? 'Enviando...' : enviado ? '✅ Enviado' : '📢 Enviar a todos'}
          </button>
        </div>
      </div>

      {/* Historial */}
      <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-400 text-xs uppercase tracking-widest">
                Historial de comunicados
            </h3>
            <button
                onClick={exportarComunicados}
                disabled={comunicados.length === 0}
                className="bg-green-700 text-white text-xs px-3 py-1.5 rounded-xl disabled:opacity-40"
            >
                📥 Exportar Excel
            </button>
            </div>

      {comunicados.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No hay comunicados enviados aún
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {comunicados.map((c) => (
            <div key={c.id} className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <span className="text-blue-400 text-xs font-medium">
                  📢 Comunicado masivo
                </span>
                <span className="text-gray-500 text-xs shrink-0">
                  {formatFecha(c.created_at)}
                </span>
              </div>
              <p className="text-white text-sm mb-2">{c.mensaje}</p>
              <p className="text-gray-400 text-xs">
                Enviado por: <span className="text-gray-300">{c.enviado_por}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}