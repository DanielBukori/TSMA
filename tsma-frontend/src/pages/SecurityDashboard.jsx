import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import securityClient from '../api/securityClient.js'

const SEVERITY_COLOR = {
  critical: 'bg-terracotta text-white',
  high: 'bg-terracotta/15 text-terracotta',
  medium: 'bg-gold/20 text-gold-dark',
  low: 'bg-cream text-ink-muted',
}

export default function SecurityDashboard() {
  const navigate = useNavigate()
  const operator = JSON.parse(localStorage.getItem('tsma_security_operator') || 'null')

  const [summary, setSummary] = useState(null)
  const [events, setEvents] = useState([])
  const [blockedIps, setBlockedIps] = useState([])
  const [pending, setPending] = useState([])
  const [severityFilter, setSeverityFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!localStorage.getItem('tsma_security_token')) {
      navigate('/security/login')
      return
    }
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (loading) return
    loadEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severityFilter])

  async function loadAll() {
    setLoading(true)
    try {
      const [summaryRes, eventsRes, ipsRes, pendingRes] = await Promise.all([
        securityClient.get('/security/summary/'),
        securityClient.get('/security/events/'),
        securityClient.get('/security/blocked-ips/'),
        securityClient.get('/security/pending-actions/'),
      ])
      setSummary(summaryRes.data)
      setEvents(eventsRes.data?.results || eventsRes.data || [])
      setBlockedIps(ipsRes.data?.results || ipsRes.data || [])
      setPending(pendingRes.data?.results || pendingRes.data || [])
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/security/login')
      } else {
        setError('Imeshindikana kupakua data. Jaribu tena.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadEvents() {
    try {
      const params = severityFilter ? { severity: severityFilter } : {}
      const res = await securityClient.get('/security/events/', { params })
      setEvents(res.data?.results || res.data || [])
    } catch {
      // orodha ya zamani inabaki kuonekana badala ya kutoweka
    }
  }

  async function handleUnblock(id) {
    if (!window.confirm('Una uhakika unataka kufungua IP hii?')) return
    try {
      await securityClient.post(`/security/blocked-ips/${id}/unblock/`)
      setBlockedIps((prev) => prev.filter((ip) => ip.id !== id))
    } catch {
      alert('Imeshindikana kufungua IP.')
    }
  }

  async function handleDecide(id, approve) {
    const notes = approve ? '' : window.prompt('Sababu ya kukataa (hiari):') || ''
    try {
      await securityClient.post(`/security/pending-actions/${id}/decide/`, { approve, notes })
      setPending((prev) => prev.filter((p) => p.id !== id))
      loadAll()
    } catch (err) {
      alert(err.response?.data?.detail || 'Imeshindikana kuamua.')
    }
  }

  function handleLogout() {
    securityClient.post('/security/auth/logout/').catch(() => {})
    localStorage.removeItem('tsma_security_token')
    localStorage.removeItem('tsma_security_operator')
    navigate('/security/login')
  }

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-ink-muted text-sm">Inapakua...</div>
  }

  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-navy-deep text-white px-5 md:px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="font-serif font-bold text-lg">🛡️ Security Dashboard</h1>
          {operator && <p className="text-xs text-white/60">{operator.full_name} ({operator.email})</p>}
        </div>
        <button onClick={handleLogout} className="text-xs font-bold border border-white/30 rounded-md px-4 py-2 hover:bg-white/10">
          Toka
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-5 md:px-8 py-8">
        {error && <p className="bg-terracotta/10 text-terracotta text-sm font-bold rounded-md px-4 py-3 mb-6">{error}</p>}

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <SummaryCard label="Matukio (Saa 24)" value={summary.events_last_24h} />
            <SummaryCard label="Muhimu Hayajaangaliwa" value={summary.critical_unreviewed} danger={summary.critical_unreviewed > 0} />
            <SummaryCard label="IP Zilizozuiwa Sasa" value={summary.active_blocks} />
            <SummaryCard label="Zinasubiri Idhini" value={summary.pending_approvals} danger={summary.pending_approvals > 0} />
          </div>
        )}

        {/* Pending Approvals - hatua ya idhini ya binadamu */}
        {pending.length > 0 && (
          <div className="mb-10">
            <h2 className="font-serif font-bold text-navy mb-3">Zinasubiri Idhini Yako</h2>
            <div className="space-y-3">
              {pending.map((p) => (
                <div key={p.id} className="bg-surface border border-gold/30 rounded-lg p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-navy">{p.action_type}</p>
                    <p className="text-xs text-ink-muted">{p.target_description} — {p.reason}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleDecide(p.id, true)}
                      className="text-xs font-bold bg-green/15 text-green px-3 py-2 rounded-md"
                    >
                      Idhinisha
                    </button>
                    <button
                      onClick={() => handleDecide(p.id, false)}
                      className="text-xs font-bold bg-terracotta/15 text-terracotta px-3 py-2 rounded-md"
                    >
                      Kataa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blocked IPs */}
        <div className="mb-10">
          <h2 className="font-serif font-bold text-navy mb-3">IP Zilizozuiwa</h2>
          {blockedIps.length === 0 ? (
            <p className="text-sm text-ink-muted">Hakuna IP iliyozuiwa sasa hivi.</p>
          ) : (
            <div className="bg-surface rounded-lg border border-black/10 divide-y divide-black/5">
              {blockedIps.map((ip) => (
                <div key={ip.id} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-bold text-navy">{ip.ip_address}</p>
                    <p className="text-xs text-ink-muted truncate">
                      {ip.reason} {ip.is_permanent ? '· Ya Kudumu' : ip.blocked_until ? `· Hadi ${new Date(ip.blocked_until).toLocaleString()}` : ''}
                    </p>
                  </div>
                  {ip.is_active && (
                    <button onClick={() => handleUnblock(ip.id)} className="text-xs font-bold text-terracotta shrink-0">
                      Fungua →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Events */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif font-bold text-navy">Matukio ya Usalama</h2>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-xs border border-black/15 rounded-md px-2 py-1.5"
            >
              <option value="">Zote</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-ink-muted">Hakuna matukio.</p>
          ) : (
            <div className="bg-surface rounded-lg border border-black/10 divide-y divide-black/5 max-h-[500px] overflow-y-auto">
              {events.map((ev) => (
                <div key={ev.id} className="px-4 py-3 flex items-start gap-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${SEVERITY_COLOR[ev.severity] || SEVERITY_COLOR.low}`}>
                    {ev.severity?.toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">{ev.description}</p>
                    <p className="text-[11px] text-ink-muted font-mono">
                      {ev.ip_address} · {ev.path} · {new Date(ev.created_at).toLocaleString()}
                    </p>
                  </div>
                  {ev.auto_action_taken && (
                    <span className="text-[10px] text-gold-dark shrink-0">⚡ {ev.auto_action_taken}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, danger }) {
  return (
    <div className={`rounded-xl p-4 border ${danger ? 'border-terracotta/40 bg-terracotta/5' : 'border-black/10 bg-surface'}`}>
      <div className={`font-serif font-black text-2xl ${danger ? 'text-terracotta' : 'text-navy'}`}>{value}</div>
      <div className="text-[11px] text-ink-muted font-bold uppercase tracking-wide mt-1">{label}</div>
    </div>
  )
}
