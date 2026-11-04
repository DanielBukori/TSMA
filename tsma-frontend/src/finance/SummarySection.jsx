import { formatMoney, formatMonth, toAmount } from './format.js'
import { gatewayLabel, PURPOSE_LOOKUP } from './options.js'
import { BarRow, Card, Notice, StateBlock, StatCard, goldButtonClass } from './ui.jsx'

function Trend({ months, currency, language }) {
  // Backend anarudisha mwezi mpya kwanza (order_by -month); grafu inahitaji
  // mpangilio wa muda, hivyo tunageuza orodha.
  const ordered = [...months].reverse()
  const max = Math.max(...ordered.map((row) => toAmount(row.total)), 0)
  if (ordered.length === 0 || max <= 0) {
    return <StateBlock kind="empty" message="Hakuna data bado" />
  }
  const unit = 100 / ordered.length
  return (
    <div className="p-5">
      <svg viewBox="0 0 100 42" className="h-32 w-full" role="img" aria-label="Mwenendo wa mapato kwa mwezi">
        {ordered.map((row, index) => {
          const ratio = toAmount(row.total) / max
          const height = Math.max(1.5, ratio * 36)
          return (
            <rect key={row.month || `m${index}`} x={index * unit + unit * 0.18} y={38 - height} width={unit * 0.64} height={height} fill="#101d36" rx="0.6">
              <title>{`${formatMonth(row.month, language)} — ${formatMoney(row.total, currency, language)} · malipo ${row.count}`}</title>
            </rect>
          )
        })}
        <line x1="0" y1="38" x2="100" y2="38" stroke="#e2e8f0" strokeWidth="0.6" />
      </svg>
      <div className="mt-2 flex gap-1">
        {ordered.map((row, index) => (
          <span key={row.month || `l${index}`} className="min-w-0 flex-1 truncate text-center text-[10px] text-slate-500">
            {formatMonth(row.month, language) || '—'}
          </span>
        ))}
      </div>
      <p className="mt-1 text-center text-[10px] text-slate-400">Kila utepe ni mwezi mmoja; urefu wake ni jumla iliyokusanywa mwezi huo.</p>
    </div>
  )
}

function Breakdown({ title, subtitle, rows, currency, language, nameOf }) {
  const sorted = [...rows].sort((a, b) => toAmount(b.total) - toAmount(a.total))
  const max = Math.max(...sorted.map((row) => toAmount(row.total)), 0)
  return (
    <Card title={title} subtitle={subtitle}>
      {sorted.length === 0 ? (
        <StateBlock kind="empty" message="Hakuna data bado" />
      ) : (
        <div className="space-y-4 p-5">
          {sorted.map((row) => (
            <BarRow
              key={row.purpose || row.gateway}
              label={nameOf(row)}
              sub={`Malipo ${row.count}`}
              value={formatMoney(row.total, currency, language)}
              ratio={max > 0 ? toAmount(row.total) / max : 0}
            />
          ))}
        </div>
      )}
    </Card>
  )
}

