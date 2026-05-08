import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { feriasApi } from '../api'
import './SolicitarFerias.css'

function today() {
  return new Date().toISOString().split('T')[0]
}

function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function calcDays(ini, fim) {
  if (!ini || !fim) return 0
  const a = new Date(ini), b = new Date(fim)
  if (b < a) return 0
  return Math.round((b - a) / 86400000) + 1
}

export default function SolicitarFerias() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const start = addDays(today(), 30)
  const [periodos, setPeriodos] = useState([
    { inicio: start, fim: addDays(start, 29) }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const totalDays = periodos.reduce((acc, p) => acc + calcDays(p.inicio, p.fim), 0)

  function addPeriodo() {
    setPeriodos(prev => [...prev, { inicio: start, fim: start }])
  }

  function removePeriodo(i) {
    setPeriodos(prev => prev.filter((_, idx) => idx !== i))
  }

  function updatePeriodo(i, field, val) {
    setPeriodos(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess(null)

    if (totalDays !== 30) {
      setError(`A soma dos períodos deve ser exatamente 30 dias. Atual: ${totalDays} dias.`)
      return
    }

    setLoading(true)
    try {
      const res = await feriasApi.solicitar(user.matricula, periodos.map(p => ({
        inicio: p.inicio,
        fim: p.fim
      })))
      setSuccess(res.data)
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data ?? 'Erro ao solicitar férias.'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div>
        <h1 className="page-title">Solicitar Férias</h1>
        <div className="card success-result">
          <div className="success-icon">🎉</div>
          <h2>Solicitação enviada!</h2>
          <p>Sua solicitação foi criada com status <strong>Pendente</strong>.</p>
          {success.avisos?.length > 0 && (
            <div className="alert alert-warning">
              <strong>Avisos:</strong>
              <ul style={{ paddingLeft: '1rem', marginTop: '0.3rem' }}>
                {success.avisos.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
          <div className="success-periods">
            {success.periodos?.map((p, i) => (
              <div key={i} className="success-period">
                📅 {p.inicio} → {p.fim}
              </div>
            ))}
          </div>
          <div className="success-actions">
            <button className="btn btn-outline" onClick={() => { setSuccess(null); setPeriodos([{ inicio: start, fim: addDays(start, 29) }]) }}>
              Nova solicitação
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/minhas-ferias')}>
              Ver minhas férias
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Solicitar Férias</h1>
        <p className="page-subtitle">Defina um ou mais períodos que totalizem exatamente 30 dias corridos</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="solicitar-layout">
        <form className="card" onSubmit={handleSubmit}>
          <div className="periodos-header">
            <h3>Períodos</h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addPeriodo}>
              + Adicionar período
            </button>
          </div>

          <div className="periodos-list">
            {periodos.map((p, i) => (
              <div key={i} className="periodo-row">
                <div className="periodo-num">{i + 1}</div>
                <div className="periodo-inputs">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Início</label>
                    <input
                      type="date"
                      className="form-control"
                      value={p.inicio}
                      onChange={e => updatePeriodo(i, 'inicio', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Fim</label>
                    <input
                      type="date"
                      className="form-control"
                      value={p.fim}
                      min={p.inicio}
                      onChange={e => updatePeriodo(i, 'fim', e.target.value)}
                      required
                    />
                  </div>
                  <div className="periodo-dias-badge">
                    <span>{calcDays(p.inicio, p.fim)}</span>
                    <small>dias</small>
                  </div>
                </div>
                {periodos.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm periodo-remove"
                    onClick={() => removePeriodo(i)}
                    title="Remover"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '1.25rem', justifyContent: 'center', padding: '0.75rem' }} disabled={loading}>
            {loading ? <><span className="spinner" /> Enviando...</> : '📤 Enviar solicitação'}
          </button>
        </form>

        <div className="solicitar-sidebar">
          <div className="card total-card">
            <div className="total-label">Total de dias</div>
            <div className={`total-value ${totalDays === 30 ? 'ok' : totalDays > 30 ? 'over' : 'under'}`}>
              {totalDays}
            </div>
            <div className="total-sub">de 30 necessários</div>
            <div className="total-bar">
              <div
                className={`total-bar-fill ${totalDays === 30 ? 'ok' : totalDays > 30 ? 'over' : 'under'}`}
                style={{ width: `${Math.min((totalDays / 30) * 100, 100)}%` }}
              />
            </div>
            {totalDays !== 30 && (
              <div className={`total-hint ${totalDays > 30 ? 'over' : ''}`}>
                {totalDays > 30
                  ? `${totalDays - 30} dia(s) a mais`
                  : `Faltam ${30 - totalDays} dia(s)`}
              </div>
            )}
            {totalDays === 30 && <div className="total-hint ok">Pronto para enviar! ✓</div>}
          </div>

          <div className="card info-card">
            <h4>ℹ Regras</h4>
            <ul>
              <li>A soma dos períodos deve ser <strong>exatamente 30 dias</strong> corridos</li>
              <li>Cada período: <code>início ≤ fim</code></li>
              <li>Períodos <strong>não podem se sobrepor</strong></li>
              <li>Verifique o limite de férias simultâneas do seu setor</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
