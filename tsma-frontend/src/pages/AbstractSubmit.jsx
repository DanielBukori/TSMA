import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'

const FALLBACK_CATEGORIES = [
  { id: 1, name: 'Uchumi wa Michezo' },
  { id: 2, name: 'Uongozi wa Michezo' },
  { id: 3, name: 'Sayansi ya Michezo' },
]

export default function AbstractSubmit() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const navigate = useNavigate()

  const [categories, setCategories] = useState(FALLBACK_CATEGORIES)
  const [form, setForm] = useState({
    title: '',
    authors: '',
    abstract_text: '',
    keywords: '',
    category: '',
  })
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [error, setError] = useState('')

  useEffect(() => {
    apiClient
      .get('/publications/categories/')
      .then((res) => {
        const results = res.data?.results || res.data
        if (Array.isArray(results) && results.length > 0) setCategories(results)
      })
      .catch(() => {})
  }, [])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('submitting')
    setError('')

    const formData = new FormData()
    Object.entries(form).forEach(([key, value]) => formData.append(key, value))
    if (file) formData.append('supporting_file', file)

    try {
      await apiClient.post('/publications/abstracts/submit/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(
        err.response?.data?.detail ||
          (isSw ? 'Uwasilishaji umeshindikana. Jaribu tena.' : 'Submission failed. Please try again.'),
      )
    }
  }

  if (status === 'success') {
    return (
      <section className="max-w-lg mx-auto px-5 py-24 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h1 className="font-serif font-bold text-2xl text-navy mb-3">
          {isSw ? 'Utafiti Wako Umewasilishwa!' : 'Your Research Has Been Submitted!'}
        </h1>
        <p className="text-sm text-ink-muted mb-8">
          {isSw
            ? 'Timu yetu itaupitia na kukujulisha hali yake hivi karibuni.'
            : 'Our team will review it and notify you of the status soon.'}
        </p>
        <button
          onClick={() => navigate('/publications')}
          className="bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm px-7 py-3.5 rounded-md"
        >
          {isSw ? 'Rudi kwenye Machapisho' : 'Back to Publications'}
        </button>
      </section>
    )
  }

  return (
    <section className="max-w-xl mx-auto px-5 py-16 md:py-20">
      <div className="text-center mb-10">
        <span className="inline-block bg-cream text-terracotta text-xs font-extrabold tracking-widest px-4 py-2 rounded-full mb-4">
          {isSw ? 'UWASILISHAJI WA UTAFITI' : 'RESEARCH SUBMISSION'}
        </span>
        <h1 className="font-serif font-bold text-3xl text-navy">
          {isSw ? 'Wasilisha Kazi Yako ya Kitaaluma' : 'Submit Your Academic Work'}
        </h1>
        <p className="text-sm text-ink-muted mt-3">
          {isSw
            ? 'Kwa ajili ya kuwasilishwa kwenye mkutano ujao wa TSMA.'
            : "For consideration at TSMA's upcoming conference."}
        </p>
      </div>

      {error && (
        <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta text-sm rounded-lg px-4 py-3 mb-5">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label={isSw ? 'Kichwa cha Kazi' : 'Title'}
          value={form.title}
          onChange={(v) => update('title', v)}
          required
        />
        <Field
          label={isSw ? 'Waandishi' : 'Authors'}
          value={form.authors}
          onChange={(v) => update('authors', v)}
          placeholder={isSw ? 'Yaliyotenganishwa kwa comma' : 'Comma-separated'}
          required
        />

        <div>
          <label className="block text-xs font-bold text-ink mb-1.5">
            {isSw ? 'Kategoria' : 'Category'}
          </label>
          <select
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
            className="w-full border border-black/15 rounded-md px-4 py-3 text-sm"
          >
            <option value="">{isSw ? 'Chagua Kategoria' : 'Select Category'}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-ink mb-1.5">
            {isSw ? 'Maandishi ya Abstract' : 'Abstract Text'}
          </label>
          <textarea
            required
            rows={6}
            value={form.abstract_text}
            onChange={(e) => update('abstract_text', e.target.value)}
            className="w-full border border-black/15 rounded-md px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-terracotta/40"
          />
        </div>

        <Field
          label={isSw ? 'Maneno Muhimu (Keywords)' : 'Keywords'}
          value={form.keywords}
          onChange={(v) => update('keywords', v)}
          placeholder={isSw ? 'Yaliyotenganishwa kwa comma' : 'Comma-separated'}
        />

        <div>
          <label className="block text-xs font-bold text-ink mb-1.5">
            {isSw ? 'Faili la Ziada (Hiari)' : 'Supporting File (Optional)'}
          </label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm py-4 rounded-md transition-colors disabled:opacity-60"
        >
          {status === 'submitting'
            ? isSw ? 'Inawasilisha...' : 'Submitting...'
            : isSw ? 'Wasilisha Utafiti' : 'Submit Research'}
        </button>
      </form>
    </section>
  )
}

function Field({ label, value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="block text-xs font-bold text-ink mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}  
        className="w-full border border-black/15 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40"
      />
    </div>
  )
}
