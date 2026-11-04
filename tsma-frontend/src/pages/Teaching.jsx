import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import PageBanner from '../components/PageBanner.jsx'
import PageBannerText from '../components/PageBannerText.jsx'
import EmptyState from '../components/EmptyState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import Icon from '../components/Icon.jsx'

export default function Teaching() {
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [courses, setCourses] = useState([])
  const [sessions, setSessions] = useState([])
  const [state, setState] = useState('loading')

  useEffect(() => {
    let cancelled = false
    setState('loading')
    Promise.allSettled([
      apiClient.get('/teaching/courses/'),
      apiClient.get('/teaching/sessions/'),
    ]).then(([courseRes, sessionRes]) => {
      if (cancelled) return
      if (courseRes.status === 'fulfilled') {
        const results = courseRes.value.data?.results || courseRes.value.data
        if (Array.isArray(results)) setCourses(results)
      }
      if (sessionRes.status === 'fulfilled') {
        const results = sessionRes.value.data?.results || sessionRes.value.data
        if (Array.isArray(results)) setSessions(results)
      }
      setState(courseRes.status === 'fulfilled' || sessionRes.status === 'fulfilled' ? 'ready' : 'error')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const standaloneSessions = sessions.filter((s) => !s.course)

  return (
    <>
      <PageBanner>
        <PageBannerText
          pageKey="teaching"
          isSw={isSw}
          fallback={{
            badge_sw: 'KOZI NA MAFUNZO', badge_en: 'COURSES AND TRAINING',
            title_sw: 'Jifunze na TSMA', title_en: 'Learn with TSMA',
            subtitle_sw: 'Kozi, vikao vya moja kwa moja, na video zilizorekodiwa kwa wataalamu wa usimamizi wa michezo.',
            subtitle_en: 'Courses, live sessions, and recorded videos for sports management professionals.',
          }}
        />
      </PageBanner>

      {state === 'error' && (
        <section className="max-w-5xl mx-auto px-5 md:px-8 py-12">
          <EmptyState
            isSw={isSw}
            tone="error"
            sw="Hakuna kozi za kuonyesha kwa sasa."
            en="No courses to show right now."
            hintSw="Muunganisho na seva haukufanyika. Fundi wa TSMA ataangalia; jaribu tena baadaye."
            hintEn="The connection to the server failed. The TSMA administrator will be notified; please try again later."
          />
        </section>
      )}

      {state === 'ready' && courses.length === 0 && standaloneSessions.length === 0 && (
        <section className="max-w-5xl mx-auto px-5 md:px-8 py-12">
          <EmptyState
            isSw={isSw}
            sw="TSMA bado haijaweka kozi wala vikao."
            en="TSMA has not published courses or sessions yet."
            hintSw="Kozi mpya na vikao vya mafunzo huongezwa na mhariri wa tovuti."
            hintEn="New courses and training sessions are added by the site editor."
          />
        </section>
      )}

      {state === 'ready' && courses.length > 0 && (
        <section className="max-w-5xl mx-auto px-5 md:px-8 py-14">
          <h2 className="font-serif font-bold text-xl text-navy mb-6">
            {isSw ? 'Kozi' : 'Courses'}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/teaching/courses/${course.slug}`}
                className="block bg-surface border border-black/10 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative h-44 bg-gradient-to-br from-navy to-green-dark overflow-hidden">
                  {course.cover_image ? (
                    <img
                      src={course.cover_image}
                      alt={course.title ? `${course.title} cover` : 'Course cover'}
                      loading="lazy"
                      className="h-full w-full object-contain p-2 transition-transform duration-500"
                      onError={(event) => { event.currentTarget.style.display = 'none' }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center" aria-label={isSw ? 'Picha ya kozi haijawekwa' : 'No course cover uploaded'}>
                      <Icon name="image" className="w-10 h-10 text-white/60" strokeWidth={1.4} />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />
                </div>
                <div className="p-5">
                  <h3 className="font-serif font-bold text-navy text-base">{course.title}</h3>
                  <p className="text-xs text-ink-muted mt-1.5 line-clamp-2">{course.description}</p>
                  <p className="text-xs font-bold text-terracotta mt-2">
                    {course.session_count} {isSw ? 'vikao' : 'sessions'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {state === 'ready' && standaloneSessions.length > 0 && (
        <section className="bg-cream py-14">
          <div className="max-w-5xl mx-auto px-5 md:px-8">
            <h2 className="font-serif font-bold text-xl text-navy mb-6">
              {isSw ? 'Vikao Huru' : 'Standalone Sessions'}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {standaloneSessions.map((session) => (
                <Link
                  key={session.id}
                  to={`/teaching/sessions/${session.slug}`}
                  className="flex items-center gap-4 bg-surface border border-black/10 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-lg bg-navy text-gold flex items-center justify-center text-xl shrink-0">
                    {session.session_type === 'live' ? (
                      <Icon name="dot" className="w-4 h-4 text-terracotta" strokeWidth={2} />
                    ) : (
                      <Icon name="play" className="w-5 h-5" strokeWidth={1.6} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-navy truncate">{session.title}</h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {session.instructor_name}
                      {session.scheduled_start && ` · ${new Date(session.scheduled_start).toLocaleDateString()}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
