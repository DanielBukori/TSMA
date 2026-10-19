import apiClient from './client.js'

export function registerUser(data) {
  return apiClient.post('/auth/register/', data)
}

export function loginUser(email, password) {
  return apiClient.post('/auth/login/', { email, password })
}

export function refreshAccessToken(refreshToken) {
  return apiClient.post('/auth/refresh/', { refresh: refreshToken })
}

export function logoutUser(refreshToken) {
  return apiClient.post('/auth/logout/', { refresh: refreshToken })
}

export function fetchMe() {
  return apiClient.get('/auth/me/')
}

// ---- OTP ya barua pepe (tarakimu 6) ----
export function verifyEmailOtp(email, code) {
  return apiClient.post('/auth/email/verify/', { email, code })
}

export function resendEmailOtp(email) {
  return apiClient.post('/auth/email/resend/', { email })
}

export function requestPasswordReset(email) {
  return apiClient.post('/auth/password/reset/', { email })
}

export function confirmPasswordReset(payload) {
  // payload: { email, code, new_password, new_password_confirm }
  return apiClient.post('/auth/password/reset/confirm/', payload)
}
