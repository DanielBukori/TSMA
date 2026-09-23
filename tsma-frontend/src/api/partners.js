import apiClient from './client.js'

// GET /api/partners/ - Washirika (ASMA/WASM n.k.), kwa Home na About pages
export function fetchPartners() {
  return apiClient.get('/partners/')
}
