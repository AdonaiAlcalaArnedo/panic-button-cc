import { useState } from 'react'

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState(false)

  function handleLogin() {
    const usuarioCorrecto = import.meta.env.VITE_DASHBOARD_USER
    const claveCorrecto = import.meta.env.VITE_DASHBOARD_PASS

    if (usuario === usuarioCorrecto && clave === claveCorrecto) {
      sessionStorage.setItem('dashboard_auth', 'true')
      onLogin()
    } else {
      setError(true)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-white text-2xl font-bold">Central de Vigilancia</h1>
          <p className="text-gray-400 text-sm mt-2">Acceso restringido</p>
        </div>

        <label className="text-gray-400 text-sm mb-1 block">Usuario</label>
        <input
          className="bg-gray-700 text-white rounded-xl p-3 w-full mb-4"
          placeholder="Usuario"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <label className="text-gray-400 text-sm mb-1 block">Contraseña</label>
        <input
          className="bg-gray-700 text-white rounded-xl p-3 w-full mb-6"
          placeholder="Contraseña"
          type="password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {error && (
          <p className="text-red-400 text-sm text-center mb-4">
            Usuario o contraseña incorrectos
          </p>
        )}

        <button
          onClick={handleLogin}
          className="bg-blue-600 text-white font-bold py-3 rounded-xl w-full"
        >
          Ingresar
        </button>
      </div>
    </div>
  )
}