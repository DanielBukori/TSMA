import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import BoardMemberCard from '../components/BoardMemberCard.jsx'
import BoardProfileModal from '../components/BoardProfileModal.jsx'
import PageBanner from '../components/PageBanner.jsx'

/**
 * Fallback ya DEV pekee — inaonekana tu endapo backend haijaunganishwa.
 * Wajumbe HALISI wa Management wanaongezwa na Admin kupitia Django Admin
 * (Management -> Wajumbe) — "position" ni maandishi huru anayoandika
 * Admin mwenyewe, si orodha iliyofungwa kwenye code.
 */
const FALLBACK_MEMBERS = [
  { id: 1, full_name: 'Jina Litawekwa na Admin', position: 'Chair', photo: null },
  { id: 2, full_name: 'Jina Litawekwa na Admin', position: 'Secretary General', photo: null },
  { id: 3, full_name: 'Jina Litawekwa na Admin', position: 'Treasurer', photo: null },
]

export default function Management() {
  const { t, i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [members, setMembers] = useState(FALLBACK_MEMBERS)
  const [selected, setSelected] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiClient
      .get('/management/')
      .then((res) => {
        const results = res.data?.results || res.data
        if (!cancelled && Array.isArray(results) && results.length > 0) {
          setMembers(results)
        }
      })
      .catch(() => {
        // Backend haipatikani bado — tunabaki na fallback ya placeholder
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function openMember(member) {
    setModalLoading(true)
    setSelected(member) // fungua modal papo hapo na taarifa tulizonazo
    try {
      const res = await apiClient.get(`/management/${member.id}/`)
      setSelected(res.data)
    } catch {
      // Ikiwa detail haipatikani (mfano fallback data), bado tunaonyesha
      // taarifa za msingi tulizokuwa nazo kwenye orodha.
    } finally {
      setModalLoading(false)
    }
  }

  return (
    <>
      <PageBanner>
        <span className="inline-block border border-gold/50 text-gold text-xs font-extrabold tracking-widest px-5 py-2 rounded-full mb-6">
          {isSw ? 'UONGOZI WA UTENDAJI' : 'EXECUTIVE MANAGEMENT'}
        </span>
        <h1 className="font-serif font-bold text-3xl md:text-5xl">
          {isSw ? 'Management ya TSMA' : 'TSMA Management'}
        </h1>
        <p className="text-white/75 max-w-lg mx-auto mt-4 px-5">
          {isSw
            ? 'Timu inayoendesha shughuli za kila siku za TSMA. Bofya kadi kuona wasifu kamili.'
            : "The team running TSMA's day-to-day operations. Tap a card to view their full profile."}
        </p>
      </PageBanner>

      <section className="max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {members.map((member) => (
            <BoardMemberCard key={member.id} member={member} onOpen={openMember} />
          ))}
        </div>
      </section>

      {selected && (
        <BoardProfileModal member={selected} onClose={() => setSelected(null)} loading={modalLoading} />
      )}
    </>
  )
}
