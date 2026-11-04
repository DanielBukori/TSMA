/**
 * Maneno haya ni nakala ya `choices` za backend (payments/models.py,
 * members/models.py). Vinakabidhiwa hapa kwa sababu njia za API hurudisha
 * msimbo ("pending") badala ya jina lake, na orodha za kuchuja lazima
 * zilingane na choozi za Django — kutoa jina jingine kungeua data.
 */

export const STATUS_OPTIONS = [
  { value: 'pending', label: 'Inasubiri' },
  { value: 'processing', label: 'Inachakatwa' },
  { value: 'success', label: 'Imefanikiwa' },
  { value: 'failed', label: 'Imeshindwa' },
  { value: 'cancelled', label: 'Imesitishwa' },
  { value: 'expired', label: 'Imeisha Muda' },
]

export const PURPOSE_OPTIONS = [
  { value: 'membership', label: 'Ada ya Uanachama' },
  { value: 'conference', label: 'Usajili wa Conference' },
  { value: 'publication_purchase', label: 'Ununuzi wa Chapisho' },
  { value: 'other', label: 'Nyingine' },
]

// Gateway ambazo haziko kwenye /payments/gateways/ (zimemezwa au zimezimwa)
// bado zinaweza kuonekana kwenye rekodi za zamani.
export const GATEWAY_LABELS = {
  selcom: 'Selcom',
  azampay: 'AzamPay',
  paypal: 'PayPal',
  clickpesa: 'ClickPesa',
  dpo_pesapal: 'DPO/Pesapal',
  flutterwave: 'Flutterwave',
  snippe: 'Snippe',
  manual: 'Malipo ya Mkono (Manual/Bank Deposit)',
}

export const MEMBER_STATUS_OPTIONS = [
  { value: 'pending_payment', label: 'Inasubiri Malipo' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Imeisha Muda' },
  { value: 'suspended', label: 'Imesimamishwa' },
  { value: 'cancelled', label: 'Imefutwa' },
]

const FALLBACK_TONE = 'slate'
const TONES = {
  success: 'green',
  pending: 'amber',
  processing: 'blue',
  failed: 'red',
  cancelled: 'slate',
  expired: 'slate',
  active: 'green',
  pending_payment: 'amber',
  suspended: 'red',
}

export function statusTone(value) {
  return TONES[value] || FALLBACK_TONE
}

export function labelFor(options, value, fallback) {
  if (!value) return fallback || '—'
  const found = options.find((option) => option.value === value)
  return found ? found.label : fallback || value
}

export function gatewayLabel(gateway, availableGateways) {
  if (!gateway) return '—'
  const live = availableGateways.find((item) => item.code === gateway)
  return live?.label || GATEWAY_LABELS[gateway] || gateway
}

export const STATUS_LOOKUP = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]))
export const PURPOSE_LOOKUP = Object.fromEntries(PURPOSE_OPTIONS.map((o) => [o.value, o.label]))
export const MEMBER_STATUS_LOOKUP = Object.fromEntries(
  MEMBER_STATUS_OPTIONS.map((o) => [o.value, o.label]),
)

/**
 * Hali moja ya ukweli kwa kila upakiaji: API isiyo na token hurudisha 401,
 * bila ruhusa 403, njia iliyopotea 404, na seva iliyanguka 5xx au hakuna
 * mtandao kabisa. Kila moja ina ujumbe wake — tusiandike "hakuna rekodi"
 * wakati data imekataliwa.
 */
export function describeError(error) {
  const status = error?.response?.status
  if (status === 401) return { kind: 'session', message: 'Session imeisha muda. Ingia tena.' }
  if (status === 403) return { kind: 'denied', message: 'Ruhusa imekataliwa.' }
  if (status === 404) return { kind: 'missing', message: 'Hakuna rekodi.' }
  if (status && status >= 500) return { kind: 'server', message: 'Mfumo haupatikani kwa sasa.' }
  if (!error?.response) return { kind: 'server', message: 'Mfumo haupatikani kwa sasa — hakuna muunganisho na seva.' }
  return { kind: 'request', message: serverMessage(error) || 'Ombi halikufanikiwa.' }
}

// Ujumbe wa Django ni wa kweli kuliko uotengenezwa hapa: tuonyeshe kama ulivyo.
export function serverMessage(error) {
  const data = error?.response?.data
  if (!data) return ''
  if (typeof data === 'string') return data.slice(0, 400)
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail)) return data.detail.join(', ')
  const entries = Object.entries(data)
    .map(([field, value]) => {
      const text = Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value : ''
      return text ? `${field}: ${text}` : ''
    })
    .filter(Boolean)
  return entries.join(' · ').slice(0, 400)
}
