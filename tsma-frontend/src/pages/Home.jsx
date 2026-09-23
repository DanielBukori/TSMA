import HeroSlideshow from '../components/HeroSlideshow.jsx'
import InfoBox from '../components/InfoBox.jsx'
import QuickLinks from '../components/QuickLinks.jsx'
import AboutSummary from '../components/AboutSummary.jsx'
import NewsPreview from '../components/NewsPreview.jsx'
import ConferenceCallout from '../components/ConferenceCallout.jsx'
import Testimonials from '../components/Testimonials.jsx'
import PartnersStrip from '../components/PartnersStrip.jsx'
import { useTranslation } from 'react-i18next'

export default function Home() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

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
