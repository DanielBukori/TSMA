import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

/**
 * Fedha ni eneo la Treasurer/Accountant pekee (Board Admin na Super Admin
 * huruhusiwa na Django API); Content Editor anaondoka hapa — ana maudhui tu.
 */
const FINANCE_ROLES = new Set(['accountant', 'board_admin', 'super_admin'])
export const canUseFinance = (candidate) => FINANCE_ROLES.has(candidate?.role) || candidate?.is_superuser === true

export default function FinanceAccessGuard({ children }) {
  const { user, isAuthenticated, hasEditorMfa, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
        <p role="status" className="text-sm text-slate-300">
          Inakagua ruhusa...
        </p>
      </main>
    )
  }

  // Token ya mwanachama wa kawaida haina claim `editor_mfa`, hivyo seva ingekataa
  // kila ombi; rudisha kwenye login ya hatua-mbili badala ya kuonyesha daftari limeharibika.
  if (!isAuthenticated || !hasEditorMfa) {
    return <Navigate to="/finance/login" state={{ from: location.pathname }} replace />
  }

  if (!canUseFinance(user)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
        <section className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900 p-7">
          <h1 className="text-xl font-bold">Ruhusa imekataliwa</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Akaunti hii haina ruhusa ya eneo la Fedha (Treasurer/Accountant). Mfumo huruhusu{' '}
            <strong className="text-white">Treasurer/Accountant</strong>, Board Admin au Super Administrator
            kuona mapato, kuthibitisha malipo ya mkono na kusimamia mikutano.
          </p>
          <p className="mt-3 text-sm text-slate-400">
            Ukiwa ni mhariri wa maudhui, daftari lako liko <span className="font-semibold text-slate-200">/editor-access</span>.
          </p>
          <a href="/" className="mt-5 inline-block rounded-lg bg-amber-400 px-4 py-2 font-bold text-slate-950 transition hover:bg-amber-300">
            Rudi kwenye tovuti
          </a>
        </section>
      </main>
    )
  }

  return children
}
