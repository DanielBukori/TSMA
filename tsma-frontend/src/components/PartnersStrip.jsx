import { useEffect, useState } from 'react'
import { fetchPartners } from '../api/partners.js'

/**
 * Safu ya logo za washirika (ASMA/WASM n.k.) - component MOJA
 * inayotumiwa na Home.jsx NA About.jsx zote mbili (uamuzi wa Sunga: data
 * moja, sehemu mbili). Ikiwa hakuna washirika bado (Admin hajaongeza),
 * component hii haionyeshi chochote (haina "kutupu" kwa udanganyifu).
 */
export default function PartnersStrip({ isSw }) {
  const [partners, setPartners] = useState([])

  useEffect(() => {
    fetchPartners()
      .then((res) => {
        const results = res.data?.results || res.data
        setPartners(Array.isArray(results) ? results : [])
      })
      .catch(() => {})
  }, [])

  if (partners.length === 0) return null

  return (
    <section className="py-12 border-t border-black/5">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <p className="text-center text-xs font-bold text-ink-muted uppercase tracking-widest mb-8">
          {isSw ? 'Washirika Wetu' : 'Our Partners'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-10 md:gap-14">
          {partners.map((partner) =>
            partner.website_url ? (
              <a
                key={partner.id}
                href={partner.website_url}
                target="_blank"
                rel="noopener noreferrer"
                title={partner.description || partner.name}
                className="opacity-70 hover:opacity-100 transition-opacity"
              >
                <img src={partner.logo} alt={partner.name} className="h-12 md:h-14 w-auto object-contain" />
              </a>
            ) : (
              <img
                key={partner.id}
                src={partner.logo}
                alt={partner.name}
                title={partner.description || partner.name}
                className="h-12 md:h-14 w-auto object-contain opacity-70"
              />
            )
          )}
        </div>
      </div>
    </section>
  )
}
