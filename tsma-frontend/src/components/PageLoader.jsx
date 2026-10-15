import { useTranslation } from 'react-i18next'

export default function PageLoader() {
  const { t } = useTranslation()
  return (
    <div className="min-h-[45vh] flex flex-col items-center justify-center gap-4 px-5" role="status" aria-live="polite">
      <div className="h-10 w-10 rounded-full border-4 border-gold/30 border-t-gold animate-spin" aria-hidden="true" />
      <p className="text-sm font-semibold text-navy">{t('common.loading', 'Inapakia...')}</p>
    </div>
  )
}
