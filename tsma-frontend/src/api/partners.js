import apiClient from './client.js'

// GET /api/partners/ - Washirika (ASMA/WASM n.k.), kwa Home na About pages
export function fetchPartners() {
  return apiClient.get('/partners/')
}

// GET /api/partners/voices/ - maneno ya washirika yaliyochapishwa na Admin/Editor
export function fetchPartnerVoices() {
  return apiClient.get('/partners/voices/')
}
