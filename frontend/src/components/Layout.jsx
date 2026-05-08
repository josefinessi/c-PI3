import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Layout.css'

const navItems = [
  { path: '/dashboard',         label: 'Dashboard',         icon: '⊞', roles: ['Funcionario','Colaborador','Chefia','Gestor','Admin'] },
  { path: '/minhas-ferias',     label: 'Minhas Férias',     icon: '🏖', roles: ['Funcionario','Colaborador','Chefia','Gestor','Admin'] },
  { path: '/solicitar',         label: 'Solicitar Férias',  icon: '➕', roles: ['Funcionario','Colaborador','Chefia','Gestor','Admin'] },
  { path: '/pendentes',         label: 'Respostas (Chefia)',icon: '⏳', roles: ['Chefia','Gestor'] },
  { path: '/aprovar-admin',     label: 'Respostas (Admin)', icon: '✅', roles: ['Admin'] },
  { path: '/calendario',        label: 'Calendário',        icon: '📅', roles: ['Funcionario','Colaborador','Chefia','Gestor','Admin'] },
  { path: '/usuarios',          label: 'Usuários',          icon: '👥', roles: ['Chefia','Gestor','Admin'] },
  { path: '/setores',           label: 'Setores',           icon: '🏢', roles: ['Admin'] },
  { path: '/adiantamentos',     label: 'Adiantamentos',     icon: '💰', roles: ['Admin'] },
]

function getRoleBadgeClass(role) {
  if (role === 'Admin') return 'badge-admin'
  if (role === 'Chefia' || role === 'Gestor') return 'badge-gestor'
  return 'badge-colaborador'
}

function getRoleLabel(role) {
  if (role === 'Admin') return 'Admin'
  if (role === 'Chefia' || role === 'Gestor') return 'Chefia'
  return 'Funcionário'
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const role = user?.role ?? 'Funcionario'
  const filtered = navItems.filter(item => item.roles.includes(role))

  return (
    <div className="layout">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">☀️</span>
            <span className="logo-text">GestãoFérias</span>
          </div>
          <button className="sidebar-close" onClick={() => setMenuOpen(false)}>✕</button>
        </div>

        <div className="user-info">
          <div className="user-avatar">
            {user?.nome?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <div className="user-name">{user?.nome ?? 'Usuário'}</div>
            <div className="user-meta">
              <span className={`badge ${getRoleBadgeClass(role)}`}>
                {getRoleLabel(role)}
              </span>
              <span className="user-matricula">#{user?.matricula}</span>
            </div>
          </div>
        </div>

        <nav className="nav">
          {filtered.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <span>⬅</span> Sair
        </button>
      </aside>

      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}

      <div className="main-wrapper">
        <header className="topbar">
          <button className="hamburger" onClick={() => setMenuOpen(true)}>☰</button>
          <span className="topbar-title">
            {filtered.find(i => i.path === location.pathname)?.label ?? 'Gestão de Férias'}
          </span>
          <div className="topbar-user">
            <span className="user-avatar-sm">{user?.nome?.[0]?.toUpperCase() ?? 'U'}</span>
            <span className="topbar-nome">{user?.nome}</span>
          </div>
        </header>

        <main className="content">
          {children}
        </main>
      </div>
    </div>
  )
}
