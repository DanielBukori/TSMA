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
