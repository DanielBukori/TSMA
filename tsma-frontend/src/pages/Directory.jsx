import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import PageBanner from '../components/PageBanner.jsx'
import PageBannerText from '../components/PageBannerText.jsx'

// Kipengele kimoja cha profaili (Wasifu, Uzoefu, Elimu...) - kinafunguka kwa kubofya.
function ProfileSection({ id, title, openKey, setOpenKey, children }) {
  const open = openKey === id
  return (
    <div className="border border-black/10 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpenKey(open ? null : id)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left bg-cream hover:bg-gold/10 transition-colors"
      >
        <span className="text-sm font-bold text-navy">{title}</span>
        <span className={`text-navy text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && <div className="px-4 py-4 text-sm text-ink leading-relaxed whitespace-pre-line">{children}</div>}
    </div>
  )
}

export default function Directory() {
  const { t, i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [openKey, setOpenKey] = useState(null) // kipengele kimoja kinafunguka kwa wakati

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
      setOpenKey(null)
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
            className="bg-surface rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-7"
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

            {selected.is_public === false && (
              <p className="text-[11px] font-bold text-terracotta bg-terracotta/10 rounded-md px-3 py-2 mb-4">
                {isSw
                  ? '🔒 Profaili hii ni siri - unaiona kwa sababu ni yako au wewe ni admin.'
                  : '🔒 This profile is private - you can see it because it is yours or you are an admin.'}
              </p>
            )}

            {selected.current_organization && (
              <p className="text-xs text-ink-muted mb-4">
                <span className="font-bold">{isSw ? 'Mwajiri: ' : 'Organization: '}</span>
                {selected.current_organization}
              </p>
            )}

            {/* Vipengele - vinafunguka mtu akibofya */}
            <div className="space-y-2">
              {selected.bio && (
                <ProfileSection id="bio" openKey={openKey} setOpenKey={setOpenKey} title={isSw ? 'Wasifu' : 'About'}>
                  {selected.bio}
                </ProfileSection>
              )}
              {(selected.experience || selected.years_of_experience != null) && (
                <ProfileSection id="experience" openKey={openKey} setOpenKey={setOpenKey} title={isSw ? 'Uzoefu wa Kazi' : 'Work Experience'}>
                  {selected.years_of_experience != null && (
                    <p className="font-bold mb-2">
                      {selected.years_of_experience} {isSw ? 'miaka ya uzoefu' : 'years of experience'}
                    </p>
                  )}
                  {selected.experience}
                </ProfileSection>
              )}
              {selected.education && (
                <ProfileSection id="education" openKey={openKey} setOpenKey={setOpenKey} title={isSw ? 'Elimu' : 'Education'}>
                  {selected.education}
                </ProfileSection>
              )}
              {selected.certifications && (
                <ProfileSection id="certifications" openKey={openKey} setOpenKey={setOpenKey} title={isSw ? 'Vyeti' : 'Certifications'}>
                  {selected.certifications}
                </ProfileSection>
              )}
              {selected.cv_file && (
                <ProfileSection id="cv" openKey={openKey} setOpenKey={setOpenKey} title={selected.cv_public === false ? 'CV 🔒' : 'CV'}>
                  {selected.cv_public === false && (
                    <p className="text-[11px] text-terracotta font-bold mb-2">
                      {isSw ? 'Imefichwa kwa jamii - wewe/admin tu mnaiona.' : 'Hidden from the community - only you/admins see it.'}
                    </p>
                  )}
                  <a href={selected.cv_file} target="_blank" rel="noopener noreferrer" className="font-bold text-terracotta">
                    {isSw ? 'Pakua CV →' : 'Download CV →'}
                  </a>
                </ProfileSection>
              )}
              {(selected.linkedin_url || selected.public_email) && (
                <ProfileSection id="contact" openKey={openKey} setOpenKey={setOpenKey} title={isSw ? 'Mawasiliano' : 'Contact'}>
                  {selected.public_email && selected.email_public === false && (
                    <p className="text-[11px] text-terracotta font-bold mb-2">
                      {isSw ? '🔒 Barua pepe imefichwa kwa jamii - wewe/admin tu mnaiona.' : '🔒 Email hidden from the community - only you/admins see it.'}
                    </p>
                  )}
                  <div className="space-y-2">
                    {selected.linkedin_url && (
                      <a href={selected.linkedin_url} target="_blank" rel="noopener noreferrer" className="block font-bold text-terracotta">
                        LinkedIn →
                      </a>
                    )}
                    {selected.public_email && (
                      <a href={`mailto:${selected.public_email}`} className="block font-bold text-terracotta">
                        {selected.public_email}
                      </a>
                    )}
                  </div>
                </ProfileSection>
              )}
              {!selected.bio && !selected.experience && !selected.education && !selected.certifications &&
                !selected.cv_file && !selected.linkedin_url && !selected.public_email &&
                selected.years_of_experience == null && (
                  <p className="text-xs text-ink-muted">
                    {isSw ? 'Mwanachama bado hajaongeza maelezo ya profaili.' : 'This member has not added profile details yet.'}
                  </p>
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
