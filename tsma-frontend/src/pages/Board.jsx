import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import BoardMemberCard from '../components/BoardMemberCard.jsx'
import PageBanner from '../components/PageBanner.jsx'
import BoardProfileModal from '../components/BoardProfileModal.jsx'

/**
 * Fallback ya DEV pekee — inaonekana tu endapo backend haijaunganishwa.
 * Wanabodi HALISI wanaongezwa na Admin kupitia Django Admin (Board ->
 * Wanabodi) au baadaye kupitia admin dashboard ya React — hakuna jina
 * lolote lililowekwa ndani ya code kwa ajili ya production.
 */
const FALLBACK_MEMBERS = [
  { id: 1, full_name: 'Jina Litawekwa na Admin', position: 'Chairman', photo: null, is_founder: true },
  { id: 2, full_name: 'Jina Litawekwa na Admin', position: 'Vice Chairperson', photo: null, is_founder: true },
  { id: 3, full_name: 'Jina Litawekwa na Admin', position: 'Secretary General', photo: null, is_founder: false },
  { id: 4, full_name: 'Jina Litawekwa na Admin', position: 'Board Member', photo: null, is_founder: false },
]

export default function Board() {
  const { t, i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [members, setMembers] = useState(FALLBACK_MEMBERS)
  const [selected, setSelected] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiClient
      .get('/board/')
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
      const res = await apiClient.get(`/board/${member.id}/`)
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
          {isSw ? 'UONGOZI WETU' : 'OUR LEADERSHIP'}
        </span>
        <h1 className="font-serif font-bold text-3xl md:text-5xl">
          {isSw ? 'Wanabodi wa TSMA' : 'TSMA Board Members'}
        </h1>
        <p className="text-white/75 max-w-lg mx-auto mt-4 px-5">
          {isSw
            ? 'Bofya kadi ya mjumbe kuona wasifu wake kamili.'
            : "Tap a member's card to view their full profile."}
        </p>
      </PageBanner>

      <section className="max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {members.map((member) => (
            <BoardMemberCard key={member.id} member={member} onOpen={openMember} />
          ))}
        </div>

        <div className="text-center mt-14">
          <Link
            to="/founders"
            className="inline-block border-b-2 border-terracotta text-navy font-bold text-sm pb-1 hover:text-terracotta transition-colors"
          >
            {isSw ? 'Angalia Waanzilishi wa TSMA →' : 'View TSMA Founders →'}
          </Link>
        </div>
      </section>

      {selected && (
        <BoardProfileModal member={selected} onClose={() => setSelected(null)} loading={modalLoading} />
      )}
    </>
  )
}
