import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { confirmPasswordReset, requestPasswordReset } from '../api/auth.js'
import PasswordInput from '../components/PasswordInput.jsx'

const COOLDOWN_SECONDS = 60

function firstError(err, fallback) {
  const data = err.response?.data
  if (!data) return fallback
  const value = data.detail ?? Object.values(data)[0]
  return (Array.isArray(value) ? value[0] : value) || fallback
}

// Hatua 2: (1) weka barua pepe -> tunatuma namba, (2) weka namba + password mpya.
export default function ForgotPassword() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const navigate = useNavigate()

  const [step, setStep] = useState('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function sendCode() {
    await requestPasswordReset(email.trim())
    setCooldown(COOLDOWN_SECONDS)
    setNotice(
      isSw
        ? 'Kama barua pepe hiyo ipo kwenye mfumo, tumetuma namba ya tarakimu 6. Angalia pia folda ya spam.'
        : 'If that email exists, we sent a 6-digit code. Check your spam folder too.',
    )
  }

  async function handleRequest(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await sendCode()
      setStep('reset')
    } catch (err) {
      setError(firstError(err, isSw ? 'Imeshindikana. Jaribu tena baadaye.' : 'Failed. Try again later.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (cooldown > 0) return
    setError('')
    try {
      await sendCode()
    } catch (err) {
      setError(firstError(err, isSw ? 'Imeshindikana kutuma. Jaribu tena baadaye.' : 'Could not send. Try again later.'))
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    if (password !== passwordConfirm) {
      setError(isSw ? 'Password hazifanani.' : 'Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const res = await confirmPasswordReset({
        email: email.trim(),
        code: code.trim(),
        new_password: password,
        new_password_confirm: passwordConfirm,
      })
      navigate('/login', {
        replace: true,
        state: { notice: res.data?.detail || (isSw ? 'Password imebadilishwa.' : 'Password changed.') },
      })
    } catch (err) {
      const data = err.response?.data
      const value = data ? data.detail ?? Object.values(data)[0] : null
      setError(
        (Array.isArray(value) ? value[0] : value) ||
          (isSw ? 'Imeshindikana kubadili password.' : 'Could not change password.'),
      )
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full border border-black/15 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40'

  return (
    <section className="min-h-[70vh] flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="font-serif font-bold text-3xl text-navy">
            {isSw ? 'Umesahau Password?' : 'Forgot Password?'}
          </h1>
          <p className="text-ink-muted text-sm mt-2">
            {step === 'request'
              ? isSw
                ? 'Weka barua pepe yako - tutakutumia namba ya tarakimu 6.'
                : 'Enter your email - we will send you a 6-digit code.'
              : isSw
                ? 'Weka namba uliyotumiwa na password mpya.'
                : 'Enter the code we sent and your new password.'}
          </p>
        </div>

        {notice && step === 'reset' && (
          <div className="bg-green/10 border border-green/30 text-green text-sm rounded-lg px-4 py-3 mb-5">{notice}</div>
        )}
        {error && (
          <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta text-sm rounded-lg px-4 py-3 mb-5">
            {error}
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">{isSw ? 'Barua Pepe' : 'Email Address'}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm py-3.5 rounded-md transition-colors disabled:opacity-60"
            >
              {loading ? (isSw ? 'Inatuma...' : 'Sending...') : isSw ? 'Tuma Namba' : 'Send Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">{isSw ? 'Namba ya Tarakimu 6' : '6-digit Code'}</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full border border-black/15 rounded-md px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold focus:outline-none focus:ring-2 focus:ring-terracotta/40"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">{isSw ? 'Password Mpya' : 'New Password'}</label>
              <PasswordInput required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">{isSw ? 'Rudia Password Mpya' : 'Confirm New Password'}</label>
              <PasswordInput required autoComplete="new-password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className={inputClass} />
            </div>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm py-3.5 rounded-md transition-colors disabled:opacity-60"
            >
              {loading ? (isSw ? 'Inabadilisha...' : 'Changing...') : isSw ? 'Badilisha Password' : 'Change Password'}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0}
                className="text-sm font-bold text-navy hover:text-terracotta disabled:opacity-50"
              >
                {cooldown > 0
                  ? isSw ? `Tuma namba tena (subiri sekunde ${cooldown})` : `Resend code (wait ${cooldown}s)`
                  : isSw ? 'Tuma namba tena' : 'Resend code'}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-ink-muted mt-6">
          <Link to="/login" className="text-navy font-bold hover:text-terracotta">
            {isSw ? '← Rudi kwenye Ingia' : '← Back to Sign In'}
          </Link>
        </p>
      </div>
    </section>
  )
}
