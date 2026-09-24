import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import PageBanner from '../components/PageBanner.jsx'
import PageBannerText from '../components/PageBannerText.jsx'

const TYPE_LABEL_SW = {
  full_time: 'Muda Kamili', part_time: 'Muda Fulani', consultancy: 'Ushauri',
  volunteer: 'Kujitolea', internship: 'Mafunzo kwa Vitendo',
}
const TYPE_LABEL_EN = {
  full_time: 'Full-time', part_time: 'Part-time', consultancy: 'Consultancy',
  volunteer: 'Volunteer', internship: 'Internship',
}

export default function Careers() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient
      .get('/careers/')
      .then((res) => setJobs(res.data?.results || res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <PageBanner>
        <PageBannerText
          pageKey="careers"
          isSw={isSw}
          fallback={{
            badge_sw: 'NAFASI ZA AJIRA', badge_en: 'CAREERS',
            title_sw: 'Jiunge na Timu ya TSMA', title_en: 'Join the TSMA Team',
          }}
        />
      </PageBanner>

      <section className="max-w-4xl mx-auto px-5 md:px-8 py-14 md:py-20">
        {loading ? (
          <p className="text-center text-ink-muted text-sm">{isSw ? 'Inapakua...' : 'Loading...'}</p>
        ) : jobs.length === 0 ? (
          <p className="text-center text-ink-muted text-sm">
            {isSw ? 'Hakuna nafasi za kazi zilizo wazi kwa sasa.' : 'No open positions right now.'}
          </p>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Link
                key={job.id}
                to={`/careers/${job.slug}`}
                className="block border border-black/10 rounded-xl p-5 hover:border-gold hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-bold text-navy">{job.title}</h2>
                    <p className="text-xs text-ink-muted mt-1">
                      {job.department && `${job.department} · `}
                      {isSw ? TYPE_LABEL_SW[job.employment_type] : TYPE_LABEL_EN[job.employment_type]}
                      {job.location && ` · ${job.location}`}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-terracotta shrink-0">
                    {isSw ? 'Omba →' : 'Apply →'}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted mt-3">
                  {isSw ? 'Mwisho wa kuomba: ' : 'Deadline: '}
                  {new Date(job.application_deadline).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
