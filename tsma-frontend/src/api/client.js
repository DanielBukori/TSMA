import axios from 'axios'

/**
 * Weka VITE_API_BASE_URL kwenye faili la .env (mfano:
 * VITE_API_BASE_URL=http://localhost:8000/api) ili frontend iunganishwe
 * na backend halisi ya Django tuliyojenga (accounts/members/news/n.k.).
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('tsma_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Mara access token ikiisha muda (401), jaribu kupata mpya kwa kutumia
// refresh token MOJA TU (kuepuka mzunguko usio na mwisho), kisha rudia
// ombi la awali. Ikishindwa, futa session na acha error iendelee kwenda
// juu (component itaonyesha ujumbe wa kuingia tena).
let isRefreshing = false
let pendingQueue = []

function processQueue(error, token = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  pendingQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('tsma_refresh_token')
    if (!refreshToken) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return apiClient(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const res = await axios.post(
        `${apiClient.defaults.baseURL}/auth/refresh/`,
        { refresh: refreshToken },
      )
      const newAccess = res.data.access
      localStorage.setItem('tsma_access_token', newAccess)

      // MUHIMU: backend ina ROTATE_REFRESH_TOKENS=True — kila refresh
      // inarudisha refresh TOKEN MPYA (ile ya zamani inablacklist-iwa
      // upande wa server). Lazima tuihifadhi hii mpya, la sivyo refresh
      // ijayo itatumia token iliyokwisha-blacklist-iwa na ku-fail.
      if (res.data.refresh) {
        localStorage.setItem('tsma_refresh_token', res.data.refresh)
      }

      processQueue(null, newAccess)
      originalRequest.headers.Authorization = `Bearer ${newAccess}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      localStorage.removeItem('tsma_access_token')
      localStorage.removeItem('tsma_refresh_token')
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default apiClient
