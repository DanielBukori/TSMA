import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import GatewaySelect from '../components/GatewaySelect.jsx'
import ManualPaymentCard from '../components/ManualPaymentCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function PublicationDetail() {
  const { slug } = useParams()
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const { isAuthenticated } = useAuth()

  const [pub, setPub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloadState, setDownloadState] = useState('idle')

  useEffect(() => {
    let cancelled = false
    apiClient
      .get(`/publications/${slug}/`)
      .then((res) => {
        if (!cancelled) setPub(res.data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  async function handleDownload() {
    setDownloadState('loading')
    try {
      const res = await apiClient.get(`/publications/${slug}/download/`, {
        responseType: 'blob',
      })
      const contentDisposition = res.headers['content-disposition'] || ''
      const match = contentDisposition.match(/filename="?([^"]+)"?/)
      const filename = match ? match[1] : `${pub?.slug || 'publication'}.pdf`

      const blobUrl = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
      setDownloadState('idle')
    } catch (err) {
      setDownloadState(err.response?.status === 403 ? 'denied' : 'error')
    }
  }

  if (loading) return <div className="py-24 text-center text-ink-muted text-sm">{isSw ? 'Inapakia...' : 'Loading...'}</div>
  if (!pub) return <div className="py-24 text-center text-ink-muted text-sm">{isSw ? 'Chapisho halikupatikana.' : 'Publication not found.'}</div>

  return (
    <section className="max-w-4xl mx-auto px-5 md:px-8 py-14 md:py-20">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="aspect-[3/4] rounded-xl bg-gradient-to-br from-navy to-green-dark flex items-center justify-center p-5 sticky top-24">
            {pub.cover_image ? (
              <img src={pub.cover_image} alt={pub.title} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <span className="text-white/90 font-serif font-bold text-center text-sm leading-snug">{pub.title}</span>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {pub.category?.name && (
              <span className="inline-block bg-cream text-terracotta text-[11px] font-bold px-3 py-1.5 rounded-full">
                {pub.category.name}
              </span>
            )}
            <AccessTag accessType={pub.access_type} isSw={isSw} />
          </div>

          <h1 className="font-serif font-bold text-2xl md:text-3xl text-navy leading-tight">{pub.title}</h1>
          <p className="text-sm text-ink-muted mt-2">{pub.authors} · {pub.publication_year}</p>

          <div className="mt-6">
            <h2 className="font-serif font-bold text-sm text-navy mb-2">{isSw ? 'Muhtasari (Abstract)' : 'Abstract'}</h2>
            <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{pub.abstract}</p>
          </div>

          <div className="mt-8">
            {pub.access_type === 'paid' && !pub.has_purchased ? (
              <PurchaseBlock pub={pub} isSw={isSw} isAuthenticated={isAuthenticated} />
            ) : downloadState === 'denied' ? (
              <LockedBlock pub={pub} isSw={isSw} isAuthenticated={isAuthenticated} />
            ) : (
              <>
                <button
                  onClick={handleDownload}
                  disabled={downloadState === 'loading'}
                  className="bg-navy hover:bg-navy-light text-white font-extrabold text-sm px-8 py-4 rounded-md transition-colors disabled:opacity-60"
                >
                  {downloadState === 'loading'
                    ? isSw ? 'Inapakua...' : 'Preparing download...'
                    : `⬇ ${isSw ? 'Pakua Chapisho' : 'Download Publication'}`}
                </button>
                {downloadState === 'error' && (
                  <p className="text-xs text-terracotta mt-3">{isSw ? 'Imeshindikana. Jaribu tena.' : 'Failed. Please try again.'}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function AccessTag({ accessType, isSw }) {
  const config = {
    free: { color: 'bg-green/10 text-green', label: isSw ? 'BURE' : 'FREE' },
    member_only: { color: 'bg-terracotta/10 text-terracotta', label: isSw ? 'WANACHAMA PEKEE' : 'MEMBERS ONLY' },
    paid: { color: 'bg-gold/15 text-gold-dark', label: isSw ? 'INANUNULIWA' : 'PURCHASABLE' },
  }
  const c = config[accessType] || config.free
  return <span className={`inline-block text-[11px] font-bold px-3 py-1.5 rounded-full ${c.color}`}>{c.label}</span>
}

function LockedBlock({ pub, isSw, isAuthenticated }) {
  return (
    <div className="bg-terracotta/10 border border-terracotta/25 rounded-xl p-5 text-center">
      <div className="text-2xl mb-2">🔒</div>
      <p className="text-sm font-semibold text-ink mb-4">
        {isSw
          ? 'Chapisho hili ni kwa wanachama pekee. Jiunge au ingia kwenye akaunti yako ya uanachama.'
          : 'This publication is members-only. Join or sign in to your membership account.'}
      </p>
      <div className="flex justify-center gap-3">
        {!isAuthenticated && (
          <Link to="/login" className="text-sm font-bold text-navy border-b-2 border-navy pb-0.5 self-center">
            {isSw ? 'Ingia' : 'Sign In'}
          </Link>
        )}
        <Link to="/members" className="bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm px-6 py-3 rounded-md">
          {isSw ? 'Jiunge Nasi →' : 'Join Us →'}
        </Link>
      </div>
    </div>
  )
}

function PurchaseBlock({ pub, isSw, isAuthenticated }) {
  const [phone, setPhone] = useState('')
  const [gateway, setGateway] = useState(null)
  const [method, setMethod] = useState('mobile_money')
  const [status, setStatus] = useState('idle') // idle | form | submitting | waiting | success | error
  const [message, setMessage] = useState('')
  const [reference, setReference] = useState(null)
  const [manual, setManual] = useState(null)
  const pollRef = useRef(null)

  useEffect(() => () => clearInterval(pollRef.current), [])

  async function handlePurchase(e) {
    e.preventDefault()
    setStatus('submitting')
    try {
      const res = await apiClient.post(`/publications/${pub.slug}/purchase/`, {
        phone_number: phone,
        gateway: gateway?.code,
        payment_method: gateway?.code === 'manual' ? 'bank_transfer' : method,
      })
      setMessage(res.data.payment.instructions)
      setReference(res.data.payment.internal_reference)
      setManual(res.data.payment.bank_details ? res.data.payment : null)
      setStatus('waiting')
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await apiClient.get(`/payments/status/${res.data.payment.internal_reference}/`)
          if (statusRes.data.status === 'success') {
            clearInterval(pollRef.current)
            setStatus('success')
            setMessage(isSw ? 'Malipo yamekamilika! Unaweza kupakua sasa.' : 'Payment complete! You can download now.')
          } else if (statusRes.data.status === 'failed') {
            clearInterval(pollRef.current)
            setStatus('error')
            setMessage(isSw ? 'Malipo yameshindwa.' : 'Payment failed.')
          } else if (statusRes.data.status === 'expired') {
            clearInterval(pollRef.current)
            setStatus('error')
            setMessage(
              isSw
                ? 'Muda wa kuthibitisha malipo umeisha. Wasiliana na TSMA (WhatsApp) kama tayari ulilipa.'
                : 'The confirmation window has closed. Contact TSMA (WhatsApp) if you already paid.',
            )
          }
        } catch {
          // endelea kusubiri
        }
      }, 5000)
    } catch (err) {
      setStatus('error')
      setMessage(err.response?.data?.detail || (isSw ? 'Imeshindikana.' : 'Something went wrong.'))
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="border border-dashed border-black/20 rounded-xl p-6 text-center">
        <p className="text-sm text-ink-muted mb-4">
          {isSw ? 'Ingia kuweza kununua chapisho hili.' : 'Sign in to purchase this publication.'}
        </p>
        <Link to="/login" className="inline-block bg-gold text-navy-deep font-extrabold text-sm px-7 py-3 rounded-md">
          {isSw ? 'Ingia →' : 'Sign In →'}
        </Link>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="text-center border border-green/30 bg-green/10 rounded-xl p-6">
        <div className="text-3xl mb-2">✅</div>
        <p className="text-sm font-semibold mb-4">{message}</p>
        <a href={`/publications/${pub.slug}`} onClick={() => window.location.reload()} className="inline-block bg-navy text-white font-extrabold text-sm px-7 py-3 rounded-md">
          ⬇ {isSw ? 'Pakua Sasa' : 'Download Now'}
        </a>
      </div>
    )
  }

  if (status === 'waiting' && manual?.bank_details) {
    return (
      <div className="border border-black/10 bg-surface rounded-xl p-6">
        <ManualPaymentCard
          isSw={isSw}
          bankDetails={manual.bank_details}
          reference={reference}
          expiresAt={manual.expires_at}
          deadlineHours={manual.confirm_deadline_hours || 24}
        />
      </div>
    )
  }

  if (status === 'waiting') {
    return (
      <div className="text-center border border-black/10 bg-cream rounded-xl p-6">
        <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold">{message}</p>
        <p className="text-xs text-ink-muted mt-2">Ref: {reference}</p>
      </div>
    )
  }

  return (
    <div className="border border-gold/40 bg-gold/5 rounded-xl p-6">
      <div className="flex items-baseline justify-between mb-4">
        <span className="text-sm font-bold text-navy">{isSw ? 'Bei' : 'Price'}</span>
        <span className="font-serif font-black text-2xl text-green">
          {Number(pub.price).toLocaleString()} <span className="text-sm font-sans font-normal text-ink-muted">{pub.currency}</span>
        </span>
      </div>

      {status !== 'form' ? (
        <button
          onClick={() => setStatus('form')}
          className="w-full bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm py-3.5 rounded-md"
        >
          🛒 {isSw ? 'Nunua Chapisho Hili' : 'Purchase This Publication'}
        </button>
      ) : (
        <form onSubmit={handlePurchase} className="space-y-3">
          <GatewaySelect value={gateway} onChange={setGateway} isSw={isSw} />

          {(!gateway || gateway.requires_phone) && (
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                {isSw ? 'Namba ya Simu (Malipo)' : 'Phone Number (Payment)'}
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+255712345678"
                className="w-full border border-black/15 rounded-md px-4 py-2.5 text-sm"
              />
            </div>
          )}
          <div className={`grid grid-cols-2 gap-2 ${gateway?.code === 'manual' ? 'hidden' : ''}`}>
            <button type="button" onClick={() => setMethod('mobile_money')} className={`text-xs font-bold py-2.5 rounded-md border ${method === 'mobile_money' ? 'bg-navy text-white border-navy' : 'border-black/15'}`}>
              📱 {isSw ? 'M-Pesa/Simu' : 'Mobile Money'}
            </button>
            <button type="button" onClick={() => setMethod('card')} className={`text-xs font-bold py-2.5 rounded-md border ${method === 'card' ? 'bg-navy text-white border-navy' : 'border-black/15'}`}>
              💳 {isSw ? 'Kadi' : 'Card'}
            </button>
          </div>
          {status === 'error' && <p className="text-xs text-terracotta">{message}</p>}
          <button
            type="submit"
            disabled={status === 'submitting' || !gateway}
            className="w-full bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm py-3 rounded-md disabled:opacity-60"
          >
            {status === 'submitting' ? (isSw ? 'Inatuma...' : 'Submitting...') : isSw ? 'Lipia Sasa' : 'Pay Now'}
          </button>
        </form>
      )}

      <p className="text-[11px] text-ink-muted mt-4 text-center">
        {isSw
          ? 'Sehemu ya mauzo inakwenda moja kwa moja kwa mwandishi baada ya TSMA kukata asilimia ndogo.'
          : "A share of the sale goes directly to the author after TSMA's small commission."}
      </p>
    </div>
  )
}
