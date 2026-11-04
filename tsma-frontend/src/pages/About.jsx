import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import PageBanner from '../components/PageBanner.jsx'
import PageBannerText from '../components/PageBannerText.jsx'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'

export default function About() {
  const { t, i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const [content, setContent] = useState(null)
  const [state, setState] = useState('loading')

  useEffect(() => {
    let cancelled = false
    setState('loading')
    apiClient
      .get('/content/about/')
      .then((res) => {
        if (cancelled) return
        setContent(res.data ?? null)
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const pick = (swKey, enKey) => (content ? ((isSw ? content[swKey] : content[enKey]) || '') : '')

  const milestones = Array.isArray(content?.milestones) ? content.milestones : []

  return (
    <>
      {/* ============ HERO ============
          MUHIMU (picha): weka hapa picha ya nyuma (background) ya tukio
          kubwa la TSMA (mfano picha ya kundi la mkutano, au uwanja) —
          1920x800px, iwe na watu/hisia za taasisi. Sasa ni gradient
          placeholder. */}
      <PageBanner>
        <PageBannerText
          pageKey="about"
          isSw={isSw}
          titleClassName="font-serif font-bold text-4xl md:text-5xl"
          fallback={{
            badge_sw: 'KUHUSU SISI', badge_en: 'ABOUT US',
            title_sw: 'TSMA — Tunaowajibika Kwako', title_en: 'TSMA — Committed to You',
          }}
        />
      </PageBanner>

      {/* ============ VISION & MISSION ============ */}
      <section className="max-w-5xl mx-auto px-5 md:px-8 py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border border-black/10 rounded-xl p-8">
          <h2 className="font-serif font-bold text-2xl text-navy mb-3">
            {isSw ? 'Dira Yetu' : 'Our Vision'}
          </h2>
          <ContentOrEmpty
            isSw={isSw}
            state={state}
            text={pick('vision_sw', 'vision_en')}
            emptySw="Dira ya TSMA bado haijawekwa na mhariri."
            emptyEn="TSMA's vision has not been published yet."
            className="text-ink-muted leading-relaxed"
          />
        </div>
        <div className="border border-black/10 rounded-xl p-8">
          <h2 className="font-serif font-bold text-2xl text-navy mb-3">
            {isSw ? 'Dhamira Yetu' : 'Our Mission'}
          </h2>
          <ContentOrEmpty
            isSw={isSw}
            state={state}
            text={pick('mission_sw', 'mission_en')}
            emptySw="Dhamira ya TSMA bado haijawekwa na mhariri."
            emptyEn="TSMA's mission has not been published yet."
            className="text-ink-muted leading-relaxed"
          />
        </div>
      </section>

      {/* ============ CORE VALUES ============ */}
      <section className="bg-cream py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12">
            <div className="text-terracotta font-extrabold text-xs tracking-widest mb-2">
              {isSw ? 'MISINGI YETU' : 'OUR FOUNDATION'}
            </div>
            <h2 className="font-serif font-bold text-2xl md:text-3xl text-navy">
              {isSw ? 'Imani na Maadili' : 'Values We Stand For'}
            </h2>
            <div className="lane-divider mx-auto mt-4" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {(content?.values || []).map((v) => (
              <div key={v.id} className="bg-surface rounded-xl p-6 text-center border border-black/5">
                <h3 className="font-serif font-bold text-navy mb-1.5">
                  {isSw ? v.title_sw : v.title_en}
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {isSw ? v.description_sw : v.description_en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HISTORY + TIMELINE ============
          MUHIMU (picha): weka picha ya kihistoria hapa (mfano picha ya
          kuanzishwa kwa TSMA, au shughuli za mwanzo) — 800x600px,
          itaonekana kando ya maandishi ya historia. */}
      <section className="max-w-5xl mx-auto px-5 md:px-8 py-16 md:py-20">
        <div className="text-center mb-12">
          <div className="text-terracotta font-extrabold text-xs tracking-widest mb-2">
            {isSw ? 'SAFARI YETU' : 'OUR JOURNEY'}
          </div>
          <h2 className="font-serif font-bold text-2xl md:text-3xl text-navy">
            {pick('history_title_sw', 'history_title_en') || (isSw ? 'Historia Yetu' : 'Our Story')}
          </h2>
          <div className="lane-divider mx-auto mt-4" />
        </div>

        <div className="mb-14">
          <ContentOrEmpty
            isSw={isSw}
            state={state}
            text={pick('history_body_sw', 'history_body_en')}
            emptySw="Historia ya TSMA bado haijaandikwa na mhariri."
            emptyEn="TSMA's history has not been published yet."
            className="text-ink leading-relaxed max-w-3xl mx-auto text-center"
          />
        </div>

        {/* Timeline */}
        <div className="relative max-w-2xl mx-auto">
          {milestones.length > 0 && <div className="absolute left-[27px] top-2 bottom-2 w-px bg-black/10" />}
          <div className="space-y-10">
            {milestones.length === 0 ? (
              <EmptyState
                isSw={isSw}
                tone={state === 'error' ? 'error' : 'empty'}
                sw={state === 'error' ? 'Hakuna historia ya kuonyesha kwa sasa.' : 'Taarifa za historia bado hazijawekwa na mhariri.'}
                en={state === 'error' ? 'No history to show right now.' : 'Timeline details have not been published yet.'}
                hintSw={state === 'error' ? 'Muunganisho na seva haukufanyika. Fundi wa TSMA ataangalia; jaribu tena baadaye.' : 'Tarehe na matukio rasmi yataonekana hapa mara tu yatakapowekwa na kuthibitishwa kwenye mfumo.'}
                hintEn={state === 'error' ? 'The connection to the server failed. The TSMA administrator will be notified; please try again later.' : 'Official dates and milestones will appear here as soon as they are added and verified in our system.'}
              />
            ) : (milestones.map((m) => (
              <div key={m.id} className="relative pl-16">
                <div className="absolute left-0 top-0 w-14 h-14 rounded-full bg-navy text-gold font-serif font-black text-sm flex items-center justify-center border-4 border-cream">
                  {m.year}
                </div>
                <h3 className="font-serif font-bold text-lg text-navy">
                  {isSw ? m.title_sw : m.title_en}
                </h3>
                {(isSw ? m.description_sw : m.description_en) && (
                  <p className="text-sm text-ink-muted mt-1.5 leading-relaxed">
                    {isSw ? m.description_sw : m.description_en}
                  </p>
                )}
              </div>
            )))}
          </div>
        </div>
      </section>

      {/* ============ LINK TO BOARD ============ */}
      <section className="bg-navy text-white text-center py-14 px-5">
        <h2 className="font-serif font-bold text-2xl md:text-3xl mb-4">
          {isSw ? 'Fahamu Uongozi Wetu' : 'Meet Our Leadership'}
        </h2>
        <p className="text-white/75 max-w-xl mx-auto mb-7">
          {isSw
            ? 'Wanabodi na waanzilishi wanaoongoza dira ya TSMA.'
            : 'The board members and founders driving TSMA\'s vision.'}
        </p>
        <Link
          to="/board"
          className="inline-block bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm px-8 py-4 rounded-md transition-colors"
        >
          {isSw ? 'Angalia Bodi →' : 'View Board →'}
        </Link>
      </section>

    </>
  )
}

/**
 * Maandishi halisi kutoka API tu; ikiwa hayajawekwa (au seva haikujibu)
 * tunaonyesha hali tupu/ikifisiri — sio maudhui yaliyoundwa.
 */
function ContentOrEmpty({ isSw, state, text, emptySw, emptyEn, className }) {
  if (text) return <p className={className}>{text}</p>
  const isError = state === 'error'
  return (
    <EmptyState
      isSw={isSw}
      tone={isError ? 'error' : 'empty'}
      sw={isError ? 'Hakuna maudhui ya kuonyesha kwa sasa.' : emptySw}
      en={isError ? 'No content to show right now.' : emptyEn}
      hintSw={isError ? 'Muunganisho na seva haukufanyika. Fundi wa TSMA ataangalia; jaribu tena baadaye.' : 'Maudhui haya huongezwa na mhariri wa TSMA kupitia mfumo.'}
      hintEn={isError ? 'The connection to the server failed. The TSMA administrator will be notified; please try again later.' : 'This content is added by the TSMA editor through the system.'}
    />
  )
}
