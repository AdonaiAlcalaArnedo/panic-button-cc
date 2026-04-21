import LocalApp from './pages/LocalApp'
import Dashboard from './pages/Dashboard'

function App() {
  const path = window.location.pathname

  if (path === '/dashboard') {
    return <Dashboard />
  }

  return <LocalApp />
}

export default App