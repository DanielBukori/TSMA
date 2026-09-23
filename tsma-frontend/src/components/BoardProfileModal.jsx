import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Modal ya wasifu kamili — muundo kama unavyobofya profile ya mtu
 * kwenye Instagram: picha kubwa juu, jina, nafasi, kisha taarifa
 * zilizopangwa kwa sehemu (bio, elimu, uzoefu, mchango).
 */
export default function BoardProfileModal({ member, onClose }) {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  if (!member) return null

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: kubonyeza kufunga */}
        <div className="sticky top-0 bg-white flex justify-end p-3 border-b border-black/5 z-10">
          <button
            onClick={onClose}
            aria-label="Funga"
            className="w-9 h-9 rounded-full bg-cream flex items-center justify-center text-navy text-lg"
          >
            ✕
          </button>
        </div>

        {/* Profile header (kama Instagram) */}
        <div className="px-6 pt-2 pb-6 text-center">
          <div className="w-28 h-28 rounded-full mx-auto overflow-hidden bg-gradient-to-br from-navy to-green ring-4 ring-gold/30">
            {member.photo ? (
              <img src={member.photo} alt={member.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-serif font-black text-3xl">
                {member.full_name?.[0]}
              </div>
            )}
          </div>

          <h2 className="font-serif font-bold text-2xl text-navy mt-4">{member.full_name}</h2>
          <p className="text-terracotta font-semibold text-sm mt-1">{member.position}</p>

          {member.is_founder && (
            <span className="inline-block mt-3 bg-gold/15 text-gold-dark text-[11px] font-extrabold tracking-wide px-3 py-1.5 rounded-full">
              {isSw ? '★ MWANZILISHI WA TSMA' : '★ TSMA FOUNDER'}
            </span>
          )}

          {/* "Stats row" - kama Instagram, lakini yenye taarifa za maana kwa wasifu wa kitaaluma */}
          <div className="flex justify-center gap-8 mt-6 pt-6 border-t border-black/5">
            {(member.joined_board_date || member.joined_date) && (
              <div className="text-center">
                <div className="font-serif font-bold text-navy text-lg">
                  {new Date(member.joined_board_date || member.joined_date).getFullYear()}
                </div>
                <div className="text-[11px] text-ink-muted uppercase tracking-wide">
                  {isSw ? 'Alijiunga' : 'Joined'}
                </div>
              </div>
            )}
            {member.email && (
              <a href={`mailto:${member.email}`} className="text-center">
                <div className="font-serif font-bold text-navy text-lg">✉️</div>
                <div className="text-[11px] text-ink-muted uppercase tracking-wide">Email</div>
              </a>
            )}
            {member.linkedin_url && (
              <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-center">
                <div className="font-serif font-bold text-navy text-lg">🔗</div>
                <div className="text-[11px] text-ink-muted uppercase tracking-wide">LinkedIn</div>
              </a>
            )}
          </div>
        </div>

        {/* Body sections */}
        <div className="px-6 pb-8 space-y-6">
          {member.bio && (
            <ProfileSection title={isSw ? 'Wasifu' : 'Bio'} text={member.bio} />
          )}
          {member.education && (
            <ProfileSection title={isSw ? 'Elimu' : 'Education'} text={member.education} />
          )}
          {member.experience && (
            <ProfileSection title={isSw ? 'Uzoefu' : 'Experience'} text={member.experience} />
          )}
          {member.contribution && (
            <ProfileSection
              title={isSw ? 'Mchango kwa TSMA' : 'Contribution to TSMA'}
              text={member.contribution}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileSection({ title, text }) {
  return (
    <div>
      <h3 className="font-serif font-bold text-navy text-sm mb-2">{title}</h3>
      <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-line">{text}</p>
    </div>
  )
}
