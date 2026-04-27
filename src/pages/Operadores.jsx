import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Operadores() {
  const [operadores, setOperadores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [creando, setCreando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [editandoClave, setEditandoClave] = useState(null)
  const [nuevaClave, setNuevaClave] = useState('')
  const [operadorActualId, setOperadorActualId] = useState(null)
  const [form, setForm] = useState({
    nombre: '', usuario: '', clave: '', rol: 'operador'
  })

  async function cargarOperadores() {
    const { data, error } = await supabase
      .from('operadores')
      .select('*')
      .order('created_at')
    if (!error) setOperadores(data)
    setCargando(false)
  }

  useEffect(() => {
    cargarOperadores()
    try {
      const data = sessionStorage.getItem('operador')
      if (data) setOperadorActualId(JSON.parse(data).id)
    } catch (e) {}
  }, [])

  async function crearOperador() {
    if (!form.nombre || !form.usuario || !form.clave) {
      alert('Todos los campos son obligatorios')
      return
    }
    setGuardando(true)
    const { error } = await supabase.from('operadores').insert(form)
    setGuardando(false)
    if (error) {
      alert('Error — verifica que el usuario no exista ya')
    } else {
      setForm({ nombre: '', usuario: '', clave: '', rol: 'operador' })
      setCreando(false)
      cargarOperadores()
    }
  }

  async function toggleActivo(op) {
    const confirmar = window.confirm(
      op.activo
        ? `¿Desactivar acceso de ${op.nombre}?`
        : `¿Reactivar acceso de ${op.nombre}?`
    )
    if (!confirmar) return
    await supabase.from('operadores').update({ activo: !op.activo }).eq('id', op.id)
    cargarOperadores()
  }

  async function eliminarOperador(op) {
    if (op.id === operadorActualId) {
      alert('No puedes eliminarte a ti mismo.')
      return
    }
    if (op.rol === 'admin') {
      const adminsActivos = operadores.filter(
        (o) => o.rol === 'admin' && o.activo && o.id !== op.id
      )
      if (adminsActivos.length === 0) {
        alert('No es posible eliminar al único administrador activo del sistema.')
        return
      }
    }
    const ok = window.confirm(
      `¿Eliminar permanentemente a ${op.nombre}? Esta acción no se puede deshacer.`
    )
    if (!ok) return
    await supabase.from('operadores').delete().eq('id', op.id)
    cargarOperadores()
  }

  async function cambiarClave(op) {
    if (!nuevaClave.trim()) {
      alert('La clave no puede estar vacía')
      return
    }
    await supabase.from('operadores').update({ clave: nuevaClave.trim() }).eq('id', op.id)
    setEditandoClave(null)
    setNuevaClave('')
    cargarOperadores()
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Cargando operadores...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-xl font-bold">
          👮 Operadores — {operadores.filter(o => o.activo).length} activos
        </h2>
        <button
          onClick={() => setCreando(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm"
        >
          + Nuevo operador
        </button>
      </div>

      {/* Formulario */}
      {creando && (
        <div className="bg-gray-800 rounded-2xl p-6 mb-6">
          <h3 className="text-white font-bold mb-4">Nuevo operador</h3>
          <label className="text-gray-400 text-sm mb-1 block">Nombre completo *</label>
          <input
            className="bg-gray-700 text-white rounded-xl p-3 w-full mb-4"
            placeholder="Ej: Carlos García"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
          <label className="text-gray-400 text-sm mb-1 block">Usuario *</label>
          <input
            className="bg-gray-700 text-white rounded-xl p-3 w-full mb-4"
            placeholder="Ej: carlos.garcia"
            value={form.usuario}
            onChange={(e) => setForm({ ...form, usuario: e.target.value })}
          />
          <label className="text-gray-400 text-sm mb-1 block">Contraseña *</label>
          <input
            className="bg-gray-700 text-white rounded-xl p-3 w-full mb-4"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={form.clave}
            onChange={(e) => setForm({ ...form, clave: e.target.value })}
          />
          <label className="text-gray-400 text-sm mb-1 block">Rol</label>
          <select
            className="bg-gray-700 text-white rounded-xl p-3 w-full mb-6"
            value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value })}
          >
            <option value="operador">Operador — solo ve alertas</option>
            <option value="admin">Admin — acceso completo</option>
          </select>
          <div className="flex gap-3">
            <button
              onClick={crearOperador}
              disabled={guardando}
              className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold"
            >
              {guardando ? 'Guardando...' : 'Crear operador'}
            </button>
            <button
              onClick={() => setCreando(false)}
              className="flex-1 bg-gray-700 text-white py-3 rounded-xl"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="flex flex-col gap-3">
        {operadores.map((op) => (
          <div
            key={op.id}
            className={`rounded-xl px-4 py-3 ${
              op.activo ? 'bg-gray-800' : 'bg-gray-900 opacity-60'
            }`}
          >
            {editandoClave === op.id ? (
              <div className="flex gap-2 items-center">
                <input
                  className="bg-gray-700 text-white rounded-xl p-2 flex-1 text-sm"
                  type="password"
                  placeholder="Nueva contraseña"
                  value={nuevaClave}
                  onChange={(e) => setNuevaClave(e.target.value)}
                  autoFocus
                />
                <button
                  onClick={() => cambiarClave(op)}
                  className="bg-green-600 text-white text-sm px-3 py-2 rounded-xl"
                >✅</button>
                <button
                  onClick={() => setEditandoClave(null)}
                  className="bg-gray-700 text-white text-sm px-3 py-2 rounded-xl"
                >✕</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{op.nombre}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      op.rol === 'admin'
                        ? 'bg-purple-900 text-purple-400'
                        : 'bg-blue-900 text-blue-400'
                    }`}>
                      {op.rol}
                    </span>
                    {!op.activo && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-400">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">@{op.usuario}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditandoClave(op.id)
                      setNuevaClave('')
                    }}
                    className="bg-gray-700 text-yellow-400 text-sm px-3 py-2 rounded-xl"
                  >🔑</button>
                  <button
                    onClick={() => toggleActivo(op)}
                    className={`text-sm px-3 py-2 rounded-xl ${
                      op.activo
                        ? 'bg-red-900 text-red-400'
                        : 'bg-green-900 text-green-400'
                    }`}
                  >
                    {op.activo ? 'Desactivar' : 'Reactivar'}
                  </button>
                  {op.id !== operadorActualId && (
                    <button
                      onClick={() => eliminarOperador(op)}
                      className="bg-gray-700 text-red-400 text-sm px-3 py-2 rounded-xl"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}