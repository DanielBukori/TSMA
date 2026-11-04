import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createConference,
  createTicketType,
  deleteConference,
  deleteTicketType,
  fetchConferenceAnalytics,
  fetchConferences,
  fetchTicketTypes,
  updateConference,
  updateTicketType,
} from '../api/finance.js'
import { formatDate, formatMoney, toInputDateTime, toIsoDateTime } from './format.js'
import { describeError, serverMessage } from './options.js'
import {
  Badge,
  Card,
  Field,
  Notice,
  Pager,
  StateBlock,
  Toggle,
  dangerButtonClass,
  ghostButtonClass,
  goldButtonClass,
  inputClass,
  primaryButtonClass,
} from './ui.jsx'

const CONFERENCE_BLANK = {
  title: '',
  description: '',
  theme: '',
  venue_name: '',
  city: '',
  country: 'Tanzania',
  physical_address: '',
  start_date: '',
  end_date: '',
  registration_deadline: '',
  is_published: false,
  registration_open: true,
  banner_image: null,
}

const TICKET_BLANK = {
  name: '',
  description: '',
  price: '',
  currency: 'TZS',
  max_quantity: '',
  sales_start: '',
  sales_end: '',
  is_active: true,
  display_order: '0',
}

// `banner_image` ni URL kwenye jawabu, lakapa ni File; fomu inahifadhi File
// pekee, hivyo thamani ya URL huondolewa kabla ya kuandika.
function conferenceToForm(item) {
  return {
    ...CONFERENCE_BLANK,
    ...item,
    registration_deadline: toInputDateTime(item.registration_deadline),
    banner_image: null,
  }
}

function ticketToForm(item) {
  return {
    ...TICKET_BLANK,
    ...item,
    price: item.price ?? '',
    max_quantity: item.max_quantity ?? '',
    sales_start: toInputDateTime(item.sales_start),
    sales_end: toInputDateTime(item.sales_end),
    is_active: Boolean(item.is_active),
    display_order: String(item.display_order ?? 0),
  }
}

function conferencePayload(source) {
  return {
    title: (source.title || '').trim(),
    description: source.description || '',
    theme: source.theme || '',
    venue_name: source.venue_name || '',
    city: source.city || '',
    country: source.country || '',
    physical_address: source.physical_address || '',
    start_date: source.start_date || null,
    end_date: source.end_date || null,
    registration_deadline: toIsoDateTime(source.registration_deadline),
    is_published: Boolean(source.is_published),
    registration_open: Boolean(source.registration_open),
  }
}

// Vigezo vya `datetime-local` huja kwa nambari/tarehe, si null; FormData
// inahitaji kila thamani iwe kamba.
function conferenceFormData(payload, file) {
  const data = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    data.append(key, value === null || value === undefined ? '' : String(value))
  })
  data.append('banner_image', file)
  return data
}

