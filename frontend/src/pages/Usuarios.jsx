import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { usuariosApi, setoresApi } from '../api'
import './Usuarios.css'

export default function Usuarios() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [setores, setSetores] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({ nome: '', role: '', setorNome: '', senha: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const [uRes, sRes] = await Promise.all([usuariosApi.getAll(), setoresApi.getAll()])
      setUsers(uRes.data ?? [])
      setSetores(sRes.data ?? [])
    } catch {
      setError('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openEdit(u) {
    setEditModal(u)
    setEditForm({ nome: u.nome, role: u.role, setorNome: u.setorNome === 'Sem Setor' ? '' : u.setorNome, senha: '' })
    setError('')
  }

  async function handleEdit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body = {}
      if (editForm.nome) body.nome = editForm.nome
      if (editForm.role) body.role = editForm.role
      if (editForm.senha) body.senha = editForm.senha
      body.setorNome = editForm.setorNome
      await usuariosApi.update(editModal.id, body)
      setMsg('Usuário atualizado com sucesso!')
      setEditModal(null)
      load()
    } catch (e) {
      setError(e.response?.data?.message ?? e.response?.data ?? 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(u) {
    if (!confirm(`Excluir o usuário ${u.nome}? Esta ação não pode ser desfeita.`)) return
    setDeleting(u.id)
    setError('')
    try {
      await usuariosApi.delete(u.id)
      setMsg(`Usuário ${u.nome} excluído.`)
      load()
    } catch (e) {
      setError(e.response?.data?.message ?? 'Erro ao excluir.')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = users.filter(u =>
    u.nome?.toLowerCase().includes(search.toLowerCase()) ||
    u.matricula?.includes(search) ||
    u.setorNome?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="page-subtitle">{users.length} usuário(s) cadastrado(s)</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card">
        <div className="table-toolbar">
          <input
            className="form-control"
            placeholder="🔍 Buscar por nome, matrícula ou setor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 340 }}
          />
          <span className="results-count">{filtered.length} resultado(s)</span>
        </div>

        {loading ? (
          <div className="loading-center">
            <div className="spinner" style={{ borderTopColor: 'var(--red)', borderColor: 'var(--gray-200)', width: '2rem', height: '2rem', borderWidth: '3px' }} />
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Matrícula</th>
                  <th>Cargo</th>
                  <th>Setor</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <div className="mini-avatar-lg" style={{ background: u.id === me.id ? 'var(--red)' : 'var(--gray-400)' }}>
                          {u.nome?.[0]}
                        </div>
                        <div>
                          <div className="user-cell-name">
                            {u.nome}
                            {u.id === me.id && <span className="you-badge">Você</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><code style={{ background: 'var(--gray-100)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}>#{u.matricula}</code></td>
                    <td>
                      <span className={`badge ${u.role === 'Gestor' ? 'badge-gestor' : 'badge-colaborador'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>{u.setorNome || 'Sem Setor'}</td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>✏ Editar</button>
                        {u.id !== me.id && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(u)}
                            disabled={deleting === u.id}
                          >
                            {deleting === u.id ? <span className="spinner" /> : '🗑'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditModal(null)}>
          <div className="modal-box card">
            <div className="modal-header">
              <h3>Editar: {editModal.nome}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditModal(null)}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleEdit}>
              <div className="form-group">
                <label>Nome</label>
                <input className="form-control" value={editForm.nome} onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Cargo</label>
                <select className="form-control" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="Colaborador">Colaborador</option>
                  <option value="Gestor">Gestor</option>
                </select>
              </div>
              <div className="form-group">
                <label>Setor</label>
                <select className="form-control" value={editForm.setorNome} onChange={e => setEditForm(f => ({ ...f, setorNome: e.target.value }))}>
                  <option value="">Sem Setor</option>
                  {setores.filter(s => s.nome !== 'Sem Setor').map(s => (
                    <option key={s.id} value={s.nome}>{s.nome}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Nova senha (deixe em branco para não alterar)</label>
                <input
                  className="form-control"
                  type="password"
                  value={editForm.senha}
                  onChange={e => setEditForm(f => ({ ...f, senha: e.target.value }))}
                  placeholder="Nova senha..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" /> : '💾 Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
