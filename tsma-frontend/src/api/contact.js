import apiClient from './client.js'

// GET /api/contact/info/ - namba za simu/WhatsApp/email na viungo vya
// mitandao ya kijamii, tayari kubofywa (clickable links). Backend
// (contact app) tayari inarudisha hizi zote — angalia
// contact/serializers.py ContactInfoSerializer.
export function fetchContactInfo() {
  return apiClient.get('/contact/info/')
}
