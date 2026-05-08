import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, usuariosApi, parseJwt } from '../api'
import { useAuth } from '../context/AuthContext'
import './Login.css'

const DEMO_USERS = [
  { nome: 'João Silva', senha: 'Ferias@2026', role: 'Gestor', setorNome: 'Enfermagem' },
  { nome: 'Maria Santos', senha: 'Ferias@2026', role: 'Colaborador', setorNome: 'Enfermagem' },
  { nome: 'Carlos Oliveira', senha: 'Ferias@2026', role: 'Colaborador', setorNome: 'Radiologia' },
  { nome: 'Ana Costa', senha: 'Ferias@2026', role: 'Gestor', setorNome: 'Radiologia' },
  { nome: 'Pedro Souza', senha: 'Ferias@2026', role: 'Colaborador', setorNome: '' },
]

const DEMO_SETORES = ['Enfermagem', 'Radiologia', 'UTI', 'Pediatria']

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [matricula, setMatricula] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState('')
  const [seedError, setSeedError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login(matricula.trim(), senha)
      const token = res.data.token
      const claims = parseJwt(token)
      const role = claims?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
        ?? claims?.role ?? claims?.Role ?? 'Colaborador'
      const mat = claims?.Matricula ?? claims?.matricula ?? matricula

      let userData = { nome: 'Usuário', matricula: mat, role, setorId: null, setorNome: '', id: null }
      try {
        const uRes = await usuariosApi.getByMatricula(mat)
        userData = {
          nome: uRes.data.nome,
          matricula: uRes.data.matricula,
          role: uRes.data.role,
          setorId: uRes.data.setorId,
          setorNome: uRes.data.setorNome,
          id: uRes.data.id,
        }
      } catch { /* use claims */ }

      login(token, userData)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message ?? err.response?.data ?? 'Matrícula ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSeed() {
    setSeeding(true)
    setSeedMsg('')
    setSeedError('')
    let created = 0
    let errs = []

    for (const setor of DEMO_SETORES) {
      try {
        const token = localStorage.getItem('token')
        await fetch('/api/setores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ nome: setor })
        })
      } catch { /* ignore - may already exist */ }
    }

    for (const u of DEMO_USERS) {
      try {
        const body = { nome: u.nome, senha: u.senha, role: u.role }
        if (u.setorNome) body.setorNome = u.setorNome
        await authApi.register(body)
        created++
      } catch (e) {
        const msg = e.response?.data?.message ?? e.response?.data ?? String(e)
        if (String(msg).toLowerCase().includes('já') || String(msg).toLowerCase().includes('exist')) {
          errs.push(`${u.nome}: já existe`)
        } else {
          errs.push(`${u.nome}: ${String(msg).slice(0, 60)}`)
        }
      }
    }

    if (created > 0) {
      setSeedMsg(`${created} usuário(s) criado(s) com sucesso!`)
    }
    if (errs.length > 0) {
      setSeedError(errs.join(' | '))
    }
    setSeeding(false)
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <span className="login-logo-icon">☀️</span>
          <h1>GestãoFérias</h1>
          <p>Sistema de gestão de férias para equipes de saúde</p>
        </div>
        <div className="login-features">
          <div className="feature-item">
            <span>✔</span> Solicitação e aprovação de férias
          </div>
          <div className="feature-item">
            <span>✔</span> Controle de limite por setor
          </div>
          <div className="feature-item">
            <span>✔</span> Calendário de ocupação
          </div>
          <div className="feature-item">
            <span>✔</span> Gestão de usuários e setores
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="login-header">
            <h2>Entrar no sistema</h2>
            <p>Use sua matrícula e senha para acessar</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Matrícula</label>
              <input
                className="form-control"
                value={matricula}
                onChange={e => setMatricula(e.target.value)}
                placeholder="Ex: 0001"
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Senha</label>
              <input
                className="form-control"
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Sua senha"
                required
              />
            </div>
            <button className="btn btn-primary w-full login-submit-btn" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" /> Entrando...</> : 'Entrar'}
            </button>
          </form>

          <div className="demo-section">
            <div className="demo-title">Usuários de demonstração</div>
            <div className="demo-users">
              <div className="demo-user-row header-row">
                <span>Nome</span><span>Matrícula</span><span>Senha</span><span>Cargo</span>
              </div>
              <div className="demo-user-row">
                <span>João Silva</span><span>ver abaixo</span><span>Ferias@2026</span>
                <span className="badge badge-gestor">Gestor</span>
              </div>
              <div className="demo-user-row">
                <span>Maria Santos</span><span>ver abaixo</span><span>Ferias@2026</span>
                <span className="badge badge-colaborador">Colaborador</span>
              </div>
              <div className="demo-user-row">
                <span>Carlos Oliveira</span><span>ver abaixo</span><span>Ferias@2026</span>
                <span className="badge badge-colaborador">Colaborador</span>
              </div>
              <div className="demo-user-row">
                <span>Ana Costa</span><span>ver abaixo</span><span>Ferias@2026</span>
                <span className="badge badge-gestor">Gestor</span>
              </div>
            </div>
            <p className="demo-note">
              Primeiro, crie os usuários demo. Depois consulte a matrícula gerada em <strong>Usuários</strong> após login.
            </p>
            {seedMsg && <div className="alert alert-success mt-2">{seedMsg}</div>}
            {seedError && <div className="alert alert-warning mt-2 demo-errs">{seedError}</div>}
            <button
              className="btn btn-outline w-full"
              onClick={handleSeed}
              disabled={seeding}
              type="button"
            >
              {seeding ? <><span className="spinner" style={{borderTopColor:'var(--red)', borderColor:'var(--red-light)'}} /> Criando...</> : '🚀 Criar usuários demo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
