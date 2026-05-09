import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import { useAuth } from '../hooks/useAuth'
import { validateForm } from '../utils/validation'

const MailIcon  = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="M2 7l10 7 10-7"/>
  </svg>
)
const LockIcon  = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const initialFields = { email: '', password: '' }

export default function LoginPage() {
  const { login, isLoading } = useAuth()
  const [fields, setFields] = useState(initialFields)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFields((f) => ({ ...f, [name]: value }))
    if (touched[name]) {
      const errs = validateForm({ ...fields, [name]: value })
      setErrors((prev) => ({ ...prev, [name]: errs[name] || null }))
    }
  }

  const handleBlur = (e) => {
    const { name } = e.target
    setTouched((t) => ({ ...t, [name]: true }))
    const errs = validateForm(fields)
    setErrors((prev) => ({ ...prev, [name]: errs[name] || null }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validateForm(fields)
    setErrors(errs)
    setTouched({ email: true, password: true })
    if (Object.keys(errs).length) return
    await login(fields)
  }

  return (
    <AuthLayout>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '28px', fontWeight: 800,
          letterSpacing: '-0.03em',
          color: 'var(--text-primary)',
          marginBottom: '8px',
          lineHeight: 1.2,
        }}>
          Welcome back
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          Sign in to continue to your workspace
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Input
          label="Email"
          type="email"
          name="email"
          value={fields.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.email && errors.email}
          placeholder="you@example.com"
          autoComplete="email"
          icon={MailIcon}
        />

        <div>
          <Input
            label="Password"
            type="password"
            name="password"
            value={fields.password}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.password && errors.password}
            placeholder="Enter your password"
            autoComplete="current-password"
            icon={LockIcon}
          />
          <div style={{ textAlign: 'right', marginTop: '8px' }}>
            <Link
              to="/forgot-password"
              style={{ fontSize: '13px', color: 'var(--text-secondary)' }}
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '14px',
            background: isLoading
              ? 'rgba(124,101,246,0.5)'
              : 'linear-gradient(135deg, var(--accent) 0%, #5a45d4 100%)',
            borderRadius: 'var(--radius-sm)',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            transition: 'all 0.2s var(--transition)',
            boxShadow: isLoading ? 'none' : '0 4px 20px var(--accent-glow)',
            transform: 'translateY(0)',
            marginTop: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 8px 30px var(--accent-glow)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = isLoading ? 'none' : '0 4px 20px var(--accent-glow)'
          }}
        >
          {isLoading ? (
            <>
              <span style={{
                width: '16px', height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
              Signing in…
            </>
          ) : 'Sign in'}
        </button>
      </form>

      {/* Divider */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        margin: '28px 0',
      }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>OR</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>

      {/* Sign up link */}
      <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
        Don't have an account?{' '}
        <Link
          to="/signup"
          style={{
            color: 'var(--accent)',
            fontWeight: 600,
          }}
        >
          Create one free
        </Link>
      </p>
    </AuthLayout>
  )
}
