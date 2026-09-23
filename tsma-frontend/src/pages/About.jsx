import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import PartnersStrip from '../components/PartnersStrip.jsx'

/**
 * Maudhui haya ya FALLBACK yanatumika tu endapo backend haipatikani bado
 * (mfano wakati wa kuendeleza frontend pekee). Mara backend ikiwa tayari,
 * ukurasa huu unavuta maudhui halisi kutoka /api/content/about/ — yale
 * yanayohaririwa na Admin kupitia Django Admin (SiteContent -> About).
 */
const FALLBACK_CONTENT = {
  history_title_sw: 'Historia Yetu',
  history_title_en: 'Our History',
  history_body_sw:
    'Tanzania Sports Management Association (TSMA) ilianzishwa kwa lengo la kuunganisha wataalamu, wasomi, na wadau wa sekta ya michezo nchini Tanzania, kwa ajili ya kujenga uchumi wa michezo wenye tija na endelevu.',
  history_body_en:
    "The Tanzania Sports Management Association (TSMA) was founded to connect professionals, academics, and stakeholders in Tanzania's sports sector to build a productive and sustainable sports economy.",
  vision_sw:
    'Kuwa taasisi inayoongoza kwa uwezeshaji wa uchumi wa michezo Tanzania, inayotambulika kikanda na kimataifa kwa taaluma na uwazi.',
  vision_en:
    "To be the leading institution empowering Tanzania's sports economy, recognized regionally and internationally for professionalism and transparency.",
  mission_sw:
    'Kuunganisha wataalamu, wanachama, wadhamini na wawekezaji kujenga mfumo wa michezo unaojiendesha wenyewe, wenye kutengeneza ajira na fursa za kiuchumi kwa Watanzania.',
  mission_en:
    'To connect professionals, members, sponsors and investors in building a self-sustaining sports ecosystem that creates jobs and economic opportunities for Tanzanians.',
  values: [
    { id: 1, icon: '🎯', title_sw: 'Weledi', title_en: 'Professionalism', description_sw: 'Tunatekeleza majukumu yetu kwa uadilifu na taaluma.', description_en: 'We work with integrity and high professional standards.' },
    { id: 2, icon: '🔍', title_sw: 'Uwazi', title_en: 'Transparency', description_sw: 'Uwazi katika uongozi, fedha na maamuzi.', description_en: 'Transparency in leadership, finances, and decisions.' },
    { id: 3, icon: '🤝', title_sw: 'Ushirikiano', title_en: 'Collaboration', description_sw: 'Tunaunganisha wadau kufikia malengo ya pamoja.', description_en: 'We bring stakeholders together for shared goals.' },
    { id: 4, icon: '💡', title_sw: 'Ubunifu', title_en: 'Innovation', description_sw: 'Tunatafuta suluhisho mpya za kiuchumi.', description_en: 'We seek innovative economic solutions.' },
  ],
  milestones: [
    { id: 1, year: 2020, title_sw: 'Kuanzishwa kwa TSMA', title_en: 'TSMA Founded', description_sw: '', description_en: '' },
    { id: 2, year: 2023, title_sw: 'Mkutano wa Kwanza wa Kitaifa', title_en: 'First National Conference', description_sw: '', description_en: '' },
    { id: 3, year: 2026, title_sw: 'Uzinduzi wa Jukwaa la Kidijitali', title_en: 'Digital Platform Launch', description_sw: '', description_en: '' },
  ],
}

export default function About() {
  const { t, i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const [content, setContent] = useState(FALLBACK_CONTENT)

  useEffect(() => {
    let cancelled = false
    apiClient
      .get('/content/about/')
      .then((res) => {
        if (!cancelled && res.data) setContent(res.data)
      })
      .catch(() => {
        // Backend haipatikani bado — tunabaki na FALLBACK_CONTENT
      })
    return () => {
      cancelled = true
    }
  }, [])

  const pick = (swKey, enKey) => (isSw ? content[swKey] : content[enKey])

  return (
    <>
      {/* ============ HERO ============
          MUHIMU (picha): weka hapa picha ya nyuma (background) ya tukio
          kubwa la TSMA (mfano picha ya kundi la mkutano, au uwanja) —
          1920x800px, iwe na watu/hisia za taasisi. Sasa ni gradient
          placeholder. */}
      <section className="relative bg-navy-deep bg-track-lines text-white py-20 md:py-28 text-center overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto px-5">
          <span className="inline-block border border-gold/50 text-gold text-xs font-extrabold tracking-widest px-5 py-2 rounded-full mb-6">
            {isSw ? 'KUHUSU SISI' : 'ABOUT US'}
          </span>
          <h1 className="font-serif font-bold text-4xl md:text-5xl">
            TSMA — {isSw ? 'Tunaowajibika Kwako' : 'Committed to You'}
          </h1>
        </div>
      </section>

      {/* ============ VISION & MISSION ============ */}
      <section className="max-w-5xl mx-auto px-5 md:px-8 py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border border-black/10 rounded-xl p-8">
          <div className="text-terracotta text-3xl mb-4">🔭</div>
          <h2 className="font-serif font-bold text-2xl text-navy mb-3">
            {isSw ? 'Dira Yetu' : 'Our Vision'}
          </h2>
          <p className="text-ink-muted leading-relaxed">{pick('vision_sw', 'vision_en')}</p>
        </div>
        <div className="border border-black/10 rounded-xl p-8">
          <div className="text-terracotta text-3xl mb-4">🎯</div>
          <h2 className="font-serif font-bold text-2xl text-navy mb-3">
            {isSw ? 'Dhamira Yetu' : 'Our Mission'}
          </h2>
          <p className="text-ink-muted leading-relaxed">{pick('mission_sw', 'mission_en')}</p>
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
            {content.values.map((v) => (
              <div key={v.id} className="bg-white rounded-xl p-6 text-center border border-black/5">
                <div className="text-3xl mb-3">{v.icon}</div>
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
            {pick('history_title_sw', 'history_title_en')}
          </h2>
          <div className="lane-divider mx-auto mt-4" />
        </div>

        <p className="text-ink leading-relaxed max-w-3xl mx-auto text-center mb-14">
          {pick('history_body_sw', 'history_body_en')}
        </p>

        {/* Timeline */}
        <div className="relative max-w-2xl mx-auto">
          <div className="absolute left-[27px] top-2 bottom-2 w-px bg-black/10" />
          <div className="space-y-10">
            {content.milestones.map((m) => (
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
            ))}
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

      <PartnersStrip isSw={isSw} />
    </>
  )
}
