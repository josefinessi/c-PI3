import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { setoresApi, authApi } from '../api'
import './Setores.css'

export default function Setores() {
  const [setores, setSetores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [newNome, setNewNome] = useState('')
  const [creating, setCreating] = useState(false)
  const [editLimite, setEditLimite] = useState({})
  const [savingLimite, setSavingLimite] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const res = await setoresApi.getAll()
      const list = res.data ?? []
      setSetores(list)
      const limites = {}
      list.forEach(s => { limites[s.id] = s.limiteFeriasSimultaneas })
      setEditLimite(limites)
    } catch {
      setError('Erro ao carregar setores.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!newNome.trim()) return
    setCreating(true)
    setError('')
    try {
      await setoresApi.create(newNome.trim())
      setMsg(`Setor "${newNome.trim()}" criado!`)
      setNewNome('')
      load()
    } catch (e) {
      setError(e.response?.data?.message ?? e.response?.data ?? 'Erro ao criar setor.')
    } finally {
      setCreating(false)
    }
  }

  async function handleUpdateLimite(setor) {
    const val = parseInt(editLimite[setor.id])
    if (isNaN(val) || val < 1) { setError('Limite deve ser >= 1'); return }
    setSavingLimite(setor.id)
    setError('')
    try {
      await setoresApi.updateLimite(setor.id, val)
      setMsg(`Limite do setor "${setor.nome}" atualizado para ${val}.`)
      load()
    } catch (e) {
      setError(e.response?.data?.message ?? 'Erro ao atualizar limite.')
    } finally {
      setSavingLimite(null)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Setores</h1>
        <p className="page-subtitle">Gerencie os setores e o limite de férias simultâneas</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="setores-layout">
        <div>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>Criar novo setor</h3>
            <form onSubmit={handleCreate} className="create-form">
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label>Nome do setor</label>
                <input
                  className="form-control"
                  value={newNome}
                  onChange={e => setNewNome(e.target.value)}
                  placeholder="Ex: Radiologia, UTI..."
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }} disabled={creating}>
                {creating ? <span className="spinner" /> : '+'} Criar
              </button>
            </form>
          </div>

          <div className="card" style={{ marginTop: '1rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>Setores cadastrados</h3>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner" style={{ borderTopColor: 'var(--red)', borderColor: 'var(--gray-200)', width: '1.5rem', height: '1.5rem', borderWidth: '2px', display: 'inline-block' }} />
              </div>
            ) : setores.length === 0 ? (
              <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: '1rem' }}>Nenhum setor cadastrado.</p>
            ) : (
              <div className="setores-list">
                {setores.map(s => (
                  <div key={s.id} className="setor-item">
                    <div className="setor-icon">🏢</div>
                    <div className="setor-info-col">
                      <div className="setor-name">{s.nome}</div>
                      <div className="setor-id-text">ID: {s.id.slice(0, 8)}...</div>
                    </div>
                    <div className="setor-limite-control">
                      <label className="limite-label">Limite simultâneo</label>
                      <div className="limite-row">
                        <input
                          type="number"
                          className="form-control limite-input"
                          min={1}
                          value={editLimite[s.id] ?? s.limiteFeriasSimultaneas}
                          onChange={e => setEditLimite(prev => ({ ...prev, [s.id]: e.target.value }))}
                        />
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleUpdateLimite(s)}
                          disabled={savingLimite === s.id}
                        >
                          {savingLimite === s.id ? <span className="spinner" style={{ borderTopColor: 'var(--red)', borderColor: 'var(--red-light)' }} /> : '✓'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card info-box">
          <h4>ℹ Sobre os setores</h4>
          <p>O <strong>limite de férias simultâneas</strong> define quantas férias aprovadas podem ocorrer no mesmo dia dentro deste setor.</p>
          <p style={{ marginTop: '0.75rem' }}>Se o limite for atingido para um dia, novas solicitações de férias que cubram esse dia serão <strong>bloqueadas</strong>.</p>
          <p style={{ marginTop: '0.75rem' }}>Quando há apenas <strong>pendências</strong> (não aprovadas), a solicitação é criada com um <strong>aviso</strong>, mas não é bloqueada.</p>
          <div className="info-rule">
            <span>Limite mínimo:</span>
            <strong>1</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
