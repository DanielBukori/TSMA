import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'

// Ukurasa unaofunguka mtu anaposcan QR ya cheti:
// /verify-certificate/<verification_code>  ->  GET /api/teaching/certificates/verify/<code>/
function Field({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-black/10 last:border-0">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="text-sm font-bold text-ink text-right">{value || '—'}</span>
    </div>
  )
}

export default function VerifyCertificate() {
  const { code } = useParams()
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const [state, setState] = useState({ status: 'loading', data: null })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading', data: null })
    apiClient
      .get(`/teaching/certificates/verify/${code}/`)
      .then((res) => {
        if (!cancelled) setState({ status: 'ok', data: res.data })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: err.response?.status === 404 ? 'notfound' : 'error', data: null })
      })
    return () => {
      cancelled = true
    }
  }, [code])

  const { status, data } = state
  const issued = data?.issued_at
    ? new Date(data.issued_at).toLocaleDateString(isSw ? 'sw-TZ' : 'en-GB', { dateStyle: 'long' })
    : null

  return (
    <section className="min-h-[60vh] bg-cream px-5 py-14">
      <div className="max-w-md mx-auto">
        <h1 className="font-serif font-black text-2xl text-navy text-center mb-1">
          {isSw ? 'Uthibitisho wa Cheti' : 'Certificate Verification'}
        </h1>
        <p className="text-xs text-ink-muted text-center mb-6">Tanzania Sports Management Association (TSMA)</p>

        {status === 'loading' && (
          <div className="text-center py-10">
            <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-ink-muted">{isSw ? 'Inathibitisha...' : 'Verifying...'}</p>
          </div>
        )}

        {status === 'notfound' && (
          <div className="bg-terracotta/10 border border-terracotta/30 rounded-xl p-6 text-center">
            <div className="text-4xl mb-2">❌</div>
            <p className="text-sm font-bold text-terracotta">
              {isSw ? 'Cheti hiki hakipo kwenye mfumo wa TSMA.' : 'This certificate is not in the TSMA system.'}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-terracotta/10 border border-terracotta/30 rounded-xl p-6 text-center">
            <p className="text-sm font-bold text-terracotta">
              {isSw ? 'Imeshindikana kuthibitisha sasa. Jaribu tena baadaye.' : 'Could not verify right now. Please try again later.'}
            </p>
          </div>
        )}

        {status === 'ok' && (
          <div className="rounded-xl p-6 border bg-green/10 border-green/30">
            <div className="text-center mb-4">
              <div className="text-4xl mb-1">✅</div>
              <p className="text-base font-extrabold text-green">{isSw ? 'Cheti halali' : 'Valid certificate'}</p>
            </div>
            <div className="bg-surface rounded-lg px-4">
              <Field label={isSw ? 'Jina' : 'Name'} value={data.full_name} />
              <Field label={isSw ? 'Mafunzo' : 'Course'} value={data.title_earned} />
              <Field label={isSw ? 'Namba ya Cheti' : 'Certificate No.'} value={data.certificate_number} />
              <Field label={isSw ? 'Tarehe' : 'Issued'} value={issued} />
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          <Link to="/" className="text-sm font-bold text-navy border-b-2 border-gold">
            {isSw ? '← Rudi Mwanzo' : '← Back to Home'}
          </Link>
        </div>
      </div>
    </section>
  )
}
