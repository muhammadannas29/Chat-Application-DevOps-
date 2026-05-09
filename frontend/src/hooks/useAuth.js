import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import { authApi } from '../services/api'

export function useAuth() {
  const navigate = useNavigate()
  const { setAuth, logout: storeLogout, setLoading, isLoading } = useAuthStore()

  const login = useCallback(async ({ email, password }) => {
    setLoading(true)
    try {
      const { data } = await authApi.login({ email, password })
      setAuth(data.user, data.accessToken)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate('/', { replace: true })
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.'
      toast.error(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [navigate, setAuth, setLoading])

  const signup = useCallback(async ({ name, email, password }) => {
    setLoading(true)
    try {
      await authApi.signup({ name, email, password })
      toast.success('Account created! Please sign in.')
      navigate('/login', { replace: true })
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.message || 'Signup failed. Please try again.'
      toast.error(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [navigate, setLoading])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (_) { /* silent */ }
    storeLogout()
    navigate('/login', { replace: true })
    toast.success('Logged out successfully')
  }, [navigate, storeLogout])

  return { login, signup, logout, isLoading }
}