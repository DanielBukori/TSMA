import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import PasswordInput from '../components/PasswordInput.jsx'

export default function Login() {
  const { t, i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const redirectTo = location.state?.from || '/dashboard'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const data = err.response?.data
      // Barua pepe haijathibitishwa: backend imeshatuma namba mpya - mpeleke kwenye skrini ya OTP
      if (data?.code === 'email_not_verified') {
        navigate('/verify-email', { state: { email: data.email || form.email, emailSent: true } })
        return
      }
      const detail = Array.isArray(data?.detail) ? data.detail[0] : data?.detail
      setError(detail || (isSw ? 'Email au password si sahihi.' : 'Invalid email or password.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="min-h-[70vh] flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif font-bold text-3xl text-navy">
            {isSw ? 'Karibu Tena' : 'Welcome Back'}
          </h1>
          <p className="text-ink-muted text-sm mt-2">
            {isSw ? 'Ingia kwenye akaunti yako ya TSMA' : 'Sign in to your TSMA account'}
          </p>
        </div>

        {location.state?.notice && !error && (
          <div className="bg-green/10 border border-green/30 text-green text-sm rounded-lg px-4 py-3 mb-5">
            {location.state.notice}
          </div>
        )}

        {error && (
          <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta text-sm rounded-lg px-4 py-3 mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label={isSw ? 'Barua Pepe' : 'Email Address'}
            type="email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            placeholder="you@example.com"
            required
          />
          <Field
            label={isSw ? 'Password' : 'Password'}
            type="password"
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            placeholder="••••••••"
            required
          />
          <div className="text-right -mt-2">
            <Link to="/forgot-password" className="text-xs font-bold text-navy hover:text-terracotta">
              {isSw ? 'Umesahau password?' : 'Forgot password?'}
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm py-3.5 rounded-md transition-colors disabled:opacity-60"
          >
            {loading ? (isSw ? 'Inaingia...' : 'Signing in...') : isSw ? 'Ingia' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-muted mt-6">
          {isSw ? 'Huna akaunti?' : "Don't have an account?"}{' '}
          <Link to="/register" className="text-navy font-bold hover:text-terracotta">
            {isSw ? 'Jisajili' : 'Register'}
          </Link>
        </p>
      </div>
    </section>
  )
}

function Field({ label, type, value, onChange, placeholder, required }) {
  const InputTag = type === 'password' ? PasswordInput : 'input' // password: kitufe cha kuonyesha/kuficha
  return (
    <div>
      <label className="block text-xs font-bold text-ink mb-1.5">{label}</label>
      <InputTag
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full border border-black/15 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40 focus:border-terracotta"
      />
    </div>
  )
}
