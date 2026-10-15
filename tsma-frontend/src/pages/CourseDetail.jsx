import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function CourseDetail() {
  const { slug } = useParams()
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')
  const { isAuthenticated } = useAuth()

  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState(null) // { code, message }

  useEffect(() => {
    fetchCourse()
  }, [slug])

  function fetchCourse() {
    apiClient
      .get(`/teaching/courses/${slug}/`)
      .then((res) => setCourse(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  async function handleEnroll() {
    setEnrolling(true)
    setEnrollError(null)
    try {
      await apiClient.post(`/teaching/courses/${slug}/enroll/`)
      fetchCourse()
    } catch (err) {
      const data = err.response?.data
      setEnrollError({
        code: data?.code,
        message:
          (Array.isArray(data?.detail) ? data.detail[0] : data?.detail) ||
          (isSw ? 'Imeshindikana kujiunga. Jaribu tena.' : 'Could not enroll. Try again.'),
      })
    } finally {
      setEnrolling(false)
    }
  }

  if (loading) return <div className="py-24 text-center text-ink-muted text-sm">{isSw ? 'Inapakia...' : 'Loading...'}</div>
  if (!course) return <div className="py-24 text-center text-ink-muted text-sm">{isSw ? 'Kozi haikupatikana.' : 'Course not found.'}</div>

  return (
    <>
      <section className="relative bg-navy-deep bg-track-lines text-white text-center px-5 overflow-hidden">
        {course.cover_image && (
          <img
            src={course.cover_image}
            alt={course.title ? `${course.title} cover` : 'Course cover'}
            className="absolute inset-0 h-full w-full object-cover opacity-25"
            onError={(event) => { event.currentTarget.style.display = 'none' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-navy-deep/75 to-navy-deep/95" />
        <div className="relative z-10 py-14 md:py-16">
          <h1 className="font-serif font-bold text-2xl md:text-4xl max-w-2xl mx-auto">{course.title}</h1>
          <p className="text-white/80 text-sm mt-3 max-w-xl mx-auto">{course.description}</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-5 md:px-8 py-10">
        {isAuthenticated ? (
          course.is_enrolled ? (
            <div className="bg-cream rounded-xl p-5 mb-8">
              <div className="flex justify-between text-sm font-bold text-navy mb-2">
                <span>{isSw ? 'Maendeleo Yako' : 'Your Progress'}</span>
                <span>{course.progress_percent || 0}%</span>
              </div>
              <div className="h-2.5 bg-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold transition-all"
                  style={{ width: `${course.progress_percent || 0}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="mb-8 bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm px-7 py-3.5 rounded-md disabled:opacity-60"
            >
              {enrolling ? (isSw ? 'Inajiunga...' : 'Enrolling...') : isSw ? 'Jiunge na Kozi Hii →' : 'Enroll in This Course →'}
            </button>
          )
        ) : (
          <div className="mb-8 border border-dashed border-black/20 rounded-xl p-5 text-center">
            <p className="text-sm text-ink-muted mb-3">
              {isSw ? 'Ingia kuweza kujiunga na kozi hii.' : 'Sign in to enroll in this course.'}
            </p>
            <Link to="/login" className="text-sm font-bold text-navy border-b-2 border-gold">
              {isSw ? 'Ingia →' : 'Sign In →'}
            </Link>
          </div>
        )}

        {enrollError && (
          <div className="mb-8 bg-gold/10 border border-gold/30 rounded-xl p-4 text-sm text-ink">
            {enrollError.message}
            {enrollError.code === 'membership_required' && (
              <Link to="/members" className="block mt-2 font-bold text-navy border-b-2 border-gold w-fit">
                {isSw ? 'Jiunge / Fanya Upya Uanachama →' : 'Join / Renew Membership →'}
              </Link>
            )}
          </div>
        )}

        <h2 className="font-serif font-bold text-lg text-navy mb-4">
          {isSw ? 'Vikao vya Kozi' : 'Course Sessions'}
        </h2>
        <div className="space-y-3">
          {course.sessions?.map((session, i) => (
            <Link
              key={session.id}
              to={`/teaching/sessions/${session.slug}`}
              className="flex items-center gap-4 bg-white border border-black/10 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="w-9 h-9 rounded-full bg-navy text-gold flex items-center justify-center text-xs font-bold shrink-0">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-navy truncate">{session.title}</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  {session.session_type === 'live' ? '🔴 Live' : '▶️ Recorded'}
                  {session.instructor_name && ` · ${session.instructor_name}`}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {course.quizzes?.length > 0 && (
          <>
            <h2 className="font-serif font-bold text-lg text-navy mt-10 mb-4">
              {isSw ? 'Quiz za Kozi (pata cheti ukifaulu)' : 'Course Quizzes (earn a certificate when you pass)'}
            </h2>
            <div className="space-y-3">
              {course.quizzes.map((quiz) =>
                quiz.is_unlocked ? (
                  <Link
                    key={quiz.id}
                    to={`/teaching/quiz/${quiz.id}`}
                    className="flex items-center justify-between gap-4 bg-gold/10 border border-gold/30 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-navy truncate">{quiz.passed ? '✅' : '📝'} {quiz.title}</h3>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {quiz.total_questions} {isSw ? 'maswali' : 'questions'} · {isSw ? 'kufaulu' : 'pass'} {quiz.passing_score_percent}%
                      </p>
                    </div>
                    <span className="text-xs font-bold text-navy shrink-0">{isSw ? 'Anza →' : 'Start →'}</span>
                  </Link>
                ) : (
                  <div key={quiz.id} className="bg-cream border border-black/10 rounded-xl p-4 text-sm text-ink-muted">
                    🔒 {quiz.title} —{' '}
                    {course.is_enrolled
                      ? isSw ? 'maliza vikao vyote vya kozi (jiunge/tazama kila kimoja) ili kufungua quiz hii.' : 'complete every session (join/watch each one) to unlock this quiz.'
                      : isSw ? 'jiunge na kozi kwanza.' : 'enroll in the course first.'}
                  </div>
                ),
              )}
            </div>
          </>
        )}
      </section>
    </>
  )
}
