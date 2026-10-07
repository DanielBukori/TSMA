import { useEffect, useState } from 'react'
import { fetchAvailableGateways } from '../api/payments.js'

/**
 * Dropdown/buttons za kuchagua gateway ya malipo — orodha inapakuliwa
 * kutoka backend (`/api/payments/gateways/`), kwa hiyo gateway mpya
 * ikiongezwa (AzamPay, PayPal, Pesapal...) INAONEKANA HAPA MOJA KWA MOJA,
 * hakuna mabadiliko ya frontend yanayohitajika.
 *
 * `value` / `onChange` hubeba OBJECT nzima ya gateway (si string tu):
 * { code, label, requires_phone, supports_redirect } — hii inaruhusu form
 * ya mzazi (parent) kuonyesha/kuficha field ya "Namba ya Simu" kulingana
 * na gateway iliyochaguliwa (mfano PayPal haihitaji namba ya simu).
 */
export default function GatewaySelect({ value, onChange, isSw }) {
  const [gateways, setGateways] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchAvailableGateways()
      .then((res) => {
        setGateways(res.data)
        if (!value && res.data.length > 0) onChange(res.data[0])
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <p className="text-xs text-ink-muted">
        {isSw ? 'Inapakua njia za malipo...' : 'Loading payment options...'}
      </p>
    )
  }

  if (error || gateways.length === 0) {
    return (
      <p className="text-xs text-terracotta">
        {isSw
          ? 'Hakuna njia ya malipo iliyowekwa kwa sasa. Wasiliana na TSMA.'
          : 'No payment gateway is configured right now. Please contact TSMA.'}
      </p>
    )
  }

  // Gateway MOJA tu (mfano Manual pekee) — hakuna cha kuchagua, onyesha jina tu.
  if (gateways.length === 1) {
    return (
      <div className="bg-cream border border-black/10 rounded-md px-4 py-2.5">
        <span className="text-xs font-bold text-ink-muted">
          {isSw ? 'Njia ya Malipo: ' : 'Payment method: '}
        </span>
        <span className="text-sm font-bold text-navy">{gateways[0].label}</span>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-xs font-bold text-ink mb-1.5">
        {isSw ? 'Njia ya Malipo' : 'Payment Gateway'}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {gateways.map((gw) => (
          <button
            key={gw.code}
            type="button"
            onClick={() => onChange(gw)}
            className={`text-sm font-bold py-2.5 rounded-md border ${
              value?.code === gw.code ? 'bg-navy text-white border-navy' : 'border-black/15 text-ink'
            }`}
          >
            {gw.label}
          </button>
        ))}
      </div>
    </div>
  )
}
