import axios from 'axios'
import Cookies from 'js-cookie'

// ─── Base Instance ─────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// ─── Auth endpoints — never try to refresh on these ───────────────────────────
const AUTH_ENDPOINTS = ['/auth/login', '/auth/signup', '/auth/refresh']
const isAuthEndpoint = (url = '') => AUTH_ENDPOINTS.some((e) => url.includes(e))

// ─── Request Interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response Interceptor (token refresh on 401) ──────────────────────────────
let isRefreshing = false
let failedQueue  = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // ── Do NOT attempt refresh for auth endpoints or non-401 errors ─────────
    if (
      error.response?.status !== 401 ||
      isAuthEndpoint(originalRequest?.url) ||
      originalRequest?._retry
    ) {
      return Promise.reject(error)
    }

    // ── Queue concurrent requests while refreshing ───────────────────────────
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const { data } = await api.post('/auth/refresh')
      const newToken = data.accessToken
      Cookies.set('access_token', newToken, {
        expires: 1,
        secure: import.meta.env.PROD,
        sameSite: 'Strict',
      })
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`
      originalRequest.headers.Authorization     = `Bearer ${newToken}`
      processQueue(null, newToken)
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      Cookies.remove('access_token')
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

// ─── Auth Endpoints ────────────────────────────────────────────────────────────
export const authApi = {
  login:   (credentials) => api.post('/auth/login', credentials),
  signup:  (userData)    => api.post('/auth/signup', userData),
  logout:  ()            => api.post('/auth/logout'),
  refresh: ()            => api.post('/auth/refresh'),
  me:      ()            => api.get('/auth/me'),
}

export default api

// ─── Users Endpoints ───────────────────────────────────────────────────────────
export const usersApi = {
  getAll: () => api.get('/users'),
}

// ─── Messages Endpoints ────────────────────────────────────────────────────────
export const messagesApi = {
  getConversation: (userId) => api.get(`/messages/${userId}`),
  getUnreadCounts: ()       => api.get('/messages/unread-counts'),
  send:            (data)   => api.post('/messages', data),
}