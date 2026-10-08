import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import PasswordInput from '../components/PasswordInput.jsx'

export default function Register() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    password_confirm: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password !== form.password_confirm) {
      setError(isSw ? 'Password hazifanani.' : 'Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const data = await register(form)
      // Hakuna auto-login: lazima kwanza athibitishe barua pepe kwa namba ya tarakimu 6 (OTP)
      navigate('/verify-email', {
        replace: true,
        state: { email: form.email, emailSent: data?.email_sent !== false },
      })
    } catch (err) {
      const data = err.response?.data
      const firstError = data ? Object.values(data)[0] : null
      setError(
        (Array.isArray(firstError) ? firstError[0] : firstError) ||
          (isSw ? 'Usajili umeshindikana. Jaribu tena.' : 'Registration failed. Please try again.'),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="min-h-[70vh] flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif font-bold text-3xl text-navy">
            {isSw ? 'Jiunge na TSMA' : 'Join TSMA'}
          </h1>
          <p className="text-ink-muted text-sm mt-2">
            {isSw ? 'Tengeneza akaunti yako kuanza' : 'Create your account to get started'}
          </p>
        </div>

        {error && (
          <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta text-sm rounded-lg px-4 py-3 mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={isSw ? 'Jina la Kwanza' : 'First Name'}
              value={form.first_name}
              onChange={(v) => update('first_name', v)}
              required
            />
            <Field
              label={isSw ? 'Jina la Mwisho' : 'Last Name'}
              value={form.last_name}
              onChange={(v) => update('last_name', v)}
              required
            />
          </div>
          <Field
            label={isSw ? 'Barua Pepe' : 'Email Address'}
            type="email"
            value={form.email}
            onChange={(v) => update('email', v)}
            placeholder="you@example.com"
            required
          />
          <Field
            label={isSw ? 'Namba ya Simu' : 'Phone Number'}
            value={form.phone_number}
            onChange={(v) => update('phone_number', v)}
            placeholder="+255712345678"
          />
          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={(v) => update('password', v)}
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
          <Field
            label={isSw ? 'Rudia Password' : 'Confirm Password'}
            type="password"
            value={form.password_confirm}
            onChange={(v) => update('password_confirm', v)}
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm py-3.5 rounded-md transition-colors disabled:opacity-60"
          >
            {loading ? (isSw ? 'Inasajili...' : 'Registering...') : isSw ? 'Jisajili' : 'Register'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-muted mt-6">
          {isSw ? 'Tayari una akaunti?' : 'Already have an account?'}{' '}
          <Link to="/login" className="text-navy font-bold hover:text-terracotta">
            {isSw ? 'Ingia' : 'Sign In'}
          </Link>
        </p>
      </div>
    </section>
  )
}

function Field({ label, type = 'text', value, onChange, placeholder, required, autoComplete }) {
  const InputTag = type === 'password' ? PasswordInput : 'input' // password: kitufe cha kuonyesha/kuficha
  return (
    <div>
      <label className="block text-xs font-bold text-ink mb-1.5">{label}</label>
      <InputTag
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full border border-black/15 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40 focus:border-terracotta"
      />
    </div>
  )
}
