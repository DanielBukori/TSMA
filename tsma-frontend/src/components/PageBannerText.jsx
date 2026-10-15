import { Link } from 'react-router-dom'
import { useBannerContent } from '../context/BannerContentContext.jsx'

/**
 * Maandishi ya ndani ya <PageBanner> (badge/title/subtitle/CTA hiari) —
 * yanatoka Django Admin (sitecontent -> Maudhui ya Banner) kwa ukurasa
 * husika (pageKey), badala ya kuwa hardcoded ndani ya kila page file.
 *
 * `fallback` (hiari) ni maandishi ya awali yaliyokuwepo kabla ya mfumo
 * huu — yanatumika tu endapo API bado haijajibu (mzunguko wa kwanza wa
 * page load) ili banner isionekane tupu kwa muda mfupi. Mara data ya
 * kweli ikishafika kutoka API, hiyo ndiyo inayoonekana siku zote baada
 * ya hapo (Admin akiihariri, inabadilika papo hapo tovuti ikirefresh).
 *
 * Matumizi:
 *   <PageBanner>
 *     <PageBannerText pageKey="board" isSw={isSw} fallback={{...}} />
 *   </PageBanner>
 */
export default function PageBannerText({
  pageKey,
  isSw,
  fallback,
  titleClassName = 'font-serif font-bold text-2xl md:text-4xl text-navy-deep',
}) {
  const { banner } = useBannerContent(pageKey)
  const b = banner || fallback

  if (!b) return null

  const badge = isSw ? b.badge_sw : b.badge_en
  const subtitle = isSw ? b.subtitle_sw : b.subtitle_en
  const ctaText = isSw ? b.cta_text_sw : b.cta_text_en

  return (
    <>
      {badge && (
        <span className="inline-block border border-navy/15 text-navy text-xs font-extrabold tracking-widest px-4 py-1.5 rounded-full mb-3">
          {badge}
        </span>
      )}
      <h1 className={titleClassName}>{isSw ? b.title_sw : b.title_en}</h1>
      {subtitle && (
        <p className="text-ink-muted max-w-2xl mx-auto mt-3 px-5">{subtitle}</p>
      )}
      {ctaText && b.cta_url && (
        <Link
          to={b.cta_url}
          className="inline-block mt-7 bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm px-7 py-3.5 rounded-md transition-colors"
        >
          {ctaText}
        </Link>
      )}
    </>
  )
}
