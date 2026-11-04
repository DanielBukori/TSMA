import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import BoardMemberCard from '../components/BoardMemberCard.jsx'
import PageBanner from '../components/PageBanner.jsx'
import PageBannerText from '../components/PageBannerText.jsx'
import BoardProfileModal from '../components/BoardProfileModal.jsx'
import BoardPhotoSlideshow from '../components/BoardPhotoSlideshow.jsx'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'

export default function Board() {
  const { t, i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [members, setMembers] = useState([])
  const [state, setState] = useState('loading')
  const [selected, setSelected] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setState('loading')
    apiClient
      .get('/board/')
      .then((res) => {
        const results = res.data?.results || res.data
        if (cancelled) return
        setMembers(Array.isArray(results) ? results : [])
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
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
      // Ikiwa wasifu kamili haupatikani, bado tunaonyesha
      // taarifa za msingi tulizopata kwenye orodha.
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
        {state === 'loading' && <LoadingState />}

        {state === 'error' && (
          <EmptyState
            isSw={isSw}
            sw="Hakuna majina ya wanabodi ya kuonyesha kwa sasa."
            en="No board members to show right now."
            hintSw="Muunganisho na seva haukufanyika. Fundi wa TSMA ataangalia; jaribu tena baadaye."
            hintEn="The connection to the server failed. The TSMA administrator will be notified; please try again later."
            tone="error"
          />
        )}

        {state === 'ready' && members.length === 0 && (
          <EmptyState
            isSw={isSw}
            sw="Bodi mpya itatangazwa baada ya uchaguzi."
            en="A new board will be announced after the election."
            hintSw="Majina na picha za wanabodi huwekwa na mhariri wa tovuti."
            hintEn="Board member names and photos are added by the site editor."
          />
        )}

        {state === 'ready' && members.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {members.map((member) => (
              <BoardMemberCard key={member.id} member={member} onOpen={openMember} />
            ))}
          </div>
        )}

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
