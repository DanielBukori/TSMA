import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import BoardMemberCard from '../components/BoardMemberCard.jsx'
import BoardProfileModal from '../components/BoardProfileModal.jsx'
import PageBanner from '../components/PageBanner.jsx'
import PageBannerText from '../components/PageBannerText.jsx'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'

export default function Management() {
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
      .get('/management/')
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
      const res = await apiClient.get(`/management/${member.id}/`)
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
          pageKey="management"
          isSw={isSw}
          fallback={{
            badge_sw: 'UONGOZI WA UTENDAJI', badge_en: 'EXECUTIVE MANAGEMENT',
            title_sw: 'Management ya TSMA', title_en: 'TSMA Management',
            subtitle_sw: 'Timu inayoendesha shughuli za kila siku za TSMA. Bofya kadi kuona wasifu kamili.',
            subtitle_en: "The team running TSMA's day-to-day operations. Tap a card to view their full profile.",
          }}
        />
      </PageBanner>

      <section className="max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-20">
        {state === 'error' && (
          <EmptyState
            isSw={isSw}
            sw="Hakuna majina ya wajumbe ya kuonyesha kwa sasa."
            en="No management members to show right now."
            hintSw="Muunganisho na seva haukufanyika. Fundi wa TSMA ataangalia; jaribu tena baadaye."
            hintEn="The connection to the server failed. The TSMA administrator will be notified; please try again later."
            tone="error"
          />
        )}

        {state === 'ready' && members.length === 0 && (
          <EmptyState
            isSw={isSw}
            sw="Wajumbe wa Management bado hawjatajwa na mhariri."
            en="Management team members have not been published yet."
            hintSw="Majina na picha za wajumbe huwekwa na mhariri wa tovuti."
            hintEn="Team member names and photos are added by the site editor."
          />
        )}

        {state === 'ready' && members.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {members.map((member) => (
              <BoardMemberCard key={member.id} member={member} onOpen={openMember} />
            ))}
          </div>
        )}
      </section>

      {selected && (
        <BoardProfileModal member={selected} onClose={() => setSelected(null)} loading={modalLoading} />
      )}
    </>
  )
}
