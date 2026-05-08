import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { setoresApi, feriasApi } from '../api'
import './CalendarioSetor.css'

function toDateStr(d) { return d.toISOString().split('T')[0] }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }

export default function CalendarioSetor() {
  const { user, isGestor } = useAuth()
  const [setores, setSetores] = useState([])
  const [selectedSetor, setSelectedSetor] = useState('')
  const [inicio, setInicio] = useState(toDateStr(new Date()))
  const [fim, setFim] = useState(toDateStr(addDays(new Date(), 29)))
  const [calendario, setCalendario] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setoresApi.getAll().then(r => {
      const list = r.data ?? []
      setSetores(list)
      if (user.setorId) {
        setSelectedSetor(user.setorId)
      } else if (list.length > 0) {
        setSelectedSetor(list[0].id)
      }
    }).catch(() => {})
  }, [user.setorId])

  useEffect(() => {
    if (selectedSetor) fetchCalendario()
  }, [selectedSetor])

  async function fetchCalendario() {
    if (!selectedSetor) return
    setLoading(true)
    setError('')
    try {
      const res = await feriasApi.calendario(selectedSetor, inicio, fim)
      setCalendario(res.data ?? [])
    } catch (e) {
      setError(e.response?.data?.message ?? 'Erro ao carregar calendário.')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    fetchCalendario()
  }

  function getOccupationClass(item) {
    if (item.aprovadas >= item.limite) return 'full'
    if (item.aprovadas >= item.limite * 0.8) return 'high'
    if (item.aprovadas > 0 || item.pendentes > 0) return 'partial'
    return 'free'
  }

  const currentSetor = setores.find(s => s.id === selectedSetor)

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Calendário do Setor</h1>
        <p className="page-subtitle">Visualize a ocupação de férias por dia</p>
      </div>

      <div className="card cal-filter">
        <form onSubmit={handleSearch} className="cal-form">
          {isGestor && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Setor</label>
              <select
                className="form-control"
                value={selectedSetor}
                onChange={e => setSelectedSetor(e.target.value)}
              >
                {setores.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Início</label>
            <input type="date" className="form-control" value={inicio} onChange={e => setInicio(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Fim</label>
            <input type="date" className="form-control" value={fim} min={inicio} onChange={e => setFim(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }} disabled={loading}>
            {loading ? <span className="spinner" /> : '🔍'} Buscar
          </button>
        </form>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}

      {currentSetor && (
        <div className="cal-legend">
          <div className="setor-info">
            <strong>{currentSetor.nome}</strong>
            <span>Limite: <strong>{currentSetor.limiteFeriasSimultaneas}</strong> simultânea(s)</span>
          </div>
          <div className="legend-items">
            <span className="legend-item free">Livre</span>
            <span className="legend-item partial">Parcial</span>
            <span className="legend-item high">Quase cheio</span>
            <span className="legend-item full">Cheio</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-center" style={{ height: '200px' }}>
          <div className="spinner" style={{ borderTopColor: 'var(--red)', borderColor: 'var(--gray-200)', width: '2rem', height: '2rem', borderWidth: '3px' }} />
        </div>
      ) : calendario.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', marginTop: '1rem' }}>
          <p style={{ color: 'var(--gray-500)' }}>Nenhum dado disponível para o período.</p>
        </div>
      ) : (
        <div className="cal-grid-wrapper card" style={{ marginTop: '1rem' }}>
          <div className="cal-grid">
            {calendario.map(item => {
              const cls = getOccupationClass(item)
              const [y, m, d] = item.dia.split('-')
              return (
                <div key={item.dia} className={`cal-day ${cls}`} title={`${item.dia}: ${item.aprovadas} aprovadas, ${item.pendentes} pendentes, limite ${item.limite}`}>
                  <div className="cal-day-date">
                    <span className="cal-day-num">{d}</span>
                    <span className="cal-day-month">{new Date(item.dia).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                  </div>
                  <div className="cal-day-bars">
                    {item.limite > 0 && (
                      <div className="cal-bar-wrap">
                        <div
                          className="cal-bar approved"
                          style={{ height: `${Math.min((item.aprovadas / item.limite) * 100, 100)}%` }}
                          title={`${item.aprovadas} aprovadas`}
                        />
                      </div>
                    )}
                  </div>
                  <div className="cal-day-nums">
                    <span className="approved-num">{item.aprovadas}</span>
                    {item.pendentes > 0 && <span className="pending-num">+{item.pendentes}</span>}
                    <span className="limit-num">/{item.limite}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="cal-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Aprovadas</th>
                  <th>Pendentes</th>
                  <th>Limite</th>
                  <th>Disponível</th>
                </tr>
              </thead>
              <tbody>
                {calendario.map(item => {
                  const disponivel = item.limite - item.aprovadas
                  return (
                    <tr key={item.dia}>
                      <td>{new Date(item.dia).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                      <td>
                        <span style={{ color: item.aprovadas > 0 ? '#16a34a' : 'var(--gray-400)' }}>
                          {item.aprovadas}
                        </span>
                      </td>
                      <td>
                        {item.pendentes > 0
                          ? <span style={{ color: '#d97706' }}>{item.pendentes}</span>
                          : <span style={{ color: 'var(--gray-300)' }}>0</span>}
                      </td>
                      <td>{item.limite}</td>
                      <td>
                        <span className={`badge ${disponivel > 0 ? 'badge-approved' : 'badge-denied'}`}>
                          {disponivel > 0 ? disponivel : 'Esgotado'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
