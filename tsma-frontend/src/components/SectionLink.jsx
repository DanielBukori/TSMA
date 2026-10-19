import { Link, useLocation, useNavigate } from 'react-router-dom'
import { scrollToSection } from '../utils/sectionScroll.js'
import { SECTION_ROUTES, SINGLE_PAGE } from '../config/layout.js'

/**
 * Kiungo cha sehemu ya Home. Tukiwa tayari kwenye Home: tunaruka (smooth) kwenye
 * sehemu. Tukiwa ukurasa mwingine: tunaenda Home kwenye sehemu hiyo ("/#about").
 */
export default function SectionLink({ section, onClick, children, ...props }) {
  const location = useLocation()
  const navigate = useNavigate()

  function handleClick(e) {
    onClick?.(e)
    if (e.defaultPrevented) return
    const plainClick = e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
    if (!plainClick) return
    e.preventDefault()
    if (!SINGLE_PAGE) {
      navigate(SECTION_ROUTES[section] || '/', { replace: false })
      return
    }
    // URL safi bila #; scroll baada ya React kutoa Home ikiwa unatoka ukurasa mwingine.
    if (location.pathname !== '/') navigate('/', { replace: false })
    window.setTimeout(() => scrollToSection(section), location.pathname === '/' ? 0 : 180)
  }

  return (
    <Link {...props} to={SINGLE_PAGE ? '/' : (SECTION_ROUTES[section] || '/')} onClick={handleClick}>
      {children}
    </Link>
  )
}
