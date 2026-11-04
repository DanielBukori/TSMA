/**
 * Muundo wa fedha na tarehe kwa dashibodi ya Fedha.
 *
 * Backend hurudisha kiasi kama kamba yenye desimali mbili ("12500.00").
 * Kamba hiyo ndiyo inayoonyeshwa hadi mwisho: `Intl.NumberFormat` inakubali
 * kamba ya nambari, hivyo hakuna hatari ya kupoteza usahihi wa float.
 * `Number()` inatumika tu inapohitajika hisabati (jumla, urefu wa grafu).
 */

export function moneyLocale(language) {
  return language?.startsWith('sw') ? 'sw-TZ' : 'en-GB'
}

export function formatMoney(amount, currency, language) {
  const value = amount === null || amount === undefined || amount === '' ? '0.00' : String(amount)
  const code = (currency || '').trim()
  // Kamba isiyo ya nambari ingeonyesha "TSh NaN" - boolea nayo kama ilivyo.
  if (!/^-?\d+(\.\d+)?$/.test(value)) return `${value}${code ? ` ${code}` : ''}`
  // Sarafu isiyo ya ISO ingevuruga `Intl` na kuangamiza ukurasa nzima,
  // hivyo tunarudi kwenye muundo wa nambari pekee.
  const shaped = /^[A-Za-z]{3}$/.test(code)
  try {
    return new Intl.NumberFormat(moneyLocale(language), {
      style: shaped ? 'currency' : 'decimal',
      ...(shaped ? { currency: code.toUpperCase() } : {}),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return shaped ? `${code.toUpperCase()} ${value}` : value
  }
}

export function formatNumber(value, language) {
  return new Intl.NumberFormat(moneyLocale(language)).format(Number(value) || 0)
}

export function toAmount(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

// Jumla ndogo za upande wa kivinjari (safu za ukurasa mmoja tu).
export function sumAmounts(values) {
  return values.reduce((total, value) => total + toAmount(value), 0).toFixed(2)
}

export function formatDateTime(value, language) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString(moneyLocale(language), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(value, language) {
  if (!value) return ''
  const date = new Date(String(value).length <= 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString(moneyLocale(language), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// "2026-11" -> "Nov 2026" kwa lugha inayotumika sasa.
export function formatMonth(value, language) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ''))
  if (!match) return value ? String(value) : ''
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1)
  return date.toLocaleDateString(moneyLocale(language), { month: 'short', year: 'numeric' })
}

/**
 * DRF inahitaji ISO 8601 yenye eneo wakati; `datetime-local` inatoa
 * "2026-11-05T14:30" isiyo na zone. Tunabadilisha kuwa UTC ili seva
 * isipoke naiv ambayo Django angeitungiza kwa default timezone.
 */
export function toIsoDateTime(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

// ISO -> thamani ya `datetime-local` (saa za mtu binafsi).
export function toInputDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
