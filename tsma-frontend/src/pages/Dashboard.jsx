import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Dashboard() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const { user } = useAuth()

  const [membership, setMembership] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [teachingProgress, setTeachingProgress] = useState(null)
  const [conferenceRegs, setConferenceRegs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    Promise.allSettled([
      apiClient.get('/members/me/'),
      apiClient.get('/payments/my-transactions/'),
      apiClient.get('/teaching/my-progress/'),
      apiClient.get('/conferences/my-registrations/'),
    ]).then(([memberRes, txnRes, teachingRes, confRes]) => {
      if (cancelled) return
      if (memberRes.status === 'fulfilled') setMembership(memberRes.value.data)
      if (txnRes.status === 'fulfilled') {
        const results = txnRes.value.data?.results || txnRes.value.data
        if (Array.isArray(results)) setTransactions(results)
      }
      if (teachingRes.status === 'fulfilled') setTeachingProgress(teachingRes.value.data)
      if (confRes.status === 'fulfilled') {
        const batches = confRes.value.data?.results || confRes.value.data
        if (Array.isArray(batches)) {
          // Kila batch ina "attendees" (moja au wengi, kwa bulk registration) -
          // tunazitandaza kuwa orodha moja ya tiketi kwa ajili ya Dashboard.
          const tickets = batches.flatMap((batch) => batch.attendees || [])
          setConferenceRegs(tickets)
        }
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="max-w-4xl mx-auto px-5 md:px-8 py-14 md:py-20">
      <h1 className="font-serif font-bold text-3xl text-navy mb-2">
        {isSw ? 'Dashibodi Yangu' : 'My Dashboard'}
      </h1>
      <p className="text-ink-muted text-sm mb-10">
        {isSw ? `Karibu, ${user?.full_name || ''}` : `Welcome, ${user?.full_name || ''}`}
      </p>

      {loading ? (
        <p className="text-ink-muted text-sm">{isSw ? 'Inapakia...' : 'Loading...'}</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Digital membership card */}
          <div className="lg:col-span-2">
            <h2 className="font-serif font-bold text-lg text-navy mb-4">
              {isSw ? 'Kadi Yangu ya Uanachama' : 'My Membership Card'}
            </h2>

            {membership ? (
              <DigitalCard membership={membership} isSw={isSw} />
            ) : (
              <div className="border border-dashed border-black/20 rounded-xl p-8 text-center">
                <p className="text-sm text-ink-muted">
                  {isSw
                    ? 'Bado hujajiunga na daraja lolote la uanachama.'
                    : "You haven't joined a membership tier yet."}
                </p>
                <a
                  href="/members"
                  className="inline-block mt-4 bg-gold text-navy-deep font-extrabold text-sm px-6 py-3 rounded-md"
                >
                  {isSw ? 'Jiunge Sasa →' : 'Join Now →'}
                </a>
              </div>
            )}
          </div>

          {/* Payment history */}
          <div className="lg:col-span-3">
            <h2 className="font-serif font-bold text-lg text-navy mb-4">
              {isSw ? 'Historia ya Malipo' : 'Payment History'}
            </h2>

            {transactions.length === 0 ? (
              <p className="text-sm text-ink-muted">
                {isSw ? 'Hakuna malipo bado.' : 'No payments yet.'}
              </p>
            ) : (
              <div className="border border-black/10 rounded-xl overflow-hidden divide-y divide-black/5">
                {transactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <div className="font-semibold text-sm text-ink capitalize">
                        {txn.purpose === 'membership' ? (isSw ? 'Ada ya Uanachama' : 'Membership Fee') : txn.purpose}
                      </div>
                      <div className="text-xs text-ink-muted mt-0.5">
                        {new Date(txn.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-serif font-bold text-navy text-sm">
                        {Number(txn.amount).toLocaleString()} {txn.currency}
                      </div>
                      <StatusPill status={txn.status} isSw={isSw} />
                      {/* Risiti halisi (QR) inaonekana chini kwenye "Mikutano
                          Yangu" (ConferenceRegistrationsSection) - hapa tunatoa
                          tu kiungo cha kupeleka pale, badala ya kurudia logic ya
                          kutafuta e_receipt_image sahihi bila kujua muunganiko
                          kamili wa data (angalia maelezo kwenye JINSI_YA_KUWEKA.md). */}
                      {txn.purpose === 'conference' && txn.status === 'success' && (
                        <a
                          href="#my-conferences"
                          className="block text-[11px] font-bold text-terracotta mt-1"
                        >
                          {isSw ? 'Ona risiti chini ↓' : 'See receipt below ↓'}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ TEACHING PROGRESS & CERTIFICATES ============ */}
      {!loading && teachingProgress && (
        <div className="mt-14">
          <h2 className="font-serif font-bold text-lg text-navy mb-4">
            {isSw ? 'Vyeti na Maendeleo ya Mafunzo' : 'Certificates & Learning Progress'}
          </h2>

          {teachingProgress.certificates?.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {teachingProgress.certificates.map((cert) => (
                <div key={cert.id} className="border border-gold/30 bg-gold/5 rounded-xl p-4 flex items-center gap-4">
                  <span className="text-2xl">🏆</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-navy truncate">{cert.title_earned}</div>
                    <div className="text-xs text-ink-muted">{cert.certificate_number}</div>
                    {cert.certificate_image && (
                      <a
                        href={cert.certificate_image}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-terracotta mt-1 inline-block"
                      >
                        {isSw ? 'Pakua Cheti →' : 'Download Certificate →'}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {teachingProgress.enrollments?.length > 0 && (
            <div className="space-y-3">
              {teachingProgress.enrollments.map((enr) => (
                <div key={enr.id} className="border border-black/10 rounded-xl p-4">
                  <div className="flex justify-between text-sm font-bold text-navy mb-2">
                    <span>{enr.course_title}</span>
                    <span>{enr.progress_percent}%</span>
                  </div>
                  <div className="h-2 bg-cream rounded-full overflow-hidden">
                    <div className="h-full bg-green transition-all" style={{ width: `${enr.progress_percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {(!teachingProgress.certificates?.length && !teachingProgress.enrollments?.length) && (
            <p className="text-sm text-ink-muted">
              {isSw ? 'Bado hujaanza kozi yoyote.' : "You haven't started any courses yet."}{' '}
              <a href="/teaching" className="font-bold text-terracotta">{isSw ? 'Anza sasa →' : 'Start now →'}</a>
            </p>
          )}
        </div>
      )}

      {/* Mikutano Yangu (Conferences) - tiketi/risiti. Zilizopita zinabaki
          kama "history" tu (muundo hafifu, bila kitufe kikubwa cha
          kitendo), zinazokuja zinaonekana kwa uzito zaidi. */}
      {!loading && (
        <ConferenceRegistrationsSection registrations={conferenceRegs} isSw={isSw} />
      )}

      {/* Profaili ya Kitaaluma - CV, bio, elimu, uzoefu. NI SIRI kwa default
          (mwenyewe na Admin tu). Mwanachama anaulizwa kama anataka kuitoa
          kwa jamii; anaweza kubadili uamuzi wakati wowote hapa chini. */}
      <ProfessionalProfileSection isSw={isSw} />
    </section>
  )
}

function ConferenceRegistrationsSection({ registrations, isSw }) {
  if (!registrations.length) return null

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = registrations.filter((r) => !r.conference_end_date || r.conference_end_date >= today)
  const past = registrations.filter((r) => r.conference_end_date && r.conference_end_date < today)

  return (
    <div className="mt-14" id="my-conferences">
      <h2 className="font-serif font-bold text-lg text-navy mb-4">
        {isSw ? 'Mikutano Yangu' : 'My Conferences'}
      </h2>

      {upcoming.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {upcoming.map((reg) => (
            <div key={reg.id} className="border border-gold/30 bg-gold/5 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎫</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-navy truncate">{reg.conference_title}</div>
                  <div className="text-xs text-ink-muted">{reg.ticket_type_name}</div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                    reg.batch_status === 'confirmed'
                      ? 'bg-green/15 text-green'
                      : reg.batch_status === 'cancelled'
                        ? 'bg-terracotta/15 text-terracotta'
                        : 'bg-gold/20 text-gold-dark'
                  }`}
                >
                  {reg.batch_status === 'confirmed'
                    ? isSw ? 'Imethibitishwa' : 'Confirmed'
                    : reg.batch_status === 'cancelled'
                      ? isSw ? 'Imefutwa' : 'Cancelled'
                      : isSw ? 'Inasubiri Malipo' : 'Pending Payment'}
                </span>
              </div>
              {reg.e_receipt_image ? (
                <a
                  href={reg.e_receipt_image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-terracotta mt-3 inline-block"
                >
                  {isSw ? 'Pakua Risiti (QR) →' : 'Download Receipt (QR) →'}
                </a>
              ) : (
                <p className="text-xs text-ink-muted mt-3">
                  {isSw
                    ? 'Risiti itapatikana baada ya malipo kuthibitishwa.'
                    : 'Receipt will be available once payment is confirmed.'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-3">
            {isSw ? 'Historia' : 'History'}
          </h3>
          <div className="space-y-2">
            {past.map((reg) => (
              <div
                key={reg.id}
                className="flex items-center justify-between text-sm border-b border-black/5 pb-2"
              >
                <div className="min-w-0">
                  <span className="text-ink-muted truncate">{reg.conference_title}</span>
                  <span className="text-ink-muted/60"> · {reg.ticket_type_name}</span>
                </div>
                {reg.e_receipt_image && (
                  <a
                    href={reg.e_receipt_image}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-ink-muted shrink-0 ml-3"
                  >
                    {isSw ? 'Risiti' : 'Receipt'}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DigitalCard({ membership, isSw }) {
  if (membership.digital_card_image) {
    return (
      <img
        src={membership.digital_card_image}
        alt="Digital membership card"
        className="w-full rounded-xl shadow-lg"
      />
    )
  }

  // Kadi ya "fallback" endapo picha bado haijazalishwa (mfano malipo
  // yakiwa bado hayajakamilika) — inafanana na mtindo wa kadi halisi.
  return (
    <div className="aspect-[1.586/1] rounded-xl bg-gradient-to-br from-navy-deep via-navy to-green-dark text-white p-6 flex flex-col justify-between shadow-lg">
      <div>
        <div className="font-serif font-black text-xl">TSMA</div>
        <div className="text-[10px] text-white/60 tracking-wide mt-0.5">
          {isSw ? 'CHAMA CHA USIMAMIZI WA MICHEZO' : 'SPORTS MANAGEMENT ASSOCIATION'}
        </div>
      </div>
      <div>
        <div className="font-serif font-bold text-lg tracking-wider">
          {membership.membership_number}
        </div>
        <div className="flex justify-between items-end mt-2">
          <div>
            <div className="text-xs uppercase">{membership.full_name}</div>
            <div className="text-[10px] text-gold mt-0.5">{membership.tier?.name}</div>
          </div>
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
              membership.status === 'active' ? 'bg-green/80' : 'bg-gold/80 text-navy-deep'
            }`}
          >
            {membership.status === 'active'
              ? isSw ? 'ACTIVE' : 'ACTIVE'
              : isSw ? 'INASUBIRI' : 'PENDING'}
          </span>
        </div>
      </div>
    </div>
  )
}

function StatusPill({ status, isSw }) {
  const config = {
    success: { color: 'text-green bg-green/10', label: isSw ? 'Imefanikiwa' : 'Success' },
    pending: { color: 'text-gold-dark bg-gold/10', label: isSw ? 'Inasubiri' : 'Pending' },
    processing: { color: 'text-gold-dark bg-gold/10', label: isSw ? 'Inachakatwa' : 'Processing' },
    failed: { color: 'text-terracotta bg-terracotta/10', label: isSw ? 'Imeshindwa' : 'Failed' },
  }
  const c = config[status] || config.pending
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${c.color}`}>
      {c.label}
    </span>
  )
}

function ProfessionalProfileSection({ isSw }) {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [cvFile, setCvFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [visibilitySaving, setVisibilitySaving] = useState(false)

  useEffect(() => {
    apiClient
      .get('/members/me/profile/')
      .then((res) => {
        setProfile(res.data)
        setForm(res.data)
      })
      .catch(() => {})
  }, [])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const data = new FormData()
      const textFields = [
        'professional_title', 'current_organization', 'years_of_experience',
        'specialization', 'bio', 'education', 'experience', 'certifications',
        'linkedin_url', 'public_email',
      ]
      textFields.forEach((f) => data.append(f, form[f] ?? ''))
      if (photoFile) data.append('photo', photoFile)
      if (cvFile) data.append('cv_file', cvFile)

      const res = await apiClient.patch('/members/me/profile/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setProfile(res.data)
      setForm(res.data)
      // Navbar inasikiliza tukio hili ili kusasisha avatar mara moja
      window.dispatchEvent(new CustomEvent('tsma:profile-updated', { detail: res.data }))
      setPhotoFile(null)
      setCvFile(null)
      setSaved(true)
    } catch {
      // form inabaki na thamani zilizoandikwa - mtumiaji anaweza kujaribu tena
    } finally {
      setSaving(false)
    }
  }

  // Inabadilisha ruhusa MOJA tu (is_public, cv_public au email_public) na
  // inahifadhi papo hapo - maandishi ambayo mtumiaji hajahifadhi hayaguswi.
  async function patchFlag(field, value) {
    setVisibilitySaving(true)
    try {
      const data = new FormData()
      data.append(field, value ? 'true' : 'false')
      const res = await apiClient.patch('/members/me/profile/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const patch = {
        is_public: res.data.is_public,
        visibility_decided: res.data.visibility_decided,
        cv_public: res.data.cv_public,
        email_public: res.data.email_public,
      }
      setProfile((prev) => ({ ...prev, ...patch }))
      setForm((prev) => ({ ...prev, ...patch }))
    } catch {
      // hali haijabadilika - mtumiaji anaweza kujaribu tena
    } finally {
      setVisibilitySaving(false)
    }
  }

  const setVisibility = (makePublic) => patchFlag('is_public', makePublic)

  if (!form) return null

  const inputClass =
    'w-full border border-black/15 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40'
  const labelClass = 'block text-xs font-bold text-ink mb-1.5'

  return (
    <div className="mt-14 border-t border-black/5 pt-10">
      <h2 className="font-serif font-bold text-lg text-navy mb-3">
        {isSw ? 'Profaili Yangu ya Kitaaluma' : 'My Professional Profile'}
      </h2>

      {/* Swali la idhini - linaonekana hadi mwanachama ajibu (Ndiyo au Hapana) */}
      {!form.visibility_decided ? (
        <div className="bg-gold/10 border border-gold/40 rounded-xl p-5 mb-6">
          <p className="text-sm font-extrabold text-navy mb-2">
            {isSw
              ? 'Je, unataka profaili yako ionekane na jamii ya TSMA?'
              : 'Do you want to release your profile for the TSMA community to see?'}
          </p>
          <p className="text-xs text-ink leading-relaxed mb-1">
            {isSw
              ? 'Ukichagua NDIYO, hivi vitaonekana kwa kila mtu kwenye ukurasa wa Wataalamu: jina, cheo, taasisi, picha, wasifu, uzoefu, elimu, vyeti na LinkedIn. CV na barua pepe havionekani hadi uviruhusu kila kimoja hapa chini.'
              : 'If you choose YES, these become visible to everyone on the Professionals page: name, title, organization, photo, bio, experience, education, certifications and LinkedIn. Your CV and email stay hidden until you allow each one below.'}
          </p>
          <p className="text-xs text-ink leading-relaxed mb-4">
            {isSw
              ? 'Ukichagua HAPANA, profaili yako inabaki siri: wewe na viongozi (admin) wa TSMA tu mnaweza kuiona. Unaweza kubadili uamuzi wakati wowote.'
              : 'If you choose NO, your profile stays private: only you and TSMA administrators can see it. You can change your mind at any time.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={visibilitySaving}
              onClick={() => setVisibility(true)}
              className="bg-navy text-white text-xs font-bold px-5 py-2.5 rounded-md disabled:opacity-60"
            >
              {isSw ? 'Ndiyo, itoe kwa jamii' : 'Yes, release it to the community'}
            </button>
            <button
              type="button"
              disabled={visibilitySaving}
              onClick={() => setVisibility(false)}
              className="border border-black/20 text-ink text-xs font-bold px-5 py-2.5 rounded-md disabled:opacity-60"
            >
              {isSw ? 'Hapana, ibaki siri' : 'No, keep it private'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-cream border border-black/10 rounded-lg px-4 py-3 mb-6">
          <p className="text-xs text-ink">
            {form.is_public
              ? isSw
                ? '🌍 Profaili yako imetolewa kwa jamii - inaonekana kwenye ukurasa wa Wataalamu.'
                : '🌍 Your profile is released to the community - visible on the Professionals page.'
              : isSw
                ? '🔒 Profaili yako ni siri - wewe na viongozi (admin) wa TSMA tu mnaiona.'
                : '🔒 Your profile is private - only you and TSMA administrators can see it.'}
          </p>
          <button
            type="button"
            disabled={visibilitySaving}
            onClick={() => setVisibility(!form.is_public)}
            className="text-xs font-bold text-terracotta border-b border-terracotta disabled:opacity-60"
          >
            {form.is_public
              ? isSw ? 'Ifanye siri' : 'Make private'
              : isSw ? 'Itoe kwa jamii' : 'Release to community'}
          </button>
        </div>
      )}

      {/* Ruhusa za kando: CV na barua pepe - kila kimoja kinaruhusiwa peke yake */}
      <div className="border border-black/10 rounded-lg px-4 py-3 mb-6 space-y-3">
        <p className="text-xs font-bold text-navy">
          {isSw ? 'Taarifa nyeti - kila moja ina ruhusa yake' : 'Sensitive details - each has its own permission'}
        </p>
        <label className="flex items-start gap-3 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!form.cv_public}
            disabled={visibilitySaving}
            onChange={(e) => patchFlag('cv_public', e.target.checked)}
            className="w-4 h-4 mt-0.5"
          />
          <span>
            <span className="font-bold">CV</span> -{' '}
            {isSw ? 'ruhusu jamii kuona na kupakua CV yangu' : 'allow the community to view and download my CV'}
          </span>
        </label>
        <label className="flex items-start gap-3 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!form.email_public}
            disabled={visibilitySaving}
            onChange={(e) => patchFlag('email_public', e.target.checked)}
            className="w-4 h-4 mt-0.5"
          />
          <span>
            <span className="font-bold">{isSw ? 'Barua pepe' : 'Email'}</span> -{' '}
            {isSw ? 'ruhusu jamii kuona barua pepe yangu ya umma' : 'allow the community to see my public email'}
          </span>
        </label>
        <p className="text-[11px] text-ink-muted">
          {isSw
            ? 'Visiporuhusiwa, havionekani kwa jamii hata profaili ikiwa imetolewa. Wewe na viongozi (admin) wa TSMA mnaviona kila wakati.'
            : 'If not allowed, they stay hidden from the community even when your profile is released. You and TSMA administrators can always see them.'}
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{isSw ? 'Cheo/Taaluma' : 'Professional Title'}</label>
            <input
              className={inputClass}
              value={form.professional_title || ''}
              onChange={(e) => update('professional_title', e.target.value)}
              placeholder={isSw ? 'mfano: Meneja wa Klabu' : 'e.g. Club Manager'}
            />
          </div>
          <div>
            <label className={labelClass}>{isSw ? 'Mwajiri wa Sasa' : 'Current Organization'}</label>
            <input
              className={inputClass}
              value={form.current_organization || ''}
              onChange={(e) => update('current_organization', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{isSw ? 'Miaka ya Uzoefu' : 'Years of Experience'}</label>
            <input
              type="number"
              min="0"
              className={inputClass}
              value={form.years_of_experience ?? ''}
              onChange={(e) => update('years_of_experience', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{isSw ? 'Eneo la Utaalamu' : 'Specialization'}</label>
            <input
              className={inputClass}
              value={form.specialization || ''}
              onChange={(e) => update('specialization', e.target.value)}
              placeholder={isSw ? 'mfano: Uchumi wa Michezo' : 'e.g. Sports Economics'}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>{isSw ? 'Kuhusu Mimi' : 'About Me'}</label>
          <textarea
            rows={3}
            className={inputClass}
            value={form.bio || ''}
            onChange={(e) => update('bio', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>{isSw ? 'Elimu' : 'Education'}</label>
          <textarea
            rows={2}
            className={inputClass}
            value={form.education || ''}
            onChange={(e) => update('education', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>{isSw ? 'Uzoefu wa Kazi' : 'Work Experience'}</label>
          <textarea
            rows={2}
            className={inputClass}
            value={form.experience || ''}
            onChange={(e) => update('experience', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>{isSw ? 'Vyeti/Certifications' : 'Certifications'}</label>
          <textarea
            rows={2}
            className={inputClass}
            value={form.certifications || ''}
            onChange={(e) => update('certifications', e.target.value)}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>LinkedIn</label>
            <input
              className={inputClass}
              value={form.linkedin_url || ''}
              onChange={(e) => update('linkedin_url', e.target.value)}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div>
            <label className={labelClass}>{isSw ? 'Email ya Umma (hiari)' : 'Public Email (optional)'}</label>
            <input
              type="email"
              className={inputClass}
              value={form.public_email || ''}
              onChange={(e) => update('public_email', e.target.value)}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{isSw ? 'Picha' : 'Photo'}</label>
            {profile?.photo && !photoFile && (
              <img src={profile.photo} alt="" className="w-16 h-16 rounded-full object-cover mb-2" />
            )}
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} className="text-xs" />
          </div>
          <div>
            <label className={labelClass}>CV (PDF)</label>
            {profile?.cv_file && !cvFile && (
              <a href={profile.cv_file} target="_blank" rel="noopener noreferrer" className="text-xs text-terracotta font-bold block mb-2">
                {isSw ? 'CV ya sasa →' : 'Current CV →'}
              </a>
            )}
            <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCvFile(e.target.files[0])} className="text-xs" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-navy hover:bg-navy-deep text-white font-bold text-sm px-6 py-2.5 rounded-md disabled:opacity-60"
          >
            {saving ? (isSw ? 'Inahifadhi...' : 'Saving...') : isSw ? 'Hifadhi Profaili' : 'Save Profile'}
          </button>
          {saved && (
            <span className="text-xs font-bold text-green">{isSw ? 'Imehifadhiwa ✓' : 'Saved ✓'}</span>
          )}
        </div>
      </form>
    </div>
  )
}
