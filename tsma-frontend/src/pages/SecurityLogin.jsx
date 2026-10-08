import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import securityClient from '../api/securityClient.js'
import PasswordInput from '../components/PasswordInput.jsx'

// Hatua: 'credentials' -> (ikihitaji) 'setup_totp' -> 'totp' -> imekamilika
export default function SecurityLogin() {
  const navigate = useNavigate()
  const location = useLocation()

  const [stage, setStage] = useState('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [preToken, setPreToken] = useState(null)
  const [qrSvg, setQrSvg] = useState(null)
  const [manualSecret, setManualSecret] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCredentials(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await securityClient.post('/security/auth/login/step1/', { email, password })
      setPreToken(res.data.pre_2fa_token)
      if (res.data.needs_totp_setup) {
        setQrSvg(res.data.qr_code_svg)
        setManualSecret(res.data.manual_entry_secret)
        setStage('setup_totp')
      } else {
        setStage('totp')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Imeshindikana kuingia.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSetupConfirm(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await securityClient.post('/security/auth/setup-totp/confirm/', {
        pre_2fa_token: preToken,
        totp_code: totpCode,
      })
      localStorage.setItem('tsma_security_token', res.data.token)
      if (res.data.operator) localStorage.setItem('tsma_security_operator', JSON.stringify(res.data.operator))
      localStorage.setItem('tsma_security_login_at', String(Date.now())) // kwa kipima-muda cha session
      navigate('/security')
    } catch (err) {
      setError(err.response?.data?.detail || 'Code si sahihi.')
    } finally {
      setLoading(false)
    }
  }

  async function handleTotp(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await securityClient.post('/security/auth/login/step2/', {
        pre_2fa_token: preToken,
        totp_code: totpCode,
      })
      localStorage.setItem('tsma_security_token', res.data.token)
      localStorage.setItem('tsma_security_operator', JSON.stringify(res.data.operator))
      localStorage.setItem('tsma_security_login_at', String(Date.now())) // kwa kipima-muda cha session
      navigate('/security')
    } catch (err) {
      setError(err.response?.data?.detail || 'Code si sahihi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5 py-16 bg-navy-deep">
      <div className="bg-white rounded-xl max-w-sm w-full p-8">
        <div className="text-center mb-6">
          <span className="text-3xl">🛡️</span>
          <h1 className="font-serif font-bold text-lg text-navy mt-2">Security Dashboard</h1>
          <p className="text-xs text-ink-muted">TSMA Guardian - Operator Login</p>
        </div>

        {location.state?.notice && !error && (
          <p className="bg-gold/15 text-gold-dark text-xs font-bold rounded-md px-3 py-2 mb-4">
            {location.state.notice}
          </p>
        )}

        {error && (
          <p className="bg-terracotta/10 text-terracotta text-xs font-bold rounded-md px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {stage === 'credentials' && (
          <form onSubmit={handleCredentials} className="space-y-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-black/15 rounded-md px-3 py-2.5 text-sm"
            />
            <PasswordInput
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-black/15 rounded-md px-3 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy hover:bg-navy-deep text-white font-bold text-sm py-2.5 rounded-md disabled:opacity-60"
            >
              {loading ? 'Inaangalia...' : 'Endelea'}
            </button>
          </form>
        )}

        {stage === 'setup_totp' && (
          <form onSubmit={handleSetupConfirm} className="space-y-4">
            <p className="text-xs text-ink-muted text-center">
              Mara ya kwanza - sanidi 2FA. Scan QR hii kwa Google Authenticator/Authy:
            </p>
            {qrSvg && (
              <div
                className="mx-auto w-40 h-40 [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            )}
            {manualSecret && (
              <p className="text-[11px] text-center text-ink-muted break-all">
                Au ingiza mwenyewe: <span className="font-mono font-bold">{manualSecret}</span>
              </p>
            )}
            <input
              type="text"
              required
              maxLength={6}
              placeholder="Namba 6 kutoka app"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              className="w-full border border-black/15 rounded-md px-3 py-2.5 text-sm text-center tracking-widest font-mono"
            />
            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="w-full bg-gold hover:bg-gold-dark text-navy-deep font-bold text-sm py-2.5 rounded-md disabled:opacity-60"
            >
              {loading ? 'Inathibitisha...' : 'Thibitisha na Ingia'}
            </button>
          </form>
        )}

        {stage === 'totp' && (
          <form onSubmit={handleTotp} className="space-y-4">
            <p className="text-xs text-ink-muted text-center">
              Ingiza namba 6 kutoka Google Authenticator/Authy yako:
            </p>
            <input
              type="text"
              required
              maxLength={6}
              autoFocus
              placeholder="000000"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              className="w-full border border-black/15 rounded-md px-3 py-2.5 text-sm text-center tracking-widest font-mono"
            />
            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="w-full bg-gold hover:bg-gold-dark text-navy-deep font-bold text-sm py-2.5 rounded-md disabled:opacity-60"
            >
              {loading ? 'Inaangalia...' : 'Ingia'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
