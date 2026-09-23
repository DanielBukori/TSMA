import { useTranslation } from 'react-i18next'
import StatCounter from './StatCounter.jsx'

export default function InfoBox() {
  const { t } = useTranslation()

  return (
    <section className="max-w-4xl mx-auto px-5 md:px-8 -mt-4 md:-mt-8 relative z-10">
      <div className="bg-navy rounded-2xl px-8 py-10 md:py-12 text-center text-white shadow-xl">
        <div className="font-serif font-black text-5xl md:text-6xl text-gold">26</div>
        <div className="text-sm text-white/80 mt-2">{t('infoBox.bigLabel')}</div>

        <div className="grid grid-cols-2 gap-3.5 mt-8">
          <Tile num="1,200+" label={t('infoBox.tile1')} />
          <Tile num="TZS 5M" label={t('infoBox.tile2')} />
          <Tile num="18" label={t('infoBox.tile3')} />
          <Tile num="Dar es Salaam" label={t('infoBox.tile4')} />
        </div>
      </div>
    </section>
  )
}

function Tile({ num, label }) {
  return (
    <div className="bg-gold/10 border border-gold/30 rounded-lg px-3 py-4">
      <div className="font-serif font-extrabold text-xl md:text-2xl text-gold">{num}</div>
      <div className="text-[11px] text-white/70 mt-1">{label}</div>
    </div>
  )
}
