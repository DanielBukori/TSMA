import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function CareerDetail() {
  const { slug } = useParams()
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const { isAuthenticated } = useAuth()

  const [job, setJob] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [cvFile, setCvFile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    apiClient
      .get(`/careers/${slug}/`)
      .then((res) => setJob(res.data))
      .catch(() => setJob(false))
  }, [slug])

  async function handleApply(e) {
    e.preventDefault()
    if (!cvFile) return
    setStatus('submitting')
    try {
      const data = new FormData()
      data.append('cover_letter', coverLetter)
      data.append('cv_file', cvFile)
      await apiClient.post(`/careers/${slug}/apply/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setStatus('success')
      setMessage(isSw ? 'Ombi lako limetumwa! Tutawasiliana nawe.' : 'Your application was submitted! We will be in touch.')
    } catch (err) {
      setStatus('error')
      setMessage(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || (isSw ? 'Imeshindikana kutuma.' : 'Submission failed.'))
    }
  }

  if (job === null) {
    return <p className="text-center text-ink-muted text-sm py-20">{isSw ? 'Inapakua...' : 'Loading...'}</p>
  }
  if (job === false) {
    return <p className="text-center text-ink-muted text-sm py-20">{isSw ? 'Nafasi haipatikani.' : 'Job not found.'}</p>
  }

  return (
    <section className="max-w-2xl mx-auto px-5 md:px-8 py-14 md:py-20">
      <Link to="/careers" className="text-xs font-bold text-ink-muted">
        {isSw ? '← Nafasi Zote' : '← All Jobs'}
      </Link>

      <h1 className="font-serif font-bold text-2xl md:text-3xl text-navy mt-3">{job.title}</h1>
      <p className="text-sm text-ink-muted mt-1">
        {job.department && `${job.department} · `}{job.location}
      </p>
      <p className="text-xs text-terracotta font-bold mt-2">
        {isSw ? 'Mwisho wa kuomba: ' : 'Deadline: '}
        {new Date(job.application_deadline).toLocaleDateString()}
      </p>

      <div className="prose prose-sm max-w-none mt-6 whitespace-pre-line text-ink">{job.description}</div>

      {job.requirements && (
        <>
          <h3 className="font-bold text-navy text-sm mt-6 mb-2">{isSw ? 'Sifa Zinazohitajika' : 'Requirements'}</h3>
          <p className="text-sm text-ink whitespace-pre-line">{job.requirements}</p>
        </>
      )}

      <div className="mt-10 border-t border-black/10 pt-8">
        {!job.is_still_open ? (
          <p className="text-sm text-ink-muted font-bold">
            {isSw ? 'Nafasi hii haipokei maombi tena.' : 'This position is no longer accepting applications.'}
          </p>
        ) : status === 'success' ? (
          <p className="text-sm text-green font-bold">{message}</p>
        ) : !isAuthenticated ? (
          <div className="bg-cream rounded-xl p-5 text-center">
            <p className="text-sm text-ink mb-3">
              {isSw ? 'Lazima uingie kwenye akaunti yako kuomba nafasi hii.' : 'You must be logged in to apply.'}
            </p>
            <Link to="/login" className="inline-block bg-navy text-white font-bold text-sm px-6 py-2.5 rounded-md">
              {isSw ? 'Ingia' : 'Login'}
            </Link>
          </div>
        ) : !showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm px-7 py-3.5 rounded-md"
          >
            {isSw ? 'Omba Nafasi Hii' : 'Apply for this Position'}
          </button>
        ) : (
          <form onSubmit={handleApply} className="space-y-4">
            {status === 'error' && <p className="text-xs text-terracotta font-bold">{message}</p>}
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                {isSw ? 'Barua ya Maombi' : 'Cover Letter'}
              </label>
              <textarea
                rows={4}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                className="w-full border border-black/15 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">CV (PDF)</label>
              <input
                type="file"
                required
                accept=".pdf,.doc,.docx"
                onChange={(e) => setCvFile(e.target.files[0])}
                className="text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="bg-navy hover:bg-navy-deep text-white font-bold text-sm px-7 py-3 rounded-md disabled:opacity-60"
            >
              {status === 'submitting' ? (isSw ? 'Inatuma...' : 'Submitting...') : isSw ? 'Tuma Ombi' : 'Submit Application'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
