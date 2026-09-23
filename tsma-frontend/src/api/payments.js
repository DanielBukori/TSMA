import apiClient from './client.js'

// GET /api/payments/gateways/ - orodha ya gateways zilizosajiliwa backend
// (na maelezo ya jinsi ya kuonyesha fomu kwa kila moja). Gateway mpya
// ikiongezwa backend (AzamPay, PayPal, Pesapal...), inatokea hapa AUTO.
export function fetchAvailableGateways() {
  return apiClient.get('/payments/gateways/')
}
