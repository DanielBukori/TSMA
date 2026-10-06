import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import GatewaySelect from '../components/GatewaySelect.jsx'
import ManualPaymentCard from '../components/ManualPaymentCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import PageBanner from '../components/PageBanner.jsx'
import PageBannerText from '../components/PageBannerText.jsx'

export default function Members() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Hakuna orodha ya "fallback" tena: ids za fallback hazikulingana na za backend,
  // mtu angeweza kuona bei ya daraja moja na kujiunga na daraja jingine.
  const [tiers, setTiers] = useState([])
  const [loadingTiers, setLoadingTiers] = useState(true)
  const [selectedTierId, setSelectedTierId] = useState(null)

  useEffect(() => {
    let cancelled = false
    apiClient
      .get('/members/tiers/')
      .then((res) => {
        const results = res.data?.results || res.data
        if (!cancelled && Array.isArray(results) && results.length > 0) setTiers(results)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingTiers(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function handleChooseTier(tierId) {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/members' } })
      return
    }
    setSelectedTierId(selectedTierId === tierId ? null : tierId)
  }

  return (
    <>
      <PageBanner>
        <PageBannerText
          pageKey="members"
          isSw={isSw}
          fallback={{
            badge_sw: 'UANACHAMA', badge_en: 'MEMBERSHIP',
            title_sw: 'Jiunge na TSMA', title_en: 'Join TSMA',
            subtitle_sw: 'Chagua daraja linalokufaa kulingana na Katiba ya TSMA — lipa kwa benki, kisha thibitisha kupitia WhatsApp.',
            subtitle_en: 'Choose the tier that fits you under the TSMA Constitution — pay by bank, then confirm via WhatsApp.',
          }}
        />
      </PageBanner>

      <section className="max-w-5xl mx-auto px-5 md:px-8 py-14 md:py-20">
        {tiers.length === 0 && (
          <p className="text-center text-sm text-ink-muted py-10">
            {loadingTiers
              ? isSw ? 'Inapakua madaraja...' : 'Loading tiers...'
              : isSw
                ? 'Madaraja ya uanachama hayapatikani kwa sasa. Tafadhali jaribu tena baadaye au wasiliana na TSMA.'
                : 'Membership tiers are not available right now. Please try again later or contact TSMA.'}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div key={tier.id}>
              <TierCard
                tier={tier}
                isSw={isSw}
                isOpen={selectedTierId === tier.id}
                onChoose={() => handleChooseTier(tier.id)}
              />
              {selectedTierId === tier.id && (
                <JoinForm tier={tier} isSw={isSw} onClose={() => setSelectedTierId(null)} />
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function TierCard({ tier, isSw, isOpen, onChoose }) {
  const fee = Number(tier.annual_fee)
  return (
    <button
      onClick={onChoose}
      className={`w-full text-left bg-surface border rounded-xl p-7 transition-all ${
        isOpen ? 'border-gold ring-2 ring-gold/30' : 'border-black/10 hover:shadow-lg'
      }`}
    >
      <div className="font-extrabold text-sm text-navy uppercase tracking-wide">{tier.name}</div>
      <div className="font-serif font-black text-3xl text-green mt-3">
        {fee === 0 ? (isSw ? 'Bure' : 'Free') : `${fee.toLocaleString()}`}
        {fee > 0 && <span className="text-sm font-sans font-normal text-ink-muted"> {tier.currency}/{isSw ? 'mwaka' : 'yr'}</span>}
      </div>
      <p className="text-sm text-ink-muted mt-3">{tier.description}</p>
      {tier.benefits?.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm">
          {tier.benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-green mt-0.5">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 text-center bg-gold/10 text-gold-dark font-bold text-sm py-2.5 rounded-md">
        {isOpen ? (isSw ? 'Funga ▲' : 'Close ▲') : isSw ? 'Chagua Daraja Hili' : 'Choose This Tier'}
      </div>
    </button>
  )
}

// Inatoa ujumbe halisi wa backend (DRF): {"detail": "..."} au
// {"field": ["kosa1", ...]} -> "kosa1 kosa2".
function extractApiError(data) {
  if (!data) return ''
  if (typeof data === 'string') {
    // Hitilafu ya seva (500) hurudisha ukurasa wa HTML — usimwonyeshe mtumiaji
    return data.trim().startsWith('<') ? '' : data
  }
  if (data.detail) return String(data.detail)
  const parts = []
  Object.values(data).forEach((v) => {
    if (Array.isArray(v)) parts.push(...v.map(String))
    else if (typeof v === 'string') parts.push(v)
  })
  return parts.join(' ')
}

function JoinForm({ tier, isSw, onClose }) {
  const [phone, setPhone] = useState('')
  const [gateway, setGateway] = useState(null)
  const [method, setMethod] = useState('mobile_money')
  const [organizationName, setOrganizationName] = useState('')
  const [studentIdFile, setStudentIdFile] = useState(null) // Student Member: picha ya ID ya chuo
  const [status, setStatus] = useState('idle') // idle | submitting | waiting | success | error
  const [message, setMessage] = useState('')
  const [reference, setReference] = useState(null)
  const [bankDetails, setBankDetails] = useState(null)
  const [expiresAt, setExpiresAt] = useState(null)
  const [deadlineHours, setDeadlineHours] = useState(24)
  const pollRef = useRef(null)

  useEffect(() => {
    return () => clearInterval(pollRef.current)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('submitting')
    setMessage('')

    try {
      // multipart (si JSON) kwa sababu Student anatuma picha ya ID ya chuo
      const body = new FormData()
      body.append('tier_id', tier.id)
      body.append('phone_number', phone)
      body.append('organization_name', organizationName)
      if (gateway?.code) body.append('gateway', gateway.code)
      body.append('payment_method', gateway?.code === 'manual' ? 'bank_transfer' : method)
      if (tier.slug === 'student-member' && studentIdFile) body.append('student_id_image', studentIdFile)

      const res = await apiClient.post('/members/join/', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (res.data.payment) {
        setReference(res.data.payment.internal_reference)
        setMessage(res.data.payment.instructions)
        setBankDetails(res.data.payment.bank_details || null)
        setExpiresAt(res.data.payment.expires_at || null)
        setDeadlineHours(res.data.payment.confirm_deadline_hours || 24)
        setStatus('waiting')
        startPolling(res.data.payment.internal_reference)
      } else {
        setStatus('success')
        setMessage(isSw ? 'Umejiunga na TSMA kwa mafanikio!' : 'You have successfully joined TSMA!')
      }
    } catch (err) {
      setStatus('error')
      setMessage(
        extractApiError(err.response?.data) ||
          (isSw ? 'Imeshindikana. Jaribu tena.' : 'Something went wrong. Please try again.'),
      )
    }
  }

  function startPolling(ref) {
    pollRef.current = setInterval(async () => {
      try {
        const res = await apiClient.get(`/payments/status/${ref}/`)
        if (res.data.status === 'success') {
          clearInterval(pollRef.current)
          setStatus('success')
          setMessage(isSw ? 'Malipo yamekamilika! Uanachama umewezeshwa.' : 'Payment complete! Membership activated.')
        } else if (res.data.status === 'failed') {
          clearInterval(pollRef.current)
          setStatus('error')
          setMessage(isSw ? 'Malipo yameshindikana.' : 'Payment failed.')
        } else if (res.data.status === 'expired') {
          clearInterval(pollRef.current)
          setStatus('error')
          setMessage(
            isSw
              ? 'Muda wa kuthibitisha malipo umeisha bila uthibitisho kufika. Wasiliana na TSMA au jaribu kujiunga tena.'
              : 'The confirmation window closed without a confirmation reaching us. Contact TSMA or try joining again.',
          )
        }
      } catch {
        // endelea kusubiri, jaribu tena kwenye interval ijayo
      }
    }, 5000)
  }

  if (status === 'success') {
    return (
      <div className="mt-3 bg-green/10 border border-green/30 rounded-xl p-6 text-center">
        <div className="text-3xl mb-2">✅</div>
        <p className="text-sm text-ink font-semibold">{message}</p>
        <a href="/dashboard" className="inline-block mt-4 text-sm font-bold text-navy border-b-2 border-gold">
          {isSw ? 'Angalia Dashibodi Yangu →' : 'View My Dashboard →'}
        </a>
      </div>
    )
  }

  return (
    <div className="mt-3 bg-surface border border-black/10 rounded-xl p-6">
      {status === 'waiting' ? (
        bankDetails ? (
          <ManualPaymentCard
            isSw={isSw}
            bankDetails={bankDetails}
            reference={reference}
            expiresAt={expiresAt}
            deadlineHours={deadlineHours}
          />
        ) : (
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-ink font-semibold">{message}</p>
            <p className="text-xs text-ink-muted mt-2">
              {isSw ? 'Reference: ' : 'Reference: '}
              {reference}
            </p>
          </div>
        )
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tier.requires_payment !== false && Number(tier.annual_fee) > 0 && (
            <>
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
                    className="w-full border border-black/15 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
                  />
                </div>
              )}

              {['institutional-member', 'corporate-member'].includes(tier.slug) && (
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    {isSw ? 'Jina la Taasisi' : 'Organization Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full border border-black/15 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
                  />
                </div>
              )}

              {/* Katiba Art 10.3: Student Member lazima athibitishe kwa ID ya chuo */}
              {tier.slug === 'student-member' && (
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    {isSw ? 'Picha ya ID ya Chuo (lazima)' : 'College ID photo (required)'}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      if (file && file.size > 5 * 1024 * 1024) {
                        setStatus('error')
                        setMessage(isSw ? 'Picha ni kubwa mno. Kikomo ni MB 5.' : 'Image is too large. Limit is 5 MB.')
                        e.target.value = ''
                        setStudentIdFile(null)
                        return
                      }
                      setStudentIdFile(file)
                    }}
                    className="w-full text-xs"
                  />
                  <p className="text-[11px] text-ink-muted mt-1">
                    {isSw
                      ? 'Piga picha ya ID yako ya chuo (upande wenye jina na chuo). Itaonekana na viongozi wa TSMA tu kwa ajili ya kuthibitisha.'
                      : 'Take a photo of your college ID (the side showing your name and institution). Only TSMA administrators will see it, to verify you.'}
                  </p>
                </div>
              )}

              <div className={gateway?.code === 'manual' ? 'hidden' : ''}>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  {isSw ? 'Njia ya Malipo' : 'Payment Method'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod('mobile_money')}
                    className={`text-sm font-bold py-2.5 rounded-md border ${
                      method === 'mobile_money'
                        ? 'bg-navy text-white border-navy'
                        : 'border-black/15 text-ink'
                    }`}
                  >
                    📱 {isSw ? 'M-Pesa/Simu' : 'Mobile Money'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('card')}
                    className={`text-sm font-bold py-2.5 rounded-md border ${
                      method === 'card' ? 'bg-navy text-white border-navy' : 'border-black/15 text-ink'
                    }`}
                  >
                    💳 {isSw ? 'Kadi' : 'Card'}
                  </button>
                </div>
              </div>
            </>
          )}

          {status === 'error' && (
            <div className="bg-terracotta/10 text-terracotta text-xs rounded-md px-3 py-2">{message}</div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={status === 'submitting' || !gateway}
              className="flex-1 bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm py-3 rounded-md disabled:opacity-60"
            >
              {status === 'submitting'
                ? isSw ? 'Inatuma...' : 'Submitting...'
                : isSw ? 'Kamilisha Usajili' : 'Complete Registration'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 border border-black/15 rounded-md text-sm font-bold text-ink"
            >
              {isSw ? 'Ghairi' : 'Cancel'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