export default function SummarySection({ summary, state, language, availableGateways, onOpenTransactions, onOpenSettings, onRetry }) {
  if (state.kind === 'loading' && !summary) {
    return <Card><StateBlock kind="loading" /></Card>
  }
  if (state.kind !== 'ok' && !summary) {
    return (
      <Card>
        <StateBlock
          kind={state.kind}
          message={state.message}
          action={state.kind === 'server' || state.kind === 'request' ? (
            <button type="button" onClick={onRetry} className={goldButtonClass}>Jaribu tena</button>
          ) : null}
        />
      </Card>
    )
  }
  if (!summary) return null

  const currency = summary.currency || 'TZS'
  const awaiting = summary.awaiting_confirmation || { count: 0, amount: '0.00' }
  const failures = Number(summary.post_processing_failures) || 0

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Yamekusanywa Jumla" value={formatMoney(summary.collected_total, currency, language)} hint={`Malipo yaliyofanikiwa: ${summary.successful_count ?? 0}`} tone="green" />
        <StatCard label="Mwezi Huu" value={formatMoney(summary.collected_this_month, currency, language)} hint="Kuanzia tarehe 1 ya mwezi" tone="blue" />
        <StatCard label="Siku 7 Zilizopita" value={formatMoney(summary.collected_last_7_days, currency, language)} hint="Kuanzia wiki moja iliyopita" tone="blue" />
        <StatCard
          label="Yanasubiri Uthibitisho"
          value={formatMoney(awaiting.amount, currency, language)}
          hint={`Malipo ya mkono ${awaiting.count}`}
          tone="amber"
          onClick={awaiting.count > 0 ? () => onOpenTransactions({ awaiting: '1', status: '', purpose: '', gateway: '', q: '', from: '', to: '' }) : undefined}
        />
        <StatCard
          label="Yameshindwa"
          value={String(summary.failed_count ?? 0)}
          hint="Rekodi za hali Imeshindwa"
          tone="red"
          onClick={summary.failed_count > 0 ? () => onOpenTransactions({ awaiting: '', status: 'failed', purpose: '', gateway: '', q: '', from: '', to: '' }) : undefined}
        />
      </div>

      {awaiting.count > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-wider text-amber-800">Inahitaji hatua</p>
              <p className="mt-1 text-lg font-bold text-amber-900">
                Malipo {awaiting.count} ya mkono yanasubiri uthibitisho wako
              </p>
              <p className="mt-1 text-sm text-amber-800">
                Jumla {formatMoney(awaiting.amount, currency, language)} — angalia benki kisha wathibitishe au ukane kwa sababu.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenTransactions({ awaiting: '1', status: '', purpose: '', gateway: '', q: '', from: '', to: '' })}
              className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-400"
            >
              Fungua orodha ya kuthibitisha
            </button>
          </div>
        </div>
      )}

      {failures > 0 && (
        <Notice tone="red">
          Malipo {failures} yamefanikiwa lakini yamekosa hatua za baada ya malipo (kadi ya uanachama, risiti au kiti cha
          conference). Fungua daftari la malipo na ubonyeze «Rudia hatua za baada ya malipo» kwenye kila rekodi.{' '}
          <button type="button" onClick={() => onOpenTransactions({ awaiting: '', status: 'success', purpose: '', gateway: '', q: '', from: '', to: '' }, true)} className="font-bold underline">
            Nenda kwenye malipo
          </button>
        </Notice>
      )}

      {!summary.manual_payments_ready && (
        <Notice tone="amber">
          Taarifa za akaunti ya benki hazijajazwa — mwanachama anapochagua «Malipo ya Mkono» malipo hayakamiliki hadi uweke nne hizi.{' '}
          <button type="button" onClick={onOpenSettings} className="font-bold underline">
            Weka taarifa za benki
          </button>
        </Notice>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Mwenendo wa miezi 6 iliyopita" subtitle="Jumla iliyokusanywa kwa kila mwezi (malipo yaliyofanikiwa)">
          <Trend months={summary.monthly || []} currency={currency} language={language} />
        </Card>
        <Breakdown
          title="Kwa madhumuni"
          subtitle="Mapato yamegawanywa kwa sababu ya malipo"
          rows={summary.by_purpose || []}
          currency={currency}
          language={language}
          nameOf={(row) => PURPOSE_LOOKUP[row.purpose] || row.purpose || '—'}
        />
      </div>

      <Breakdown
        title="Kwa gateway"
        subtitle="Mapato yamegawanywa kwa mfumo wa malipo uliotumika"
        rows={summary.by_gateway || []}
        currency={currency}
        language={language}
        nameOf={(row) => gatewayLabel(row.gateway, availableGateways)}
      />

      <p className="text-xs text-slate-400">
        Namba zote zinahesabiwa na Django API wakati wa kufungua ukurasa huu; hakuna takwimu iliyowekwa hapa mkono.
      </p>
    </div>
  )
}
