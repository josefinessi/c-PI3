import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { feriasApi, usuariosApi, formatDateOnly } from '../api'
import './PendentesSetor.css'

export default function PendentesSetor() {
  const { user } = useAuth()
  const [pendentes, setPendentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [acting, setActing] = useState(null)
  const [negarModal, setNegarModal] = useState(null)
  const [motivo, setMotivo] = useState('')

  async function load() {
    if (!user.setorId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await feriasApi.pendentesPorSetor(user.setorId)
      setPendentes(res.data ?? [])
    } catch {
      setError('Erro ao carregar pendências.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user.setorId])

  async function handleAprovar(f) {
    if (!confirm(`Aprovar férias de ${f.nome}?`)) return
    setActing(f.id + '_aprovar')
    setError('')
    setMsg('')
    try {
      await feriasApi.aprovar(f.id, user.id)
      setMsg(`Férias de ${f.nome} aprovadas com sucesso!`)
      load()
    } catch (e) {
      setError(e.response?.data?.message ?? e.response?.data ?? 'Erro ao aprovar.')
    } finally {
      setActing(null)
    }
  }

  async function handleNegar() {
    if (!motivo.trim()) { setError('Informe o motivo da negação.'); return }
    setActing(negarModal.id + '_negar')
    setError('')
    setMsg('')
    try {
      await feriasApi.negar(negarModal.id, user.id, motivo)
      setMsg(`Férias de ${negarModal.nome} negadas.`)
      setNegarModal(null)
      setMotivo('')
      load()
    } catch (e) {
      setError(e.response?.data?.message ?? e.response?.data ?? 'Erro ao negar.')
    } finally {
      setActing(null)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Pendentes do Setor</h1>
        <p className="page-subtitle">
          {user.setorNome ? `Setor: ${user.setorNome}` : 'Você não está em um setor'} — Solicitações aguardando aprovação
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      {!user.setorId ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Você não está associado a nenhum setor.</p>
        </div>
      ) : loading ? (
        <div className="loading-center">
          <div className="spinner" style={{ borderTopColor: 'var(--red)', borderColor: 'var(--gray-200)', width: '2rem', height: '2rem', borderWidth: '3px' }} />
        </div>
      ) : pendentes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Nenhuma solicitação pendente</h3>
          <p style={{ color: 'var(--gray-500)' }}>Todas as solicitações foram processadas.</p>
        </div>
      ) : (
        <div className="pendentes-list">
          {pendentes.map(f => (
            <div key={f.id} className="pendente-card card">
              <div className="pendente-header">
                <div className="pendente-user">
                  <div className="pend-avatar">{f.nome?.[0]}</div>
                  <div>
                    <div className="pend-name">{f.nome}</div>
                    <div className="pend-meta">
                      <span>Matrícula #{f.matricula}</span>
                      {f.setorNome && <span>• {f.setorNome}</span>}
                      <span>• Solicitado em {new Date(f.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
                <div className="pendente-actions">
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleAprovar(f)}
                    disabled={acting === f.id + '_aprovar'}
                  >
                    {acting === f.id + '_aprovar' ? <span className="spinner" /> : '✓'} Aprovar
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => { setNegarModal(f); setMotivo(''); setError('') }}
                    disabled={!!acting}
                  >
                    ✕ Negar
                  </button>
                </div>
              </div>

              <div className="pendente-periods">
                {f.periodos?.map((p, i) => {
                  const dias = calcDays(p.inicio, p.fim)
                  return (
                    <div key={i} className="pend-period">
                      <span>📅</span>
                      <span>{formatDateOnly(p.inicio)} → {formatDateOnly(p.fim)}</span>
                      <span className="pend-days">{dias} dias</span>
                    </div>
                  )
                })}
                <div className="pend-total">
                  Total: <strong>{f.periodos?.reduce((s, p) => s + calcDays(p.inicio, p.fim), 0)} dias</strong>
                </div>
              </div>

              {f.avisos?.length > 0 && (
                <div className="alert alert-warning" style={{ marginTop: '0.75rem', marginBottom: 0, fontSize: '0.85rem' }}>
                  ⚠ {f.avisos.join(' | ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {negarModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setNegarModal(null)}>
          <div className="modal-box card">
            <div className="modal-header">
              <h3>Negar férias de {negarModal.nome}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setNegarModal(null)}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label>Motivo da negação *</label>
              <textarea
                className="form-control"
                rows={3}
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Descreva o motivo..."
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setNegarModal(null)}>Cancelar</button>
              <button
                className="btn btn-danger"
                onClick={handleNegar}
                disabled={acting === negarModal.id + '_negar'}
              >
                {acting === negarModal.id + '_negar' ? <span className="spinner" /> : '✕ Confirmar negação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function calcDays(ini, fim) {
  if (!ini || !fim) return 0
  const a = new Date(ini), b = new Date(fim)
  return Math.round((b - a) / 86400000) + 1
}
