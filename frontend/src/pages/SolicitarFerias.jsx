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

const minStart = addDays(today(), 30)

export default function SolicitarFerias() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [periodos, setPeriodos] = useState([
    { inicio: minStart, fim: addDays(minStart, 13) }
  ])
  const [adiantFerias, setAdiantFerias] = useState(false)
  const [adiant13, setAdiant13] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const totalDays = periodos.reduce((acc, p) => acc + calcDays(p.inicio, p.fim), 0)
  const canAddPeriodo = periodos.length < 3

  function addPeriodo() {
    if (!canAddPeriodo) return
    const lastFim = periodos[periodos.length - 1]?.fim ?? minStart
    const novoInicio = addDays(lastFim, 1)
    setPeriodos(prev => [...prev, { inicio: novoInicio, fim: novoInicio }])
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

    if (totalDays > 30) {
      setError(`A soma dos períodos não pode ultrapassar 30 dias. Atual: ${totalDays} dias.`)
      return
    }
    if (totalDays === 0) {
      setError('Informe pelo menos um período válido.')
      return
    }

    setLoading(true)
    try {
      const res = await feriasApi.solicitar(
        user.matricula,
        periodos.map(p => ({ inicio: p.inicio, fim: p.fim })),
        adiantFerias,
        adiant13
      )
      setSuccess(res.data)
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data ?? 'Erro ao solicitar férias.'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setSuccess(null)
    setPeriodos([{ inicio: minStart, fim: addDays(minStart, 13) }])
    setAdiantFerias(false)
    setAdiant13(false)
    setError('')
  }

  if (success) {
    return (
      <div>
        <h1 className="page-title">Solicitar Férias</h1>
        <div className="card success-result">
          <div className="success-icon">🎉</div>
          <h2>Solicitação enviada!</h2>
          <p>Sua solicitação foi criada com status <strong>Pendente</strong>. Aguarde a aprovação da chefia.</p>
          {(success.adiantFerias || success.adiant13) && (
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '0.5rem 0' }}>
              {success.adiantFerias && <span className="badge badge-info">Adiantamento de férias solicitado</span>}
              {success.adiant13    && <span className="badge badge-info">Adiantamento de 13° solicitado</span>}
            </div>
          )}
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
                📅 Período {i + 1}: {p.inicio} → {p.fim} ({calcDays(p.inicio, p.fim)} dias)
              </div>
            ))}
            <div className="success-period" style={{ fontWeight: 600, background: 'var(--gray-100)' }}>
              Total: {totalDays} dias
            </div>
          </div>
          <div className="success-actions">
            <button className="btn btn-outline" onClick={resetForm}>Nova solicitação</button>
            <button className="btn btn-primary" onClick={() => navigate('/minhas-ferias')}>Ver minhas férias</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Solicitar Férias</h1>
        <p className="page-subtitle">Defina até 3 períodos com total de até 30 dias corridos (mínimo 30 dias de antecedência)</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="solicitar-layout">
        <form className="card" onSubmit={handleSubmit}>

          {/* Períodos */}
          <div className="periodos-header">
            <h3>Períodos ({periodos.length}/3)</h3>
            {canAddPeriodo && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={addPeriodo}>
                + Adicionar período
              </button>
            )}
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
                      min={minStart}
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
                      min={p.inicio || minStart}
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
                    title="Remover período"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Adiantamentos */}
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--gray-200)', paddingTop: '1.25rem' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Adiantamentos (opcional)</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <label className={`toggle-option ${adiantFerias ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={adiantFerias}
                  onChange={e => setAdiantFerias(e.target.checked)}
                  style={{ display: 'none' }}
                />
                <span className="toggle-icon">💼</span>
                <div>
                  <div className="toggle-title">Adiantamento de férias</div>
                  <div className="toggle-sub">Receber adiantamento do salário das férias</div>
                </div>
              </label>
              <label className={`toggle-option ${adiant13 ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={adiant13}
                  onChange={e => setAdiant13(e.target.checked)}
                  style={{ display: 'none' }}
                />
                <span className="toggle-icon">💰</span>
                <div>
                  <div className="toggle-title">Adiantamento de 13° salário</div>
                  <div className="toggle-sub">Receber 1ª parcela do 13° antecipada</div>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ marginTop: '1.5rem', justifyContent: 'center', padding: '0.75rem' }}
            disabled={loading || totalDays === 0}
          >
            {loading ? <><span className="spinner" /> Enviando...</> : '📤 Enviar solicitação'}
          </button>
        </form>

        <div className="solicitar-sidebar">
          <div className="card total-card">
            <div className="total-label">Total de dias</div>
            <div className={`total-value ${totalDays > 30 ? 'over' : totalDays > 0 ? 'ok' : 'under'}`}>
              {totalDays}
            </div>
            <div className="total-sub">de no máximo 30</div>
            <div className="total-bar">
              <div
                className={`total-bar-fill ${totalDays > 30 ? 'over' : 'ok'}`}
                style={{ width: `${Math.min((totalDays / 30) * 100, 100)}%` }}
              />
            </div>
            {totalDays > 30
              ? <div className="total-hint over">{totalDays - 30} dia(s) acima do limite</div>
              : totalDays > 0
                ? <div className="total-hint ok">Ainda cabem {30 - totalDays} dia(s) ✓</div>
                : <div className="total-hint">Informe os períodos</div>
            }
          </div>

          <div className="card info-card">
            <h4>ℹ Regras</h4>
            <ul>
              <li>Máximo de <strong>3 períodos</strong> por solicitação</li>
              <li>Total ≤ <strong>30 dias</strong> corridos</li>
              <li>Antecedência mínima de <strong>30 dias</strong></li>
              <li>Períodos <strong>não podem se sobrepor</strong></li>
              <li>Aprovação: <strong>Chefia → Admin</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