export default function ConferencesSection({ language }) {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ count: 0, hasNext: false, hasPrev: false, pageLength: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState({ kind: 'ok' })

  const [selectedId, setSelectedId] = useState(null)
  const selectedIdRef = useRef(null)

  const [form, setForm] = useState(CONFERENCE_BLANK)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const [tickets, setTickets] = useState([])
  const [ticketsState, setTicketsState] = useState({ kind: 'ok' })
  const [ticketsLoading, setTicketsLoading] = useState(true)
  const [ticketForm, setTicketForm] = useState(null)
  const [ticketSaving, setTicketSaving] = useState(false)
  const [ticketNotice, setTicketNotice] = useState(null)

  const [analytics, setAnalytics] = useState(null)
  const [analyticsState, setAnalyticsState] = useState({ kind: 'ok' })

  const choose = useCallback((item) => {
    const next = item?.id ?? null
    selectedIdRef.current = next
    setSelectedId(next)
    setForm(item ? conferenceToForm(item) : CONFERENCE_BLANK)
    setTicketForm(null)
    setConfirmingDelete(false)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchConferences(page)
      const results = res.data?.results || []
      setItems(results)
      setMeta({
        count: res.data?.count || 0,
        hasNext: Boolean(res.data?.next),
        hasPrev: Boolean(res.data?.previous),
        pageLength: results.length,
      })
      setState({ kind: 'ok' })
      const stillThere = results.find((item) => item.id === selectedIdRef.current)
      if (selectedIdRef.current && !stillThere) choose(null)
      else if (stillThere) choose(stillThere)
    } catch (error) {
      setState(describeError(error))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [page, choose])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    setTicketsLoading(true)
    fetchTicketTypes()
      .then((all) => {
        if (!cancelled) {
          setTickets(all)
          setTicketsState({ kind: 'ok' })
        }
      })
      .catch((error) => {
        if (!cancelled) setTicketsState(describeError(error))
      })
      .finally(() => {
        if (!cancelled) setTicketsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selected = useMemo(() => items.find((item) => item.id === selectedId) || null, [items, selectedId])
  const selectedTickets = useMemo(
    () => tickets.filter((ticket) => Number(ticket.conference) === Number(selectedId)),
    [tickets, selectedId],
  )

  useEffect(() => {
    const slug = selected?.slug
    if (!slug) {
      setAnalytics(null)
      setAnalyticsState({ kind: 'ok' })
      return undefined
    }
    let cancelled = false
    setAnalyticsState({ kind: 'loading' })
    fetchConferenceAnalytics(slug)
      .then((res) => {
        if (cancelled) return
        setAnalytics(res.data)
        setAnalyticsState({ kind: 'ok' })
      })
      .catch((error) => {
        if (cancelled) return
        setAnalytics(null)
        setAnalyticsState(describeError(error))
      })
    return () => {
      cancelled = true
    }
  }, [selected?.slug])

  async function saveConference(event) {
    event.preventDefault()
    if (!selected) return
    setSaving(true)
    setNotice(null)
    try {
      const payload = conferencePayload(form)
      const body = form.banner_image instanceof File ? conferenceFormData(payload, form.banner_image) : payload
      const response = await updateConference(selected.id, body)
      const saved = response.data
      setItems((current) => current.map((item) => (item.id === saved.id ? { ...item, ...saved } : item)))
      setForm(conferenceToForm(saved))
      setNotice({ tone: 'green', text: 'Taarifa za mkutano zimehifadhiwa.' })
    } catch (error) {
      setNotice({ tone: 'red', text: serverMessage(error) || describeError(error).message })
    } finally {
      setSaving(false)
    }
  }

  async function createNewConference(event) {
    event.preventDefault()
    setSaving(true)
    setNotice(null)
    try {
      const payload = conferencePayload(form)
      const body = form.banner_image instanceof File ? conferenceFormData(payload, form.banner_image) : payload
      const response = await createConference(body)
      // Slug hutengenezwa na backend kutoka kwenye title.
      choose(response.data)
      setNotice({ tone: 'green', text: `Mkutano «${response.data.title}» umeundwa.` })
      await load()
    } catch (error) {
      setNotice({ tone: 'red', text: serverMessage(error) || describeError(error).message })
    } finally {
      setSaving(false)
    }
  }

  async function removeConference() {
    if (!selected) return
    setSaving(true)
    setNotice(null)
    try {
      await deleteConference(selected.id)
      setTickets((current) => current.filter((ticket) => Number(ticket.conference) !== Number(selected.id)))
      choose(null)
      setNotice({ tone: 'green', text: 'Mkutano umefutwa kwenye mfumo.' })
      await load()
    } catch (error) {
      setNotice({ tone: 'red', text: describeError(error).message })
    } finally {
      setConfirmingDelete(false)
      setSaving(false)
    }
  }

  async function saveTicket(event) {
    event.preventDefault()
    if (!selected || !ticketForm) return
    setTicketSaving(true)
    setTicketNotice(null)
    try {
      const source = ticketForm.data
      const payload = {
        conference: selected.id,
        name: source.name.trim(),
        description: source.description,
        price: source.price === '' ? null : String(source.price),
        currency: source.currency || 'TZS',
        max_quantity: source.max_quantity === '' ? null : Number(source.max_quantity),
        sales_start: toIsoDateTime(source.sales_start),
        sales_end: toIsoDateTime(source.sales_end),
        is_active: Boolean(source.is_active),
        display_order: Number(source.display_order) || 0,
      }
      const response = ticketForm.id ? await updateTicketType(ticketForm.id, payload) : await createTicketType(payload)
      const saved = response.data
      setTickets((current) =>
        current.some((item) => item.id === saved.id)
          ? current.map((item) => (item.id === saved.id ? { ...item, ...saved } : item))
          : [...current, saved],
      )
      setTicketForm(null)
      setTicketNotice({ tone: 'green', text: `Tiketi «${saved.name}» imehifadhiwa.` })
    } catch (error) {
      setTicketNotice({ tone: 'red', text: serverMessage(error) || describeError(error).message })
    } finally {
      setTicketSaving(false)
    }
  }

  async function removeTicket(ticket) {
    setTicketSaving(true)
    setTicketNotice(null)
    try {
      await deleteTicketType(ticket.id)
      setTickets((current) => current.filter((item) => item.id !== ticket.id))
      setTicketNotice({ tone: 'green', text: 'Aina ya tiketi imefutwa.' })
    } catch (error) {
      setTicketNotice({ tone: 'red', text: describeError(error).message })
    } finally {
      setTicketSaving(false)
    }
  }

  const showSkeleton = loading && items.length === 0

  return (
    <div className="space-y-5">
      <Card
        title="Orodha ya mikutano"
        subtitle="Chagua mkutano kuuhariri, kuona tiketi zake na takwimu za usajili."
        actions={
          <>
            <button type="button" onClick={() => choose(null)} disabled={saving} className={goldButtonClass}>
              + Mkutano mpya
            </button>
            <button type="button" onClick={load} disabled={loading} className={ghostButtonClass}>
              Onyesha upya
            </button>
          </>
        }
      >
        {showSkeleton ? (
          <StateBlock kind="loading" />
        ) : state.kind !== 'ok' ? (
          <StateBlock kind={state.kind} message={state.kind === 'request' ? state.message : undefined} />
        ) : items.length === 0 ? (
          <StateBlock kind="empty" message="Hakuna mikutano iliyoundwa bado" />
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => choose(item)}
                    className={`flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50 ${item.id === selectedId ? 'bg-[#101d36]/5 ring-1 ring-inset ring-[#101d36]/25' : ''}`}
                  >
                    <span className="min-w-0">
                      <span className="block font-bold text-slate-900">{item.title}</span>
                      <span className="block text-xs text-slate-500">
                        {formatDate(item.start_date, language) || '—'} → {formatDate(item.end_date, language) || '—'} ·{' '}
                        {item.venue_name || 'ukumbi haujawekwa'} · {item.city || '—'}
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      <Badge tone={item.is_published ? 'green' : 'slate'}>{item.is_published ? 'Imechapishwa' : 'Haijachapishwa'}</Badge>
                      <Badge tone={item.registration_open ? 'amber' : 'slate'}>{item.registration_open ? 'Usajili uko wazi' : 'Usajili umefungwa'}</Badge>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Pager
              page={page}
              count={meta.count}
              pageLength={meta.pageLength}
              hasNext={meta.hasNext}
              hasPrev={meta.hasPrev}
              busy={loading}
              onNext={() => setPage((current) => current + 1)}
              onPrev={() => setPage((current) => Math.max(1, current - 1))}
            />
          </>
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card
          title={selected ? `Hariri: ${selected.title}` : 'Mkutano mpya'}
          subtitle={selected?.slug ? `Slug (haibadilikiwe): ${selected.slug}` : 'Unda mkutano — slug hutengenezwa na backend kutoka kwenye jina.'}
        >
          {showSkeleton ? (
            <StateBlock kind="loading" />
          ) : (
            <ConferenceForm
              form={form}
              setForm={setForm}
              onSubmit={selected ? saveConference : createNewConference}
              saving={saving}
              notice={notice}
              dismissNotice={() => setNotice(null)}
              selected={selected}
              confirmingDelete={confirmingDelete}
              onAskDelete={() => setConfirmingDelete(true)}
              onCancelDelete={() => setConfirmingDelete(false)}
              onConfirmDelete={removeConference}
            />
          )}
        </Card>

        <div className="space-y-5">
          <Card title="Takwimu za usajili" subtitle={selected ? `Rekodi halisi za «${selected.title}»` : 'Chagua mkutano kuona takwimu zake.'}>
            {!selected ? (
              <StateBlock kind="empty" message="Hakuna mkutano uliochaguliwa" />
            ) : analyticsState.kind === 'loading' ? (
              <StateBlock kind="loading" />
            ) : analyticsState.kind !== 'ok' ? (
              <StateBlock kind={analyticsState.kind} message={analyticsState.kind === 'request' ? analyticsState.message : undefined} />
            ) : !analytics ? (
              <StateBlock kind="empty" />
            ) : (
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['Walisajiliwa', analytics.total_registered],
                    ['Waliofanya malipo', analytics.total_paid],
                    ['Waliofika mlango', analytics.total_checked_in],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                      <p className="text-2xl font-black tabular-nums text-slate-900">{Number(value) || 0}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
                {(analytics.by_ticket_type || []).length === 0 ? (
                  <p className="text-sm text-slate-500">Hakuna data bado — hakuna tiketi iliyolipwa kwa mkutano huu.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {analytics.by_ticket_type.map((row) => (
                      <li key={row.ticket_type__name} className="flex items-center justify-between gap-3 py-2">
                        <span className="text-slate-700">{row.ticket_type__name || 'tiketi isiyo na jina'}</span>
                        <span className="font-bold tabular-nums text-slate-900">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>

          <Card
            title="Aina za tiketi"
            subtitle="Bei, sarafu, ukomo wa viti na dirisha la mauzo. Kubadilisha bei kunaathiri ukurasa wa usajili mara moja."
            actions={
              selected ? (
                <button type="button" onClick={() => setTicketForm({ id: null, data: { ...TICKET_BLANK } })} disabled={ticketSaving} className={goldButtonClass}>
                  + Tiketi mpya
                </button>
              ) : null
            }
          >
            <div className="space-y-3 p-5">
              {ticketNotice && <Notice tone={ticketNotice.tone} onDismiss={() => setTicketNotice(null)}>{ticketNotice.text}</Notice>}
              {!selected ? (
                <StateBlock kind="empty" message="Chagua mkutano kwanza" />
              ) : ticketsLoading ? (
                <StateBlock kind="loading" />
              ) : ticketsState.kind !== 'ok' ? (
                <StateBlock kind={ticketsState.kind} message={ticketsState.kind === 'request' ? ticketsState.message : undefined} />
              ) : selectedTickets.length === 0 && !ticketForm ? (
                <StateBlock kind="empty" message="Hakuna tiketi zilizowekwa kwa mkutano huu" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {selectedTickets.map((ticket) => (
                    <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">{ticket.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatMoney(ticket.price, ticket.currency, language)} ·{' '}
                          {ticket.max_quantity ? `ukomo ${ticket.max_quantity}` : 'hakuna ukomo'} · zimeuza {ticket.sold_count ?? 0}
                        </p>
                        {(ticket.sales_start || ticket.sales_end) && (
                          <p className="text-[11px] text-slate-500">
                            Dirisha la mauzo: {formatDate(ticket.sales_start, language) || 'wazi'} → {formatDate(ticket.sales_end, language) || 'bila mwisho'}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={ticket.is_active ? 'green' : 'slate'}>{ticket.is_active ? 'Inauzwa' : 'Haipo hewani'}</Badge>
                        <button type="button" onClick={() => setTicketForm({ id: ticket.id, data: ticketToForm(ticket) })} disabled={ticketSaving} className={ghostButtonClass}>
                          Hariri
                        </button>
                        <button type="button" onClick={() => removeTicket(ticket)} disabled={ticketSaving} className={dangerButtonClass}>
                          Futa
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {selected && ticketForm && <TicketForm ticketForm={ticketForm} setTicketForm={setTicketForm} onSave={saveTicket} onCancel={() => setTicketForm(null)} saving={ticketSaving} />}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ConferenceForm({ form, setForm, onSubmit, saving, notice, dismissNotice, selected, confirmingDelete, onAskDelete, onCancelDelete, onConfirmDelete }) {
  const update = (patch) => setForm((current) => ({ ...current, ...patch }))

  return (
    <form onSubmit={onSubmit} className="space-y-4 p-5">
      {notice && (
        <Notice tone={notice.tone} onDismiss={dismissNotice}>
          {notice.text}
        </Notice>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Jina la mkutano (title)" required className="sm:col-span-2">
          <input value={form.title} onChange={(event) => update({ title: event.target.value })} required className={inputClass} />
        </Field>
        <Field label="Kaulimbiu (theme)" className="sm:col-span-2">
          <input value={form.theme} onChange={(event) => update({ theme: event.target.value })} className={inputClass} />
        </Field>
        <Field label="Maelezo (description)" required className="sm:col-span-2">
          <textarea rows={4} value={form.description} onChange={(event) => update({ description: event.target.value })} required className={inputClass} />
        </Field>
        <Field label="Ukumbi (venue_name)" required>
          <input value={form.venue_name} onChange={(event) => update({ venue_name: event.target.value })} required className={inputClass} />
        </Field>
        <Field label="Jiji (city)" required>
          <input value={form.city} onChange={(event) => update({ city: event.target.value })} required className={inputClass} />
        </Field>
        <Field label="Nchi (country)">
          <input value={form.country} onChange={(event) => update({ country: event.target.value })} className={inputClass} />
        </Field>
        <Field label="Anwani (physical_address)">
          <input value={form.physical_address} onChange={(event) => update({ physical_address: event.target.value })} className={inputClass} />
        </Field>
        <Field label="Tarehe ya kuanza (start_date)" required>
          <input type="date" value={form.start_date} onChange={(event) => update({ start_date: event.target.value })} required className={inputClass} />
        </Field>
        <Field label="Tarehe ya kumaliza (end_date)" required>
          <input type="date" value={form.end_date} onChange={(event) => update({ end_date: event.target.value })} required className={inputClass} />
        </Field>
        <Field label="Mwisho wa usajili (registration_deadline)" className="sm:col-span-2" hint="Saa za mtu binafsi; zinatumwa kwa seva kama UTC">
          <input type="datetime-local" value={form.registration_deadline} onChange={(event) => update({ registration_deadline: event.target.value })} className={inputClass} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle label="Imechapishwa (is_published)" hint="Ikizimwa, mkutano hauonekani kwa umma" checked={form.is_published} onChange={(checked) => update({ is_published: checked })} />
        <Toggle label="Usajili uko wazi (registration_open)" hint="Wanachama hawawezi kujisajili ukizima" checked={form.registration_open} onChange={(checked) => update({ registration_open: checked })} />
      </div>

      <Field label="Picha ya banner (banner_image)" hint="Acha tupu kama hutaki kubadilisha picha iliyopo">
        <input
          type="file"
          accept="image/*"
          onChange={(event) => update({ banner_image: event.target.files?.[0] || null })}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2"
        />
      </Field>
      {selected?.banner_image && (
        <p className="text-xs text-slate-500">
          Picha iliyopo:{' '}
          <a href={selected.banner_image} target="_blank" rel="noreferrer" className="font-semibold underline">
            fungua picha
          </a>
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving ? 'Inahifadhi...' : selected ? 'Hifadhi mabadiliko' : 'Unda mkutano'}
        </button>
        {selected && (
          <button type="button" onClick={onAskDelete} disabled={saving} className={dangerButtonClass}>
            Futa mkutano
          </button>
        )}
      </div>

      {selected && !confirmingDelete && (
        <p className="text-xs text-slate-400">Kufuta mkutano ni kitendo cha mwisho — tiketi zake huondoka pamoja nalo.</p>
      )}

      {selected && confirmingDelete && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-800">Thibitisha kufuta</p>
          <p className="mt-1 text-sm text-red-800">
            «{selected.title}» itaondolewa kabisa kwenye mfumo pamoja na aina zake za tiketi. Kitendo hiki hakiwezi kurudishwa.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onConfirmDelete} disabled={saving} className={`${dangerButtonClass} font-bold`}>
              {saving ? 'Inafuta...' : 'Ndiyo, futa mkutano huu'}
            </button>
            <button type="button" onClick={onCancelDelete} disabled={saving} className={ghostButtonClass}>
              Rudi nyuma
            </button>
          </div>
        </div>
      )}
    </form>
  )
}

function TicketForm({ ticketForm, setTicketForm, onSave, onCancel, saving }) {
  const update = (patch) => setTicketForm((current) => ({ ...current, data: { ...current.data, ...patch } }))

  return (
    <form onSubmit={onSave} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-800">{ticketForm.id ? 'Hariri tiketi' : 'Tiketi mpya'}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Jina la tiketi (name)" required>
          <input value={ticketForm.data.name} onChange={(event) => update({ name: event.target.value })} required className={inputClass} />
        </Field>
        <Field label="Bei (price)" required>
          <input type="number" min="0" step="0.01" value={ticketForm.data.price} onChange={(event) => update({ price: event.target.value })} required className={inputClass} />
        </Field>
        <Field label="Sarafu (currency)" required>
          <input value={ticketForm.data.currency} onChange={(event) => update({ currency: event.target.value.toUpperCase().slice(0, 3) })} required className={inputClass} />
        </Field>
        <Field label="Idadi ya juu (max_quantity)" hint="Acha wazi = hakuna ukomo">
          <input type="number" min="0" step="1" value={ticketForm.data.max_quantity} onChange={(event) => update({ max_quantity: event.target.value })} className={inputClass} />
        </Field>
        <Field label="Mauzo yanaanza (sales_start)">
          <input type="datetime-local" value={ticketForm.data.sales_start} onChange={(event) => update({ sales_start: event.target.value })} className={inputClass} />
        </Field>
        <Field label="Mauzo yanaisha (sales_end)">
          <input type="datetime-local" value={ticketForm.data.sales_end} onChange={(event) => update({ sales_end: event.target.value })} className={inputClass} />
        </Field>
        <Field label="Mpangilio (display_order)">
          <input type="number" min="0" step="1" value={ticketForm.data.display_order} onChange={(event) => update({ display_order: event.target.value })} className={inputClass} />
        </Field>
        <Field label="Maelezo (description)">
          <input value={ticketForm.data.description} onChange={(event) => update({ description: event.target.value })} className={inputClass} />
        </Field>
      </div>
      <Toggle label="Inauzwa (is_active)" checked={ticketForm.data.is_active} onChange={(checked) => update({ is_active: checked })} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving ? 'Inahifadhi...' : 'Hifadhi tiketi'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className={ghostButtonClass}>
          Ghairi
        </button>
      </div>
    </form>
  )
}
