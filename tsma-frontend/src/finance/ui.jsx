import Icon from '../components/Icon.jsx'
import { formatMoney } from './format.js'

const TONE_CLASSES = {
  green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  amber: 'bg-amber-50 text-amber-900 border-amber-200',
  red: 'bg-red-50 text-red-800 border-red-200',
  blue: 'bg-sky-50 text-sky-800 border-sky-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
}

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100 disabled:text-slate-500'

export const primaryButtonClass =
  'rounded-lg bg-[#101d36] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50'

export const goldButtonClass =
  'rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50'

export const ghostButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'

export const dangerButtonClass =
  'rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50'

export function Badge({ tone = 'slate', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${TONE_CLASSES[tone] || TONE_CLASSES.slate}`}>
      {children}
    </span>
  )
}

export function Card({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div className="min-w-0">
            {title && <h3 className="text-lg font-bold text-slate-900">{title}</h3>}
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

const ACCENT_CLASSES = {
  green: 'border-l-emerald-500',
  amber: 'border-l-amber-500',
  red: 'border-l-red-500',
  blue: 'border-l-sky-500',
  slate: 'border-l-slate-300',
}

export function StatCard({ label, value, hint, tone = 'slate', onClick }) {
  const accent = ACCENT_CLASSES[tone] || ACCENT_CLASSES.slate
  const body = (
    <>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 break-words text-lg font-black text-slate-900 sm:text-xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </>
  )
  const shell = `rounded-xl border border-slate-200 border-l-4 bg-white p-4 text-left shadow-sm ${accent}`
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${shell} transition hover:-translate-y-0.5 hover:shadow-md`}>
        {body}
      </button>
    )
  }
  return <div className={shell}>{body}</div>
}

export function Notice({ tone = 'red', children, onDismiss }) {
  if (!children) return null
  return (
    <div role={tone === 'ok' ? 'status' : 'alert'} className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${TONE_CLASSES[tone] || TONE_CLASSES.red}`}>
      <Icon name={tone === 'ok' ? 'check' : 'alert'} className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 break-words">{children}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Funga ujumbe" className="shrink-0 opacity-60 hover:opacity-100">
          <Icon name="close" className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

/**
 * Hali za juu zinazorudiwa kila wakati: Inapakia / Hakuna data bado /
 * Hakuna rekodi / Ruhusa imekataliwa / Mfumo haupatikani kwa sasa.
 */
const STATE_COPY = {
  loading: { title: 'Inapakia...', note: 'Taarifa zinazotoka moja kwa moja kwenye Django API.', icon: 'chart', tone: 'text-slate-500' },
  empty: { title: 'Hakuna data bado', note: 'Ukiona rekodi zipo hapo juu, ondoa vichujilizi.', icon: 'dot', tone: 'text-slate-500' },
  missing: { title: 'Hakuna rekodi', note: 'Njia hii haina kitu cha kuonyesha.', icon: 'search', tone: 'text-slate-500' },
  denied: { title: 'Ruhusa imekataliwa', note: 'Sehemu hii inahitaji Treasurer/Accountant au Board Admin.', icon: 'lock', tone: 'text-red-700' },
  session: { title: 'Session imeisha muda', note: 'Ingia tena kwa uthibitisho wa hatua mbili.', icon: 'shield', tone: 'text-amber-800' },
  server: { title: 'Mfumo haupatikani kwa sasa', note: 'Hakuna muunganisho na seva, au seva imeshindwa kujibu.', icon: 'alert', tone: 'text-red-700' },
  request: { title: 'Ombi halikufanikiwa', note: '', icon: 'alert', tone: 'text-red-700' },
}

export function StateBlock({ kind = 'empty', message, action }) {
  const copy = STATE_COPY[kind] || STATE_COPY.empty
  // Kosa la `request` tayari lina ujumbe halisi wa seva; la hili ni jina lake tu.
  const title = message && kind !== 'request' ? message : copy.title
  const note = kind === 'request' ? message || '' : copy.note
  // Session iliyokwama haiwezi kurudiwa — lazima mtu aingie upya.
  const defaultAction =
    kind === 'session' ? (
      <a href="/finance/login" className={goldButtonClass}>
        Ingia tena
      </a>
    ) : null
  return (
    <div className="px-5 py-12 text-center">
      <Icon name={copy.icon} className={`mx-auto h-7 w-7 ${copy.tone}`} />
      <p className="mt-3 font-bold text-slate-800">{title}</p>
      {note && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{note}</p>}
      {(action || defaultAction) && <div className="mt-4 flex justify-center">{action || defaultAction}</div>}
    </div>
  )
}

export function Field({ label, hint, required, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export function Select({ value, onChange, options, placeholder, disabled, className = '' }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className={`${inputClass} ${className}`}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function Toggle({ label, checked, onChange, hint, disabled }) {
  return (
    <span className={`flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 ${disabled ? 'opacity-60' : ''}`}>
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} disabled={disabled} className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-800">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </span>
  )
}

export function Money({ value, currency, language, className = '' }) {
  return <span className={`whitespace-nowrap tabular-nums ${className}`}>{formatMoney(value, currency, language)}</span>
}

export function BarRow({ label, sub, value, ratio, tone = 'navy' }) {
  const width = Math.max(2, Math.min(100, Math.round((ratio || 0) * 100)))
  const fill = tone === 'amber' ? 'bg-amber-400' : tone === 'red' ? 'bg-red-500' : 'bg-[#101d36]'
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-semibold text-slate-800">{label}</span>
        <span className="shrink-0 tabular-nums text-slate-700">{value}</span>
      </div>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100" role="presentation">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

export function Pager({ page, count, pageLength, hasNext, hasPrev, busy, onNext, onPrev }) {
  const from = count === 0 ? 0 : (page - 1) * pageLength + 1
  const to = count === 0 ? 0 : Math.min(page * pageLength, count)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
      <span>{count > 0 ? `Rekodi ${from}–${to} kati ya ${count}` : 'Hakuna rekodi'} · ukurasa {page}</span>
      <span className="flex items-center gap-2">
        <button type="button" onClick={onPrev} disabled={!hasPrev || busy} className={ghostButtonClass}>
          Uliopita
        </button>
        <button type="button" onClick={onNext} disabled={!hasNext || busy} className={ghostButtonClass}>
          Ufuatao
        </button>
      </span>
    </div>
  )
}
