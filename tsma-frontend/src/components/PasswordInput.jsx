import { useState } from 'react'
import { useTranslation } from 'react-i18next'

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.5 10.5 0 0 1 12 19c-6.4 0-10-7-10-7a18.5 18.5 0 0 1 4.06-5.06" />
      <path d="M9.9 4.24A9.8 9.8 0 0 1 12 5c6.4 0 10 7 10 7a18.6 18.6 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
      <path d="M1 1l22 22" />
    </svg>
  )
}

/**
 * Sehemu ya kuandika password yenye kitufe cha kuonyesha/kuficha.
 * Inapokea props zote za <input> za kawaida (value, onChange, required, placeholder,
 * className, autoComplete...). Mtumiaji ndiye anayeamua kuona anachoandika.
 * Tumia `autoComplete="new-password"` kwa password mpya (usajili/kubadili).
 */
export default function PasswordInput({ className = '', type: _type, autoComplete = 'current-password', ...props }) {
  const [visible, setVisible] = useState(false)
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const label = visible ? (isSw ? 'Ficha password' : 'Hide password') : isSw ? 'Onyesha password' : 'Show password'

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        className={className}
        style={{ paddingRight: '2.9rem' }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted hover:text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40 rounded-md"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  )
}
