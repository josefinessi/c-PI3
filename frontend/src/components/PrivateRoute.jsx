import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from './Layout'

export default function PrivateRoute({ children, chefiaOuAdmin = false, adminOnly = false }) {
  const { user, loading, isChefia, isAdmin } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" style={{ borderTopColor: 'var(--red)', borderColor: 'var(--gray-200)', width: '2rem', height: '2rem', borderWidth: '3px' }} />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (chefiaOuAdmin && !isChefia && !isAdmin) return <Navigate to="/dashboard" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />

  return <Layout>{children}</Layout>
}
