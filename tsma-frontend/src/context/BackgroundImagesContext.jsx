import { createContext, useContext, useEffect, useState } from 'react'
import apiClient from '../api/client.js'

const BackgroundImagesContext = createContext({ images: [], loading: true })

/**
 * Inapakua bwawa la picha za background MARA MOJA (app inapoanza), na
 * kuzishiriki na HeroSlideshow.jsx (Home) NA PageBanner.jsx (kurasa
 * zingine zote) — badala ya kila ukurasa kuomba API yake yenyewe.
 *
 * Admin anapopakia/kuondoa picha kwenye Django Admin, sehemu ZOTE
 * zinazotumia background hii zinasasishwa kiotomatiki (refresh moja tu
 * ya ukurasa) — hakuna code inayohitaji kubadilika popote.
 */
export function BackgroundImagesProvider({ children }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient
      .get('/content/backgrounds/')
      .then((res) => {
        const results = res.data?.results || res.data
        setImages(Array.isArray(results) ? results : [])
      })
      .catch(() => {
        // Hakuna picha bado / backend haipatikani - sehemu zinazotumia
        // hii zinabaki na rangi ya kawaida ya navy (haivunjiki).
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <BackgroundImagesContext.Provider value={{ images, loading }}>
      {children}
    </BackgroundImagesContext.Provider>
  )
}

export function useBackgroundImages() {
  return useContext(BackgroundImagesContext)
}
