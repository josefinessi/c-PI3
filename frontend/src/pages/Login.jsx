import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, usuariosApi, parseJwt } from '../api'
import { useAuth } from '../context/AuthContext'
import './Login.css'

const DEMO_USERS = [
  { nome: 'Admin Hospital',   senha: 'Ferias@2026', role: 'Admin',      setorNome: '' },
  { nome: 'João Silva',       senha: 'Ferias@2026', role: 'Chefia',     setorNome: 'Enfermagem' },
  { nome: 'Ana Costa',        senha: 'Ferias@2026', role: 'Chefia',     setorNome: 'Radiologia' },
  { nome: 'Maria Santos',     senha: 'Ferias@2026', role: 'Funcionario',setorNome: 'Enfermagem' },
  { nome: 'Carlos Oliveira',  senha: 'Ferias@2026', role: 'Funcionario',setorNome: 'Radiologia' },
  { nome: 'Pedro Souza',      senha: 'Ferias@2026', role: 'Funcionario',setorNome: '' },
]

const DEMO_SETORES = ['Enfermagem', 'Radiologia', 'UTI', 'Pediatria', 'Laboratorio']

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
        ?? claims?.role ?? claims?.Role ?? 'Funcionario'
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
      } catch { /* usa claims */ }

      login(token, userData)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message ?? err.response?.data ?? 'Dados incorretos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSeed() {
    setSeeding(true)
    setSeedMsg('')
    setSeedError('')
    let created = 0
    const errs = []

    for (const setor of DEMO_SETORES) {
      try {
        await fetch('/api/setores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: setor })
        })
      } catch { /* ignora se já existe */ }
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

    if (created > 0) setSeedMsg(`${created} usuário(s) criado(s) com sucesso!`)
    if (errs.length > 0) setSeedError(errs.join(' | '))
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
          <div className="feature-item"><span>✔</span> Solicitação com até 3 períodos</div>
          <div className="feature-item"><span>✔</span> Aprovação em duas etapas (Chefia → Admin)</div>
          <div className="feature-item"><span>✔</span> Adiantamento de férias e 13°</div>
          <div className="feature-item"><span>✔</span> Calendário de ocupação por setor</div>
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
                <span>Nome</span><span>Cargo</span><span>Setor</span><span>Senha</span>
              </div>
              {[
                { nome: 'Admin Hospital',  cargo: 'Admin',      setor: '—',          badge: 'badge-admin' },
                { nome: 'João Silva',      cargo: 'Chefia',     setor: 'Enfermagem', badge: 'badge-gestor' },
                { nome: 'Ana Costa',       cargo: 'Chefia',     setor: 'Radiologia', badge: 'badge-gestor' },
                { nome: 'Maria Santos',    cargo: 'Funcionário',setor: 'Enfermagem', badge: 'badge-colaborador' },
                { nome: 'Carlos Oliveira', cargo: 'Funcionário',setor: 'Radiologia', badge: 'badge-colaborador' },
              ].map(u => (
                <div key={u.nome} className="demo-user-row">
                  <span>{u.nome}</span>
                  <span className={`badge ${u.badge}`}>{u.cargo}</span>
                  <span>{u.setor}</span>
                  <span>Ferias@2026</span>
                </div>
              ))}
            </div>
            <p className="demo-note">
              Clique em <strong>Criar usuários demo</strong>. Depois veja a matrícula gerada em <strong>Usuários</strong> (login como Admin ou Chefia).
            </p>
            {seedMsg && <div className="alert alert-success mt-2">{seedMsg}</div>}
            {seedError && <div className="alert alert-warning mt-2 demo-errs">{seedError}</div>}
            <button
              className="btn btn-outline w-full"
              onClick={handleSeed}
              disabled={seeding}
              type="button"
            >
              {seeding
                ? <><span className="spinner" style={{ borderTopColor: 'var(--red)', borderColor: 'var(--red-light)' }} /> Criando...</>
                : '🚀 Criar usuários demo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
