import { createContext, useContext, useEffect, useState } from 'react'
import apiClient from '../api/client.js'

/**
 * Maandishi ya banner (badge/title/subtitle/CTA) ya KILA ukurasa —
 * yanavutwa MARA MOJA hapa (kama BackgroundImagesContext) kutoka
 * /api/content/banners/ na kushirikiwa na kurasa zote kupitia
 * useBannerContent(pageKey), badala ya kila ukurasa kuita API yake
 * mwenyewe. Admin anahariri maneno haya kupitia Django Admin
 * (sitecontent -> Maudhui ya Banner) bila kugusa code.
 */
const BannerContentContext = createContext({ banners: {}, loading: true })

export function BannerContentProvider({ children }) {
  const [banners, setBanners] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiClient
      .get('/content/banners/')
      .then((res) => {
        const results = res.data?.results || res.data
        if (!cancelled && Array.isArray(results)) {
          const byKey = {}
          results.forEach((b) => {
            byKey[b.page_key] = b
          })
          setBanners(byKey)
        }
      })
      .catch(() => {
        // Kimya - kurasa zitatumia `fallback` yao (angalia PageBannerText.jsx)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <BannerContentContext.Provider value={{ banners, loading }}>
      {children}
    </BannerContentContext.Provider>
  )
}

export function useBannerContent(pageKey) {
  const { banners, loading } = useContext(BannerContentContext)
  return { banner: banners[pageKey], loading }
}
