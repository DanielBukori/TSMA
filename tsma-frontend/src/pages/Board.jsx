import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import BoardMemberCard from '../components/BoardMemberCard.jsx'
import PageBanner from '../components/PageBanner.jsx'
import PageBannerText from '../components/PageBannerText.jsx'
import BoardProfileModal from '../components/BoardProfileModal.jsx'
import BoardPhotoSlideshow from '../components/BoardPhotoSlideshow.jsx'

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
        <PageBannerText
          pageKey="board"
          isSw={isSw}
          fallback={{
            badge_sw: 'UONGOZI WETU', badge_en: 'OUR LEADERSHIP',
            title_sw: 'Wanabodi wa TSMA', title_en: 'TSMA Board Members',
            subtitle_sw: 'Bofya kadi ya mjumbe kuona wasifu wake kamili.',
            subtitle_en: "Tap a member's card to view their full profile.",
          }}
        />
      </PageBanner>

      <BoardPhotoSlideshow members={members} isSw={isSw} />

      <section data-reveal className="max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-20">
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
