import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import securityClient from '../api/securityClient.js'

const SESSION_MINUTES = 20 // lazima ilingane na TOKEN_LIFETIME_MINUTES ya backend
const REFRESH_MS = 60_000

const SEVERITY = {
  critical: { label: 'Hatari Sana', badge: 'bg-terracotta text-white', bar: 'bg-terracotta' },
  high: { label: 'Kubwa', badge: 'bg-terracotta/15 text-terracotta', bar: 'bg-terracotta/60' },
  medium: { label: 'Wastani', badge: 'bg-gold/25 text-gold-dark', bar: 'bg-gold' },
  low: { label: 'Ndogo', badge: 'bg-black/5 text-ink-muted', bar: 'bg-black/20' },
}

const SEVERITY_FILTERS = [
  { key: '', label: 'Zote' },
  { key: 'critical', label: 'Hatari Sana' },
  { key: 'high', label: 'Kubwa' },
  { key: 'medium', label: 'Wastani' },
  { key: 'low', label: 'Ndogo' },
]

const emptySection = { data: null, loading: true, error: null }

function timeAgo(iso) {
  if (!iso) return ''
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return 'sasa hivi'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `dakika ${minutes} zilizopita`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `saa ${hours} zilizopita`
  return `siku ${Math.floor(hours / 24)} zilizopita`
}

function remaining(iso) {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'inaisha sasa'
  const minutes = Math.ceil(ms / 60000)
  if (minutes < 60) return `dakika ${minutes} zimebaki`
  const hours = Math.floor(minutes / 60)
  return `saa ${hours} na dakika ${minutes % 60} zimebaki`
}

function listOf(data) {
  return Array.isArray(data) ? data : data?.results || []
}

