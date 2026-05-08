import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MinhasFerias from './pages/MinhasFerias'
import SolicitarFerias from './pages/SolicitarFerias'
import PendentesSetor from './pages/PendentesSetor'
import CalendarioSetor from './pages/CalendarioSetor'
import Usuarios from './pages/Usuarios'
import Setores from './pages/Setores'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/minhas-ferias" element={<PrivateRoute><MinhasFerias /></PrivateRoute>} />
          <Route path="/solicitar" element={<PrivateRoute><SolicitarFerias /></PrivateRoute>} />
          <Route path="/pendentes" element={<PrivateRoute gestorOnly><PendentesSetor /></PrivateRoute>} />
          <Route path="/calendario" element={<PrivateRoute><CalendarioSetor /></PrivateRoute>} />
          <Route path="/usuarios" element={<PrivateRoute gestorOnly><Usuarios /></PrivateRoute>} />
          <Route path="/setores" element={<PrivateRoute gestorOnly><Setores /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
