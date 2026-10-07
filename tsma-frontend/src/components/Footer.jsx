import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchContactInfo } from '../api/contact.js'
import SocialIcon from './SocialIcon.jsx'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

// Mitandao ya kijamii — icons HUONEKANA DAIMA kwenye Footer, hata kabla
// ya Admin kujaza URL kwenye Django Admin. Kabla ya kujazwa, icons hizi
// ni za kuangalia tu (si "clickable" — angalia FooterLink chini) ili
// zisionekane kama viungo vilivyovunjika. Ukishajaza ContactInfo
// backend, zinakuwa clickable moja kwa moja — hakuna mabadiliko
// mengine ya code yanayohitajika.
const SOCIAL_LINKS = [
  { key: 'facebook_url', icon: 'facebook', label: 'Facebook' },
  { key: 'instagram_url', icon: 'instagram', label: 'Instagram' },
  { key: 'tiktok_url', icon: 'tiktok', label: 'TikTok' },
  { key: 'linkedin_url', icon: 'linkedin', label: 'LinkedIn' },
  { key: 'twitter_x_url', icon: 'x', label: 'X (Twitter)' },
  { key: 'youtube_url', icon: 'youtube', label: 'YouTube' },
]

// Kiungo hiki kinaonekana DAIMA (icon + maandishi), lakini kinakuwa
// "clickable" TU pale href halisi ikiwepo (kutoka ContactInfo). Bila
// hiyo, ni <span> ya kawaida — haionekani kama kiungo kilichovunjika
// kinachoenda popote pasipo maana.
function FooterLink({ href, external, className, children }) {
  if (!href) {
    // Opacity kidogo chini — ishara ya kuona kwamba hii bado haijawekewa
    // kiungo halisi na Admin, badala ya kuonekana kama kiungo cha kawaida.
    return <span className={`${className} opacity-50 cursor-default`}>{children}</span>
  }
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={className}
    >
      {children}
    </a>
  )
}

export default function Footer() {
  const { t } = useTranslation()
  const { logoOnDarkUrl } = useSiteSettings()
  const [info, setInfo] = useState(null)

  useEffect(() => {
    fetchContactInfo()
      .then((res) => setInfo(res.data))
      .catch(() => {
        // Taarifa za mawasiliano bado hazijawekwa na Admin - Footer
        // inaendelea kuonyesha icons (placeholder) badala ya kuzificha.
      })
  }, [])

  return (
    <footer className="bg-navy-deep text-white/80">
      <div className="flex h-1 w-full" aria-hidden="true">
        <span className="flex-1 bg-[#1EB53A]" />
        <span className="flex-1 bg-[#FCD116]" />
        <span className="flex-1 bg-black" />
        <span className="flex-1 bg-[#FCD116]" />
        <span className="flex-1 bg-[#00A3DD]" />
      </div>

      <div className="max-w-6xl mx-auto px-5 md:px-8 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          {logoOnDarkUrl ? (
            <img src={logoOnDarkUrl} alt="TSMA" className="h-9 mb-3 object-contain" />
          ) : (
            // Fallback mpaka TSMA ipate logo rasmi — angalia SiteSettingsContext
            <div className="font-serif font-bold text-xl text-white mb-3">TSMA</div>
          )}
          <p className="text-sm leading-relaxed">{t('footer.about')}</p>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm mb-4">{t('footer.quickLinks')}</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/about" className="hover:text-gold transition-colors">{t('nav.about')}</Link></li>
            <li><Link to="/members" className="hover:text-gold transition-colors">{t('nav.members')}</Link></li>
            <li><Link to="/conferences" className="hover:text-gold transition-colors">{t('nav.conferences')}</Link></li>
            <li><Link to="/publications" className="hover:text-gold transition-colors">{t('nav.publications')}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm mb-4">{t('footer.contact')}</h4>
          {/* Zinaonekana DAIMA - namba/email halisi zinachukua nafasi ya
              placeholder mara ContactInfo itakapojazwa kwenye Admin. */}
          <ul className="space-y-3 text-sm">
            <li>
              <FooterLink href={info?.phone_call_link} className="flex items-center gap-2.5 hover:text-gold transition-colors">
                <SocialIcon name="phone" className="w-4 h-4 shrink-0" />
                <span>{info?.phone_number || '+255 7XX XXX XXX'}</span>
              </FooterLink>
            </li>
            <li>
              <FooterLink href={info?.whatsapp_link} external className="flex items-center gap-2.5 hover:text-gold transition-colors">
                <SocialIcon name="whatsapp" className="w-4 h-4 shrink-0" />
                <span>WhatsApp</span>
              </FooterLink>
            </li>
            <li>
              <FooterLink href={info?.email_mailto_link} className="flex items-center gap-2.5 hover:text-gold transition-colors">
                <SocialIcon name="mail" className="w-4 h-4 shrink-0" />
                <span>{info?.email || 'info@tsma.or.tz'}</span>
              </FooterLink>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm mb-4">{t('footer.followUs')}</h4>
          <div className="flex flex-wrap gap-3">
            {SOCIAL_LINKS.map((item) => (
              <FooterLink
                key={item.key}
                href={info?.[item.key]}
                external
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-gold text-white hover:text-navy-deep flex items-center justify-center transition-colors"
              >
                <SocialIcon name={item.icon} className="w-3.5 h-3.5" />
              </FooterLink>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
        © {new Date().getFullYear()} TSMA — Tanzania Sports Management Association. {t('footer.rights')}
      </div>
    </footer>
  )
}
