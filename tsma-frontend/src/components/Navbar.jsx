import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageToggle from './LanguageToggle.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

export default function Navbar() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { isAuthenticated, user, logout } = useAuth()
  const { logoUrl } = useSiteSettings()
  const navigate = useNavigate()

  const links = [
    { to: '/about', label: t('nav.about') },
    { to: '/board', label: t('nav.board') },
    { to: '/management', label: t('nav.management') },
    { to: '/publications', label: t('nav.publications') },
    { to: '/teaching', label: t('nav.teaching') },
    { to: '/conferences', label: t('nav.conferences') },
    { to: '/members', label: t('nav.members') },
    { to: '/directory', label: t('nav.directory') },
    { to: '/news', label: t('nav.news') },
    { to: '/gallery', label: t('nav.gallery') },
    { to: '/contact', label: t('nav.contact') },
    { to: '/careers', label: t('nav.careers') },
  ]

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  async function handleLogout() {
    await logout()
    setOpen(false)
    navigate('/')
  }

  return (
    <header className="border-b border-black/5 relative z-40 bg-white">
      <div className="flex items-center justify-between px-5 md:px-8 py-3.5">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="TSMA"
              className="w-11 h-11 rounded-lg object-contain shrink-0"
            />
          ) : (
            // Fallback mpaka TSMA ipate logo rasmi — angalia SiteSettingsContext
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-navy to-green flex items-center justify-center text-white font-serif font-black text-lg shrink-0">
              T
            </div>
          )}
          <div className="leading-tight">
            <div className="font-serif font-bold text-lg text-navy">TSMA</div>
            <div className="font-sans font-bold text-[10px] text-terracotta tracking-wider">
              {t('nav.tagline')}
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-semibold text-ink hover:text-navy transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          <LanguageToggle />
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="text-sm font-bold text-navy hover:text-terracotta transition-colors"
              >
                {user?.full_name?.split(' ')[0] || 'Dashibodi'}
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm font-bold text-ink-muted hover:text-terracotta transition-colors"
              >
                {t('common.logout', 'Toka')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-sm font-bold text-navy hover:text-terracotta transition-colors"
              >
                {t('common.login')}
              </Link>
              <Link
                to="/members"
                className="bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm px-5 py-2.5 rounded-md transition-colors"
              >
                {t('nav.registerNow')}
              </Link>
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label="Fungua menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="lg:hidden text-navy text-2xl leading-none w-10 h-10 flex items-center justify-center"
        >
          ☰
        </button>
      </div>

      {/* Sidebar drawer (simu/tablet) */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!open}
      />

      <aside
        className={`fixed top-0 right-0 h-full w-[82%] max-w-sm bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu kuu"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-navy to-green flex items-center justify-center text-white font-serif font-black text-sm">
              T
            </div>
            <div className="font-serif font-bold text-navy">TSMA</div>
          </div>
          <button
            type="button"
            aria-label="Funga menu"
            onClick={() => setOpen(false)}
            className="text-navy text-2xl leading-none w-9 h-9 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 border-b border-black/5">
          <LanguageToggle />
        </div>

        <nav className="flex-1 overflow-y-auto px-5 py-2">
          {isAuthenticated && (
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="block text-[15px] font-bold text-navy py-3.5 border-b border-black/5"
            >
              👤 {user?.full_name || (t('common.dashboard', 'Dashibodi Yangu'))}
            </Link>
          )}
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className="block text-[15px] font-semibold text-ink py-3.5 border-b border-black/5"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="px-5 py-5 border-t border-black/5">
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="block w-full bg-cream text-navy font-extrabold text-sm text-center px-5 py-3.5 rounded-md"
            >
              {t('common.logout', 'Toka')}
            </button>
          ) : (
            <div className="space-y-3">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="block bg-cream text-navy font-extrabold text-sm text-center px-5 py-3.5 rounded-md"
              >
                {t('common.login')}
              </Link>
              <Link
                to="/members"
                onClick={() => setOpen(false)}
                className="block bg-gold text-navy-deep font-extrabold text-sm text-center px-5 py-3.5 rounded-md"
              >
                {t('nav.registerNow')}
              </Link>
            </div>
          )}
        </div>
      </aside>
    </header>
  )
}
