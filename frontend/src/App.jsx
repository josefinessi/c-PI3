import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MinhasFerias from './pages/MinhasFerias'
import SolicitarFerias from './pages/SolicitarFerias'
import PendentesSetor from './pages/PendentesSetor'
import RespostasAdmin from './pages/RespostasAdmin'
import CalendarioSetor from './pages/CalendarioSetor'
import Usuarios from './pages/Usuarios'
import Setores from './pages/Setores'
import Adiantamentos from './pages/Adiantamentos'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Todos os usuários autenticados */}
          <Route path="/dashboard"    element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/minhas-ferias"element={<PrivateRoute><MinhasFerias /></PrivateRoute>} />
          <Route path="/solicitar"    element={<PrivateRoute><SolicitarFerias /></PrivateRoute>} />
          <Route path="/calendario"   element={<PrivateRoute><CalendarioSetor /></PrivateRoute>} />

          {/* Chefia e Admin */}
          <Route path="/pendentes"    element={<PrivateRoute chefiaOuAdmin><PendentesSetor /></PrivateRoute>} />
          <Route path="/usuarios"     element={<PrivateRoute chefiaOuAdmin><Usuarios /></PrivateRoute>} />

          {/* Apenas Admin */}
          <Route path="/aprovar-admin"element={<PrivateRoute adminOnly><RespostasAdmin /></PrivateRoute>} />
          <Route path="/setores"      element={<PrivateRoute adminOnly><Setores /></PrivateRoute>} />
          <Route path="/adiantamentos"element={<PrivateRoute adminOnly><Adiantamentos /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
