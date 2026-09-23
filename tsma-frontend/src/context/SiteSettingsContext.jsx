import { createContext, useContext, useEffect, useState } from 'react'
import { fetchSiteSettings } from '../api/siteSettings.js'

const SiteSettingsContext = createContext(null)

/**
 * Inapakua logo/favicon MARA MOJA tu app inapoanza, na kuzishiriki na
 * Navbar + Footer (badala ya kila component kuomba API yake yenyewe).
 *
 * MUHIMU: TSMA bado haina logo rasmi (angalia mazungumzo yetu) — kwa
 * hiyo `logoUrl`/`logoOnDarkUrl`/`faviconUrl` zitakuwa `null` mpaka
 * Admin apakie picha kwenye Django Admin. Components zinazotumia haya
 * ZINAPASWA kuwa na fallback (mfano herufi "T" au maandishi "TSMA") —
 * kamwe zisidhani logo ipo.
 */
export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    logoUrl: null,
    logoOnDarkUrl: null,
    faviconUrl: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSiteSettings()
      .then((res) => {
        setSettings({
          logoUrl: res.data.logo_image || null,
          logoOnDarkUrl: res.data.logo_on_dark || res.data.logo_image || null,
          faviconUrl: res.data.favicon || null,
        })
      })
      .catch(() => {
        // Ikishindwa (mfano backend haipo bado), tovuti inaendelea na
        // fallback ya maandishi — logo si kitu cha kuzuia app isifanye kazi.
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <SiteSettingsContext.Provider value={{ ...settings, loading }}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext)
  if (!ctx) throw new Error('useSiteSettings lazima itumike ndani ya <SiteSettingsProvider>')
  return ctx
}