export default function SecurityDashboard() {
  const navigate = useNavigate()
  const operator = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('tsma_security_operator') || 'null')
    } catch {
      return null
    }
  }, [])
  const loginAt = Number(localStorage.getItem('tsma_security_login_at')) || null
  const canDecide = operator?.is_superuser_operator !== false // haijulikani = ruhusu, seva ndiyo inaamua

  const [sections, setSections] = useState({
    summary: emptySection,
    events: emptySection,
    ips: emptySection,
    pending: emptySection,
  })
  const [tab, setTab] = useState(null)
  const [severity, setSeverity] = useState('')
  const [onlyUnreviewed, setOnlyUnreviewed] = useState(false)
  const [search, setSearch] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState(null)
  const [dialog, setDialog] = useState(null) // { kind, item }
  const [blockOpen, setBlockOpen] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [now, setNow] = useState(Date.now())
  const firstLoad = useRef(true)

  const showToast = useCallback((text, tone = 'ok') => {
    setToast({ text, tone })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const forceLogin = useCallback(
    (reason) => {
      localStorage.removeItem('tsma_security_token')
      localStorage.removeItem('tsma_security_operator')
      localStorage.removeItem('tsma_security_login_at')
      navigate('/security/login', { state: { notice: reason } })
    },
    [navigate],
  )

  const loadSection = useCallback(
    async (key, url, params) => {
      setSections((prev) => ({ ...prev, [key]: { ...prev[key], loading: true } }))
      try {
        const res = await securityClient.get(url, { params })
        setSections((prev) => ({ ...prev, [key]: { data: res.data, loading: false, error: null } }))
      } catch (err) {
        if (err.response?.status === 401) {
          forceLogin('Session imeisha muda. Ingia tena.')
          return
        }
        setSections((prev) => ({
          ...prev,
          [key]: {
            data: prev[key].data,
            loading: false,
            error: { status: err.response?.status || 0, message: err.response?.data?.detail || '' },
          },
        }))
      }
    },
    [forceLogin],
  )

  const eventParams = useMemo(() => {
    const params = {}
    if (severity) params.severity = severity
    if (onlyUnreviewed) params.reviewed = 'false'
    return params
  }, [severity, onlyUnreviewed])

  const loadAll = useCallback(async () => {
    setRefreshing(true)
    await Promise.allSettled([
      loadSection('summary', '/security/summary/'),
      loadSection('events', '/security/events/', eventParams),
      loadSection('ips', '/security/blocked-ips/'),
      loadSection('pending', '/security/pending-actions/'),
    ])
    setLastUpdated(new Date())
    setRefreshing(false)
  }, [loadSection, eventParams])

  useEffect(() => {
    if (!localStorage.getItem('tsma_security_token')) {
      navigate('/security/login')
      return
    }
    loadAll()
    firstLoad.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Vichujio vya matukio vikibadilika, pakia matukio tu
  useEffect(() => {
    if (firstLoad.current) return
    loadSection('events', '/security/events/', eventParams)
  }, [eventParams, loadSection])

  // Kujisasisha kila dakika (tab inapoonekana tu)
  useEffect(() => {
    if (!autoRefresh) return undefined
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') loadAll()
    }, REFRESH_MS)
    return () => clearInterval(timer)
  }, [autoRefresh, loadAll])

  // Saa ya kipima-muda cha session
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const sessionLeftMs = loginAt ? SESSION_MINUTES * 60_000 - (now - loginAt) : null
  useEffect(() => {
    if (sessionLeftMs !== null && sessionLeftMs <= 0) forceLogin('Session ya dakika 20 imeisha. Ingia tena.')
  }, [sessionLeftMs, forceLogin])

  const summary = sections.summary.data
  const pending = listOf(sections.pending.data)
  const ips = listOf(sections.ips.data)
  const activeIps = ips.filter((ip) => ip.is_active)
  const allEvents = listOf(sections.events.data)
  const events = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allEvents
    return allEvents.filter((ev) =>
      [ev.description, ev.ip_address, ev.path, ev.event_type_display].some((v) => (v || '').toLowerCase().includes(q)),
    )
  }, [allEvents, search])

  // Tab ya kuanzia: idhini zikiwepo, vinginevyo matukio
  useEffect(() => {
    if (tab === null && !sections.pending.loading) setTab(pending.length > 0 ? 'pending' : 'events')
  }, [tab, sections.pending.loading, pending.length])

  const needsAttention = (summary?.pending_approvals || 0) + (summary?.critical_unreviewed || 0)

  async function handleLogout() {
    try {
      await securityClient.post('/security/auth/logout/')
    } catch {
      /* session itaisha yenyewe */
    }
    forceLogin('Umetoka salama.')
  }

  async function confirmDialog(notes) {
    const { kind, item } = dialog
    setBusyId(item.id)
    try {
      if (kind === 'unblock') {
        await securityClient.post(`/security/blocked-ips/${item.id}/unblock/`)
        showToast(`IP ${item.ip_address} imefunguliwa`)
      } else {
        await securityClient.post(`/security/pending-actions/${item.id}/decide/`, {
          approve: kind === 'approve',
          notes: notes || '',
        })
        showToast(kind === 'approve' ? 'Imeidhinishwa' : 'Imekataliwa')
      }
      setDialog(null)
      loadAll()
    } catch (err) {
      if (err.response?.status === 401) return forceLogin('Session imeisha muda. Ingia tena.')
      showToast(err.response?.data?.detail || 'Imeshindikana. Jaribu tena.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function markReviewed(ev) {
    setBusyId(ev.id)
    try {
      await securityClient.post(`/security/events/${ev.id}/review/`)
      setSections((prev) => ({
        ...prev,
        events: {
          ...prev.events,
          data: listOf(prev.events.data).map((e) => (e.id === ev.id ? { ...e, is_reviewed: true } : e)),
        },
      }))
      loadSection('summary', '/security/summary/')
    } catch (err) {
      if (err.response?.status === 401) return forceLogin('Session imeisha muda. Ingia tena.')
      showToast('Imeshindikana kuweka alama.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const tabs = [
    { key: 'pending', label: 'Idhini', count: pending.length, alert: pending.length > 0 },
    { key: 'ips', label: 'IP Zilizozuiwa', count: activeIps.length },
    { key: 'events', label: 'Matukio', count: allEvents.length },
  ]

  const minutesLeft = sessionLeftMs !== null ? Math.max(0, Math.floor(sessionLeftMs / 60000)) : null
  const secondsLeft = sessionLeftMs !== null ? Math.max(0, Math.floor((sessionLeftMs % 60000) / 1000)) : null
  const sessionWarn = sessionLeftMs !== null && sessionLeftMs < 3 * 60_000

  return (
    <div className="bg-cream min-h-screen pb-16">
      {/* ===== Kichwa ===== */}
      <header className="bg-navy-deep text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center text-xl shrink-0">🛡️</div>
            <div className="min-w-0">
              <h1 className="font-serif font-bold text-base leading-tight">TSMA Security</h1>
              <p className="text-[11px] text-white/60 truncate">
                {operator ? `${operator.full_name} · ${operator.is_superuser_operator ? 'Superuser' : 'Operator'}` : 'Dashibodi ya Usalama'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {sessionLeftMs !== null && (
              <span
                title="Muda uliobaki wa session"
                className={`hidden sm:inline-flex text-[11px] font-mono font-bold px-2.5 py-1.5 rounded-md ${
                  sessionWarn ? 'bg-terracotta text-white animate-pulse' : 'bg-white/10 text-white/80'
                }`}
              >
                ⏱ {String(minutesLeft).padStart(2, '0')}:{String(secondsLeft).padStart(2, '0')}
              </span>
            )}
            <button
              onClick={loadAll}
              disabled={refreshing}
              aria-label="Sasisha"
              className="text-xs font-bold border border-white/25 rounded-md px-3 py-2 hover:bg-white/10 disabled:opacity-60"
            >
              <span className={refreshing ? 'inline-block animate-spin' : 'inline-block'}>⟳</span>
              <span className="hidden sm:inline"> Sasisha</span>
            </button>
            <button onClick={handleLogout} className="text-xs font-bold bg-white/10 hover:bg-white/20 rounded-md px-3 py-2">
              Toka
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-6">
        {sessionWarn && (
          <p className="sm:hidden bg-terracotta/10 text-terracotta text-xs font-bold rounded-md px-3 py-2 mb-4">
            ⏱ Session inaisha baada ya dakika {minutesLeft}:{String(secondsLeft).padStart(2, '0')}
          </p>
        )}

        {/* ===== Hali ya jumla ===== */}
        {sections.summary.error ? (
          <SectionError error={sections.summary.error} what="muhtasari" onRetry={() => loadSection('summary', '/security/summary/')} />
        ) : (
          <div
            className={`rounded-xl px-4 py-3 mb-5 flex items-center gap-3 border ${
              !summary
                ? 'bg-white border-black/10'
                : needsAttention > 0
                  ? 'bg-gold/10 border-gold/40'
                  : 'bg-green/10 border-green/30'
            }`}
          >
            <span className="text-2xl">{!summary ? '⏳' : needsAttention > 0 ? '⚠️' : '✅'}</span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-navy">
                {!summary
                  ? 'Inapakia hali ya mfumo...'
                  : needsAttention > 0
                    ? `Kuna ${needsAttention} zinazohitaji uangalizi wako`
                    : 'Mfumo uko salama - hakuna kinachosubiri'}
              </p>
              <p className="text-[11px] text-ink-muted">
                {lastUpdated ? `Imesasishwa ${timeAgo(lastUpdated.toISOString())}` : ''}
                {autoRefresh ? ' · inajisasisha kila dakika' : ''}
              </p>
            </div>
            <label className="ml-auto flex items-center gap-2 text-[11px] font-bold text-ink-muted cursor-pointer select-none shrink-0">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-4 h-4" />
              <span className="hidden sm:inline">Jisasishe</span>
            </label>
          </div>
        )}

        {/* ===== Kadi za muhtasari ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-7">
          <StatCard icon="📊" label="Matukio (Saa 24)" value={summary?.events_last_24h} loading={sections.summary.loading && !summary} />
          <StatCard
            icon="🚨"
            label="Hatari Hayajaangaliwa"
            value={summary?.critical_unreviewed}
            danger={summary?.critical_unreviewed > 0}
            loading={sections.summary.loading && !summary}
            onClick={() => {
              setSeverity('critical')
              setOnlyUnreviewed(true)
              setTab('events')
            }}
          />
          <StatCard icon="⛔" label="IP Zilizozuiwa" value={summary?.active_blocks} loading={sections.summary.loading && !summary} onClick={() => setTab('ips')} />
          <StatCard
            icon="📝"
            label="Zinasubiri Idhini"
            value={summary?.pending_approvals}
            danger={summary?.pending_approvals > 0}
            loading={sections.summary.loading && !summary}
            onClick={() => setTab('pending')}
          />
        </div>

        {/* ===== Tabs ===== */}
        <div className="flex gap-1 bg-white border border-black/10 rounded-xl p-1 mb-5 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 whitespace-nowrap text-xs font-bold px-3 py-2.5 rounded-lg transition-colors ${
                tab === t.key ? 'bg-navy text-white' : 'text-ink-muted hover:bg-cream'
              }`}
            >
              {t.label}
              <span
                className={`ml-1.5 inline-block min-w-[18px] text-[10px] px-1.5 py-0.5 rounded-full ${
                  t.alert && tab !== t.key ? 'bg-terracotta text-white' : tab === t.key ? 'bg-white/20' : 'bg-black/5'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* ===== IDHINI ===== */}
        {tab === 'pending' && (
          <section>
            {sections.pending.error && (
              <SectionError error={sections.pending.error} what="hatua zinazosubiri idhini" onRetry={() => loadSection('pending', '/security/pending-actions/')} />
            )}
            {sections.pending.loading && !sections.pending.data ? (
              <Skeleton rows={2} />
            ) : pending.length === 0 && !sections.pending.error ? (
              <Empty icon="🎉" title="Hakuna kinachosubiri idhini" hint="Mfumo ukipendekeza hatua ya kudumu (mfano kuzuia IP milele), itaonekana hapa." />
            ) : (
              <div className="space-y-3">
                {!canDecide && (
                  <p className="text-xs text-ink-muted bg-white border border-black/10 rounded-lg px-3 py-2">
                    Ni Superuser Operator pekee anayeweza kuidhinisha au kukataa.
                  </p>
                )}
                {pending.map((p) => (
                  <article key={p.id} className="bg-white border border-gold/40 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-navy">{p.action_type_display || p.action_type}</p>
                        <p className="text-xs font-mono text-ink mt-0.5 break-all">{p.target_description}</p>
                      </div>
                      <span className="text-[11px] text-ink-muted shrink-0">{timeAgo(p.created_at)}</span>
                    </div>
                    {p.reason && <p className="text-xs text-ink-muted mt-2 leading-relaxed">{p.reason}</p>}
                    {p.related_event && (
                      <p className="text-[11px] text-ink-muted mt-2 border-l-2 border-gold pl-2">
                        Tukio husika: {p.related_event.event_type_display || p.related_event.event_type}
                        {p.related_event.ip_address ? ` · ${p.related_event.ip_address}` : ''}
                      </p>
                    )}
                    {canDecide && (
                      <div className="flex gap-2 mt-4">
                        <button
                          disabled={busyId === p.id}
                          onClick={() => setDialog({ kind: 'approve', item: p })}
                          className="flex-1 text-xs font-extrabold bg-green text-white py-2.5 rounded-md disabled:opacity-60"
                        >
                          ✓ Idhinisha
                        </button>
                        <button
                          disabled={busyId === p.id}
                          onClick={() => setDialog({ kind: 'reject', item: p })}
                          className="flex-1 text-xs font-extrabold bg-terracotta/10 text-terracotta py-2.5 rounded-md disabled:opacity-60"
                        >
                          ✕ Kataa
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ===== IP ZILIZOZUIWA ===== */}
        {tab === 'ips' && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-ink-muted">IP zinazozuiwa kiotomatiki au kwa mkono.</p>
              <button
                onClick={() => setBlockOpen(true)}
                className="text-xs font-extrabold bg-navy text-white rounded-md px-4 py-2.5 hover:bg-navy-deep"
              >
                ＋ Zuia IP
              </button>
            </div>
            {sections.ips.error && <SectionError error={sections.ips.error} what="IP zilizozuiwa" onRetry={() => loadSection('ips', '/security/blocked-ips/')} />}
            {sections.ips.loading && !sections.ips.data ? (
              <Skeleton rows={3} />
            ) : activeIps.length === 0 && !sections.ips.error ? (
              <Empty icon="🟢" title="Hakuna IP iliyozuiwa sasa hivi" hint="IP zinazozuiwa kiotomatiki (mfano brute-force) zitaonekana hapa na zinajifungua zenyewe baada ya saa 1." />
            ) : (
              <div className="bg-white rounded-xl border border-black/10 divide-y divide-black/5">
                {activeIps.map((ip) => (
                  <div key={ip.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono font-bold text-navy">{ip.ip_address}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ip.is_permanent ? 'bg-terracotta text-white' : 'bg-gold/25 text-gold-dark'
                          }`}
                        >
                          {ip.is_permanent ? 'Ya Kudumu' : 'Ya Muda'}
                        </span>
                        {ip.blocked_by_system && <span className="text-[10px] text-ink-muted">⚡ kiotomatiki</span>}
                      </div>
                      <p className="text-xs text-ink-muted mt-1 truncate">{ip.reason}</p>
                      {!ip.is_permanent && ip.blocked_until && (
                        <p className="text-[11px] text-ink-muted">{remaining(ip.blocked_until)}</p>
                      )}
                    </div>
                    <button
                      disabled={busyId === ip.id}
                      onClick={() => setDialog({ kind: 'unblock', item: ip })}
                      className="text-xs font-bold text-terracotta border border-terracotta/30 rounded-md px-3 py-2 shrink-0 hover:bg-terracotta/5 disabled:opacity-60"
                    >
                      Fungua
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ===== MATUKIO ===== */}
        {tab === 'events' && (
          <section>
            <div className="bg-white border border-black/10 rounded-xl p-3 mb-4 space-y-3">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tafuta kwa maelezo, IP au njia..."
                className="w-full text-sm border border-black/15 rounded-md px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
              <div className="flex items-center gap-2 flex-wrap">
                {SEVERITY_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setSeverity(f.key)}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-full border ${
                      severity === f.key ? 'bg-navy text-white border-navy' : 'border-black/15 text-ink-muted hover:bg-cream'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                <label className="ml-auto flex items-center gap-2 text-[11px] font-bold text-ink-muted cursor-pointer select-none">
                  <input type="checkbox" checked={onlyUnreviewed} onChange={(e) => setOnlyUnreviewed(e.target.checked)} className="w-4 h-4" />
                  Hayajaangaliwa tu
                </label>
              </div>
            </div>

            {sections.events.error && <SectionError error={sections.events.error} what="matukio" onRetry={() => loadSection('events', '/security/events/', eventParams)} />}
            {sections.events.loading && !sections.events.data ? (
              <Skeleton rows={4} />
            ) : events.length === 0 && !sections.events.error ? (
              <Empty icon="🔍" title="Hakuna matukio yanayolingana" hint={search || severity || onlyUnreviewed ? 'Jaribu kuondoa vichujio.' : 'Hakuna tukio la usalama lililorekodiwa bado.'} />
            ) : (
              <div className="space-y-2.5">
                {events.map((ev) => (
                  <EventCard key={ev.id} ev={ev} busy={busyId === ev.id} onReview={() => markReviewed(ev)} onCopied={() => showToast('IP imenakiliwa')} />
                ))}
                {allEvents.length >= 200 && (
                  <p className="text-center text-[11px] text-ink-muted pt-2">Inaonyesha matukio 200 ya hivi karibuni. Tumia vichujio kupunguza.</p>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {/* ===== Dirisha la uthibitisho ===== */}
      {dialog && <ConfirmModal dialog={dialog} busy={busyId === dialog.item.id} onCancel={() => setDialog(null)} onConfirm={confirmDialog} />}

      {blockOpen && (
        <BlockIpModal
          canPermanent={canDecide}
          onCancel={() => setBlockOpen(false)}
          onDone={(ip) => {
            setBlockOpen(false)
            showToast(`IP ${ip} imezuiwa`)
            loadAll()
          }}
          onExpired={() => forceLogin('Session imeisha muda. Ingia tena.')}
        />
      )}

      {/* ===== Ujumbe mfupi ===== */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 text-xs font-bold px-4 py-3 rounded-lg shadow-lg ${
            toast.tone === 'error' ? 'bg-terracotta text-white' : 'bg-navy-deep text-white'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, danger, loading, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`text-left rounded-xl p-4 border transition-shadow ${onClick ? 'hover:shadow-md cursor-pointer' : ''} ${
        danger ? 'border-terracotta/40 bg-terracotta/5' : 'border-black/10 bg-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg">{icon}</span>
        {danger && <span className="w-2 h-2 rounded-full bg-terracotta animate-pulse" />}
      </div>
      {loading ? (
        <div className="h-8 w-12 bg-black/10 rounded animate-pulse mt-2" />
      ) : (
        <div className={`font-serif font-black text-3xl mt-1 ${danger ? 'text-terracotta' : 'text-navy'}`}>{value ?? '—'}</div>
      )}
      <div className="text-[11px] text-ink-muted font-bold uppercase tracking-wide mt-1">{label}</div>
    </Tag>
  )
}

function EventCard({ ev, busy, onReview, onCopied }) {
  const [open, setOpen] = useState(false)
  const sev = SEVERITY[ev.severity] || SEVERITY.low
  const hasMeta = ev.metadata && Object.keys(ev.metadata).length > 0

  async function copyIp() {
    try {
      await navigator.clipboard.writeText(ev.ip_address)
      onCopied()
    } catch {
      /* clipboard haipatikani */
    }
  }

  return (
    <article className={`bg-white rounded-xl border border-black/10 overflow-hidden flex ${ev.is_reviewed ? 'opacity-70' : ''}`}>
      <div className={`w-1.5 shrink-0 ${sev.bar}`} />
      <div className="p-3.5 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${sev.badge}`}>{sev.label}</span>
          <span className="text-xs font-bold text-navy">{ev.event_type_display || ev.event_type}</span>
          <span className="text-[11px] text-ink-muted ml-auto" title={new Date(ev.created_at).toLocaleString('sw-TZ')}>
            {timeAgo(ev.created_at)}
          </span>
        </div>
        {ev.description && <p className="text-sm text-ink mt-1.5 leading-snug break-words">{ev.description}</p>}
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-2 text-[11px] text-ink-muted font-mono">
          {ev.ip_address && (
            <button onClick={copyIp} title="Nakili IP" className="hover:text-navy underline decoration-dotted">
              {ev.ip_address} ⧉
            </button>
          )}
          {ev.path && <span className="truncate max-w-full">{ev.path}</span>}
        </div>
        {ev.auto_action_taken && (
          <p className="text-[11px] text-gold-dark font-bold mt-2">⚡ Hatua ya kiotomatiki: {ev.auto_action_taken}</p>
        )}
        <div className="flex items-center gap-3 mt-3">
          {ev.is_reviewed ? (
            <span className="text-[11px] font-bold text-green">✓ Imeangaliwa</span>
          ) : (
            <button
              disabled={busy}
              onClick={onReview}
              className="text-[11px] font-bold text-navy border border-navy/25 rounded-md px-3 py-1.5 hover:bg-cream disabled:opacity-60"
            >
              Weka kuwa imeangaliwa
            </button>
          )}
          {hasMeta && (
            <button onClick={() => setOpen((v) => !v)} className="text-[11px] font-bold text-ink-muted">
              {open ? 'Ficha maelezo ▲' : 'Maelezo zaidi ▼'}
            </button>
          )}
        </div>
        {open && hasMeta && (
          <pre className="mt-2 text-[11px] bg-cream rounded-md p-3 overflow-x-auto text-ink">{JSON.stringify(ev.metadata, null, 2)}</pre>
        )}
      </div>
    </article>
  )
}

function SectionError({ error, what, onRetry }) {
  const hint =
    error.status >= 500
      ? 'Hitilafu ya seva. Angalia logs za backend.'
      : error.status === 403
        ? 'Huna ruhusa ya kuona hili.'
        : error.status === 0
          ? 'Hakuna mawasiliano na seva (mtandao au CORS).'
          : error.message
  return (
    <div className="bg-terracotta/10 border border-terracotta/30 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-terracotta">
          Imeshindikana kupakia {what}
          {error.status ? ` (HTTP ${error.status})` : ''}
        </p>
        {hint && <p className="text-xs text-terracotta/80 mt-0.5">{hint}</p>}
      </div>
      <button onClick={onRetry} className="text-xs font-bold text-terracotta border border-terracotta/40 rounded-md px-3 py-2 shrink-0">
        Jaribu tena
      </button>
    </div>
  )
}

function Empty({ icon, title, hint }) {
  return (
    <div className="bg-white border border-dashed border-black/15 rounded-xl py-12 px-6 text-center">
      <div className="text-4xl mb-2">{icon}</div>
      <p className="text-sm font-bold text-navy">{title}</p>
      {hint && <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">{hint}</p>}
    </div>
  )
}

function Skeleton({ rows }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white border border-black/10 rounded-xl p-4 animate-pulse">
          <div className="h-3 w-1/3 bg-black/10 rounded mb-3" />
          <div className="h-3 w-3/4 bg-black/10 rounded" />
        </div>
      ))}
    </div>
  )
}

function ConfirmModal({ dialog, busy, onCancel, onConfirm }) {
  const [notes, setNotes] = useState('')
  const { kind, item } = dialog
  const config = {
    unblock: {
      title: 'Fungua IP hii?',
      body: `IP ${item.ip_address} itaruhusiwa kufikia mfumo tena mara moja.`,
      button: 'Ndiyo, fungua',
      tone: 'bg-navy text-white',
    },
    approve: {
      title: 'Idhinisha hatua hii?',
      body: `${item.action_type_display || item.action_type}: ${item.target_description}. Hatua hii itakuwa ya kudumu.`,
      button: 'Ndiyo, idhinisha',
      tone: 'bg-green text-white',
    },
    reject: {
      title: 'Kataa hatua hii?',
      body: `${item.action_type_display || item.action_type}: ${item.target_description}. Block ya muda itajifungua yenyewe.`,
      button: 'Ndiyo, kataa',
      tone: 'bg-terracotta text-white',
    },
  }[kind]

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onCancel}>
      <div role="dialog" aria-modal="true" className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-serif font-bold text-lg text-navy">{config.title}</h3>
        <p className="text-sm text-ink-muted mt-2 leading-relaxed">{config.body}</p>
        {kind === 'reject' && (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Sababu ya kukataa (hiari)"
            className="w-full mt-3 text-sm border border-black/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold/50"
          />
        )}
        <div className="flex gap-2 mt-5">
          <button onClick={onCancel} disabled={busy} className="flex-1 text-sm font-bold border border-black/15 rounded-md py-2.5 text-ink-muted">
            Ghairi
          </button>
          <button onClick={() => onConfirm(notes)} disabled={busy} className={`flex-1 text-sm font-extrabold rounded-md py-2.5 disabled:opacity-60 ${config.tone}`}>
            {busy ? 'Subiri...' : config.button}
          </button>
        </div>
      </div>
    </div>
  )
}

function BlockIpModal({ canPermanent, onCancel, onDone, onExpired }) {
  const [ip, setIp] = useState('')
  const [reason, setReason] = useState('')
  const [hours, setHours] = useState(24)
  const [permanent, setPermanent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await securityClient.post('/security/blocked-ips/', {
        ip_address: ip.trim(),
        reason: reason.trim(),
        duration_hours: Number(hours) || 24,
        permanent,
      })
      onDone(ip.trim())
    } catch (err) {
      if (err.response?.status === 401) return onExpired()
      const data = err.response?.data
      const first = data?.detail || (data && Object.values(data)[0])
      setError((Array.isArray(first) ? first[0] : first) || 'Imeshindikana. Jaribu tena.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onCancel}>
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif font-bold text-lg text-navy">Zuia IP kwa mkono</h3>
        {error && <p className="bg-terracotta/10 text-terracotta text-xs font-bold rounded-md px-3 py-2">{error}</p>}
        <div>
          <label className="block text-xs font-bold text-ink mb-1">Anwani ya IP</label>
          <input
            required
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="mfano 41.59.10.5"
            className="w-full text-sm font-mono border border-black/15 rounded-md px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/50"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-ink mb-1">Sababu</label>
          <input
            required
            maxLength={200}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="mfano: majaribio ya kuvamia login"
            className="w-full text-sm border border-black/15 rounded-md px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/50"
          />
        </div>
        {!permanent && (
          <div>
            <label className="block text-xs font-bold text-ink mb-1">Muda (saa 1 hadi 720)</label>
            <input
              type="number"
              min={1}
              max={720}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full text-sm border border-black/15 rounded-md px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/50"
            />
          </div>
        )}
        {canPermanent && (
          <label className="flex items-center gap-2 text-xs font-bold text-ink cursor-pointer select-none">
            <input type="checkbox" checked={permanent} onChange={(e) => setPermanent(e.target.checked)} className="w-4 h-4" />
            Zuia kwa kudumu (Superuser pekee)
          </label>
        )}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onCancel} disabled={busy} className="flex-1 text-sm font-bold border border-black/15 rounded-md py-2.5 text-ink-muted">
            Ghairi
          </button>
          <button type="submit" disabled={busy} className="flex-1 text-sm font-extrabold bg-terracotta text-white rounded-md py-2.5 disabled:opacity-60">
            {busy ? 'Subiri...' : 'Zuia IP'}
          </button>
        </div>
      </form>
    </div>
  )
}
