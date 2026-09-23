import { useTranslation } from 'react-i18next'

export default function BoardMemberCard({ member, onOpen }) {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  return (
    <button
      onClick={() => onOpen(member)}
      className="group text-left border border-black/10 rounded-xl overflow-hidden hover:shadow-lg transition-shadow bg-white"
    >
      <div className="aspect-square bg-gradient-to-br from-navy to-green-dark relative overflow-hidden">
        {member.photo ? (
          <img
            src={member.photo}
            alt={member.full_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white font-serif font-black text-4xl">
            {member.full_name?.[0]}
          </div>
        )}
        {member.is_founder && (
          <span className="absolute top-2.5 right-2.5 bg-gold text-navy-deep text-[10px] font-extrabold px-2.5 py-1 rounded-full">
            {isSw ? 'MWANZILISHI' : 'FOUNDER'}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-serif font-bold text-navy text-base leading-tight">
          {member.full_name}
        </h3>
        <p className="text-terracotta text-xs font-semibold mt-1">{member.position}</p>
      </div>
    </button>
  )
}
