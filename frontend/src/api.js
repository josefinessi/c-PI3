import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login: (matricula, senha) => api.post('/auth/login', { matricula, senha }),
  register: (data) => api.post('/auth/register', data),
}

export const usuariosApi = {
  getAll: () => api.get('/usuarios'),
  getById: (id) => api.get(`/usuarios/${id}`),
  getByMatricula: (matricula) => api.get(`/usuarios/matricula/${matricula}`),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  updateByMatricula: (matricula, data) => api.put(`/usuarios/matricula/${matricula}`, data),
  delete: (id) => api.delete(`/usuarios/${id}`),
}

export const setoresApi = {
  getAll: () => api.get('/setores'),
  create: (nome) => api.post('/setores', { nome }),
  updateLimite: (id, limite) => api.patch(`/setores/${id}/limite-ferias`, { limiteFeriasSimultaneas: limite }),
}

export const feriasApi = {
  solicitar: (matricula, periodos, adiantFerias = false, adiant13 = false) =>
    api.post(`/Ferias/solicitar/${matricula}`, { periodos, adiantFerias, adiant13 }),
  minhas: (matricula) => api.get(`/Ferias/minhas/${matricula}`),

  // Chefia: pedidos Pendente do setor
  pendentesPorSetor: (setorId) => api.get(`/Ferias/pendentes/setor/${setorId}`),

  // Admin: pedidos AprovadaChefia aguardando aprovação final
  aguardandoAdmin: () => api.get(`/Ferias/aguardando-admin`),

  // Aprovações em duas etapas
  aprovarChefia: (feriasId, aprovadoPorId) =>
    api.post(`/Ferias/${feriasId}/aprovar-chefia`, { aprovadoPorId }),
  aprovarAdmin: (feriasId, aprovadoPorId) =>
    api.post(`/Ferias/${feriasId}/aprovar-admin`, { aprovadoPorId }),

  // Reprovações
  negarChefia: (feriasId, negadoPorId, motivo) =>
    api.post(`/Ferias/${feriasId}/negar-chefia`, { negadoPorId, motivo }),
  negarAdmin: (feriasId, negadoPorId, motivo) =>
    api.post(`/Ferias/${feriasId}/negar-admin`, { negadoPorId, motivo }),

  cancelar: (feriasId, matricula) =>
    api.delete(`/Ferias/${feriasId}/cancelar/${matricula}`),

  calendario: (setorId, inicio, fim) => {
    const params = {}
    if (inicio) params.inicio = inicio
    if (fim) params.fim = fim
    return api.get(`/Ferias/calendario/setor/${setorId}`, { params })
  },

  // Admin dashboard
  adiantamentos: () => api.get(`/Ferias/adiantamentos`),
}

export function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

// Status numéricos conforme spec v4
export const STATUS = {
  PENDENTE: 0,
  APROVADA_CHEFIA: 1,
  APROVADA_ADMIN: 2,
  REPROVADA_CHEFIA: 3,
  REPROVADA_ADMIN: 4,
  CANCELADA: 5,
}

export function getStatusLabel(status) {
  const map = {
    0: 'Pendente',
    1: 'Aprovada pela Chefia',
    2: 'Aprovada',
    3: 'Reprovada pela Chefia',
    4: 'Reprovada pelo Admin',
    5: 'Cancelada',
  }
  return map[status] ?? 'Desconhecido'
}

export function getStatusBadgeClass(status) {
  const map = {
    0: 'badge-pending',
    1: 'badge-chefia',
    2: 'badge-approved',
    3: 'badge-denied',
    4: 'badge-denied',
    5: 'badge-cancelled',
  }
  return map[status] ?? ''
}

export function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR')
}

export function formatDateOnly(dateStr) {
  if (!dateStr) return '-'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export default api
