import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'

const BASE_URL = 'https://panic-button-cc.vercel.app'

export default function Locales() {
  const [locales, setLocales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState('todas')
  const [localQR, setLocalQR] = useState(null)
  const printRef = useRef()

  async function cargarLocales() {
    const { data, error } = await supabase
      .from('locales')
      .select('*')
      .eq('activo', true)
      .order('etapa')
      .order('piso')
      .order('numero')
    if (!error) setLocales(data)
    setCargando(false)
  }

  useEffect(() => {
    cargarLocales()
  }, [])

  function imprimirTodos() {
    window.print()
  }

  const localesFiltrados = locales.filter((l) => {
    const coincideBusqueda =
      l.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      l.numero.toLowerCase().includes(busqueda.toLowerCase())
    const coincideEtapa =
      filtroEtapa === 'todas' || l.etapa === filtroEtapa
    return coincideBusqueda && coincideEtapa
  })

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Cargando locales...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
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

      <div className="max-w-4xl mx-auto">

        {/* Encabezado */}
        <div className="no-print flex items-center justify-between mb-6">
          <h2 className="text-white text-xl font-bold">
            🏪 Locales — {locales.length} registrados
          </h2>
          <button
            onClick={imprimirTodos}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm"
          >
            🖨️ Imprimir todos los QR
          </button>
        </div>

        {/* Filtros */}
        <div className="no-print flex gap-3 mb-6">
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

        {/* Modal QR individual */}
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

        {/* Lista de locales */}
        <div className="no-print flex flex-col gap-2">
          {localesFiltrados.map((local) => (
            <div
              key={local.id}
              className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between"
            >
              <div>
                <span className="text-gray-400 text-xs">
                  Etapa {local.etapa} • Piso {local.piso} • Local {local.numero}
                </span>
                <p className="text-white font-medium">{local.nombre}</p>
              </div>
              <button
                onClick={() => setLocalQR(local)}
                className="bg-gray-700 text-white text-sm px-4 py-2 rounded-xl"
              >
                Ver QR
              </button>
            </div>
          ))}
        </div>

        {/* Sección de impresión — solo visible al imprimir */}
        <div ref={printRef}>
          {localesFiltrados.map((local) => (
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
    </div>
  )
}