import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import BoardMemberCard from '../components/BoardMemberCard.jsx'
import BoardProfileModal from '../components/BoardProfileModal.jsx'
import PageBanner from '../components/PageBanner.jsx'
import PageBannerText from '../components/PageBannerText.jsx'

const FALLBACK_FOUNDERS = [
  { id: 1, full_name: 'Jina Litawekwa na Admin', position: 'Founder & Chairman', photo: null, is_founder: true },
  { id: 2, full_name: 'Jina Litawekwa na Admin', position: 'Co-Founder', photo: null, is_founder: true },
]

export default function Founders() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [founders, setFounders] = useState(FALLBACK_FOUNDERS)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let cancelled = false
    apiClient
      .get('/board/founders/')
      .then((res) => {
        const results = res.data?.results || res.data
        if (!cancelled && Array.isArray(results) && results.length > 0) {
          setFounders(results)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  async function openMember(member) {
    setSelected(member)
    try {
      const res = await apiClient.get(`/board/${member.id}/`)
      setSelected(res.data)
    } catch {
      // tumia taarifa tulizonazo tayari
    }
  }

  return (
    <>
      <PageBanner>
        <PageBannerText
          pageKey="founders"
          isSw={isSw}
          fallback={{
            badge_sw: '★ WAANZILISHI', badge_en: '★ FOUNDERS',
            title_sw: 'Waanzilishi wa TSMA', title_en: 'Founders of TSMA',
            subtitle_sw: 'Watu waliobeba dira ya kuanzisha TSMA na kuiongoza hadi hapa ilipofika.',
            subtitle_en: 'The people who carried the vision to found TSMA and led it to where it stands today.',
          }}
        />
      </PageBanner>

      <section className="max-w-4xl mx-auto px-5 md:px-8 py-14 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {founders.map((member) => (
            <BoardMemberCard key={member.id} member={member} onOpen={openMember} />
          ))}
        </div>

        <div className="text-center mt-14">
          <Link
            to="/board"
            className="inline-block border-b-2 border-terracotta text-navy font-bold text-sm pb-1 hover:text-terracotta transition-colors"
          >
            {isSw ? 'Angalia Wanabodi Wote →' : 'View All Board Members →'}
          </Link>
        </div>
      </section>

      {selected && <BoardProfileModal member={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
