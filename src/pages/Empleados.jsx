import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'

const BASE_URL = 'https://panic-button-cc.vercel.app'

export default function Empleados() {
  const [empleados, setEmpleados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [empleadoQR, setEmpleadoQR] = useState(null)
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [cargo, setCargo] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function cargarEmpleados() {
    const { data, error } = await supabase
      .from('locales')
      .select('*')
      .eq('etapa', 'empleado')
      .order('created_at', { ascending: false })
    if (!error) setEmpleados(data)
    setCargando(false)
  }

  useEffect(() => {
    cargarEmpleados()
  }, [])

  async function crearEmpleado() {
    if (!nombre.trim()) {
      alert('El nombre es obligatorio')
      return
    }
    setGuardando(true)
    const numero = 'EMP-' + Date.now().toString().slice(-6)
    const { error } = await supabase.from('locales').insert({
      numero: numero,
      nombre: nombre.trim(),
      piso: cargo.trim() || 'Empleado',
      etapa: 'empleado',
      activo: true,
    })
    setGuardando(false)
    if (error) {
      alert('Error al crear empleado')
    } else {
      setNombre('')
      setCargo('')
      setCreando(false)
      cargarEmpleados()
    }
  }

  async function toggleActivo(empleado) {
    const confirmar = window.confirm(
      empleado.activo
        ? `¿Desactivar acceso de ${empleado.nombre}? No podrá enviar alertas.`
        : `¿Reactivar acceso de ${empleado.nombre}?`
    )
    if (!confirmar) return

    await supabase
      .from('locales')
      .update({ activo: !empleado.activo })
      .eq('id', empleado.id)

    cargarEmpleados()
  }

  async function eliminarEmpleado(empleado) {
    const confirmar = window.confirm(
      `¿Eliminar permanentemente a ${empleado.nombre}? Esta acción no se puede deshacer.`
    )
    if (!confirmar) return
    await supabase.from('locales').delete().eq('id', empleado.id)
    cargarEmpleados()
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Cargando empleados...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Modal QR */}
      {empleadoQR && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center max-w-xs w-full mx-4">
            <p className="text-gray-500 text-sm mb-1">{empleadoQR.piso}</p>
            <p className="font-bold text-gray-900 text-lg mb-4">
              {empleadoQR.nombre}
            </p>
            <div className="flex justify-center mb-4">
              <QRCodeSVG
                value={`${BASE_URL}/?token=${empleadoQR.token}`}
                size={200}
                level="H"
              />
            </div>
            <p className="text-gray-400 text-xs mb-6 break-all">
              {BASE_URL}/?token={empleadoQR.token}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm"
              >
                🖨️ Imprimir
              </button>
              <button
                onClick={() => setEmpleadoQR(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-xl text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-lg font-bold">
          👷 Empleados — {empleados.length} registrados
        </h2>
        <button
          onClick={() => setCreando(true)}
          className="bg-green-600 text-white px-3 py-2 rounded-xl text-sm whitespace-nowrap"
        >
          + Nuevo empleado
        </button>
      </div>

      {/* Formulario nuevo empleado */}
      {creando && (
        <div className="bg-gray-800 rounded-2xl p-6 mb-6">
          <h3 className="text-white font-bold mb-4">Nuevo empleado</h3>
          <label className="text-gray-400 text-sm mb-1 block">
            Nombre completo *
          </label>
          <input
            className="bg-gray-700 text-white rounded-xl p-3 w-full mb-4"
            placeholder="Ej: Juan Pérez"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <label className="text-gray-400 text-sm mb-1 block">
            Cargo o área
          </label>
          <input
            className="bg-gray-700 text-white rounded-xl p-3 w-full mb-6"
            placeholder="Ej: Seguridad, Mantenimiento, Administración"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
          />
          <div className="flex gap-3">
            <button
              onClick={crearEmpleado}
              disabled={guardando}
              className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold"
            >
              {guardando ? 'Guardando...' : 'Crear y generar QR'}
            </button>
            <button
              onClick={() => {
                setCreando(false)
                setNombre('')
                setCargo('')
              }}
              className="flex-1 bg-gray-700 text-white py-3 rounded-xl"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de empleados */}
      {empleados.length === 0 ? (
        <p className="text-gray-400 text-center py-12">
          No hay empleados registrados
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {empleados.map((emp) => (
            <div
              key={emp.id}
              className={`rounded-xl px-4 py-3 flex items-center justify-between ${
                emp.activo ? 'bg-gray-800' : 'bg-gray-900 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium">{emp.nombre}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      emp.activo
                        ? 'bg-green-900 text-green-400'
                        : 'bg-red-900 text-red-400'
                    }`}
                  >
                    {emp.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">{emp.piso}</p>
              </div>

              <div className="flex gap-1 flex-shrink-0">
                {emp.activo && (
                  <button
                    onClick={() => setEmpleadoQR(emp)}
                    className="bg-gray-700 text-white text-xs px-2 py-2 rounded-xl"
                  >
                    Ver QR
                  </button>
                )}
                <button
                  onClick={() => toggleActivo(emp)}
                  className={`text-xs px-2 py-2 rounded-xl whitespace-nowrap ${
                    emp.activo
                      ? 'bg-red-900 text-red-400'
                      : 'bg-green-900 text-green-400'
                  }`}
                >
                  {emp.activo ? 'Desactivar' : 'Reactivar'}
                </button>
                <button
                  onClick={() => eliminarEmpleado(emp)}
                  className="bg-gray-700 text-red-400 text-xs px-2 py-2 rounded-xl"
                >
                  🗑️
                </button>
              </div>
              


            </div>
          ))}
        </div>
      )}
    </div>
  )
}