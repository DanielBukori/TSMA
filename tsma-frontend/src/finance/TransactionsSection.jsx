import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import {
  confirmManualPayment,
  fetchAvailableGateways,
  fetchFinanceTransactions,
  rejectManualPayment,
  reprocessPayment,
} from '../api/finance.js'
import { formatDateTime, formatMoney } from './format.js'
import { describeError, gatewayLabel, PURPOSE_OPTIONS, PURPOSE_LOOKUP, STATUS_OPTIONS, statusTone } from './options.js'
import {
  Badge,
  Card,
  Field,
  Notice,
  Pager,
  Select,
  StateBlock,
  Toggle,
  dangerButtonClass,
  ghostButtonClass,
  goldButtonClass,
  inputClass,
} from './ui.jsx'

const BLANK = { status: '', purpose: '', gateway: '', q: '', from: '', to: '', date_field: 'created_at', awaiting: '' }
const emptyOf = (extra = {}) => ({ ...BLANK, ...extra })
const COLUMNS = 7

export default function TransactionsSection({ seed, language, onChanged }) {
  const [draft, setDraft] = useState(() => emptyOf(seed?.filters || {}))
  const [query, setQuery] = useState(() => emptyOf(seed?.filters || {}))
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ count: 0, hasNext: false, hasPrev: false, pageLength: 0 })
  const [state, setState] = useState({ kind: 'ok' })
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [open, setOpen] = useState('')
  const [busy, setBusy] = useState({})
  const [rejecting, setRejecting] = useState('')
  const [reason, setReason] = useState('')
  const [gateways, setGateways] = useState([])
  const [errorOnly, setErrorOnly] = useState(Boolean(seed?.errorsOnly))

  // Muhtasari anaweza kutuma kichujilizi (mfano "yanasubiri uthibitisho").
  useEffect(() => {
    if (!seed) return
    const applied = emptyOf(seed.filters || {})
    setDraft(applied)
    setQuery(applied)
    setErrorOnly(Boolean(seed.errorsOnly))
    setPage(1)
  }, [seed])

  useEffect(() => {
    let cancelled = false
    fetchAvailableGateways()
      .then((res) => {
        if (!cancelled) setGateways(res.data?.gateways || [])
      })
      .catch(() => {
        // Orodha hii ni ya ziada: majina ya chini yanatoka choices za backend,
        // hivyo daftari linafanya kazi hata gateway ikiwa haitapatikani.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== ''))
      const res = await fetchFinanceTransactions({ ...params, page })
      const results = res.data?.results || []
      setRows(results)
      setMeta({
        count: res.data?.count || 0,
        hasNext: Boolean(res.data?.next),
        hasPrev: Boolean(res.data?.previous),
        pageLength: results.length,
      })
      setState({ kind: 'ok' })
    } catch (error) {
      setState(describeError(error))
      setRows([])
      setMeta({ count: 0, hasNext: false, hasPrev: false, pageLength: 0 })
    } finally {
      setLoading(false)
    }
  }, [query, page])

  useEffect(() => {
    load()
  }, [load])

  const visibleRows = useMemo(
    () => (errorOnly ? rows.filter((row) => Boolean(row.post_processing_error)) : rows),
    [rows, errorOnly],
  )

  // Gateway zilizowezeshwa sasa (labels za umma) + manual, ambayo haivami
  // kwenye orodha ya umma ikwa imezimwa lakini ina rekodi za zamani.
  const gatewayOptions = useMemo(() => {
    const known = new Map(Object.entries({ manual: 'Malipo ya Mkono (Manual/Bank Deposit)' }))
    gateways.forEach((item) => known.set(item.code, item.label))
    return [...known].map(([value, label]) => ({ value, label }))
  }, [gateways])

  function updateDraft(patch) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  function applyFilters(event) {
    if (event) event.preventDefault()
    setQuery({ ...draft })
    setPage(1)
    setNotice(null)
  }

  function resetFilters() {
    setDraft(emptyOf())
    setQuery(emptyOf())
    setPage(1)
    setErrorOnly(false)
  }

  async function runAction(row, action) {
    const key = `${row.internal_reference}:${action}`
    setBusy((current) => ({ ...current, [key]: true }))
    setNotice(null)
    try {
      const response =
        action === 'confirm'
          ? await confirmManualPayment(row.internal_reference)
          : action === 'reject'
            ? await rejectManualPayment(row.internal_reference, reason.trim())
            : await reprocessPayment(row.internal_reference)

      const updated = response.data?.transaction || response.data
      const leftovers = response.data?.post_processing_errors || []
      setRows((current) =>
        current.map((item) => (item.internal_reference === row.internal_reference ? { ...item, ...updated } : item)),
      )
      setRejecting('')
      setReason('')
      setOpen(row.internal_reference)
      setNotice({
        tone: leftovers.length ? 'amber' : 'green',
        text: actionText(action, row.internal_reference, leftovers),
      })
      onChanged()
      // Rekodi inaweza kuondoka kwenye kichujilizi baada ya kitendo
      // (mfano "yanasubiri"), hivyo orodha ipakiwe upya.
      await load()
    } catch (error) {
      // Ujumbe wa seva ndio unaosema ukweli (mfano "Sababu inahitajika.").
      setNotice({ tone: 'red', text: describeError(error).message })
    } finally {
      setBusy((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
    }
  }

  const showSkeleton = loading && rows.length === 0

  return (
    <div className="space-y-5">
      <Card
        title="Vichujio vya daftari"
        subtitle="Kila kichujilizi kitumwa kwa seva, hivyo majibu yanatokana na daftari zima — si ukurasa unaoonekana tu."
      >
        <form onSubmit={applyFilters} className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Hali (status)">
              <Select value={draft.status} onChange={(value) => updateDraft({ status: value })} options={STATUS_OPTIONS} placeholder="Hali zote" />
            </Field>
            <Field label="Madhumuni (purpose)">
              <Select value={draft.purpose} onChange={(value) => updateDraft({ purpose: value })} options={PURPOSE_OPTIONS} placeholder="Madhumuni yote" />
            </Field>
            <Field label="Gateway">
              <Select value={draft.gateway} onChange={(value) => updateDraft({ gateway: value })} options={gatewayOptions} placeholder="Gateways zote" />
            </Field>
            <Field label="Tafuta (q)" hint="Rejea, namba ya gateway, simu, barua pepe au jina">
              <input value={draft.q} onChange={(event) => updateDraft({ q: event.target.value })} placeholder="Mfano: TSMA-…" className={inputClass} />
            </Field>
            <Field label="Kuanzia (from)">
              <input type="date" value={draft.from} onChange={(event) => updateDraft({ from: event.target.value })} className={inputClass} />
            </Field>
            <Field label="Hadi (to)">
              <input type="date" value={draft.to} onChange={(event) => updateDraft({ to: event.target.value })} className={inputClass} />
            </Field>
            <Field label="Sifa ya tarehe" hint="Seva inalinganisha from/to na sifa hii">
              <Select
                value={draft.date_field}
                onChange={(value) => updateDraft({ date_field: value })}
                options={[
                  { value: 'created_at', label: 'Tarehe ya kuundwa' },
                  { value: 'paid_at', label: 'Tarehe ya kulipwa' },
                ]}
              />
            </Field>
            <div className="flex items-end">
              <Toggle
                label="Yanasubiri uthibitisho wa mkono tu"
                checked={draft.awaiting === '1'}
                onChange={(checked) => updateDraft({ awaiting: checked ? '1' : '' })}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className={goldButtonClass}>
              Tafuta
            </button>
            <button type="button" onClick={resetFilters} className={ghostButtonClass}>
              Ondoa vichujio
            </button>
            <span className="text-xs text-slate-500">Rekodi zilizopatikana: {meta.count}</span>
          </div>
        </form>
      </Card>

      <Card
        title="Daftari la malipo"
        subtitle={loading ? 'Inapakia...' : `Tarehe zinapangwa kwa ${query.date_field === 'paid_at' ? 'kulipwa' : 'kuundwa'}`}
        actions={
          <button type="button" onClick={load} disabled={loading} className={ghostButtonClass}>
            Onyesha upya
          </button>
        }
      >
        {notice && (
          <div className="px-5 pt-5">
            <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
              {notice.text}
            </Notice>
          </div>
        )}

        <label className="flex items-start gap-2 px-5 pt-4 text-xs text-slate-600">
          <input type="checkbox" checked={errorOnly} onChange={(event) => setErrorOnly(event.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-500" />
          <span>
            Onyesha tu rekodi zenye kosa la baada ya malipo{' '}
            <span className="text-slate-400">(uchujaji wa ukurasa huu pekee — seva haina kichujilizi cha makosa hayo)</span>
          </span>
        </label>

        {showSkeleton ? (
          <StateBlock kind="loading" />
        ) : state.kind !== 'ok' ? (
          <StateBlock
            kind={state.kind}
            message={state.kind === 'request' ? state.message : undefined}
            action={
              <button type="button" onClick={load} className={ghostButtonClass}>
                Jaribu tena
              </button>
            }
          />
        ) : visibleRows.length === 0 ? (
          <StateBlock
            kind={meta.count === 0 ? 'missing' : 'empty'}
            message={errorOnly && rows.length > 0 ? 'Hakuna kosa la baada ya malipo kwenye ukurasa huu' : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-sm">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-bold">Rejea</th>
                  <th className="px-4 py-3 font-bold">Mlipa</th>
                  <th className="px-4 py-3 text-right font-bold">Kiasi</th>
                  <th className="px-4 py-3 font-bold">Hali</th>
                  <th className="px-4 py-3 font-bold">Madhumuni</th>
                  <th className="px-4 py-3 font-bold">Gateway</th>
                  <th className="px-4 py-3 font-bold">Vitendo</th>
                </tr>
              </thead>
              <tbody className={loading ? 'opacity-60' : ''}>
                {visibleRows.map((row) => {
                  const key = row.internal_reference
                  const isBusy = Object.keys(busy).some((item) => item.startsWith(`${key}:`))
                  const isOpen = open === key
                  // Seva hurudisha 400 kama SUCCESS itakataliwa, hivyo kitendo
                  // cha kukataa kinapatikana kwa hali ambazo bado hazijakamilika.
                  const canReject = row.status !== 'success' && row.status !== 'failed' && row.status !== 'cancelled'
                  const canReprocess = row.status === 'success' && Boolean(row.post_processing_error)
                  return (
                    <Fragment key={key}>
                      <tr className={`border-b border-slate-100 align-top ${row.post_processing_error ? 'bg-red-50/60' : ''}`}>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => setOpen(isOpen ? '' : key)} className="font-bold text-slate-900 underline-offset-2 hover:underline">
                            {key}
                          </button>
                          <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(row.created_at, language) || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{row.payer_name || 'Mlipa asiye na akaunti'}</p>
                          <p className="text-xs text-slate-500">{row.payer_email || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-black text-slate-900">{formatMoney(row.amount, row.currency, language)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={statusTone(row.status)}>
                            {row.status_display || STATUS_OPTIONS.find((option) => option.value === row.status)?.label || row.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{row.purpose_display || PURPOSE_LOOKUP[row.purpose] || row.purpose || '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{gatewayLabel(row.gateway, gateways)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {row.can_confirm && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => runAction(row, 'confirm')}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {busy[`${key}:confirm`] ? 'Inathibitisha...' : 'Thibitisha'}
                              </button>
                            )}
                            {canReject && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  setOpen(key)
                                  setRejecting(rejecting === key ? '' : key)
                                  setReason('')
                                }}
                                className={`${dangerButtonClass} px-3 py-2 text-xs`}
                              >
                                Kane
                              </button>
                            )}
                            {canReprocess && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => runAction(row, 'reprocess')}
                                className={`${ghostButtonClass} px-3 py-2 text-xs`}
                              >
                                {busy[`${key}:reprocess`] ? 'Inarudia...' : 'Rudia hatua za baada ya malipo'}
                              </button>
                            )}
                            {!row.can_confirm && !canReject && !canReprocess && (
                              <span className="text-xs text-slate-400">Hakuna kitendo</span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {rejecting === key && (
                        <tr className="border-b border-red-100 bg-red-50/60">
                          <td colSpan={COLUMNS} className="px-4 py-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                              <Field label="Sababu ya kukataa (reason)" required hint="Seva inakataa ombi bila sababu; sababu huhifadhiwa kwenye rekodi" className="flex-1">
                                <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Mfano: uhamisho haukufika kwenye akaunti" className={inputClass} />
                              </Field>
                              <button type="button" disabled={isBusy || !reason.trim()} onClick={() => runAction(row, 'reject')} className={`${dangerButtonClass} font-bold`}>
                                {busy[`${key}:reject`] ? 'Inakataa...' : 'Kataa malipo'}
                              </button>
                              <button type="button" onClick={() => { setRejecting(''); setReason('') }} className={ghostButtonClass}>
                                Ghairi
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {isOpen && (
                        <tr className="border-b border-slate-100 bg-slate-50/70">
                          <td colSpan={COLUMNS} className="px-4 py-4">
                            <dl className="grid gap-x-6 gap-y-3 text-xs sm:grid-cols-2 xl:grid-cols-3">
                              {[
                                ['Namba ya msingi', row.id],
                                ['Gateway order id', row.gateway_order_id],
                                ['Gateway transaction id', row.gateway_transaction_id],
                                ['Njia ya malipo', row.payment_method],
                                ['Namba ya simu', row.phone_number],
                                ['Sarafu', row.currency],
                                ['Imeundwa', formatDateTime(row.created_at, language)],
                                ['Ilipwa', formatDateTime(row.paid_at, language)],
                                ['Mwisho wa malipo', formatDateTime(row.expires_at, language)],
                                ['Sababu ya kushindwa', row.failure_reason],
                              ].map(([label, value]) => (
                                <div key={label}>
                                  <dt className="font-bold uppercase tracking-wider text-slate-500">{label}</dt>
                                  <dd className="mt-0.5 break-words text-slate-800">{value || '—'}</dd>
                                </div>
                              ))}
                              <div className="sm:col-span-2 xl:col-span-3">
                                <dt className="font-bold uppercase tracking-wider text-slate-500">Kosa la baada ya malipo</dt>
                                <dd className={`mt-0.5 break-words ${row.post_processing_error ? 'text-red-700' : 'text-slate-800'}`}>
                                  {row.post_processing_error || 'Hakuna kosa'}
                                </dd>
                              </div>
                            </dl>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {state.kind === 'ok' && rows.length > 0 && (
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
        )}
      </Card>
    </div>
  )
}

function actionText(action, reference, leftovers) {
  if (action === 'confirm') {
    return leftovers.length
      ? `Malipo ${reference} yamefunguliwa lakini hatua za baada ya malipo zilikwama: ${leftovers.join(' · ')}`
      : `Malipo ${reference} yamethibitishwa — uanachama, risiti na kiti cha conference vimeendeshwa.`
  }
  if (action === 'reject') return `Malipo ${reference} yamewekwa hali Imeshindwa.`
  return leftovers.length
    ? `Hatua za baada ya malipo zimejaribiwa tena kwa ${reference}, lakini bado zina makosa: ${leftovers.join(' · ')}`
    : `Hatua za baada ya malipo zimekamilika kwa ${reference}.`
}
