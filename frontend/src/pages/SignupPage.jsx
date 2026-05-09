import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import { useAuth } from '../hooks/useAuth'
import { validateForm, getPasswordStrength } from '../utils/validation'

const UserIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)
const MailIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="M2 7l10 7 10-7"/>
  </svg>
)
const LockIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

function PasswordStrengthBar({ password }) {
  const { score, label, color } = getPasswordStrength(password)
  if (!password) return null

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              flex: 1, height: '3px',
              borderRadius: '2px',
              background: i <= score ? color : 'var(--border)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>
      {label && (
        <span style={{ fontSize: '11px', color, fontWeight: 500, letterSpacing: '0.04em' }}>
          {label}
        </span>
      )}
    </div>
  )
}

const initialFields = { name: '', email: '', password: '' }

export default function SignupPage() {
  const { signup, isLoading } = useAuth()
  const [fields, setFields] = useState(initialFields)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [agreed, setAgreed] = useState(false)

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
    setTouched({ name: true, email: true, password: true })
    if (Object.keys(errs).length || !agreed) return
    await signup(fields)
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
          Create your account
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          Get started — it's free, no credit card required
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <Input
          label="Full name"
          type="text"
          name="name"
          value={fields.name}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.name && errors.name}
          placeholder="Alex Johnson"
          autoComplete="name"
          icon={UserIcon}
        />

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
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            icon={LockIcon}
          />
          <PasswordStrengthBar password={fields.password} />
        </div>

        {/* Agree to terms */}
        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          cursor: 'pointer', userSelect: 'none',
        }}>
          <div
            onClick={() => setAgreed(!agreed)}
            style={{
              width: '18px', height: '18px', flexShrink: 0,
              marginTop: '1px',
              border: `1px solid ${agreed ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '5px',
              background: agreed ? 'var(--accent)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
          >
            {agreed && (
              <svg width="10" height="10" viewBox="0 0 12 10" fill="none">
                <path d="M1 5l3.5 3.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            I agree to the{' '}
            <Link to="/terms" style={{ color: 'var(--accent)' }}>Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" style={{ color: 'var(--accent)' }}>Privacy Policy</Link>
          </span>
        </label>

        <button
          type="submit"
          disabled={isLoading || !agreed}
          style={{
            width: '100%',
            padding: '14px',
            background: (!agreed || isLoading)
              ? 'rgba(124,101,246,0.4)'
              : 'linear-gradient(135deg, var(--accent) 0%, #5a45d4 100%)',
            borderRadius: 'var(--radius-sm)',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            transition: 'all 0.2s var(--transition)',
            boxShadow: (!agreed || isLoading) ? 'none' : '0 4px 20px var(--accent-glow)',
            marginTop: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: (!agreed || isLoading) ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!isLoading && agreed) {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 8px 30px var(--accent-glow)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = (!agreed || isLoading) ? 'none' : '0 4px 20px var(--accent-glow)'
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
              Creating account…
            </>
          ) : 'Create account'}
        </button>
      </form>

      {/* Login link */}
      <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)', marginTop: '28px' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
