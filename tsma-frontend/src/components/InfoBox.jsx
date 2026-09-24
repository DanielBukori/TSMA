import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'

/**
 * Takwimu za FALLBACK — yale yale namba/maneno yaliyokuwa hardcoded hapa
 * kabla ya mfumo huu. Yanatumika tu endapo API bado haijajibu, au bado
 * hakuna data kabisa kwenye database (mfano kabla ya `seed_home_stats`
 * kuendeshwa). Mara HomeStat ikiwa na rekodi, hizo ndizo zinazoonekana
 * daima — Admin anahariri kupitia Django Admin (sitecontent -> Takwimu
 * za Home) bila kugusa code.
 */
const FALLBACK_BIG = { value: '26', label_sw: 'Miaka ya Uzoefu', label_en: 'Years of Experience' }
const FALLBACK_TILES = [
  { value: '1,200+', label_sw: 'Wanachama', label_en: 'Members' },
  { value: 'TZS 5M', label_sw: 'Faida ya Kiuchumi', label_en: 'Economic Impact' },
  { value: '18', label_sw: 'Mikoa', label_en: 'Regions' },
  { value: 'Dar es Salaam', label_sw: 'Makao Makuu', label_en: 'Headquarters' },
]

export default function InfoBox() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [stats, setStats] = useState(null) // null = bado haijafika/haipo

  useEffect(() => {
    let cancelled = false
    apiClient
      .get('/content/home-stats/')
      .then((res) => {
        const results = res.data?.results || res.data
        if (!cancelled && Array.isArray(results) && results.length > 0) {
          setStats(results)
        }
      })
      .catch(() => {
        // Kimya - itatumia FALLBACK
      })
    return () => {
      cancelled = true
    }
  }, [])

  const big = stats ? stats.find((s) => s.kind === 'big') : FALLBACK_BIG
  const tiles = stats ? stats.filter((s) => s.kind === 'tile').slice(0, 4) : FALLBACK_TILES

  return (
    <section className="max-w-4xl mx-auto px-5 md:px-8 -mt-4 md:-mt-8 relative z-10">
      <div className="bg-navy rounded-2xl px-8 py-10 md:py-12 text-center text-white shadow-xl">
        {big && (
          <>
            <div className="font-serif font-black text-5xl md:text-6xl text-gold">
              {big.value}
            </div>
            <div className="text-sm text-white/80 mt-2">
              {isSw ? big.label_sw : big.label_en}
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-3.5 mt-8">
          {tiles.map((tile, i) => (
            <Tile
              key={tile.id ?? i}
              num={tile.value}
              label={isSw ? tile.label_sw : tile.label_en}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function Tile({ num, label }) {
  return (
    <div className="bg-gold/10 border border-gold/30 rounded-lg px-3 py-4">
      <div className="font-serif font-extrabold text-xl md:text-2xl text-gold">{num}</div>
      <div className="text-[11px] text-white/70 mt-1">{label}</div>
    </div>
  )
}
