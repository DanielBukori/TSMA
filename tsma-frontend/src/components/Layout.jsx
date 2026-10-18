import { Outlet } from 'react-router-dom'
import TopBar from './TopBar.jsx'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'
import ConferencePromoModal from './ConferencePromoModal.jsx'
import PartnersStrip from './PartnersStrip.jsx'
import { useTranslation } from 'react-i18next'

export default function Layout() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <PartnersStrip isSw={isSw} />
      <Footer />
      <ConferencePromoModal />
    </div>
  )
}
