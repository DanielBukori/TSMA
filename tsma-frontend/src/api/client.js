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

// ---------------------------------------------------------------------------
// KASI: maudhui ya UMMA (habari, picha, machapisho, bodi...) yanahifadhiwa dakika 5 kwenye
// kumbukumbu na sessionStorage. Ukibonyeza Back au ukirefresh, ukurasa unajaa papo hapo
// badala ya kusubiri seva tena. Wageni PEKEE (hakuna token): data ya mtumiaji aliyeingia
// (uanachama, malipo, vyeti...) HAIHIFADHIWI kamwe.
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 2 * 60 * 1000 // dakika 2: data isikae muda mrefu bila kusasishwa
const CACHE_PREFIX = 'tsma:api:'
const CACHEABLE_PREFIXES = [
  // '/conferences' HAIMO kwa makusudi: tiketi, bei na hali ya usajili lazima ziwe mpya kila wakati
  '/news', '/gallery', '/publications', '/board', '/management', '/founders',
  '/members/tiers', '/members/directory', '/sitecontent', '/contact', '/partners', '/careers',
  '/teaching/courses', '/teaching/sessions',
]
const memoryCache = new Map()

function cacheKeyOf(config) {
  return `${config.url}?${JSON.stringify(config.params || {})}`
}

function isCacheable(config) {
  if ((config.method || 'get').toLowerCase() !== 'get') return false
  if (localStorage.getItem('tsma_access_token')) return false // mtumiaji aliyeingia: kamwe
  if (config.params?._nocache) return false
  const url = config.url || ''
  return CACHEABLE_PREFIXES.some((p) => url === p || url.startsWith(`${p}/`) || url.startsWith(`${p}?`))
}

function readCache(key) {
  const now = Date.now()
  const mem = memoryCache.get(key)
  if (mem && now - mem.t < CACHE_TTL_MS) return mem
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key)
    if (raw) {
      const entry = JSON.parse(raw)
      if (now - entry.t < CACHE_TTL_MS) {
        memoryCache.set(key, entry)
        return entry
      }
    }
  } catch {
    /* si tatizo */
  }
  return null
}

function writeCache(key, data) {
  const entry = { t: Date.now(), data }
  memoryCache.set(key, entry)
  try {
    const raw = JSON.stringify(entry)
    if (raw.length < 400_000) sessionStorage.setItem(CACHE_PREFIX + key, raw)
  } catch {
    /* hifadhi imejaa */
  }
}

export function clearApiCache() {
  memoryCache.clear()
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k))
  } catch {
    /* si tatizo */
  }
}

// ---- Taarifa ya "seva inaamka" (ombi linalozidi sekunde 4) ----
let slowPending = 0
function startSlowTimer(config) {
  config.__slowTimer = setTimeout(() => {
    config.__slowCounted = true
    slowPending += 1
    window.dispatchEvent(new CustomEvent('tsma:slow-api', { detail: true }))
  }, 4000)
}
function endSlowTimer(config) {
  if (!config) return
  clearTimeout(config.__slowTimer)
  if (config.__slowCounted) {
    config.__slowCounted = false
    slowPending = Math.max(0, slowPending - 1)
    if (slowPending === 0) window.dispatchEvent(new CustomEvent('tsma:slow-api', { detail: false }))
  }
}

// Unganisha na seva mapema (TLS/DNS) kabla ombi la kwanza
try {
  const origin = new URL(apiClient.defaults.baseURL, window.location.href).origin
  if (origin !== window.location.origin && !document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = origin
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  }
} catch {
  /* si tatizo */
}

apiClient.interceptors.request.use((config) => {
  if (isCacheable(config)) {
    const key = cacheKeyOf(config)
    config.__cacheKey = key
    const hit = readCache(key)
    if (hit) {
      config.__cacheHit = true
      // Majibu ya papo hapo - hayafiki kwenye mtandao
      config.adapter = () =>
        Promise.resolve({ data: JSON.parse(JSON.stringify(hit.data)), status: 200, statusText: 'OK', headers: {}, config, request: {} })
      return config
    }
  }
  startSlowTimer(config)
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
  (response) => {
    endSlowTimer(response.config)
    if (response.config?.__cacheKey && !response.config.__cacheHit) writeCache(response.config.__cacheKey, response.data)
    return response
  },
  async (error) => {
    endSlowTimer(error.config)
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
