import axios from 'axios'

/**
 * Client TOFAUTI kabisa na api/client.js - Security Dashboard ina mfumo
 * wake wa login (SecurityAdminUser, si accounts.User), na header yake
 * ni "Authorization: Operator <token>" (si "Bearer <token>" ya JWT ya
 * kawaida). Token inahifadhiwa kwenye key TOFAUTI ya localStorage ili
 * isichanganyike na session ya kawaida ya mwanachama/admin.
 */
const securityClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
})

securityClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('tsma_security_token')
  if (token) {
    config.headers.Authorization = `Operator ${token}`
  }
  return config
})

// Session ikiisha muda (401), futa token - ukurasa wa SecurityDashboard
// utamwelekeza mtumiaji kurudi /security/login yenyewe.
securityClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tsma_security_token')
      localStorage.removeItem('tsma_security_operator')
    }
    return Promise.reject(error)
  },
)

export default securityClient
