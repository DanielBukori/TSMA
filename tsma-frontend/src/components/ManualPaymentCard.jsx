import { useState } from 'react'

/**
 * Kadi ya "Malipo ya Mkono (Manual)" — inaonyeshwa baada ya mtumiaji kuchagua
 * Manual kwenye Uanachama, Conferences na Publications.
 *
 * `bankDetails` inatoka backend (payments/gateways/manual.py) kutoka kwenye
 * Django Admin -> "Taarifa za Malipo ya Mkono (Manual)":
 *   { bank_name, account_name, account_number, swift_code, confirm_phone,
 *     extra_instructions_sw, extra_instructions_en }
 */

// 0712 345 678 / +255712345678 / 255712345678 -> 255712345678 (kwa wa.me)
function toWhatsAppNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length < 9) return null
  if (digits.startsWith('0')) return `255${digits.slice(1)}`
  return digits
}

function CopyButton({ value, isSw }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(String(value))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard haipatikani — mtumiaji anaweza kunakili mwenyewe
    }
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 text-[11px] font-bold text-white/80 border border-white/30 rounded px-2 py-0.5"
    >
      {copied ? (isSw ? 'Imenakiliwa ✓' : 'Copied ✓') : isSw ? 'Nakili' : 'Copy'}
    </button>
  )
}

function Row({ label, value, highlight, copy, isSw }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/70 text-xs">{label}</span>
      <span className={`font-bold text-right ${highlight ? 'text-gold text-base' : 'text-sm'}`}>
        {value}
        {copy && <CopyButton value={value} isSw={isSw} />}
      </span>
    </div>
  )
}

export default function ManualPaymentCard({ isSw, bankDetails, reference, expiresAt, deadlineHours = 24 }) {
  const extra = isSw ? bankDetails.extra_instructions_sw : bankDetails.extra_instructions_en
  const waNumber = toWhatsAppNumber(bankDetails.confirm_phone)

  const waText = isSw
    ? `Habari TSMA, nimefanya malipo. Reference: ${reference}`
    : `Hello TSMA, I have made a payment. Reference: ${reference}`

  const deadlineText = expiresAt
    ? new Date(expiresAt).toLocaleString(isSw ? 'sw-TZ' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null

  return (
    <div className="text-left">
      <p className="text-sm font-bold text-ink mb-3">
        {isSw
          ? 'Lipa kwa kutumia taarifa za akaunti ya TSMA hapa chini:'
          : 'Pay using the TSMA account details below:'}
      </p>

      <div className="bg-navy text-white rounded-lg p-5 space-y-2.5 text-sm">
        <Row isSw={isSw} label={isSw ? 'Benki' : 'Bank'} value={bankDetails.bank_name} />
        <Row isSw={isSw} label={isSw ? 'Jina la Akaunti' : 'Account Name'} value={bankDetails.account_name} />
        <Row
          isSw={isSw}
          label={isSw ? 'Namba ya Akaunti' : 'Account Number'}
          value={bankDetails.account_number}
          highlight
          copy
        />
        {bankDetails.swift_code && <Row isSw={isSw} label="SWIFT/BIC" value={bankDetails.swift_code} />}
        <Row
          isSw={isSw}
          label={isSw ? 'Reference (weka kwenye malipo)' : 'Reference (include with payment)'}
          value={reference}
          highlight
          copy
        />
        <Row isSw={isSw} label={isSw ? 'WhatsApp ya Uthibitisho' : 'Confirmation WhatsApp'} value={bankDetails.confirm_phone} />
      </div>

      <div className="bg-gold/10 border border-gold/30 rounded-md px-4 py-3 mt-4">
        <p className="text-sm text-ink font-semibold">
          {isSw
            ? `Baada ya kulipa, tuma ujumbe wa WhatsApp kwenda ${bankDetails.confirm_phone} ukiwa na REFERENCE hapo juu na picha ya risiti ya benki, ndani ya masaa ${deadlineHours}, ili tuthibitishe malipo yako.`
            : `After paying, send a WhatsApp message to ${bankDetails.confirm_phone} with the REFERENCE above and a photo of your bank receipt, within ${deadlineHours} hours, so we can confirm your payment.`}
        </p>
        {waNumber && (
          <a
            href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 bg-green text-white font-extrabold text-sm px-5 py-2.5 rounded-md"
          >
            💬 {isSw ? 'Fungua WhatsApp' : 'Open WhatsApp'}
          </a>
        )}
      </div>

      {extra && <p className="text-xs text-ink-muted mt-3">{extra}</p>}

      {deadlineText && (
        <p className="text-xs text-terracotta font-semibold mt-3">
          {isSw ? 'Muda wa mwisho wa kuthibitisha: ' : 'Confirmation deadline: '}
          {deadlineText}
        </p>
      )}

      <p className="text-xs text-ink-muted mt-3">
        {isSw
          ? 'Ukurasa huu utasasishwa wenyewe mara malipo yako yatakapothibitishwa.'
          : 'This page will update automatically once your payment is confirmed.'}
      </p>
    </div>
  )
}
