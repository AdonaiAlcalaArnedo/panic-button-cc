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

  async function eliminarComunicado(id) {
  const ok = window.confirm('¿Eliminar este comunicado del historial?')
  if (!ok) return
  await supabase.from('comunicados').delete().eq('id', id)
  cargarComunicados()
}

async function eliminarTodos() {
  const ok = window.confirm('¿Eliminar todo el historial de comunicados? Esta acción no se puede deshacer.')
  if (!ok) return
  await supabase.from('comunicados').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  cargarComunicados()
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ color: 'var(--text-3)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Historial de comunicados
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
            <button
            onClick={exportarComunicados}
            disabled={comunicados.length === 0}
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#6EE7B7', borderRadius: 'var(--radius-md)', padding: '0.4rem 0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.78rem', opacity: comunicados.length === 0 ? 0.4 : 1 }}
            >
            📥 Exportar
            </button>
            <button
            onClick={eliminarTodos}
            disabled={comunicados.length === 0}
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5', borderRadius: 'var(--radius-md)', padding: '0.4rem 0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.78rem', opacity: comunicados.length === 0 ? 0.4 : 1 }}
            >
            🗑️ Limpiar historial
            </button>
        </div>
        </div>

      {comunicados.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No hay comunicados enviados aún
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {comunicados.map((c) => (
            <div key={c.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: '0.5rem' }}>
                <span style={{ color: '#93C5FD', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    📢 Comunicado masivo
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ color: 'var(--text-3)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
                    {formatFecha(c.created_at)}
                    </span>
                    <button
                    onClick={() => eliminarComunicado(c.id)}
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: '0.72rem' }}
                    >
                    🗑️
                    </button>
                </div>
                </div>
                <p style={{ color: 'var(--text-1)', fontSize: '0.9rem', marginBottom: '0.4rem', lineHeight: 1.5 }}>
                {c.mensaje}
                </p>
                <p style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>
                Enviado por: <span style={{ color: 'var(--text-2)' }}>{c.enviado_por}</span>
                </p>
            </div>
            ))}
        </div>
      )}
    </div>
  )
}