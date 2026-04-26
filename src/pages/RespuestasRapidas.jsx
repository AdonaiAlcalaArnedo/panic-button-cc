import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function RespuestasRapidas() {
  const [respuestas, setRespuestas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [nuevaRespuesta, setNuevaRespuesta] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [editando, setEditando] = useState(null)
  const [textoEditado, setTextoEditado] = useState('')

  async function cargar() {
    const { data } = await supabase
      .from('respuestas_rapidas')
      .select('*')
      .order('orden')
    if (data) setRespuestas(data)
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  async function agregar() {
    if (!nuevaRespuesta.trim()) return
    setGuardando(true)
    const maxOrden = respuestas.length
      ? Math.max(...respuestas.map(r => r.orden)) + 1
      : 1
    await supabase.from('respuestas_rapidas').insert({
      texto: nuevaRespuesta.trim(),
      orden: maxOrden,
    })
    setNuevaRespuesta('')
    setGuardando(false)
    cargar()
  }

  async function guardarEdicion(r) {
    if (!textoEditado.trim()) return
    await supabase
      .from('respuestas_rapidas')
      .update({ texto: textoEditado.trim() })
      .eq('id', r.id)
    setEditando(null)
    cargar()
  }

  async function toggleActivo(r) {
    await supabase
      .from('respuestas_rapidas')
      .update({ activo: !r.activo })
      .eq('id', r.id)
    cargar()
  }

  async function eliminar(r) {
    const ok = window.confirm(`¿Eliminar "${r.texto}"?`)
    if (!ok) return
    await supabase.from('respuestas_rapidas').delete().eq('id', r.id)
    cargar()
  }

  async function subir(r, idx) {
    if (idx === 0) return
    const anterior = respuestas[idx - 1]
    await supabase.from('respuestas_rapidas').update({ orden: anterior.orden }).eq('id', r.id)
    await supabase.from('respuestas_rapidas').update({ orden: r.orden }).eq('id', anterior.id)
    cargar()
  }

  async function bajar(r, idx) {
    if (idx === respuestas.length - 1) return
    const siguiente = respuestas[idx + 1]
    await supabase.from('respuestas_rapidas').update({ orden: siguiente.orden }).eq('id', r.id)
    await supabase.from('respuestas_rapidas').update({ orden: r.orden }).eq('id', siguiente.id)
    cargar()
  }

  if (cargando) return <p className="text-gray-400 text-center py-12">Cargando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-xl font-bold">
          💬 Respuestas Rápidas — {respuestas.filter(r => r.activo).length} activas
        </h2>
      </div>

      {/* Agregar nueva */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-6">
        <label className="text-gray-400 text-sm mb-2 block">Nueva respuesta rápida</label>
        <div className="flex gap-2">
          <input
            className="bg-gray-700 text-white rounded-xl px-4 py-2 flex-1 text-sm"
            placeholder="Ej: Guardia en camino, mantengase tranquilo."
            value={nuevaRespuesta}
            onChange={e => setNuevaRespuesta(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && agregar()}
          />
          <button
            onClick={agregar}
            disabled={guardando || !nuevaRespuesta.trim()}
            className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm disabled:opacity-40"
          >
            + Agregar
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-2">
        {respuestas.map((r, idx) => (
          <div
            key={r.id}
            className={`rounded-xl px-4 py-3 ${r.activo ? 'bg-gray-800' : 'bg-gray-900 opacity-60'}`}
          >
            {editando === r.id ? (
              <div className="flex gap-2 items-center">
                <input
                  className="bg-gray-700 text-white rounded-xl px-3 py-2 flex-1 text-sm"
                  value={textoEditado}
                  onChange={e => setTextoEditado(e.target.value)}
                  autoFocus
                />
                <button onClick={() => guardarEdicion(r)} className="bg-green-600 text-white text-sm px-3 py-2 rounded-xl">✅</button>
                <button onClick={() => setEditando(null)} className="bg-gray-700 text-white text-sm px-3 py-2 rounded-xl">✕</button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-gray-500 text-xs w-5 shrink-0">{idx + 1}.</span>
                  <p className={`text-sm truncate ${r.activo ? 'text-white' : 'text-gray-500'}`}>
                    {r.texto}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => subir(r, idx)} className="bg-gray-700 text-gray-400 text-xs px-2 py-1 rounded-lg">↑</button>
                  <button onClick={() => bajar(r, idx)} className="bg-gray-700 text-gray-400 text-xs px-2 py-1 rounded-lg">↓</button>
                  <button onClick={() => { setEditando(r.id); setTextoEditado(r.texto) }} className="bg-gray-700 text-yellow-400 text-xs px-2 py-1 rounded-lg">✏️</button>
                  <button onClick={() => toggleActivo(r)} className={`text-xs px-2 py-1 rounded-lg ${r.activo ? 'bg-red-900 text-red-400' : 'bg-green-900 text-green-400'}`}>
                    {r.activo ? 'Off' : 'On'}
                  </button>
                  <button onClick={() => eliminar(r)} className="bg-gray-700 text-red-400 text-xs px-2 py-1 rounded-lg">🗑️</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}