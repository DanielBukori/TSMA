import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Home from './pages/Home.jsx'
import PageLoader from './components/PageLoader.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { SINGLE_PAGE } from './config/layout.js'

// Kurasa hizi zinapakuliwa tu mtu anapozifungua - Home inafunguka haraka zaidi
// Kurasa za sehemu (zinatumika kama kurasa tofauti tu pale VITE_SINGLE_PAGE=false)
const About = lazy(() => import('./pages/About.jsx'))
const Board = lazy(() => import('./pages/Board.jsx'))
const Publications = lazy(() => import('./pages/Publications.jsx'))
const Teaching = lazy(() => import('./pages/Teaching.jsx'))
const Conferences = lazy(() => import('./pages/Conferences.jsx'))
const Members = lazy(() => import('./pages/Members.jsx'))
const News = lazy(() => import('./pages/News.jsx'))
const Gallery = lazy(() => import('./pages/Gallery.jsx'))
const Contact = lazy(() => import('./pages/Contact.jsx'))
const SECTION_PAGES = [
  ['about', '/about', About],
  ['board', '/board', Board],
  ['publications', '/publications', Publications],
  ['teaching', '/teaching', Teaching],
  ['conferences', '/conferences', Conferences],
  ['members', '/members', Members],
  ['news', '/news', News],
  ['gallery', '/gallery', Gallery],
  ['contact', '/contact', Contact],
]

const Management = lazy(() => import('./pages/Management.jsx'))
const Directory = lazy(() => import('./pages/Directory.jsx'))
const Careers = lazy(() => import('./pages/Careers.jsx'))
const CareerDetail = lazy(() => import('./pages/CareerDetail.jsx'))
const Founders = lazy(() => import('./pages/Founders.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Register = lazy(() => import('./pages/Register.jsx'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail.jsx'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const ConferenceDetail = lazy(() => import('./pages/ConferenceDetail.jsx'))
const PublicationDetail = lazy(() => import('./pages/PublicationDetail.jsx'))
const AbstractSubmit = lazy(() => import('./pages/AbstractSubmit.jsx'))
const GalleryAlbumDetail = lazy(() => import('./pages/GalleryAlbumDetail.jsx'))
const CourseDetail = lazy(() => import('./pages/CourseDetail.jsx'))
const SessionDetail = lazy(() => import('./pages/SessionDetail.jsx'))
const QuizTake = lazy(() => import('./pages/QuizTake.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))
const SecurityLogin = lazy(() => import('./pages/SecurityLogin.jsx'))
const SecurityDashboard = lazy(() => import('./pages/SecurityDashboard.jsx'))
const EditorAccessLogin = lazy(() => import('./pages/EditorAccessLogin.jsx'))
const EditorDashboard = lazy(() => import('./pages/EditorDashboard.jsx'))
const EditorAccessGuard = lazy(() => import('./components/EditorAccessGuard.jsx'))
const VerifyMember = lazy(() => import('./pages/VerifyMember.jsx'))
const VerifyCertificate = lazy(() => import('./pages/VerifyCertificate.jsx'))

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Security Dashboard - TOFAUTI na tovuti kuu, haina Navbar/Footer
            ya umma (ni chombo cha ndani cha uendeshaji, si ukurasa wa
            umma), na ina mfumo wake wa login (SecurityAdminUser). */}
        <Route path="/security/login" element={<SecurityLogin />} />
        <Route path="/security" element={<SecurityDashboard />} />

        {/* Editor access ni njia tofauti; public routes, member dashboard na Security Dashboard hazibadilishwi. */}
        <Route path="/editor-access/login" element={<EditorAccessLogin />} />
        <Route path="/editor-access" element={<Navigate to="/editor-access/dashboard" replace />} />
        <Route path="/editor-access/dashboard" element={<EditorAccessGuard><EditorDashboard /></EditorAccessGuard>} />

        <Route element={<Layout />}>
          {/* Home = ukurasa mmoja mrefu wenye sehemu zote (About, Board, Publications, Teaching,
              Conferences, Members, News, Gallery, Contact). Njia za zamani kama /about zinaelekezwa
              kwenye sehemu yake: /#about. Kurasa za maelezo/fomu/QR zinabaki tofauti. */}
          <Route path="/" element={<Home />} />
          {/* Kurasa za sehemu: ukurasa mmoja = elekeza kwenye sehemu ya Home (/#about);
              kurasa tofauti = ukurasa wenyewe */}
          {SECTION_PAGES.map(([id, path, Page]) => (
            <Route key={id} path={path} element={SINGLE_PAGE ? <Navigate to={`/#${id}`} replace /> : <Page />} />
          ))}
          <Route path="/management" element={<Management />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/careers/:slug" element={<CareerDetail />} />
          <Route path="/founders" element={<Founders />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ForgotPassword />} />
          {/* Ukurasa wa QR ya kadi ya uanachama (public) */}
          <Route path="/verify-member/:code" element={<VerifyMember />} />
          <Route path="/verify-certificate/:code" element={<VerifyCertificate />} />
          <Route path="/conferences/:slug" element={<ConferenceDetail />} />
          <Route path="/publications/submit-abstract" element={<AbstractSubmit />} />
          <Route path="/publications/:slug" element={<PublicationDetail />} />
          <Route path="/gallery/:slug" element={<GalleryAlbumDetail />} />
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
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
