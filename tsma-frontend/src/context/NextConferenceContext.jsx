import { createContext, useContext, useEffect, useState } from 'react'
import apiClient from '../api/client.js'

const NextConferenceContext = createContext({ conference: null, loading: true })

/**
 * Mkutano unaofuatusi kwenye API (status=upcoming, imepangwa kwa tarehe).
 * Inasomwa mara moja na kuwashiriki ConferenceCallout na sehemu nyingine
 * za Home — hapo zamani kila moja ilifanya ombi lake, na Callout ilifuatilia
 * kila mkutano kwa endpoint ya maelezo.
 */
export function NextConferenceProvider({ children }) {
  const [conference, setConference] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    apiClient
      .get('/conferences/', { params: { status: 'upcoming' } })
      .then((res) => {
        if (!active) return
        const results = res.data?.results ?? res.data
        const first = Array.isArray(results) ? results.find((c) => c?.start_date) : null
        setConference(first || null)
      })
      .catch(() => {
        // Backend haipatikani: hakuna mkutano unaonyeshwa, badala ya tarehe za kupangwa.
        if (active) setConference(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  return (
    <NextConferenceContext.Provider value={{ conference, loading }}>
      {children}
    </NextConferenceContext.Provider>
  )
}

export function useNextConference() {
  return useContext(NextConferenceContext)
}
