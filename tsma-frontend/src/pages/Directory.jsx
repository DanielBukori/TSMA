import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import PageBanner from '../components/PageBanner.jsx'
import PageBannerText from '../components/PageBannerText.jsx'

export default function Directory() {
  const { t, i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    apiClient
      .get('/members/directory/')
      .then((res) => setProfiles(res.data?.results || res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function openProfile(memberId) {
    try {
      const res = await apiClient.get(`/members/directory/${memberId}/`)
      setSelected(res.data)
    } catch {
      // profaili haipatikani (imefanywa faragha ghafla) - endelea kimya
    }
  }

  return (
    <>
      <PageBanner>
        <PageBannerText
          pageKey="directory"
          isSw={isSw}
          fallback={{
            badge_sw: 'MTANDAO WA WATAALAMU', badge_en: 'PROFESSIONALS NETWORK',
            title_sw: 'Wataalamu wa TSMA', title_en: 'TSMA Professionals',
            subtitle_sw: 'Tafuta na uunganishwe na wataalamu wa usimamizi wa michezo Tanzania.',
            subtitle_en: 'Find and connect with sports management professionals across Tanzania.',
          }}
        />
      </PageBanner>

      <section className="max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-20">
        {loading ? (
          <p className="text-center text-ink-muted text-sm">{isSw ? 'Inapakua...' : 'Loading...'}</p>
        ) : profiles.length === 0 ? (
          <p className="text-center text-ink-muted text-sm">
            {isSw ? 'Hakuna wataalamu bado wanaoonekana hadharani.' : 'No public professional profiles yet.'}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {profiles.map((p) => (
              <button
                key={p.member}
                onClick={() => openProfile(p.member)}
                className="text-left border border-black/10 rounded-xl p-5 hover:border-gold hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  {p.photo ? (
                    <img src={p.photo} alt="" className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-navy/10 flex items-center justify-center text-navy font-serif font-bold text-lg">
                      {p.full_name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-navy text-sm truncate">{p.full_name}</div>
                    <div className="text-xs text-ink-muted truncate">{p.professional_title}</div>
                  </div>
                </div>
                {p.specialization && (
                  <span className="inline-block mt-3 text-[11px] font-bold text-gold-dark bg-gold/10 px-2.5 py-1 rounded-full">
                    {p.specialization}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-5">
              {selected.photo ? (
                <img src={selected.photo} alt="" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-navy/10 flex items-center justify-center text-navy font-serif font-bold text-2xl">
                  {selected.full_name?.charAt(0) || '?'}
                </div>
              )}
              <div>
                <h3 className="font-serif font-bold text-lg text-navy">{selected.full_name}</h3>
                <p className="text-sm text-ink-muted">{selected.professional_title}</p>
                <p className="text-xs text-gold-dark font-bold">{selected.membership_tier}</p>
              </div>
            </div>

            {selected.bio && <p className="text-sm text-ink mb-4">{selected.bio}</p>}

            <div className="space-y-3 text-sm">
              {selected.current_organization && (
                <p><span className="font-bold">{isSw ? 'Mwajiri: ' : 'Organization: '}</span>{selected.current_organization}</p>
              )}
              {selected.years_of_experience != null && (
                <p><span className="font-bold">{isSw ? 'Uzoefu: ' : 'Experience: '}</span>{selected.years_of_experience} {isSw ? 'miaka' : 'years'}</p>
              )}
              {selected.education && (
                <p><span className="font-bold">{isSw ? 'Elimu: ' : 'Education: '}</span>{selected.education}</p>
              )}
              {selected.experience && (
                <p><span className="font-bold">{isSw ? 'Uzoefu wa Kazi: ' : 'Work Experience: '}</span>{selected.experience}</p>
              )}
              {selected.certifications && (
                <p><span className="font-bold">{isSw ? 'Vyeti: ' : 'Certifications: '}</span>{selected.certifications}</p>
              )}
            </div>

            <div className="flex gap-4 mt-5 pt-5 border-t border-black/10">
              {selected.linkedin_url && (
                <a href={selected.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-terracotta">
                  LinkedIn →
                </a>
              )}
              {selected.public_email && (
                <a href={`mailto:${selected.public_email}`} className="text-xs font-bold text-terracotta">
                  {isSw ? 'Wasiliana' : 'Contact'} →
                </a>
              )}
              {selected.cv_file && (
                <a href={selected.cv_file} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-terracotta">
                  {isSw ? 'Pakua CV' : 'Download CV'} →
                </a>
              )}
            </div>

            <button
              onClick={() => setSelected(null)}
              className="mt-6 text-xs text-ink-muted font-bold"
            >
              {isSw ? '← Funga' : '← Close'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
