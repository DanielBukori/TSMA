import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5 py-20 bg-cream">
      <style>{`
        @keyframes tsma404-bounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-28px) rotate(180deg); }
        }
        @keyframes tsma404-shadow {
          0%, 100% { transform: scaleX(1); opacity: 0.25; }
          50% { transform: scaleX(0.6); opacity: 0.12; }
        }
        @keyframes tsma404-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .tsma404-ball { animation: tsma404-bounce 1.3s ease-in-out infinite; display: inline-block; }
        .tsma404-shadow { animation: tsma404-shadow 1.3s ease-in-out infinite; }
        .tsma404-sparkle { animation: tsma404-float 2.4s ease-in-out infinite; display: inline-block; }
      `}</style>

      <div className="text-center max-w-md">
        <div className="relative flex flex-col items-center mb-2">
          <span className="tsma404-sparkle absolute -top-2 -left-6 text-2xl">✨</span>
          <span className="tsma404-ball text-7xl">⚽</span>
          <span className="tsma404-sparkle absolute -top-1 -right-6 text-xl" style={{ animationDelay: '0.6s' }}>✨</span>
          <div className="w-16 h-2.5 bg-navy/20 rounded-full tsma404-shadow mt-2" />
        </div>

        <h1 className="font-serif font-black text-6xl text-navy mt-4 mb-2">404</h1>
        <h2 className="font-serif font-bold text-xl text-navy mb-3">{t('notFound.title')}</h2>
        <p className="text-ink-muted text-sm leading-relaxed mb-8">{t('notFound.message')}</p>

        <Link
          to="/"
          className="inline-block bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm px-7 py-3.5 rounded-md transition-colors"
        >
          {t('notFound.backHome')}
        </Link>
      </div>
    </div>
  )
}
