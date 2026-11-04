import { Link } from 'react-router-dom'
import { normalizeSection, useSectionNavigation } from '../utils/sectionScroll.js'
import { SECTION_ROUTES, SINGLE_PAGE } from '../config/layout.js'

const FOCUS_CLASS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/70'

/**
 * Kiungo cha sehemu ya Home. Tukiwa tayari kwenye Home: tunasogea (smooth) kwenye
 * sehemu na kuweka # kwenye URL bila kuipakia upya. Tukiwa ukurasa mwingine:
 * tunaenda "/#about" na Home itasogea mara sehemu itakapokuwapo.
 */
export default function SectionLink({ section, onClick, children, className = '', ...props }) {
  const id = normalizeSection(section)
  const goToSection = useSectionNavigation()

  function handleClick(e) {
    onClick?.(e)
    if (e.defaultPrevented) return
    const plainClick = e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
    if (!plainClick || !id) return
    e.preventDefault()
    goToSection(id)
  }

  return (
    <Link
      {...props}
      to={SINGLE_PAGE ? `/#${id}` : (SECTION_ROUTES[id] || '/')}
      onClick={handleClick}
      className={`${FOCUS_CLASS} ${className}`.trim()}
    >
      {children}
    </Link>
  )
}
