import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageToggle from './LanguageToggle.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

/**
 * Navbar — "pill" inayoelea (feel ya snippe.sh) badala ya bar ya kawaida
 * yenye mstari wa chini. Kazi zote za awali (auth, lugha, "Zaidi"
 * dropdown, mobile drawer) hazijaguswa — ni sura tu iliyobadilika.
 *
 * Tofauti kuu na Navbar ya awali:
 * - `<header>` sasa ni "sticky" na ina nafasi (padding) pande zote —
 *   pill yenyewe iko ndani ya div ya pili (rounded-full, shadow, blur).
 * - Rangi za TSMA (navy/gold/terracotta) zimebaki - hii ni MUUNDO
 *   (structure/shape/spacing) wa Snippe, si rangi zake za kijani.
 *   Ukipenda rangi za kijani/fintech pia, niambie - ni badiliko dogo
 *   la tailwind.config.js tu.
 */
export default function Navbar() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
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

  // Viungo vikuu vinaonekana kwenye upau; vingine vinaingia kwenye "Zaidi"
  const primaryPaths = ['/about', '/publications', '/teaching', '/conferences', '/members']
  const primaryLinks = links.filter((l) => primaryPaths.includes(l.to))
  const moreLinks = links.filter((l) => !primaryPaths.includes(l.to))

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

  // Pill inapata kivuli/mpaka kidogo zaidi mara tu ukurasa unapo-scroll —
  // hii ndiyo inatoa ile hisia ya "inayoelea" ya Snippe.
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 8)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  async function handleLogout() {
    await logout()
    setOpen(false)
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 md:px-5 md:pt-4">
      <div
        className={`flex items-center justify-between gap-3 rounded-full bg-white/90 backdrop-blur-md px-4 md:px-6 py-2.5 transition-shadow ${
          scrolled ? 'shadow-lg shadow-black/10 ring-1 ring-black/5' : 'shadow-md shadow-black/5'
        }`}
      >
        <Link to="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setOpen(false)}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="TSMA"
              className="w-10 h-10 rounded-full object-contain shrink-0"
            />
          ) : (
            // Fallback mpaka TSMA ipate logo rasmi — angalia SiteSettingsContext
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy to-green flex items-center justify-center text-white font-serif font-black text-base shrink-0">
              T
            </div>
          )}
          <div className="leading-tight hidden sm:block">
            <div className="font-serif font-bold text-base text-navy">TSMA</div>
            <div className="font-sans font-bold text-[9px] text-terracotta tracking-wider">
              {t('nav.tagline')}
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden xl:flex items-center gap-5">
          {primaryLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-semibold text-ink hover:text-navy transition-colors whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
          <div className="relative">
            <button
              type="button"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
              className="text-sm font-semibold text-ink hover:text-navy transition-colors whitespace-nowrap"
            >
              {t('more')} ▾
            </button>
            {moreOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMoreOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 top-full mt-3 w-52 bg-white rounded-2xl shadow-xl border border-black/5 py-2 z-50">
                  {moreLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMoreOpen(false)}
                      className="block px-4 py-2.5 text-sm font-semibold text-ink hover:bg-cream hover:text-navy whitespace-nowrap"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </nav>

        <div className="hidden xl:flex items-center gap-4">
          <LanguageToggle />
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="text-sm font-bold text-navy hover:text-terracotta transition-colors whitespace-nowrap"
              >
                {user?.full_name?.split(' ')[0] || 'Dashibodi'}
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm font-bold text-ink-muted hover:text-terracotta transition-colors whitespace-nowrap"
              >
                {t('common.logout', 'Toka')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-sm font-bold text-navy hover:text-terracotta transition-colors whitespace-nowrap px-2"
              >
                {t('common.login')}
              </Link>
              <Link
                to="/members"
                className="flex items-center gap-2 bg-ink hover:bg-navy-deep text-white font-bold text-sm pl-5 pr-2 py-2 rounded-full transition-colors whitespace-nowrap"
              >
                {t('nav.registerNow')}
                <span className="w-7 h-7 rounded-full bg-gold flex items-center justify-center text-navy-deep text-sm shrink-0">
                  →
                </span>
              </Link>
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label="Fungua menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="xl:hidden text-navy text-xl leading-none w-9 h-9 flex items-center justify-center shrink-0"
        >
          ☰
        </button>
      </div>

      {/* Sidebar drawer (simu/tablet) */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 xl:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!open}
      />

      <aside
        className={`fixed top-0 right-0 h-full w-[82%] max-w-sm bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out xl:hidden flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu kuu"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-navy to-green flex items-center justify-center text-white font-serif font-black text-sm">
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
              className="block w-full bg-cream text-navy font-extrabold text-sm text-center px-5 py-3.5 rounded-full"
            >
              {t('common.logout', 'Toka')}
            </button>
          ) : (
            <div className="space-y-3">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="block bg-cream text-navy font-extrabold text-sm text-center px-5 py-3.5 rounded-full"
              >
                {t('common.login')}
              </Link>
              <Link
                to="/members"
                onClick={() => setOpen(false)}
                className="block bg-ink text-white font-extrabold text-sm text-center px-5 py-3.5 rounded-full"
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
