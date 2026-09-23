import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import BoardMemberCard from '../components/BoardMemberCard.jsx'
import BoardProfileModal from '../components/BoardProfileModal.jsx'

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
      <section className="bg-navy-deep bg-track-lines text-white text-center py-16 md:py-20">
        <span className="inline-block border border-gold/50 text-gold text-xs font-extrabold tracking-widest px-5 py-2 rounded-full mb-6">
          ★ {isSw ? 'WAANZILISHI' : 'FOUNDERS'}
        </span>
        <h1 className="font-serif font-bold text-3xl md:text-5xl">
          {isSw ? 'Waanzilishi wa TSMA' : 'Founders of TSMA'}
        </h1>
        <p className="text-white/75 max-w-lg mx-auto mt-4 px-5">
          {isSw
            ? 'Watu waliobeba dira ya kuanzisha TSMA na kuiongoza hadi hapa ilipofika.'
            : 'The people who carried the vision to found TSMA and led it to where it stands today.'}
        </p>
      </section>

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
