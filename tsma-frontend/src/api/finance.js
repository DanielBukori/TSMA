import apiClient from './client.js'

/**
 * Idhaa zote za fedha na uendeshaji wa mikutano zinahitaji token ya
 * hatua-mbili (claim `editor_mfa`); login ya mwanachama wa kawaida haitoshi,
 * hivyo kila ombi hapa linarudisha 401/403 kama session hiyo haijathibitishwa.
 */

// ---- Muhtasari na daftari la malipo ----

export function fetchFinanceSummary() {
  return apiClient.get('/finance/summary/')
}

// params: { status, purpose, gateway, q, awaiting, from, to, date_field, page }
export function fetchFinanceTransactions(params = {}) {
  return apiClient.get('/finance/transactions/', { params })
}

export function confirmManualPayment(internalReference, gatewayReference) {
  return apiClient.post(`/finance/transactions/${internalReference}/confirm/`, {
    gateway_reference: gatewayReference || '',
  })
}

export function rejectManualPayment(internalReference, reason) {
  return apiClient.post(`/finance/transactions/${internalReference}/reject/`, { reason })
}

export function reprocessPayment(internalReference) {
  return apiClient.post(`/finance/transactions/${internalReference}/reprocess/`)
}

export function fetchManualSettings() {
  return apiClient.get('/finance/manual-settings/')
}

export function saveManualSettings(payload) {
  return apiClient.patch('/finance/manual-settings/', payload)
}

// Gateways ambazo backend imezawezesha kwa sasa (labels halisi za umma).
export function fetchAvailableGateways() {
  return apiClient.get('/payments/gateways/')
}

// ---- Mikutano (Treasurer/Board) ----

/**
 * Backend inatumia PageNumberPagination yenye ukurasa wa 20 na haikubali
 * `page_size`. Orodha fupi (tiketi, madaraja) zinazochujwa hapa baadaye
 * lazima zsomekane zote, la sivyo uchujaji wa ndani ungeonyesha sehemu tu
 * ya rekodi. `next` ya DRF ni URL kamili, hivyo axios inaifata moja kwa moja.
 * Rekodi 500 ni kikomo kingimanisho dhidi ya kitanzi kisichoisha.
 */
export async function fetchAllPages(fetchPage, params) {
  const first = await fetchPage(params)
  const results = [...(first.data?.results || [])]
  let next = first.data?.next
  while (next && results.length < 500) {
    const page = await apiClient.get(next)
    results.push(...(page.data?.results || []))
    next = page.data?.next
  }
  return results
}

export function fetchConferences(page) {
  return apiClient.get('/conferences/admin/', { params: page ? { page } : {} })
}

export function createConference(payload) {
  return apiClient.post('/conferences/admin/', payload, multipartIfFile(payload))
}

export function updateConference(id, payload) {
  return apiClient.patch(`/conferences/admin/${id}/`, payload, multipartIfFile(payload))
}

// apiClient inaweka Content-Type: application/json kwa chaguo-msingi;
// faili la banner linahitaji multipart (axios huongeza boundary yenyewe).
function multipartIfFile(payload) {
  return payload instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined
}

export function deleteConference(id) {
  return apiClient.delete(`/conferences/admin/${id}/`)
}

// Hakuna `?conference=` kwenye view hii, hivyo tiketi zote zinasomeka
// kisha zinachujwa hapa kwa mkutano uliochaguliwa.
export function fetchTicketTypes() {
  return fetchAllPages(() => apiClient.get('/conferences/admin/ticket-types/'))
}

export function createTicketType(payload) {
  return apiClient.post('/conferences/admin/ticket-types/', payload)
}

export function updateTicketType(id, payload) {
  return apiClient.patch(`/conferences/admin/ticket-types/${id}/`, payload)
}

export function deleteTicketType(id) {
  return apiClient.delete(`/conferences/admin/ticket-types/${id}/`)
}

// Slug inatumika kwenye njia hii, si id.
export function fetchConferenceAnalytics(slug) {
  return apiClient.get(`/conferences/${slug}/analytics/`)
}

// ---- Uanachama ----

export function fetchMembershipTiers() {
  return fetchAllPages(() => apiClient.get('/members/admin/tiers/'))
}

export function createMembershipTier(payload) {
  return apiClient.post('/members/admin/tiers/', payload)
}

export function updateMembershipTier(id, payload) {
  return apiClient.patch(`/members/admin/tiers/${id}/`, payload)
}

// Orodha ya wanachama iko kwenye mzi wa /members/ (si /members/admin/members/).
export function fetchMembers(params = {}) {
  return apiClient.get('/members/', { params })
}
