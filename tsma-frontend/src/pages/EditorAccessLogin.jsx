import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { resendEditorLoginCode, startEditorLogin, verifyEditorLogin } from '../api/auth.js'

const EDITOR_ROLES = new Set(['content_editor', 'board_admin', 'super_admin'])
const canUseEditor = (candidate) => EDITOR_ROLES.has(candidate?.role) || candidate?.is_superuser === true

export default function EditorAccessLogin() {
  const { user, loading: authLoading, isAuthenticated, hasEditorMfa, completeLogin, logout } = useAuth()
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
    if (!authLoading && isAuthenticated && hasEditorMfa && canUseEditor(user)) navigate('/editor-access/dashboard', { replace: true })
  }, [authLoading, isAuthenticated, hasEditorMfa, user, navigate])

  if (authLoading) return <CenteredMessage>Inakagua session salama...</CenteredMessage>
  if (isAuthenticated && hasEditorMfa && canUseEditor(user)) return <Navigate to="/editor-access/dashboard" replace />

  async function handlePassword(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      const response = await startEditorLogin(email.trim(), password)
      setChallenge(response.data.challenge); setMaskedEmail(response.data.masked_email || email.trim())
      setStep('otp'); setPassword(''); setNotice('Namba ya usalama imetumwa kwenye barua pepe yako. Inaisha baada ya dakika 10.')
    } catch (err) { setError(err?.response?.data?.detail || 'Imeshindikana kuanza login. Hakiki taarifa zako au wasiliana na msimamizi.') }
    finally { setBusy(false) }
  }

  async function handleVerify(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      const response = await verifyEditorLogin(challenge, code.trim())
      const signedInUser = await completeLogin(response.data.access, response.data.refresh)
      if (!canUseEditor(signedInUser)) { await logout(); throw new Error('Akaunti hii haina ruhusa ya Editor.') }
      navigate('/editor-access/dashboard', { replace: true })
    } catch (err) { setError(err?.response?.data?.detail || err?.message || 'Namba haijathibitishwa. Jaribu tena.') }
    finally { setBusy(false) }
  }

  async function handleResend() {
    setBusy(true); setError(''); setNotice('')
    try { const response = await resendEditorLoginCode(challenge); setNotice(response.data.detail || 'Namba mpya imetumwa.') }
    catch (err) { setError(err?.response?.data?.detail || 'Imeshindikana kutuma namba mpya. Subiri kidogo kisha jaribu tena.') }
    finally { setBusy(false) }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-7 sm:p-9 shadow-2xl">
        <div className="mb-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 font-black text-slate-950">TS</div>
          <p className="text-xs uppercase tracking-[.22em] text-amber-300">TSMA · Restricted access</p>
          <h1 className="mt-2 text-3xl font-bold">Editor sign in</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">Njia salama ya kuingia kwenye dashibodi ya maudhui. Hatua mbili za uthibitisho zinahitajika kila unapoingia.</p>
        </div>
        {error && <div role="alert" className="mb-5 rounded-lg border border-red-400/30 bg-red-950/50 p-3 text-sm text-red-200">{error}</div>}
        {notice && <div role="status" className="mb-5 rounded-lg border border-emerald-400/30 bg-emerald-950/40 p-3 text-sm text-emerald-200">{notice}</div>}
        {step === 'password' ? <form onSubmit={handlePassword} className="space-y-4">
          <label className="block text-sm font-semibold">Barua pepe<input autoComplete="username" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-3 text-white outline-none focus:border-amber-400" /></label>
          <label className="block text-sm font-semibold">Password<input autoComplete="current-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-3 text-white outline-none focus:border-amber-400" /></label>
          <button type="submit" disabled={busy} className="w-full rounded-lg bg-amber-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-60">{busy ? 'Inathibitisha...' : 'Endelea kwa uthibitisho wa pili'}</button>
        </form> : <form onSubmit={handleVerify} className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">Namba ya tarakimu 6 imetumwa kwa <strong className="text-white">{maskedEmail}</strong>. Usimpe mtu yeyote namba hii.</div>
          <label className="block text-sm font-semibold">Namba ya usalama (OTP)<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-1.5 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-3 text-center text-2xl tracking-[.35em] text-white outline-none focus:border-amber-400" /></label>
          <button type="submit" disabled={busy || code.length !== 6} className="w-full rounded-lg bg-amber-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-60">{busy ? 'Inathibitisha...' : 'Thibitisha na uingie'}</button>
          <div className="flex items-center justify-between gap-3 text-sm"><button type="button" disabled={busy} onClick={handleResend} className="text-amber-300 hover:text-amber-200 disabled:opacity-50">Tuma namba nyingine</button><button type="button" disabled={busy} onClick={() => { setStep('password'); setChallenge(''); setCode(''); setError(''); setNotice('') }} className="text-slate-300 hover:text-white">Rudi nyuma</button></div>
        </form>}
        <div className="mt-7 border-t border-white/10 pt-5 text-xs leading-5 text-slate-400"><p>Ulinzi: namba inaisha baada ya dakika 10, hutumika mara moja na ina kikomo cha majaribio. Ruhusa za kila kitendo zinathibitishwa na Django API.</p><a href="/" className="mt-3 inline-block text-amber-300 hover:text-amber-200">Rudi kwenye tovuti ya TSMA</a></div>
      </section>
    </main>
  )
}

function CenteredMessage({ children }) {
  return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6"><p role="status" className="text-sm text-slate-300">{children}</p></main>
}
