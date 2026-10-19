import { lazy } from 'react'
import HeroSlideshow from '../components/HeroSlideshow.jsx'
import InfoBox from '../components/InfoBox.jsx'
import QuickLinks from '../components/QuickLinks.jsx'
import ConferenceCallout from '../components/ConferenceCallout.jsx'
import Testimonials from '../components/Testimonials.jsx'
import PartnersStrip from '../components/PartnersStrip.jsx'
import LazySection from '../components/LazySection.jsx'
import AboutSummary from '../components/AboutSummary.jsx'
import NewsPreview from '../components/NewsPreview.jsx'
import { SINGLE_PAGE } from '../config/layout.js'
import { useTranslation } from 'react-i18next'

// Kila sehemu ni "chunk" yake: inapakuliwa pale tu mtu anapokaribia kuiona (au kuichagua kwenye menyu)
const About = lazy(() => import('./About.jsx'))
const Board = lazy(() => import('./Board.jsx'))
const Publications = lazy(() => import('./Publications.jsx'))
const Teaching = lazy(() => import('./Teaching.jsx'))
const Conferences = lazy(() => import('./Conferences.jsx'))
const Members = lazy(() => import('./Members.jsx'))
const News = lazy(() => import('./News.jsx'))
const Gallery = lazy(() => import('./Gallery.jsx'))
const Contact = lazy(() => import('./Contact.jsx'))

/**
 * Home = ukurasa MMOJA mrefu. Sehemu zote zikiwa kwa mpangilio huu (juu hadi chini),
 * na Navbar inaruka kwenye sehemu uliyochagua. Kinachobaki kama kurasa tofauti:
 * login/usajili, dashibodi, kurasa za maelezo (chapisho, kozi, mkutano, albamu, kazi),
 * fomu ya abstract, kurasa za QR (uthibitisho wa kadi/cheti), na security.
 */
const SECTIONS_BEFORE_PARTNERS = [
  { id: 'about', Component: About },
  { id: 'board', Component: Board },
  { id: 'publications', Component: Publications },
  { id: 'teaching', Component: Teaching },
  { id: 'conferences', Component: Conferences },
  { id: 'members', Component: Members },
  { id: 'news', Component: News },
  { id: 'gallery', Component: Gallery },
]

export default function Home() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  // Kurasa tofauti (VITE_SINGLE_PAGE=false): Home ya kawaida yenye muhtasari tu
  if (!SINGLE_PAGE) {
    return (
      <>
        <HeroSlideshow />
        <InfoBox />
        <QuickLinks />
        <AboutSummary />
        <NewsPreview />
        <ConferenceCallout />
        <Testimonials />
        <PartnersStrip isSw={isSw} />
      </>
    )
  }

  return (
    <>
      <HeroSlideshow />
      <InfoBox />
      <QuickLinks />

      {SECTIONS_BEFORE_PARTNERS.map(({ id, Component }) => (
        <div key={id} className="contents">
          <LazySection id={id}>
            <Component />
          </LazySection>
          {/* Maelezo ya TSMA yaonekane kabla ya banner ya conference. */}
          {id === 'about' && <ConferenceCallout />}
        </div>
      ))}

      <Testimonials />
      <PartnersStrip isSw={isSw} />

      <LazySection id="contact">
        <Contact />
      </LazySection>
    </>
  )
}
