import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { resendEmailOtp, verifyEmailOtp } from '../api/auth.js'

const COOLDOWN_SECONDS = 60

// Inatoa ujumbe wa kwanza wa kosa kutoka kwa jibu la API ({detail} au {field: [..]})
function firstError(err, fallback) {
  const data = err.response?.data
  if (!data) return fallback
  const value = data.detail ?? Object.values(data)[0]
  return (Array.isArray(value) ? value[0] : value) || fallback
}

export default function VerifyEmail() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()

  const emailSent = location.state?.emailSent !== false
  const [email, setEmail] = useState(location.state?.email || params.get('email') || '')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  // Backend inazuia kutuma namba mpya chini ya sekunde 60 - tunaonyesha kipima-muda
  const [cooldown, setCooldown] = useState(emailSent ? COOLDOWN_SECONDS : 0)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)
    try {
      const res = await verifyEmailOtp(email.trim(), code.trim())
      navigate('/login', {
        replace: true,
        state: { notice: res.data?.detail || (isSw ? 'Barua pepe imethibitishwa.' : 'Email verified.') },
      })
    } catch (err) {
      setError(firstError(err, isSw ? 'Namba si sahihi au imeisha muda.' : 'Invalid or expired code.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!email.trim() || cooldown > 0) return
    setError('')
    setNotice('')
    try {
      await resendEmailOtp(email.trim())
      setCooldown(COOLDOWN_SECONDS)
      setNotice(
        isSw
          ? 'Kama akaunti ipo na haijathibitishwa, tumetuma namba mpya. Angalia pia folda ya spam.'
          : 'If the account exists and is unverified, we sent a new code. Check your spam folder too.',
      )
    } catch (err) {
      setError(firstError(err, isSw ? 'Imeshindikana kutuma. Jaribu tena baadaye.' : 'Could not send. Try again later.'))
    }
  }

  return (
    <section className="min-h-[70vh] flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="font-serif font-bold text-3xl text-navy">
            {isSw ? 'Thibitisha Barua Pepe' : 'Verify Your Email'}
          </h1>
          <p className="text-ink-muted text-sm mt-2">
            {emailSent
              ? isSw
                ? 'Tumekutumia namba ya tarakimu 6. Iingize hapa chini (inaisha baada ya dakika 10).'
                : 'We sent you a 6-digit code. Enter it below (it expires in 10 minutes).'
              : isSw
                ? 'Barua pepe haikutumwa. Bonyeza "Tuma namba tena".'
                : 'The email could not be sent. Press "Resend code".'}
          </p>
        </div>

        {notice && (
          <div className="bg-green/10 border border-green/30 text-green text-sm rounded-lg px-4 py-3 mb-5">{notice}</div>
        )}
        {error && (
          <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta text-sm rounded-lg px-4 py-3 mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">{isSw ? 'Barua Pepe' : 'Email Address'}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-black/15 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
            />
          </div>
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
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm py-3.5 rounded-md transition-colors disabled:opacity-60"
          >
            {loading ? (isSw ? 'Inathibitisha...' : 'Verifying...') : isSw ? 'Thibitisha' : 'Verify'}
          </button>
        </form>

        <div className="text-center mt-5">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || !email.trim()}
            className="text-sm font-bold text-navy hover:text-terracotta disabled:opacity-50"
          >
            {cooldown > 0
              ? isSw ? `Tuma namba tena (subiri sekunde ${cooldown})` : `Resend code (wait ${cooldown}s)`
              : isSw ? 'Tuma namba tena' : 'Resend code'}
          </button>
        </div>

        <p className="text-center text-sm text-ink-muted mt-6">
          <Link to="/login" className="text-navy font-bold hover:text-terracotta">
            {isSw ? '← Rudi kwenye Ingia' : '← Back to Sign In'}
          </Link>
        </p>
      </div>
    </section>
  )
}
