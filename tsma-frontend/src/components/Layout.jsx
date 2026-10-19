import { Outlet } from 'react-router-dom'
import TopBar from './TopBar.jsx'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'
import ConferencePromoModal from './ConferencePromoModal.jsx'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ConferencePromoModal />
    </div>
  )
}
