import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Cookies from 'js-cookie'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, accessToken) => {
        // Store token in cookie (httpOnly in prod via backend)
        Cookies.set('access_token', accessToken, {
          expires: 1, // 1 day
          secure: import.meta.env.PROD,
          sameSite: 'Strict',
        })
        set({ user, accessToken, isAuthenticated: true })
      },

      logout: () => {
        Cookies.remove('access_token')
        set({ user: null, accessToken: null, isAuthenticated: false })
      },

      setLoading: (isLoading) => set({ isLoading }),

      updateUser: (updates) =>
        set((state) => ({ user: { ...state.user, ...updates } })),
    }),
    {
      name: 'auth-storage',
      // Only persist non-sensitive data to localStorage
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export default useAuthStore
