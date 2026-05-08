import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from './Layout'

export default function PrivateRoute({ children, gestorOnly = false }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" style={{ borderTopColor: 'var(--red)', borderColor: 'var(--gray-200)', width: '2rem', height: '2rem', borderWidth: '3px' }} />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (gestorOnly && user.role !== 'Gestor') return <Navigate to="/dashboard" replace />

  return <Layout>{children}</Layout>
}
