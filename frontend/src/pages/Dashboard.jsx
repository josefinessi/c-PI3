import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { feriasApi, getStatusLabel, getStatusBadgeClass, formatDateOnly, STATUS } from '../api'
import './Dashboard.css'

export default function Dashboard() {
  const { user, isChefia, isAdmin } = useAuth()
  if (isAdmin)  return <DashboardAdmin  user={user} />
  if (isChefia) return <DashboardChefia user={user} />
  return <DashboardFuncionario user={user} />
}

// ────────────────────────────────────────────────
//  FUNCIONÁRIO
// ────────────────────────────────────────────────
function DashboardFuncionario({ user }) {
  const [minhas, setMinhas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.matricula) return
    feriasApi.minhas(user.matricula)
      .then(r => setMinhas(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const pendentes    = minhas.filter(f => f.status === STATUS.PENDENTE)
  const emAprovacao  = minhas.filter(f => f.status === STATUS.APROVADA_CHEFIA)
  const aprovadas    = minhas.filter(f => f.status === STATUS.APROVADA_ADMIN)

  const stats = [
    { icon: '⏳', value: pendentes.length,   label: 'Pendentes',            color: '#d97706' },
    { icon: '🔄', value: emAprovacao.length,  label: 'Em aprovação final',   color: '#2563eb' },
    { icon: '✅', value: aprovadas.length,    label: 'Aprovadas',            color: '#16a34a' },
    { icon: '📋', value: minhas.length,       label: 'Total de pedidos',     color: 'var(--red)' },
  ]

  return (
    <div className="dashboard">
      <div className="dash-welcome">
        <div>
          <h1 className="page-title">Olá, {user?.nome?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Acompanhe suas solicitações de férias</p>
        </div>
        <Link to="/solicitar" className="btn btn-primary">+ Solicitar Férias</Link>
      </div>

      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card card">
            <div className="stat-icon" style={{ background: `${s.color}18`, color: s.color }}>{s.icon}</div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-header">
            <h3>Minhas Últimas Férias</h3>
            <Link to="/minhas-ferias" className="btn btn-ghost btn-sm">Ver todas</Link>
          </div>

          {loading ? (
            <div className="loading-center">
              <div className="spinner" style={{ borderTopColor: 'var(--red)', borderColor: 'var(--gray-200)', width: '2rem', height: '2rem', borderWidth: '3px' }} />
            </div>
          ) : minhas.length === 0 ? (
            <div className="empty-state">
              <span>🏖</span>
              <p>Nenhuma solicitação ainda.</p>
              <Link to="/solicitar" className="btn btn-outline btn-sm">Solicitar agora</Link>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Período(s)</th><th>Status</th><th>Enviado em</th></tr>
                </thead>
                <tbody>
                  {minhas.slice(0, 5).map(f => (
                    <tr key={f.id}>
                      <td>
                        {f.periodos?.slice(0, 2).map((p, i) => (
                          <span key={i} className="periodo-chip">
                            {formatDateOnly(p.inicio)} → {formatDateOnly(p.fim)}
                          </span>
                        ))}
                        {f.periodos?.length > 2 && <span className="periodo-chip">+{f.periodos.length - 2}</span>}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(f.status)}`}>{getStatusLabel(f.status)}</span>
                        {f.adiantFerias && <span className="badge badge-info" style={{ marginLeft: 4 }}>+Férias</span>}
                        {f.adiant13    && <span className="badge badge-info" style={{ marginLeft: 4 }}>+13°</span>}
                      </td>
                      <td className="text-gray">{new Date(f.createdAt).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><h3>Ações rápidas</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
            <Link to="/solicitar"    className="btn btn-primary"  style={{ justifyContent: 'center' }}>➕ Solicitar Férias</Link>
            <Link to="/minhas-ferias"className="btn btn-outline"  style={{ justifyContent: 'center' }}>📋 Ver histórico</Link>
            <Link to="/calendario"   className="btn btn-outline"  style={{ justifyContent: 'center' }}>📅 Calendário do setor</Link>
          </div>
          <div className="card" style={{ marginTop: '1rem', background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
            <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>ℹ Regras</h4>
            <ul style={{ fontSize: '0.82rem', color: 'var(--gray-600)', paddingLeft: '1.1rem' }}>
              <li>Até <strong>3 períodos</strong> por solicitação</li>
              <li>Total ≤ <strong>30 dias</strong> corridos</li>
              <li>Antecedência mínima de <strong>30 dias</strong></li>
              <li>Fluxo: Chefia → Admin</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────
//  CHEFIA
// ────────────────────────────────────────────────
function DashboardChefia({ user }) {
  const [pendentes, setPendentes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.setorId) return
    feriasApi.pendentesPorSetor(user.setorId)
      .then(r => setPendentes(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  return (
    <div className="dashboard">
      <div className="dash-welcome">
        <div>
          <h1 className="page-title">Painel da Chefia</h1>
          <p className="page-subtitle">Setor: <strong>{user?.setorNome || '—'}</strong></p>
        </div>
        <Link to="/pendentes" className="btn btn-primary">⏳ Responder Solicitações</Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card card">
          <div className="stat-icon" style={{ background: '#d9770618', color: '#d97706' }}>⏳</div>
          <div>
            <div className="stat-value">{loading ? '…' : pendentes.length}</div>
            <div className="stat-label">Aguardando sua aprovação</div>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-header">
            <h3>Solicitações pendentes</h3>
            <Link to="/pendentes" className="btn btn-ghost btn-sm">Responder</Link>
          </div>
          {loading ? (
            <div className="loading-center">
              <div className="spinner" style={{ borderTopColor: 'var(--red)', borderColor: 'var(--gray-200)', width: '2rem', height: '2rem', borderWidth: '3px' }} />
            </div>
          ) : pendentes.length === 0 ? (
            <div className="empty-state"><span>🎉</span><p>Nenhuma pendente no momento.</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Funcionário</th><th>Períodos</th><th>Adiantamentos</th></tr>
                </thead>
                <tbody>
                  {pendentes.map(f => (
                    <tr key={f.id}>
                      <td>
                        <div className="user-cell">
                          <div className="mini-avatar">{f.nome?.[0]}</div>
                          <div>
                            <div className="user-cell-name">{f.nome}</div>
                            <div className="user-cell-sub">#{f.matricula}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {f.periodos?.map((p, i) => (
                          <span key={i} className="periodo-chip">{formatDateOnly(p.inicio)} → {formatDateOnly(p.fim)}</span>
                        ))}
                      </td>
                      <td>
                        {f.adiantFerias && <span className="badge badge-info" style={{ marginRight: 4 }}>Férias</span>}
                        {f.adiant13    && <span className="badge badge-info">13°</span>}
                        {!f.adiantFerias && !f.adiant13 && <span className="text-gray">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><h3>Acesso rápido</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
            <Link to="/pendentes"    className="btn btn-primary" style={{ justifyContent: 'center' }}>⏳ Respostas Chefia</Link>
            <Link to="/calendario"   className="btn btn-outline" style={{ justifyContent: 'center' }}>📅 Calendário do Setor</Link>
            <Link to="/usuarios"     className="btn btn-outline" style={{ justifyContent: 'center' }}>👥 Usuários do Setor</Link>
            <Link to="/minhas-ferias"className="btn btn-outline" style={{ justifyContent: 'center' }}>🏖 Minhas Férias</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────
//  ADMIN
// ────────────────────────────────────────────────
function DashboardAdmin({ user }) {
  const [aguardando, setAguardando]     = useState([])
  const [adiantamentos, setAdiantamentos] = useState([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    Promise.all([
      feriasApi.aguardandoAdmin().then(r => setAguardando(r.data ?? [])),
      feriasApi.adiantamentos().then(r => setAdiantamentos(r.data ?? [])),
    ]).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const adiantFeriasList = adiantamentos.filter(a => a.adiantFerias)
  const adiant13List     = adiantamentos.filter(a => a.adiant13)

  return (
    <div className="dashboard">
      <div className="dash-welcome">
        <div>
          <h1 className="page-title">Painel do Administrador</h1>
          <p className="page-subtitle">Visão global do hospital</p>
        </div>
        <Link to="/aprovar-admin" className="btn btn-primary">✅ Aprovar Solicitações</Link>
      </div>

      <div className="stats-grid">
        {[
          { icon: '✅', value: aguardando.length,      label: 'Aprovadas pela chefia',       color: '#16a34a' },
          { icon: '💼', value: adiantFeriasList.length, label: 'Adiant. de férias solicitados', color: '#2563eb' },
          { icon: '💰', value: adiant13List.length,     label: 'Adiant. de 13° solicitados',   color: '#7c3aed' },
        ].map((s, i) => (
          <div key={i} className="stat-card card">
            <div className="stat-icon" style={{ background: `${s.color}18`, color: s.color }}>{s.icon}</div>
            <div>
              <div className="stat-value">{loading ? '…' : s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-header">
            <h3>Aguardando aprovação final</h3>
            <Link to="/aprovar-admin" className="btn btn-ghost btn-sm">Ver todas</Link>
          </div>
          {loading ? (
            <div className="loading-center">
              <div className="spinner" style={{ borderTopColor: 'var(--red)', borderColor: 'var(--gray-200)', width: '2rem', height: '2rem', borderWidth: '3px' }} />
            </div>
          ) : aguardando.length === 0 ? (
            <div className="empty-state"><span>🎉</span><p>Nenhuma aguardando aprovação.</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Funcionário</th><th>Setor</th><th>Períodos</th><th>Adiantamentos</th></tr>
                </thead>
                <tbody>
                  {aguardando.slice(0, 5).map(f => (
                    <tr key={f.id}>
                      <td>
                        <div className="user-cell">
                          <div className="mini-avatar">{f.nome?.[0]}</div>
                          <div>
                            <div className="user-cell-name">{f.nome}</div>
                            <div className="user-cell-sub">#{f.matricula}</div>
                          </div>
                        </div>
                      </td>
                      <td>{f.setorNome}</td>
                      <td>
                        {f.periodos?.slice(0, 2).map((p, i) => (
                          <span key={i} className="periodo-chip">{formatDateOnly(p.inicio)} → {formatDateOnly(p.fim)}</span>
                        ))}
                      </td>
                      <td>
                        {f.adiantFerias && <span className="badge badge-info" style={{ marginRight: 4 }}>Férias</span>}
                        {f.adiant13    && <span className="badge badge-info">13°</span>}
                        {!f.adiantFerias && !f.adiant13 && <span className="text-gray">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><h3>Acesso rápido</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
            <Link to="/aprovar-admin"  className="btn btn-primary" style={{ justifyContent: 'center' }}>✅ Aprovar (Admin)</Link>
            <Link to="/adiantamentos"  className="btn btn-outline" style={{ justifyContent: 'center' }}>💰 Adiantamentos</Link>
            <Link to="/usuarios"       className="btn btn-outline" style={{ justifyContent: 'center' }}>👥 Usuários</Link>
            <Link to="/setores"        className="btn btn-outline" style={{ justifyContent: 'center' }}>🏢 Setores</Link>
            <Link to="/calendario"     className="btn btn-outline" style={{ justifyContent: 'center' }}>📅 Calendário</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
