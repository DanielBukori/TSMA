import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import PageBanner from '../components/PageBanner.jsx'
import PageBannerText from '../components/PageBannerText.jsx'

const FALLBACK_INFO = {
  organization_name: 'TSMA',
  phone_number: '+255700000000',
  phone_call_link: 'tel:+255700000000',
  whatsapp_number: '255700000000',
  whatsapp_link: 'https://wa.me/255700000000',
  email: 'info@tsma.or.tz',
  email_mailto_link: 'mailto:info@tsma.or.tz',
  physical_address: 'Barabara ya Uwanja wa Ndege, Dar es Salaam, Tanzania',
  postal_address: 'S.L.P 12345, Dar es Salaam',
  google_maps_link: '',
  facebook_url: '#',
  instagram_url: '#',
  linkedin_url: '#',
  youtube_url: '#',
  TikTok_url: '#',
  Twitter: '#', 

}

export default function Contact() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [info, setInfo] = useState(FALLBACK_INFO)
  const [showMessageForm, setShowMessageForm] = useState(false)

  useEffect(() => {
    apiClient
      .get('/contact/info/')
      .then((res) => setInfo(res.data))
      .catch(() => {})
  }, [])

  return (
    <>
      <PageBanner>
        <PageBannerText
          pageKey="contact"
          isSw={isSw}
          fallback={{
            badge_sw: 'MAWASILIANO', badge_en: 'CONTACT',
            title_sw: 'Wasiliana Nasi', title_en: 'Get In Touch',
            subtitle_sw: 'Tuko tayari kukusaidia — piga simu, tuma ujumbe, au jaza fomu hapa chini.',
            subtitle_en: "We're here to help — call, message, or fill the form below.",
          }}
        />
      </PageBanner>

      <section className="max-w-5xl mx-auto px-5 md:px-8 py-14 md:py-20 grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* ============ CONTACT INFO ============ */}
        <div className="lg:col-span-2 space-y-4">
          <ContactLink
            href={info.phone_call_link}
            icon="📞"
            label={isSw ? 'Piga Simu' : 'Call Us'}
            value={info.phone_number}
          />
          <ContactLink
            href={info.whatsapp_link}
            icon="💬"
            label="WhatsApp"
            value={info.whatsapp_number}
            external
          />
          <ContactLink
            href={info.email_mailto_link}
            icon="✉️"
            label={isSw ? 'Barua Pepe' : 'Email'}
            value={info.email}
          />

          {info.physical_address && (
            <div className="border border-black/10 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <span className="text-xl">📍</span>
                <div>
                  <div className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-1">
                    {isSw ? 'Anwani' : 'Address'}
                  </div>
                  <p className="text-sm text-ink leading-relaxed">{info.physical_address}</p>
                  {info.postal_address && (
                    <p className="text-xs text-ink-muted mt-1">{info.postal_address}</p>
                  )}
                  {info.google_maps_link && (
                    <a
                      href={info.google_maps_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-xs font-bold text-terracotta"
                    >
                      {isSw ? 'Fungua Ramani →' : 'Open Map →'}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}


        </div>

        {/* Message form opens only when a visitor asks to write to TSMA. */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-black/10 bg-white p-6 md:p-8 shadow-sm">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-navy">{isSw ? 'Tunaweza kukusaidia?' : 'How can we help?'}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{isSw ? 'Tuma swali au pendekezo lako kwa timu ya TSMA. Tutafurahi kusikia kutoka kwako.' : 'Send your question or idea to the TSMA team. We would be glad to hear from you.'}</p>
            <button type="button" onClick={() => setShowMessageForm((value) => !value)} aria-expanded={showMessageForm} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-3 text-sm font-extrabold text-navy-deep hover:bg-gold-dark transition-colors">
              {showMessageForm ? (isSw ? 'Funga fomu' : 'Close form') : (isSw ? 'Andika Ujumbe' : 'Write a Message')} <span aria-hidden="true">{showMessageForm ? '−' : '→'}</span>
            </button>
            {showMessageForm && <div className="mt-6"><ContactForm isSw={isSw} /></div>}
          </div>
        </div>
      </section>
    </>
  )
}

function ContactLink({ href, icon, label, value, external }) {
  if (!href) return null
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="flex items-center gap-4 border border-black/10 rounded-xl p-5 hover:border-terracotta/40 hover:shadow-md transition-all group"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="text-xs font-bold text-ink-muted uppercase tracking-wide">{label}</div>
        <div className="text-sm font-bold text-navy group-hover:text-terracotta transition-colors">
          {value}
        </div>
      </div>
    </a>
  )
}

function ContactForm({ isSw }) {
  const [form, setForm] = useState({ full_name: '', email: '', phone_number: '', subject: '', message: '' })
  const [status, setStatus] = useState('idle') // idle | submitting | success | error

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('submitting')
    try {
      await apiClient.post('/contact/message/', form)
      setStatus('success')
      setForm({ full_name: '', email: '', phone_number: '', subject: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="border border-green/30 bg-green/10 rounded-xl p-8 text-center">
        <div className="text-3xl mb-3">✅</div>
        <p className="text-sm font-semibold text-ink mb-4">
          {isSw ? 'Ujumbe wako umetumwa. Tutawasiliana nawe hivi karibuni.' : "Your message has been sent. We'll get back to you soon."}
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="text-sm font-bold text-navy border-b-2 border-gold"
        >
          {isSw ? 'Tuma Ujumbe Mwingine' : 'Send Another Message'}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label={isSw ? 'Jina Kamili' : 'Full Name'}
          value={form.full_name}
          onChange={(v) => update('full_name', v)}
          placeholder={isSw ? 'Mfano: Amina Juma' : 'e.g. Amina Juma'}
          required
        />
        <Field
          label={isSw ? 'Barua Pepe' : 'Email'}
          type="email"
          value={form.email}
          onChange={(v) => update('email', v)}
          placeholder="amina@example.com"
          required
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label={isSw ? 'Namba ya Simu (Hiari)' : 'Phone (Optional)'}
          value={form.phone_number}
          onChange={(v) => update('phone_number', v)}
          placeholder="+255 7XX XXX XXX"
        />
        <Field
          label={isSw ? 'Kichwa (Hiari)' : 'Subject (Optional)'}
          value={form.subject}
          onChange={(v) => update('subject', v)}
          placeholder={isSw ? 'Mfano: Ushirikiano wa michezo' : 'e.g. Sports partnership'}
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-ink mb-1.5">
          {isSw ? 'Ujumbe' : 'Message'}
        </label>
        <textarea
          required
          rows={5}
          value={form.message}
          placeholder={isSw ? 'Tuambie jinsi TSMA inaweza kukusaidia...' : 'Tell us how TSMA can help you...'}
          onChange={(e) => update('message', e.target.value)}
          className="w-full border border-black/15 rounded-md px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-terracotta/40"
        />
      </div>

      {status === 'error' && (
        <p className="text-xs text-terracotta">
          {isSw ? 'Imeshindikana kutuma. Jaribu tena.' : 'Failed to send. Please try again.'}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm px-8 py-4 rounded-md transition-colors disabled:opacity-60"
      >
        {status === 'submitting' ? (isSw ? 'Inatuma...' : 'Sending...') : isSw ? 'Tuma Ujumbe' : 'Send Message'}
      </button>
    </form>
  )
}

function Field({ label, type = 'text', value, onChange, required, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-bold text-ink mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-black/15 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
      />
    </div>
  )
}
