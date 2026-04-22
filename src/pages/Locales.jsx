import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'

const BASE_URL = 'https://panic-button-cc.vercel.app'

export default function Locales() {
  const [locales, setLocales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState('todas')
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [localQR, setLocalQR] = useState(null)
  const [creando, setCreando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [editando, setEditando] = useState(null)
  const [nombreEditado, setNombreEditado] = useState('')
  const [nuevoNumero, setNuevoNumero] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoEtapa, setNuevoEtapa] = useState('1')
  const [nuevoPiso, setNuevoPiso] = useState('1')
  const printRef = useRef()

  async function cargarLocales() {
    const { data, error } = await supabase
      .from('locales')
      .select('*')
      .neq('etapa', 'empleado')
      .order('etapa')
      .order('piso')
      .order('numero')
    if (!error) setLocales(data)
    setCargando(false)
  }

  useEffect(() => {
    cargarLocales()
  }, [])

  async function crearLocal() {
    if (!nuevoNumero.trim() || !nuevoNombre.trim()) {
      alert('Número y nombre son obligatorios')
      return
    }
    setGuardando(true)
    const { error } = await supabase.from('locales').insert({
      numero: nuevoNumero.trim(),
      nombre: nuevoNombre.trim(),
      etapa: nuevoEtapa,
      piso: nuevoPiso,
      activo: true,
    })
    setGuardando(false)
    if (error) {
      alert('Error al crear local. Verifica que el número no exista ya.')
    } else {
      setNuevoNumero('')
      setNuevoNombre('')
      setNuevoEtapa('1')
      setNuevoPiso('1')
      setCreando(false)
      cargarLocales()
    }
  }

  async function guardarEdicion(local) {
  if (!nombreEditado.trim()) {
    alert('El nombre no puede estar vacío')
    return
  }
  await supabase
    .from('locales')
    .update({ nombre: nombreEditado.trim() })
    .eq('id', local.id)
  setEditando(null)
  setNombreEditado('')
  cargarLocales()
  }

  async function toggleActivo(local) {
    const confirmar = window.confirm(
      local.activo
        ? `¿Desactivar Local ${local.numero} — ${local.nombre}? No podrá enviar alertas.`
        : `¿Reactivar Local ${local.numero} — ${local.nombre}?`
    )
    if (!confirmar) return
    await supabase
      .from('locales')
      .update({ activo: !local.activo })
      .eq('id', local.id)
    cargarLocales()
  }

  function imprimirTodos() {
    window.print()
  }

  const localesFiltrados = locales.filter((l) => {
    const coincideBusqueda =
      l.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      l.numero.toLowerCase().includes(busqueda.toLowerCase())
    const coincideEtapa =
      filtroEtapa === 'todas' || l.etapa === filtroEtapa
    const coincideActivo = mostrarInactivos ? true : l.activo
    return coincideBusqueda && coincideEtapa && coincideActivo
  })

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Cargando locales...</p>
      </div>
    )
  }

  return (
    <div>
      <style>{`
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .qr-card {
            break-inside: avoid;
            border: 1px solid #ccc;
            padding: 12px;
            margin: 8px;
            display: inline-block;
            width: 180px;
            text-align: center;
            vertical-align: top;
          }
        }
      `}</style>

      {/* Modal QR */}
      {localQR && (
        <div className="no-print fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center max-w-xs w-full mx-4">
            <p className="text-gray-500 text-sm mb-1">
              Etapa {localQR.etapa} — Piso {localQR.piso}
            </p>
            <p className="font-bold text-gray-900 text-lg mb-1">
              Local {localQR.numero}
            </p>
            <p className="text-gray-600 text-sm mb-4">{localQR.nombre}</p>
            <div className="flex justify-center mb-4">
              <QRCodeSVG
                value={`${BASE_URL}/?token=${localQR.token}`}
                size={200}
                level="H"
              />
            </div>
            <p className="text-gray-400 text-xs mb-6 break-all">
              {BASE_URL}/?token={localQR.token}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm"
              >
                🖨️ Imprimir
              </button>
              <button
                onClick={() => setLocalQR(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-xl text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className="no-print flex items-center justify-between mb-6">
        <h2 className="text-white text-xl font-bold">
          🏪 Marcas — {locales.filter((l) => l.activo).length} activas
        </h2>
        <div className="flex gap-2">
          <button
            onClick={imprimirTodos}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm"
          >
            🖨️ Imprimir QR
          </button>
          <button
            onClick={() => setCreando(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm"
          >
            + Nuevo local
          </button>
        </div>
      </div>

      {/* Formulario nuevo local */}
      {creando && (
        <div className="no-print bg-gray-800 rounded-2xl p-6 mb-6">
          <h3 className="text-white font-bold mb-4">Nuevo local</h3>
          <label className="text-gray-400 text-sm mb-1 block">
            Número de local *
          </label>
          <input
            className="bg-gray-700 text-white rounded-xl p-3 w-full mb-4"
            placeholder="Ej: 197 o 197-198"
            value={nuevoNumero}
            onChange={(e) => setNuevoNumero(e.target.value)}
          />
          <label className="text-gray-400 text-sm mb-1 block">
            Nombre del local *
          </label>
          <input
            className="bg-gray-700 text-white rounded-xl p-3 w-full mb-4"
            placeholder="Ej: TIENDA NUEVA"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
          />
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <label className="text-gray-400 text-sm mb-1 block">Etapa</label>
              <select
                className="bg-gray-700 text-white rounded-xl p-3 w-full"
                value={nuevoEtapa}
                onChange={(e) => setNuevoEtapa(e.target.value)}
              >
                <option value="1">Etapa 1</option>
                <option value="2">Etapa 2</option>
                <option value="3">Etapa 3</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-gray-400 text-sm mb-1 block">Piso</label>
              <select
                className="bg-gray-700 text-white rounded-xl p-3 w-full"
                value={nuevoPiso}
                onChange={(e) => setNuevoPiso(e.target.value)}
              >
                <option value="1">Piso 1</option>
                <option value="2">Piso 2</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={crearLocal}
              disabled={guardando}
              className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold"
            >
              {guardando ? 'Guardando...' : 'Crear y generar QR'}
            </button>
            <button
              onClick={() => {
                setCreando(false)
                setNuevoNumero('')
                setNuevoNombre('')
              }}
              className="flex-1 bg-gray-700 text-white py-3 rounded-xl"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="no-print flex gap-3 mb-4">
        <input
          className="bg-gray-800 text-white rounded-xl px-4 py-2 flex-1"
          placeholder="Buscar por nombre o número..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className="bg-gray-800 text-white rounded-xl px-4 py-2"
          value={filtroEtapa}
          onChange={(e) => setFiltroEtapa(e.target.value)}
        >
          <option value="todas">Todas las etapas</option>
          <option value="1">Etapa 1</option>
          <option value="2">Etapa 2</option>
          <option value="3">Etapa 3</option>
        </select>
      </div>

      {/* Toggle inactivos */}
      <div className="no-print flex items-center gap-2 mb-6">
        <input
          type="checkbox"
          id="mostrar-inactivos"
          checked={mostrarInactivos}
          onChange={(e) => setMostrarInactivos(e.target.checked)}
          className="w-4 h-4"
        />
        <label
          htmlFor="mostrar-inactivos"
          className="text-gray-400 text-sm cursor-pointer"
        >
          Mostrar marcas inactivas (
          {locales.filter((l) => !l.activo).length})
        </label>
      </div>

      {/* Lista de locales */}
      <div className="no-print flex flex-col gap-2">
        {localesFiltrados.map((local) => (
          <div
            key={local.id}
            className={`rounded-xl px-4 py-3 flex items-center justify-between ${
              local.activo ? 'bg-gray-800' : 'bg-gray-900 opacity-60'
            }`}
          >
            {editando === local.id ? (
  <div className="flex-1 flex gap-2 items-center">
    <input
      className="bg-gray-700 text-white rounded-xl p-2 flex-1 text-sm"
      value={nombreEditado}
      onChange={(e) => setNombreEditado(e.target.value)}
      autoFocus
    />
    <button
      onClick={() => guardarEdicion(local)}
      className="bg-green-600 text-white text-sm px-3 py-2 rounded-xl"
    >
      ✅
    </button>
    <button
      onClick={() => setEditando(null)}
      className="bg-gray-700 text-white text-sm px-3 py-2 rounded-xl"
    >
      ✕
    </button>
  </div>
) : (
  <>
    <div>
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-xs">
          Etapa {local.etapa} • Piso {local.piso} • Local {local.numero}
        </span>
        {!local.activo && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-400">
            Inactivo
          </span>
        )}
      </div>
      <p className="text-white font-medium">{local.nombre}</p>
    </div>
    <div className="flex gap-2">
      {local.activo && (
        <button
          onClick={() => setLocalQR(local)}
          className="bg-gray-700 text-white text-sm px-3 py-2 rounded-xl"
        >
          Ver QR
        </button>
      )}
      <button
        onClick={() => {
          setEditando(local.id)
          setNombreEditado(local.nombre)
        }}
        className="bg-gray-700 text-yellow-400 text-sm px-3 py-2 rounded-xl"
      >
        ✏️
      </button>
      <button
        onClick={() => toggleActivo(local)}
        className={`text-sm px-3 py-2 rounded-xl ${
          local.activo
            ? 'bg-red-900 text-red-400'
            : 'bg-green-900 text-green-400'
        }`}
      >
        {local.activo ? 'Desactivar' : 'Reactivar'}
      </button>
    </div>
  </>
)}
          </div>
        ))}
      </div>

      {/* Sección impresión */}
      <div ref={printRef}>
        {localesFiltrados
          .filter((l) => l.activo)
          .map((local) => (
            <div key={local.id} className="qr-card">
              <p style={{ fontSize: 10, color: '#666', margin: '0 0 2px' }}>
                Etapa {local.etapa} • Piso {local.piso}
              </p>
              <p style={{ fontSize: 13, fontWeight: 'bold', margin: '0 0 2px' }}>
                Local {local.numero}
              </p>
              <p style={{ fontSize: 11, color: '#444', margin: '0 0 8px' }}>
                {local.nombre}
              </p>
              <QRCodeSVG
                value={`${BASE_URL}/?token=${local.token}`}
                size={140}
                level="H"
              />
            </div>
          ))}
      </div>
    </div>
  )
}