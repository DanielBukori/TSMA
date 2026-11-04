import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchAvailableGateways, fetchFinanceSummary } from '../api/finance.js'
import Icon from '../components/Icon.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'
import SummarySection from '../finance/SummarySection.jsx'
import TransactionsSection from '../finance/TransactionsSection.jsx'
import ConferencesSection from '../finance/ConferencesSection.jsx'
import MembershipSection from '../finance/MembershipSection.jsx'
import ManualSettingsSection from '../finance/ManualSettingsSection.jsx'
import { describeError } from '../finance/options.js'

const SECTIONS = [
  { key: 'overview', label: 'Muhtasari', icon: 'chart', hint: 'Mapato na alama za haraka' },
  { key: 'transactions', label: 'Malipo', icon: 'card', hint: 'Daftari na uthibitisho wa mkono' },
  { key: 'conferences', label: 'Mikutano', icon: 'ticket', hint: 'Mikutano, tiketi na takwimu' },
  { key: 'membership', label: 'Uanachama', icon: 'users', hint: 'Madaraja na orodha ya wanachama' },
  { key: 'manual-settings', label: 'Mipangilio ya Malipo ya Mkono', icon: 'pin', hint: 'Akaunti ya benki wanachama wanapolipia' },
]

const ROLE_LABELS = {
  accountant: 'Treasurer / Accountant',
  board_admin: 'Board / Leadership Admin',
  super_admin: 'Super Administrator',
}

export default function FinanceDashboard() {
  const { user, logout } = useAuth()
  const { i18n } = useTranslation()
  const language = i18n.language
  const { logoOnDarkUrl, logoUrl } = useSiteSettings()
  const [section, setSection] = useState('overview')
  const [summary, setSummary] = useState(null)
  const [summaryState, setSummaryState] = useState({ kind: 'loading' })
  const [gateways, setGateways] = useState([])
  const [txSeed, setTxSeed] = useState(null)

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetchFinanceSummary()
      setSummary(res.data)
      setSummaryState({ kind: 'ok' })
    } catch (error) {
      setSummaryState(describeError(error))
    }
  }, [])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    let cancelled = false
    fetchAvailableGateways()
      .then((res) => {
        if (!cancelled) setGateways(res.data?.gateways || [])
      })
      .catch(() => {
        // Ikiwa orodha ya gateway itashindwa, majina ya chini yanatosha.
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Muhtasari unarudiwa baada ya kila kitendo cha malipo ili namba zionekane
  // za kweli mara moja, si baada ya kufungua ukurasa upya.
  const refreshAfterChange = useCallback(async () => {
    await loadSummary()
  }, [loadSummary])

  // `nonce` huhakikisha sehemu ya Malipo inatumia vichujio hata vikirudiwa
  // mara mbili (mfano kubonyeza kadi moja tena). `errorsOnly` huwasha uchujaji
  // wa ndani wa rekodi zenye kosa la baada ya malipo.
  const openTransactions = useCallback((filters, errorsOnly = false) => {
    setTxSeed({ filters, errorsOnly, nonce: Date.now() })
    setSection('transactions')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const roleLabel = useMemo(() => ROLE_LABELS[user?.role] || (user?.is_superuser ? ROLE_LABELS.super_admin : 'Mtu wa mfumo'), [user])
  const awaitingCount = Number(summary?.awaiting_confirmation?.count) || 0

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b-4 border-amber-400 bg-[#101d36] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            {logoOnDarkUrl || logoUrl ? (
              <img src={logoOnDarkUrl || logoUrl} alt="TSMA" className="h-11 w-auto max-w-[150px] object-contain" />
            ) : (
              <span className="font-serif text-lg font-black uppercase tracking-[0.18em] text-amber-300">TSMA</span>
            )}
            <div>
              <p className="text-xs uppercase tracking-[.2em] text-slate-300">Usimamizi</p>
              <h1 className="text-xl font-bold sm:text-2xl">Eneo la Fedha</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user?.full_name || user?.email || 'Mhazini'}</p>
              <p className="text-xs text-slate-300">{roleLabel}</p>
            </div>
            <button type="button" onClick={logout} className="rounded-lg border border-white/25 px-3 py-2 text-sm transition hover:bg-white/10">
              Toka
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-7">
          <p className="text-sm font-semibold text-amber-700">USIMAMIZI WA MAPATO NA MALIPO</p>
          <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Karibu, {user?.full_name?.split(' ')[0] || 'Mhazini'}</h2>
          <p className="mt-2 max-w-3xl text-slate-600">
            Mapato yote, uthibitisho wa malipo ya mkono, mikutano na ada za uanachama viko hapa. Uthibitisho
            wa hatua mbili unahitajika kila unapoingia, na ruhusa za kila kitendo zinathibitishwa na Django API.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <nav aria-label="Sehemu za dashibodi" className="lg:sticky lg:top-6 lg:self-start">
            <ul className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1.5 lg:overflow-visible lg:pb-0">
              {SECTIONS.map((item) => {
                const activeItem = item.key === section
                return (
                  <li key={item.key} className="shrink-0 lg:shrink">
                    <button
                      type="button"
                      onClick={() => setSection(item.key)}
                      aria-current={activeItem ? 'page' : undefined}
                      className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                        activeItem ? 'border-[#101d36] bg-[#101d36] text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50'
                      }`}
                    >
                      <Icon name={item.icon} className={`mt-0.5 h-5 w-5 shrink-0 ${activeItem ? 'text-amber-300' : 'text-slate-500'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold">{item.label}</span>
                        <span className={`block text-xs ${activeItem ? 'text-slate-300' : 'text-slate-500'}`}>{item.hint}</span>
                      </span>
                      {item.key === 'transactions' && awaitingCount > 0 && (
                        <span className="mt-0.5 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-black text-slate-950">{awaitingCount}</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-500">
              Dashibodi hii haina maudhui ya habari/kalenda — hayo yasimamiwa na Editor Dashboard.
            </p>
          </nav>

          <main className="min-w-0">
            {section === 'overview' && (
              <SummarySection
                summary={summary}
                state={summaryState}
                language={language}
                availableGateways={gateways}
                onOpenTransactions={openTransactions}
                onOpenSettings={() => setSection('manual-settings')}
                onRetry={loadSummary}
              />
            )}
            {section === 'transactions' && (
              <TransactionsSection seed={txSeed} language={language} onChanged={refreshAfterChange} />
            )}
            {section === 'conferences' && <ConferencesSection language={language} />}
            {section === 'membership' && <MembershipSection language={language} />}
            {section === 'manual-settings' && (
              <ManualSettingsSection language={language} onSaved={refreshAfterChange} />
            )}
          </main>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          TSMA · Eneo la Fedha — ruhusa na kumbukumbu za matukio zinasimamiwa na Django API
        </p>
      </div>
    </div>
  )
}
