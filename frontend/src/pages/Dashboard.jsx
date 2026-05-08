import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { feriasApi, usuariosApi, setoresApi, getStatusLabel, getStatusBadgeClass, formatDateOnly } from '../api'
import './Dashboard.css'

export default function Dashboard() {
  const { user, isGestor } = useAuth()
  const [myVacations, setMyVacations] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [setores, setSetores] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const promises = [
          feriasApi.minhas(user.matricula).catch(() => ({ data: [] })),
          usuariosApi.getAll().catch(() => ({ data: [] })),
          setoresApi.getAll().catch(() => ({ data: [] })),
        ]
        if (isGestor && user.setorId) {
          promises.push(feriasApi.pendentesPorSetor(user.setorId).catch(() => ({ data: [] })))
        }
        const results = await Promise.all(promises)
        setMyVacations(results[0].data ?? [])
        setAllUsers(results[1].data ?? [])
        setSetores(results[2].data ?? [])
        if (results[3]) setPending(results[3].data ?? [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, isGestor])

  const stats = [
    {
      label: 'Minhas Solicitações',
      value: myVacations.length,
      sub: `${myVacations.filter(f => f.status === 0).length} pendente(s)`,
      color: 'var(--red)',
      link: '/minhas-ferias',
      icon: '🏖'
    },
    {
      label: 'Férias Aprovadas',
      value: myVacations.filter(f => f.status === 1).length,
      sub: 'Total aprovadas',
      color: '#16a34a',
      link: '/minhas-ferias',
      icon: '✅'
    },
    ...(isGestor ? [
      {
        label: 'Pendentes no Setor',
        value: pending.length,
        sub: 'Aguardando aprovação',
        color: '#d97706',
        link: '/pendentes',
        icon: '⏳'
      },
      {
        label: 'Total de Usuários',
        value: allUsers.length,
        sub: `${setores.length} setor(es)`,
        color: '#2563eb',
        link: '/usuarios',
        icon: '👥'
      },
    ] : [
      {
        label: 'Meu Setor',
        value: user.setorNome || 'Sem Setor',
        sub: 'Setor atual',
        color: '#2563eb',
        link: '/calendario',
        icon: '🏢',
        isText: true
      }
    ])
  ]

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" style={{ borderTopColor: 'var(--red)', borderColor: 'var(--gray-200)', width: '2rem', height: '2rem', borderWidth: '3px' }} />
    </div>
  )

  return (
    <div className="dashboard">
      <div className="dash-welcome">
        <div>
          <h1 className="page-title">Olá, {user.nome?.split(' ')[0]}! 👋</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link to="/solicitar" className="btn btn-primary">+ Solicitar Férias</Link>
      </div>

      <div className="stats-grid">
        {stats.map((s, i) => (
          <Link to={s.link} key={i} className="stat-card card">
            <div className="stat-icon" style={{ background: `${s.color}15`, color: s.color }}>
              {s.icon}
            </div>
            <div>
              <div className="stat-value" style={s.isText ? { fontSize: '1rem' } : {}}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-header">
            <h3>Minhas Últimas Férias</h3>
            <Link to="/minhas-ferias" className="btn btn-ghost btn-sm">Ver todas</Link>
          </div>
          {myVacations.length === 0 ? (
            <div className="empty-state">
              <span>🏖</span>
              <p>Nenhuma solicitação ainda.</p>
              <Link to="/solicitar" className="btn btn-outline btn-sm">Solicitar agora</Link>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Status</th>
                    <th>Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {myVacations.slice(0, 5).map(f => (
                    <tr key={f.id}>
                      <td>
                        {f.periodos?.map((p, i) => (
                          <span key={i} className="periodo-chip">
                            {formatDateOnly(p.inicio)} → {formatDateOnly(p.fim)}
                          </span>
                        ))}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(f.status)}`}>
                          {getStatusLabel(f.status)}
                        </span>
                      </td>
                      <td className="text-gray">{new Date(f.createdAt).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isGestor && (
          <div className="card">
            <div className="card-header">
              <h3>Pendentes para Aprovar</h3>
              <Link to="/pendentes" className="btn btn-ghost btn-sm">Ver todas</Link>
            </div>
            {pending.length === 0 ? (
              <div className="empty-state">
                <span>🎉</span>
                <p>Sem solicitações pendentes!</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Colaborador</th>
                      <th>Período(s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.slice(0, 5).map(f => (
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
                          {f.periodos?.slice(0, 2).map((p, i) => (
                            <span key={i} className="periodo-chip">
                              {formatDateOnly(p.inicio)} → {formatDateOnly(p.fim)}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
