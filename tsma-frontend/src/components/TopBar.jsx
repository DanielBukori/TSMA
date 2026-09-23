import { useTranslation } from 'react-i18next'

export default function TopBar() {
  const { t } = useTranslation()

  return (
    <div>
      <div className="bg-terracotta text-white text-center text-[13px] font-bold py-2.5 px-4">
        {t('topbar.notice')}
      </div>
      <div className="bg-navy text-gold text-center text-[13px] font-bold py-2.5 px-4">
        {t('topbar.event')}{' '}
        <a href="#conference" className="underline text-white ml-1">
          {t('topbar.eventCta')}
        </a>
      </div>
    </div>
  )
}
