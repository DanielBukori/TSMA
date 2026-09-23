import apiClient from './client.js'

// GET /api/content/settings/ - logo/favicon za tovuti (public, haihitaji login)
export function fetchSiteSettings() {
  return apiClient.get('/content/settings/')
}
