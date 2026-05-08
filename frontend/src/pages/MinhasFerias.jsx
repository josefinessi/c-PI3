import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { feriasApi, getStatusLabel, getStatusBadgeClass, formatDateOnly } from '../api'
import './MinhasFerias.css'

export default function MinhasFerias() {
  const { user } = useAuth()
  const [ferias, setFerias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(null)
  const [msg, setMsg] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await feriasApi.minhas(user.matricula)
      setFerias(res.data ?? [])
    } catch {
      setError('Erro ao carregar férias.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user.matricula])

  async function handleCancel(f) {
    if (!confirm('Deseja cancelar esta solicitação?')) return
    setCancelling(f.id)
    try {
      await feriasApi.cancelar(f.id, user.matricula)
      setMsg('Solicitação cancelada.')
      load()
    } catch (e) {
      setError(e.response?.data?.message ?? 'Erro ao cancelar.')
    } finally {
      setCancelling(null)
    }
  }

  const pendentes = ferias.filter(f => f.status === 0)
  const aprovadas = ferias.filter(f => f.status === 1)
  const outras = ferias.filter(f => f.status === 2 || f.status === 3)

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Minhas Férias</h1>
          <p className="page-subtitle">Histórico de todas as suas solicitações</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      {loading ? (
        <div className="loading-center">
          <div className="spinner" style={{ borderTopColor: 'var(--red)', borderColor: 'var(--gray-200)', width: '2rem', height: '2rem', borderWidth: '3px' }} />
        </div>
      ) : ferias.length === 0 ? (
        <div className="card empty-page">
          <span>🏖</span>
          <h3>Nenhuma solicitação</h3>
          <p>Você ainda não solicitou férias. Use o botão abaixo para começar.</p>
          <a href="/solicitar" className="btn btn-primary">+ Solicitar Férias</a>
        </div>
      ) : (
        <div className="ferias-list">
          {ferias.map(f => (
            <div key={f.id} className={`ferias-card card status-${f.status}`}>
              <div className="ferias-card-header">
                <div className="ferias-status-row">
                  <span className={`badge ${getStatusBadgeClass(f.status)}`}>{getStatusLabel(f.status)}</span>
                  <span className="ferias-date">Solicitado em {new Date(f.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                {f.status === 0 && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleCancel(f)}
                    disabled={cancelling === f.id}
                  >
                    {cancelling === f.id ? <span className="spinner" /> : '✕'} Cancelar
                  </button>
                )}
              </div>

              <div className="ferias-periods">
                {f.periodos?.map((p, i) => (
                  <div key={i} className="period-item">
                    <span className="period-icon">📅</span>
                    <span className="period-range">
                      {formatDateOnly(p.inicio)} <strong>→</strong> {formatDateOnly(p.fim)}
                    </span>
                    <span className="period-days">
                      {calcDays(p.inicio, p.fim)} dias
                    </span>
                  </div>
                ))}
              </div>

              {f.avisos?.length > 0 && (
                <div className="alert alert-warning" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                  <strong>Avisos:</strong> {f.avisos.join(' | ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function calcDays(inicio, fim) {
  if (!inicio || !fim) return 0
  const a = new Date(inicio)
  const b = new Date(fim)
  return Math.round((b - a) / 86400000) + 1
}
