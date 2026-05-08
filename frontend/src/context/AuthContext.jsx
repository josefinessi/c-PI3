import { createContext, useContext, useState, useEffect } from 'react'
import { parseJwt } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const stored = localStorage.getItem('user')
    if (token && stored) {
      try {
        const claims = parseJwt(token)
        if (claims && claims.exp * 1000 > Date.now()) {
          setUser(JSON.parse(stored))
        } else {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  function login(token, userData) {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const role = user?.role ?? ''
  const isFuncionario = role === 'Funcionario' || role === 'Colaborador'
  const isChefia = role === 'Chefia' || role === 'Gestor'
  const isAdmin = role === 'Admin'
  const isGestorOuAdmin = isChefia || isAdmin

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isFuncionario, isChefia, isAdmin, isGestorOuAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
