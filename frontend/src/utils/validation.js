export const validators = {
  email: (value) => {
    if (!value) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email'
    return null
  },
  password: (value) => {
    if (!value) return 'Password is required'
    if (value.length < 8) return 'Password must be at least 8 characters'
    return null
  },
  name: (value) => {
    if (!value) return 'Full name is required'
    if (value.trim().length < 2) return 'Name must be at least 2 characters'
    return null
  },
}

export function validateForm(fields) {
  const errors = {}
  for (const [key, value] of Object.entries(fields)) {
    if (validators[key]) {
      const error = validators[key](value)
      if (error) errors[key] = error
    }
  }
  return errors
}

export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const levels = [
    { label: '',        color: '' },
    { label: 'Weak',    color: '#f87171' },
    { label: 'Fair',    color: '#fb923c' },
    { label: 'Good',    color: '#fbbf24' },
    { label: 'Strong',  color: '#4fd1c7' },
    { label: 'Great',   color: '#7c65f6' },
  ]
  return { score, ...levels[score] }
}
