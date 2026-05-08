import { useState, useEffect } from 'react'
import { feriasApi, getStatusLabel, getStatusBadgeClass, formatDateOnly } from '../api'

function calcDays(ini, fim) {
  if (!ini || !fim) return 0
  const a = new Date(ini), b = new Date(fim)
  return Math.round((b - a) / 86400000) + 1
}

export default function Adiantamentos() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('todos') // todos | ferias | 13

  useEffect(() => {
    feriasApi.adiantamentos()
      .then(r => setLista(r.data ?? []))
      .catch(() => setError('Erro ao carregar adiantamentos.'))
      .finally(() => setLoading(false))
  }, [])

  const filtrada = lista.filter(a => {
    if (filtro === 'ferias') return a.adiantFerias
    if (filtro === '13')    return a.adiant13
    return true
  })

  const totalFerias = lista.filter(a => a.adiantFerias).length
  const total13     = lista.filter(a => a.adiant13).length

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Adiantamentos</h1>
        <p className="page-subtitle">Funcionários que solicitaram adiantamento de férias ou 13° salário</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Resumo */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { icon: '💼', value: totalFerias, label: 'Adiant. de férias', key: 'ferias', color: '#2563eb' },
          { icon: '💰', value: total13,     label: 'Adiant. de 13°',   key: '13',     color: '#7c3aed' },
          { icon: '📋', value: lista.length, label: 'Total solicit.',  key: 'todos',  color: 'var(--red)' },
        ].map(s => (
          <div
            key={s.key}
            className={`stat-card card ${filtro === s.key ? 'stat-card--active' : ''}`}
            style={{ cursor: 'pointer', border: filtro === s.key ? `2px solid ${s.color}` : undefined }}
            onClick={() => setFiltro(s.key)}
          >
            <div className="stat-icon" style={{ background: `${s.color}18`, color: s.color }}>{s.icon}</div>
            <div>
              <div className="stat-value">{loading ? '…' : s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="loading-center">
          <div className="spinner" style={{ borderTopColor: 'var(--red)', borderColor: 'var(--gray-200)', width: '2rem', height: '2rem', borderWidth: '3px' }} />
        </div>
      ) : filtrada.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>💼</div>
          <h3 style={{ fontWeight: 700 }}>Nenhuma solicitação de adiantamento</h3>
          <p style={{ color: 'var(--gray-500)' }}>Nenhum funcionário solicitou adiantamento ainda.</p>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3>
              {filtro === 'ferias' ? 'Adiantamento de Férias'
               : filtro === '13'  ? 'Adiantamento de 13°'
               : 'Todas as Solicitações com Adiantamento'}
            </h3>
            <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>{filtrada.length} registro(s)</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Funcionário</th>
                  <th>Setor</th>
                  <th>Períodos</th>
                  <th>Adiantamentos</th>
                  <th>Status</th>
                  <th>Enviado em</th>
                </tr>
              </thead>
              <tbody>
                {filtrada.map(f => (
                  <tr key={f.feriasId}>
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
                      {f.periodos?.map((p, i) => (
                        <div key={i} style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                          {formatDateOnly(p.inicio)} → {formatDateOnly(p.fim)} ({calcDays(p.inicio, p.fim)} d)
                        </div>
                      ))}
                    </td>
                    <td>
                      {f.adiantFerias && <span className="badge badge-info" style={{ marginRight: 4, marginBottom: 2, display: 'inline-block' }}>Férias</span>}
                      {f.adiant13    && <span className="badge badge-info" style={{ display: 'inline-block' }}>13°</span>}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(f.status)}`}>{getStatusLabel(f.status)}</span>
                    </td>
                    <td className="text-gray">{new Date(f.createdAt).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
