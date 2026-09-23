import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import Board from './pages/Board.jsx'
import Management from './pages/Management.jsx'
import Directory from './pages/Directory.jsx'
import Careers from './pages/Careers.jsx'
import CareerDetail from './pages/CareerDetail.jsx'
import Founders from './pages/Founders.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Members from './pages/Members.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Conferences from './pages/Conferences.jsx'
import ConferenceDetail from './pages/ConferenceDetail.jsx'
import Publications from './pages/Publications.jsx'
import PublicationDetail from './pages/PublicationDetail.jsx'
import AbstractSubmit from './pages/AbstractSubmit.jsx'
import News from './pages/News.jsx'
import Gallery from './pages/Gallery.jsx'
import GalleryAlbumDetail from './pages/GalleryAlbumDetail.jsx'
import Contact from './pages/Contact.jsx'
import Teaching from './pages/Teaching.jsx'
import CourseDetail from './pages/CourseDetail.jsx'
import SessionDetail from './pages/SessionDetail.jsx'
import QuizTake from './pages/QuizTake.jsx'
import NotFound from './pages/NotFound.jsx'
import SecurityLogin from './pages/SecurityLogin.jsx'
import SecurityDashboard from './pages/SecurityDashboard.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Security Dashboard - TOFAUTI na tovuti kuu, haina Navbar/Footer
            ya umma (ni chombo cha ndani cha uendeshaji, si ukurasa wa
            umma), na ina mfumo wake wa login (SecurityAdminUser). */}
        <Route path="/security/login" element={<SecurityLogin />} />
        <Route path="/security" element={<SecurityDashboard />} />

        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/board" element={<Board />} />
          <Route path="/management" element={<Management />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/careers/:slug" element={<CareerDetail />} />
          <Route path="/founders" element={<Founders />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/members" element={<Members />} />
          <Route path="/conferences" element={<Conferences />} />
          <Route path="/conferences/:slug" element={<ConferenceDetail />} />
          <Route path="/publications" element={<Publications />} />
          <Route path="/publications/submit-abstract" element={<AbstractSubmit />} />
          <Route path="/publications/:slug" element={<PublicationDetail />} />
          <Route path="/news" element={<News />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/gallery/:slug" element={<GalleryAlbumDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/teaching" element={<Teaching />} />
          <Route path="/teaching/courses/:slug" element={<CourseDetail />} />
          <Route path="/teaching/sessions/:slug" element={<SessionDetail />} />
          <Route path="/teaching/quiz/:id" element={<QuizTake />} />

          {/* Kurasa zinazohitaji akaunti (login) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>

          {/* Kurasa nyingine (Publications, Conferences, n.k.) zitaongezwa
              hapa tukiendelea, kila moja ikiwa na component yake chini ya
              src/pages/ */}

          {/* LAZIMA iwe route ya MWISHO ndani ya Layout - "catch-all" kwa
              njia yoyote isiyolingana na route yoyote hapo juu. */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
