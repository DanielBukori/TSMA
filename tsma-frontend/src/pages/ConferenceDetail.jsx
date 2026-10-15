import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import GatewaySelect from '../components/GatewaySelect.jsx'
import ManualPaymentCard from '../components/ManualPaymentCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function ConferenceDetail() {
  const { slug } = useParams()
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [conference, setConference] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiClient
      .get(`/conferences/${slug}/`)
      .then((res) => {
        if (!cancelled) setConference(res.data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return <div className="py-24 text-center text-ink-muted text-sm">
      {isSw ? 'Inapakia...' : 'Loading...'}
    </div>
  }

  if (!conference) {
    return <div className="py-24 text-center text-ink-muted text-sm">
      {isSw ? 'Mkutano haukupatikana.' : 'Conference not found.'}
    </div>
  }

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="bg-navy-deep bg-track-lines text-white text-center py-16 md:py-20 px-5">
        <span className="inline-block bg-gold text-navy-deep text-[11px] font-extrabold px-3 py-1.5 rounded-full mb-5">
          {conference.is_past ? (isSw ? 'MKUTANO ULIOPITA' : 'PAST CONFERENCE') : (isSw ? 'USAJILI UNAENDELEA' : 'REGISTRATION OPEN')}
        </span>
        <h1 className="font-serif font-bold text-3xl md:text-5xl max-w-3xl mx-auto">
          {conference.title}
        </h1>
        {conference.theme && <p className="text-gold italic mt-3">"{conference.theme}"</p>}
        <p className="text-white/70 text-sm mt-5">
          {conference.venue_name}, {conference.city} · {conference.start_date} – {conference.end_date}
        </p>
      </section>

      <section data-reveal className="max-w-3xl mx-auto px-5 md:px-8 py-12 text-center">
        <p className="text-ink leading-relaxed">{conference.description}</p>
      </section>

      {/* ============ FULL AGENDA (timeline kwa siku) ============ */}
      {conference.days?.length > 0 && (
        <section data-reveal className="bg-cream py-14 md:py-20">
          <div className="max-w-3xl mx-auto px-5 md:px-8">
            <div className="text-center mb-12">
              <div className="text-terracotta font-extrabold text-xs tracking-widest mb-2">
                {isSw ? 'RATIBA KAMILI' : 'FULL SCHEDULE'}
              </div>
              <h2 className="font-serif font-bold text-2xl md:text-3xl text-navy">
                {isSw ? 'Ajenda ya Mkutano' : 'Conference Agenda'}
              </h2>
              <div className="lane-divider mx-auto mt-4" />
            </div>

            <div className="space-y-10">
              {conference.days.map((day) => (
                <div data-reveal key={day.id}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-full bg-navy text-gold font-serif font-black text-sm flex items-center justify-center shrink-0">
                      {day.day_number}
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-navy text-lg">
                        {day.title || `${isSw ? 'Siku' : 'Day'} ${day.day_number}`}
                      </h3>
                      <p className="text-xs text-ink-muted">{day.date}</p>
                    </div>
                  </div>

                  <div className="pl-14 space-y-4">
                    {day.sessions?.map((session) => (
                      <div data-reveal key={session.id} className="bg-white border border-black/10 rounded-lg p-4 transition-transform duration-300 hover:-translate-y-1">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <h4 className="font-bold text-sm text-navy">{session.title}</h4>
                            {session.speaker_name && (
                              <p className="text-xs text-terracotta font-semibold mt-1">
                                {session.speaker_name}
                                {session.speaker_title && ` — ${session.speaker_title}`}
                              </p>
                            )}
                            {session.description && (
                              <p className="text-xs text-ink-muted mt-1.5">{session.description}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold text-navy whitespace-nowrap">
                              {session.start_time}–{session.end_time}
                            </div>
                            {session.venue_hall && (
                              <div className="text-[10px] text-ink-muted mt-1">{session.venue_hall}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ REGISTRATION ============ */}
      {!conference.is_past && conference.is_registration_still_open && (
        <RegistrationSection conference={conference} isSw={isSw} />
      )}
    </>
  )
}

function RegistrationSection({ conference, isSw }) {
  const { isAuthenticated } = useAuth()
  const [mode, setMode] = useState('self') // self | bulk

  return (
    <section data-reveal id="register" className="max-w-3xl mx-auto px-5 md:px-8 py-14 md:py-20">
      <div className="text-center mb-10">
        <div className="text-terracotta font-extrabold text-xs tracking-widest mb-2">
          {isSw ? 'JISAJILI' : 'REGISTER'}
        </div>
        <h2 className="font-serif font-bold text-2xl md:text-3xl text-navy">
          {isSw ? 'Chagua Tiketi Yako' : 'Choose Your Ticket'}
        </h2>
      </div>

      {!isAuthenticated ? (
        <div className="text-center border border-dashed border-black/20 rounded-xl p-8">
          <p className="text-sm text-ink-muted mb-4">
            {isSw ? 'Ingia kwenye akaunti yako kuendelea na usajili.' : 'Sign in to your account to continue registering.'}
          </p>
          <a href="/login" className="inline-block bg-gold text-navy-deep font-extrabold text-sm px-7 py-3.5 rounded-md">
            {isSw ? 'Ingia →' : 'Sign In →'}
          </a>
        </div>
      ) : (
        <>
          <div className="flex justify-center gap-2 mb-8">
            <ModeButton active={mode === 'self'} onClick={() => setMode('self')}>
              {isSw ? '👤 Mimi Mwenyewe' : '👤 Myself'}
            </ModeButton>
            <ModeButton active={mode === 'bulk'} onClick={() => setMode('bulk')}>
              {isSw ? '🏢 Taasisi (Wengi)' : '🏢 Organization (Bulk)'}
            </ModeButton>
          </div>

          {mode === 'self' ? (
            <SelfRegistrationForm conference={conference} isSw={isSw} />
          ) : (
            <BulkRegistrationForm conference={conference} isSw={isSw} />
          )}
        </>
      )}
    </section>
  )
}

function ModeButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm font-bold px-5 py-2.5 rounded-full border transition-colors ${
        active ? 'bg-navy text-white border-navy' : 'border-black/15 text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function TicketPicker({ tickets, selectedId, onSelect, isSw }) {
  const availableTickets = (Array.isArray(tickets) ? tickets : []).filter((ticket) => ticket && ticket.is_available !== false)
  if (availableTickets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-black/20 bg-cream/60 p-5 text-center text-sm text-ink-muted" role="status">
        {isSw ? 'Hakuna tiketi zinazopatikana kwa sasa. Tafadhali wasiliana na TSMA au jaribu tena baadaye.' : 'No tickets are currently available. Please contact TSMA or try again later.'}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {availableTickets.map((ticket) => (
        <button
          key={ticket.id}
          type="button"
          onClick={() => onSelect(ticket.id)}
          aria-pressed={selectedId === ticket.id}
          className={`text-left border rounded-lg p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
            String(selectedId) === String(ticket.id) ? 'border-gold ring-2 ring-gold/30 bg-cream/40' : 'border-black/10 bg-white'
          }`}
        >
          <div className="text-xs font-extrabold text-navy uppercase">{ticket.name}</div>
          <div className="font-serif font-bold text-green text-lg mt-1.5">
            {Number(ticket.price || 0).toLocaleString()}{' '}
            <span className="text-xs font-sans font-normal text-ink-muted">{ticket.currency || 'TZS'}</span>
          </div>
        </button>
      ))}
    </div>
  )
}

function PaymentStatusBlock({ status, message, reference, isSw, manual }) {
  if (status === 'waiting' && manual?.bank_details) {
    return (
      <div className="border border-black/10 rounded-xl p-6 bg-white">
        <ManualPaymentCard
          isSw={isSw}
          bankDetails={manual.bank_details}
          reference={reference}
          expiresAt={manual.expires_at}
          deadlineHours={manual.confirm_deadline_hours || 24}
        />
      </div>
    )
  }
  if (status === 'waiting') {
    return (
      <div className="text-center border border-black/10 rounded-xl p-6 bg-cream">
        <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold">{message}</p>
        <p className="text-xs text-ink-muted mt-2">Ref: {reference}</p>
      </div>
    )
  }
  if (status === 'success') {
    return (
      <div className="text-center border border-green/30 bg-green/10 rounded-xl p-6">
        <div className="text-3xl mb-2">✅</div>
        <p className="text-sm font-semibold">{message}</p>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="text-center border border-terracotta/30 bg-terracotta/10 rounded-xl p-6">
        <p className="text-sm font-semibold text-terracotta">{message}</p>
      </div>
    )
  }
  return null
}

function usePaymentPolling() {
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [reference, setReference] = useState(null)
  const [manual, setManual] = useState(null)
  const pollRef = useRef(null)

  useEffect(() => () => clearInterval(pollRef.current), [])

  function startPolling(ref, isSw, payment) {
    setReference(ref)
    setManual(payment?.bank_details ? payment : null)
    pollRef.current = setInterval(async () => {
      try {
        const res = await apiClient.get(`/payments/status/${ref}/`)
        if (res.data.status === 'success') {
          clearInterval(pollRef.current)
          setStatus('success')
          setMessage(isSw ? 'Malipo yamekamilika! Umesajiliwa.' : 'Payment complete! You are registered.')
        } else if (res.data.status === 'failed') {
          clearInterval(pollRef.current)
          setStatus('error')
          setMessage(isSw ? 'Malipo yameshindikana.' : 'Payment failed.')
        } else if (res.data.status === 'expired') {
          clearInterval(pollRef.current)
          setStatus('error')
          setMessage(
            isSw
              ? 'Muda wa kuthibitisha malipo umeisha bila uthibitisho kufika. Wasiliana na TSMA (WhatsApp) kama tayari ulilipa.'
              : 'The confirmation window closed without a confirmation reaching us. Contact TSMA (WhatsApp) if you already paid.',
          )
        }
      } catch {
        // endelea kusubiri
      }
    }, 5000)
  }

  return { status, setStatus, message, setMessage, reference, manual, startPolling }
}

function SelfRegistrationForm({ conference, isSw }) {
  const [ticketId, setTicketId] = useState(null)
  const [phone, setPhone] = useState('')
  const [gateway, setGateway] = useState(null)
  const [method, setMethod] = useState('mobile_money')
  const { status, setStatus, message, setMessage, reference, manual, startPolling } = usePaymentPolling()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!ticketId) return
    setStatus('submitting')
    try {
      const res = await apiClient.post(`/conferences/${conference.slug}/register/`, {
        ticket_type_id: ticketId,
        phone_number: phone,
        gateway: gateway?.code,
        payment_method: gateway?.code === 'manual' ? 'bank_transfer' : method,
      })
      if (res.data.payment) {
        setMessage(res.data.payment.instructions)
        setStatus('waiting')
        startPolling(res.data.payment.internal_reference, isSw, res.data.payment)
      } else {
        setStatus('success')
        setMessage(isSw ? 'Umesajiliwa kwa mafanikio!' : 'Registered successfully!')
      }
    } catch (err) {
      setStatus('error')
      setMessage(err.response?.data?.detail || (isSw ? 'Imeshindikana.' : 'Something went wrong.'))
    }
  }

  if (status === 'waiting' || status === 'success' || status === 'error') {
    return <PaymentStatusBlock status={status} message={message} reference={reference} isSw={isSw} manual={manual} />
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <TicketPicker tickets={conference.ticket_types} selectedId={ticketId} onSelect={setTicketId} isSw={isSw} />

      {ticketId && (
        <>
          <GatewaySelect value={gateway} onChange={setGateway} isSw={isSw} />

          {(!gateway || gateway.requires_phone) && (
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                {isSw ? 'Namba ya Simu (Malipo)' : 'Phone Number (Payment)'}
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+255712345678"
                className="w-full border border-black/15 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
              />
            </div>
          )}
          <div className={`grid grid-cols-2 gap-2 ${gateway?.code === 'manual' ? 'hidden' : ''}`}>
            <button type="button" onClick={() => setMethod('mobile_money')} className={`text-sm font-bold py-2.5 rounded-md border ${method === 'mobile_money' ? 'bg-navy text-white border-navy' : 'border-black/15'}`}>
              📱 {isSw ? 'M-Pesa/Simu' : 'Mobile Money'}
            </button>
            <button type="button" onClick={() => setMethod('card')} className={`text-sm font-bold py-2.5 rounded-md border ${method === 'card' ? 'bg-navy text-white border-navy' : 'border-black/15'}`}>
              💳 {isSw ? 'Kadi' : 'Card'}
            </button>
          </div>
          <button type="submit" disabled={status === 'submitting' || !gateway} className="w-full bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm py-3.5 rounded-md disabled:opacity-60">
            {status === 'submitting' ? (isSw ? 'Inatuma...' : 'Submitting...') : isSw ? 'Jisajili na Lipia' : 'Register & Pay'}
          </button>
        </>
      )}
    </form>
  )
}

function BulkRegistrationForm({ conference, isSw }) {
  const [orgName, setOrgName] = useState('')
  const [phone, setPhone] = useState('')
  const [gateway, setGateway] = useState(null)
  const [method, setMethod] = useState('mobile_money')
  const [attendees, setAttendees] = useState([{ full_name: '', email: '', ticket_type_id: null }])
  const [formError, setFormError] = useState('')
  const { status, setStatus, message, setMessage, reference, manual, startPolling } = usePaymentPolling()

  function updateAttendee(index, field, value) {
    setFormError('')
    setAttendees((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)))
  }
  function addAttendee() {
    setAttendees((prev) => [...prev, { full_name: '', email: '', ticket_type_id: null }])
  }
  function removeAttendee(index) {
    setAttendees((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!attendees.length || attendees.some((attendee) => !attendee.ticket_type_id)) {
      setFormError(isSw ? 'Chagua tiketi kwa kila mshiriki kabla ya kuendelea.' : 'Please choose a ticket for every attendee before continuing.')
      return
    }
    setFormError('')
    setStatus('submitting')
    try {
      const res = await apiClient.post(`/conferences/${conference.slug}/register-bulk/`, {
        organization_name: orgName,
        phone_number: phone,
        gateway: gateway?.code,
        payment_method: gateway?.code === 'manual' ? 'bank_transfer' : method,
        attendees,
      })
      if (res.data.payment) {
        setMessage(res.data.payment.instructions)
        setStatus('waiting')
        startPolling(res.data.payment.internal_reference, isSw, res.data.payment)
      } else {
        setStatus('success')
        setMessage(isSw ? 'Washiriki wamesajiliwa!' : 'Attendees registered!')
      }
    } catch (err) {
      setStatus('error')
      setMessage(err.response?.data?.detail || (isSw ? 'Imeshindikana.' : 'Something went wrong.'))
    }
  }

  if (status === 'waiting' || status === 'success' || status === 'error') {
    return <PaymentStatusBlock status={status} message={message} reference={reference} isSw={isSw} manual={manual} />
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {formError && <p role="alert" className="rounded-md bg-terracotta/10 p-3 text-sm font-semibold text-terracotta">{formError}</p>}
      <div>
        <label className="block text-xs font-bold text-ink mb-1.5">
          {isSw ? 'Jina la Taasisi' : 'Organization Name'}
        </label>
        <input
          type="text"
          required
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          className="w-full border border-black/15 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
        />
      </div>

      <div className="space-y-4">
        {attendees.map((a, i) => (
          <div key={i} className="border border-black/10 rounded-lg p-4 relative">
            {attendees.length > 1 && (
              <button
                type="button"
                onClick={() => removeAttendee(i)}
                className="absolute top-2 right-2 text-ink-muted text-sm"
              >
                ✕
              </button>
            )}
            <div className="text-xs font-extrabold text-navy mb-2">
              {isSw ? `Mshiriki #${i + 1}` : `Attendee #${i + 1}`}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                placeholder={isSw ? 'Jina Kamili' : 'Full Name'}
                required
                value={a.full_name}
                onChange={(e) => updateAttendee(i, 'full_name', e.target.value)}
                className="border border-black/15 rounded-md px-3 py-2 text-sm"
              />
              <input
                placeholder="Email"
                type="email"
                required
                value={a.email}
                onChange={(e) => updateAttendee(i, 'email', e.target.value)}
                className="border border-black/15 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <TicketPicker
              tickets={conference.ticket_types}
              selectedId={a.ticket_type_id}
              onSelect={(id) => updateAttendee(i, 'ticket_type_id', id)}
              isSw={isSw}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addAttendee}
        className="text-sm font-bold text-navy border border-navy/30 rounded-md px-4 py-2.5 w-full"
      >
        + {isSw ? 'Ongeza Mshiriki' : 'Add Attendee'}
      </button>

      <GatewaySelect value={gateway} onChange={setGateway} isSw={isSw} />

      {(!gateway || gateway.requires_phone) && (
        <div>
          <label className="block text-xs font-bold text-ink mb-1.5">
            {isSw ? 'Namba ya Simu (Malipo)' : 'Phone Number (Payment)'}
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+255712345678"
            className="w-full border border-black/15 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
          />
        </div>
      )}

      <div className={`grid grid-cols-2 gap-2 ${gateway?.code === 'manual' ? 'hidden' : ''}`}>
        <button type="button" onClick={() => setMethod('mobile_money')} className={`text-sm font-bold py-2.5 rounded-md border ${method === 'mobile_money' ? 'bg-navy text-white border-navy' : 'border-black/15'}`}>
          📱 {isSw ? 'M-Pesa/Simu' : 'Mobile Money'}
        </button>
        <button type="button" onClick={() => setMethod('card')} className={`text-sm font-bold py-2.5 rounded-md border ${method === 'card' ? 'bg-navy text-white border-navy' : 'border-black/15'}`}>
          💳 {isSw ? 'Kadi' : 'Card'}
        </button>
      </div>

      <button type="submit" disabled={status === 'submitting' || !gateway} className="w-full bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm py-3.5 rounded-md disabled:opacity-60">
        {status === 'submitting' ? (isSw ? 'Inatuma...' : 'Submitting...') : isSw ? 'Sajili Wote na Lipia' : 'Register All & Pay'}
      </button>
    </form>
  )
}
