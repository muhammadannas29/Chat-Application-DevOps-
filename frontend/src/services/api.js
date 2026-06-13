import axios from 'axios'
import Cookies from 'js-cookie'

const api = axios.create({
  baseURL:     import.meta.env.VITE_API_URL || '/api',
  timeout:     15_000,
  headers:     { 'Content-Type': 'application/json' },
  withCredentials: true,
})

const AUTH_ENDPOINTS   = ['/auth/login', '/auth/signup', '/auth/refresh']
const isAuthEndpoint   = (url = '') => AUTH_ENDPOINTS.some((e) => url.includes(e))

// ── Request: attach token ──────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response: silent token refresh on 401 ─────────────────────────────────────
let isRefreshing = false
let failedQueue  = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (
      error.response?.status !== 401 ||
      isAuthEndpoint(original?.url)  ||
      original?._retry
    ) return Promise.reject(error)

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    original._retry = true
    isRefreshing    = true

    try {
      const { data } = await api.post('/auth/refresh')
      const newToken = data.accessToken
      Cookies.set('access_token', newToken, { expires: 1, secure: import.meta.env.PROD, sameSite: 'Strict' })
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`
      original.headers.Authorization            = `Bearer ${newToken}`
      processQueue(null, newToken)
      return api(original)
    } catch (err) {
      processQueue(err, null)
      Cookies.remove('access_token')
      window.location.href = '/login'
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  }
)

// ── Auth ───────────────────────────────────────────────────────────────────────
export const authApi = {
  login:   (d) => api.post('/auth/login', d),
  signup:  (d) => api.post('/auth/signup', d),
  logout:  ()  => api.post('/auth/logout'),
  refresh: ()  => api.post('/auth/refresh'),
  me:      ()  => api.get('/auth/me'),
}

// ── Users ──────────────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: () => api.get('/users'),
}

// ── Messages ───────────────────────────────────────────────────────────────────
export const messagesApi = {
  getConversation: (userId) => api.get(`/messages/${userId}`),
  getUnreadCounts: ()       => api.get('/messages/unread-counts'),
  send:            (data)   => api.post('/messages', data),
}

// ── Upload ─────────────────────────────────────────────────────────────────────
export const uploadApi = {
  // Step 1 — ask backend for a presigned URL
  getPresignedUrl: (fileName, fileType, fileSize) =>
    api.post('/upload/presigned-url', { fileName, fileType, fileSize }),

  // Step 2 — PUT file directly to S3 using presigned URL (no auth header needed)
  uploadToS3: (presignedUrl, file, onProgress) =>
    axios.put(presignedUrl, file, {
      headers:        { 'Content-Type': file.type },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total))
        }
      },
    }),
}

export default api