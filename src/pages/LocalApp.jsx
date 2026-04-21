import { useState } from 'react'
import { supabase } from '../lib/supabase'

const TIPOS_ALERTA = [
  { tipo: 'seguridad', label: 'Seguridad', emoji: '🚨', color: 'bg-red-600' },
  { tipo: 'salud', label: 'Salud', emoji: '🏥', color: 'bg-orange-500' },
  { tipo: 'siniestro', label: 'Siniestro', emoji: '🔥', color: 'bg-yellow-500' },
  { tipo: 'mantenimiento', label: 'Mantenimiento', emoji: '🔧', color: 'bg-blue-500' },
  { tipo: 'asistencia', label: 'Asistencia', emoji: '🙋', color: 'bg-green-600' },
]

export default function LocalApp() {
  const [paso, setPaso] = useState('inicio')
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null)
  const [detalle, setDetalle] = useState('')
  const [localNumero, setLocalNumero] = useState('')
  const [localNombre, setLocalNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  function seleccionarTipo(tipo) {
    setTipoSeleccionado(tipo)
    setPaso('detalle')
  }

  async function enviarAlerta() {
    if (!localNumero) {
      alert('Por favor ingresa el número de local')
      return
    }
    setEnviando(true)
    const { error } = await supabase.from('alertas').insert({
      local_numero: localNumero,
      local_nombre: localNombre,
      telefono: telefono,
      tipo: tipoSeleccionado.tipo,
      detalle: detalle,
      estado: 'pendiente',
    })
    setEnviando(false)
    if (error) {
      alert('Error al enviar. Intenta de nuevo.')
      console.error(error)
    } else {
      setEnviado(true)
      setPaso('confirmacion')
    }
  }

  function reiniciar() {
    setPaso('inicio')
    setTipoSeleccionado(null)
    setDetalle('')
    setEnviado(false)
  }

  if (paso === 'confirmacion') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-white text-2xl font-bold mb-2">Alerta enviada</h2>
        <p className="text-gray-400 text-center mb-8">
          Vigilancia ha sido notificada. Mantén la calma.
        </p>
        <button
          onClick={reiniciar}
          className="bg-gray-700 text-white px-8 py-3 rounded-xl"
        >
          Nueva alerta
        </button>
      </div>
    )
  }

  if (paso === 'detalle') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col p-6">
        <button onClick={() => setPaso('inicio')} className="text-gray-400 mb-6">
          ← Volver
        </button>
        <div className="text-4xl mb-2">{tipoSeleccionado.emoji}</div>
        <h2 className="text-white text-2xl font-bold mb-6">
          {tipoSeleccionado.label}
        </h2>

        <label className="text-gray-400 text-sm mb-1">Número de local *</label>
        <input
          className="bg-gray-800 text-white rounded-xl p-3 mb-4"
          placeholder="Ej: 142"
          value={localNumero}
          onChange={(e) => setLocalNumero(e.target.value)}
        />

        <label className="text-gray-400 text-sm mb-1">Nombre del local</label>
        <input
          className="bg-gray-800 text-white rounded-xl p-3 mb-4"
          placeholder="Ej: Tienda Ropa Moda"
          value={localNombre}
          onChange={(e) => setLocalNombre(e.target.value)}
        />

        <label className="text-gray-400 text-sm mb-1">Teléfono de contacto</label>
        <input
          className="bg-gray-800 text-white rounded-xl p-3 mb-4"
          placeholder="Ej: 3001234567"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />

        <label className="text-gray-400 text-sm mb-1">
          Detalle adicional (opcional)
        </label>
        <textarea
          className="bg-gray-800 text-white rounded-xl p-3 mb-6"
          placeholder="Describe brevemente la situación..."
          rows={3}
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
        />

        <button
          onClick={enviarAlerta}
          disabled={enviando}
          className={`${tipoSeleccionado.color} text-white text-xl font-bold py-4 rounded-2xl`}
        >
          {enviando ? 'Enviando...' : '🚨 Enviar Alerta'}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-2xl font-bold text-center mb-2 mt-8">
          🚨 Botón de Pánico
        </h1>
        <p className="text-gray-400 text-center mb-8">
          Selecciona el tipo de alerta
        </p>
        <div className="flex flex-col gap-4">
          {TIPOS_ALERTA.map((item) => (
            <button
              key={item.tipo}
              onClick={() => seleccionarTipo(item)}
              className={`${item.color} text-white text-xl font-bold py-5 rounded-2xl flex items-center justify-center gap-3`}
            >
              <span className="text-3xl">{item.emoji}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}