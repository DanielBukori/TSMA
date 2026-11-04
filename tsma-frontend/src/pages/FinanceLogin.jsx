import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'
import { canUseFinance } from '../components/FinanceAccessGuard.jsx'
import { resendEditorLoginCode, startEditorLogin, verifyEditorLogin } from '../api/auth.js'

/**
 * Njia hii ni ileile ya Editor kwa sababu ndiyo hutoa token yenye claim
 * `editor_mfa`; login ya kawaida ya mwanachama inakataliwa na API zote za
 * fedha. Majukumu ya kibiashara (kufululiza, kufunga akaunti) hutolewa na
 * backend — hapa tunaonyesha ujumbe wao tu.
 */
export default function FinanceLogin() {
  const { user, loading: authLoading, isAuthenticated, hasEditorMfa, completeLogin, logout } = useAuth()
  const { logoOnDarkUrl, logoUrl } = useSiteSettings()
  const navigate = useNavigate()
  const [step, setStep] = useState('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!authLoading && isAuthenticated && hasEditorMfa && canUseFinance(user)) navigate('/finance', { replace: true })
  }, [authLoading, isAuthenticated, hasEditorMfa, user, navigate])

  if (authLoading) return <CenteredMessage>Inakagua session salama...</CenteredMessage>
  if (isAuthenticated && hasEditorMfa && canUseFinance(user)) return <Navigate to="/finance" replace />

  async function handlePassword(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await startEditorLogin(email.trim(), password)
      setChallenge(response.data.challenge)
      setMaskedEmail(response.data.masked_email || email.trim())
      setStep('otp')
      setPassword('')
      setNotice('Namba ya usalama imetumwa kwenye barua pepe yako. Inaisha baada ya dakika 10.')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Imeshindikana kuanza login. Hakiki taarifa zako au wasiliana na msimamizi.')
    } finally {
      setBusy(false)
    }
  }

  async function handleVerify(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await verifyEditorLogin(challenge, code.trim())
      const signedIn = await completeLogin(response.data.access, response.data.refresh)
      if (!canUseFinance(signedIn)) {
        await logout()
        throw new Error('Akaunti hii haina ruhusa ya Fedha. Muombe Super Admin akupe Treasurer/Accountant.')
      }
      navigate('/finance', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Namba haijathibitishwa. Jaribu tena.')
    } finally {
      setBusy(false)
    }
  }

  async function handleResend() {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await resendEditorLoginCode(challenge)
      setNotice(response.data.detail || 'Namba mpya imetumwa.')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Imeshindikana kutuma namba mpya. Subiri kidogo kisha jaribu tena.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
        <section className="hidden lg:block">
          <p className="text-xs uppercase tracking-[.22em] text-amber-300">TSMA · Eneo la Fedha</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight">Mapato, malipo ya mkono na mikutano — mahali pamoja</h2>
          <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300">
            Dashibodi hii ni ya Treasurer/Accountant (Mhazini). Ana ruhusa ya kuona kila malipo, kuthibitisha
            uhamisho wa benki wa mwanachama, kusimamia mikutano na tiketi zake, na kuweka taarifa za akaunti ya
            benki ambayo wanachama hulipia.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-slate-300">
            {[
              'Kuthibitisha malipo ya mkono kunawasha uanachama, kutoa risiti na kuweka kiti cha conference.',
              'Hakuna kitendo kinachofanyika bila ruhusa ya Django API — kila ombi linathibitishwa upande wa seva.',
              'Takwimu zote zinatoka kwenye hali halisi ya hifadhi ya data; hakuna namba za mfano.',
            ].map((line) => (
              <li key={line} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="w-full rounded-2xl border border-white/10 bg-slate-900 p-7 shadow-2xl sm:p-9">
          <div className="mb-8">
            {logoOnDarkUrl || logoUrl ? (
              <img src={logoOnDarkUrl || logoUrl} alt="TSMA" className="mb-5 h-12 w-auto max-w-[150px] object-contain" />
            ) : (
              <p className="mb-5 font-serif text-lg font-black uppercase tracking-[0.18em] text-amber-300">TSMA</p>
            )}
            <p className="text-xs uppercase tracking-[.22em] text-amber-300">Ruhusa ya mfumo · Staff</p>
            <h1 className="mt-2 text-3xl font-bold">
              {step === 'password' ? 'Ingia — Treasurer/Accountant' : 'Ingia — thibitisha namba'}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Njia salama ya kuingia kwenye dashibodi ya fedha. Hatua mbili za uthibitisho zinahitajika kila unapoingia.
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-5 rounded-lg border border-red-400/30 bg-red-950/50 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="mb-5 rounded-lg border border-emerald-400/30 bg-emerald-950/40 p-3 text-sm text-emerald-200">
              {notice}
            </div>
          )}

          {step === 'password' ? (
            <form onSubmit={handlePassword} className="space-y-4">
              <label className="block text-sm font-semibold">
                Barua pepe ya mfumo
                <input
                  autoComplete="username"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-3 text-white outline-none focus:border-amber-400"
                />
              </label>
              <label className="block text-sm font-semibold">
                Password
                <input
                  autoComplete="current-password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-3 text-white outline-none focus:border-amber-400"
                />
              </label>
              <button type="submit" disabled={busy} className="w-full rounded-lg bg-amber-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-60">
                {busy ? 'Inathibitisha...' : 'Ingia (Endelea kwa uthibitisho wa pili)'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
                Namba ya tarakimu 6 imetumwa kwa <strong className="text-white">{maskedEmail}</strong>. Usimpe mtu yeyote namba hii.
              </div>
              <label className="block text-sm font-semibold">
                Namba ya usalama (OTP)
                <input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-3 text-center text-2xl tracking-[.35em] text-white outline-none focus:border-amber-400"
                />
              </label>
              <button type="submit" disabled={busy || code.length !== 6} className="w-full rounded-lg bg-amber-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-60">
                {busy ? 'Inathibitisha...' : 'Thibitisha na uingie'}
              </button>
              <div className="flex items-center justify-between gap-3 text-sm">
                <button type="button" disabled={busy} onClick={handleResend} className="text-amber-300 transition hover:text-amber-200 disabled:opacity-50">
                  Tuma namba nyingine
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setStep('password')
                    setChallenge('')
                    setCode('')
                    setError('')
                    setNotice('')
                  }}
                  className="text-slate-300 transition hover:text-white"
                >
                  Rudi nyuma
                </button>
              </div>
            </form>
          )}

          <div className="mt-7 rounded-xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-sm font-bold text-white">Fungua akaunti mpya</p>
            <p className="mt-1.5 text-xs leading-5 text-slate-400">
              Fomu hii haitengenezi akaunti. Akaunti za Treasurer/Accountant, Board Admin na Waruhusiwa wengine
              hutengenezwa na Super Administrator ndani ya mfumo, kisha hutumwa barua pepe ya kuthibitisha.
              Huna akaunti au umezipoteza? Wasiliana na Super Admin wa TSMA.
            </p>
            <a href="/register" className="mt-3 inline-block text-xs font-semibold text-amber-300 transition hover:text-amber-200">
              Wewe ni mwanachama wa kawaida? Fungua akaunti ya uanachama hapa
            </a>
          </div>

          <div className="mt-6 border-t border-white/10 pt-5 text-xs leading-5 text-slate-400">
            <p>
              Ulinzi: namba ya usalama inaisha baada ya dakika 10, hutumika mara moja, na majaribio yote yana kikomo
              cha muda — ukizidi, akaunti hufungwa kwa muda na ujumbe wa seva utaonekana hapo juu.
            </p>
            <a href="/" className="mt-3 inline-block text-amber-300 hover:text-amber-200">
              Rudi kwenye tovuti ya TSMA
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}

function CenteredMessage({ children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <p role="status" className="text-sm text-slate-300">
        {children}
      </p>
    </main>
  )
}
