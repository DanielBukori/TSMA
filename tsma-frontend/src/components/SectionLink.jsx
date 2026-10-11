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
    if (location.pathname === '/' && plainClick) {
      e.preventDefault()
      // subiri menyu (drawer) ifungwe ili ukurasa uweze kusogea
      if (location.hash === `#${section}`) {
        setTimeout(() => scrollToSection(section), 80) // bofya kiungo kile kile tena: ruka bila kubadili URL
      } else {
        // replace: kuhama kati ya sehemu hakujazi historia - "Back" inarudi ukurasa uliotoka
        navigate({ pathname: '/', hash: `#${section}` }, { replace: true })
      }
    }
  }

  // Kurasa tofauti: kiungo cha kawaida kwenda ukurasa wa sehemu hiyo
  if (!SINGLE_PAGE) {
    return (
      <Link {...props} to={SECTION_ROUTES[section] || '/'} onClick={onClick}>
        {children}
      </Link>
    )
  }

  return (
    <Link {...props} to={`/#${section}`} onClick={handleClick}>
      {children}
    </Link>
  )
}
