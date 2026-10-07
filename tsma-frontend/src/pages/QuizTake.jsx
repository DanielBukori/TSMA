import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'

export default function QuizTake() {
  const { id } = useParams()
  const { i18n } = useTranslation()
  const isSw = i18n.language?.startsWith('sw')

  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    apiClient
      .get(`/teaching/quizzes/${id}/`)
      .then((res) => setQuiz(res.data))
      .catch((err) => {
        const detail = err.response?.data?.detail
        setLoadError(
          detail ||
            (err.response?.status === 401
              ? isSw ? 'Ingia kwanza ili kufanya quiz.' : 'Sign in first to take the quiz.'
              : isSw ? 'Quiz haikupatikana.' : 'Quiz not found.'),
        )
      })
      .finally(() => setLoading(false))
  }, [id])

  function setAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')

    const payload = {
      answers: quiz.questions.map((q) => {
        const a = answers[q.id]
        if (q.question_type === 'short_answer') {
          return { question_id: q.id, text_answer: a || '' }
        }
        return { question_id: q.id, choice_id: a || null }
      }),
    }

    try {
      const res = await apiClient.post(`/teaching/quizzes/${id}/submit/`, payload)
      setResult(res.data)
    } catch (err) {
      const data = err.response?.data
      setSubmitError(
        (Array.isArray(data?.detail) ? data.detail[0] : data?.detail) ||
          (isSw ? 'Imeshindikana kuwasilisha. Hakikisha umejibu maswali yote kisha jaribu tena.' : 'Could not submit. Make sure you answered every question and try again.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="py-24 text-center text-ink-muted text-sm">{isSw ? 'Inapakia...' : 'Loading...'}</div>
  if (!quiz) return <div className="py-24 text-center text-ink-muted text-sm px-5">{loadError || (isSw ? 'Quiz haikupatikana.' : 'Quiz not found.')}</div>

  if (result) {
    return (
      <section className="max-w-lg mx-auto px-5 py-20 text-center">
        <div className="text-5xl mb-4">{result.passed ? '🎉' : '📊'}</div>
        <h1 className="font-serif font-bold text-2xl text-navy mb-2">
          {result.passed
            ? isSw ? 'Hongera! Umefaulu!' : 'Congratulations! You Passed!'
            : isSw ? 'Bado Hujafaulu' : "You Didn't Pass Yet"}
        </h1>
        <p className="text-sm text-ink-muted mb-6">
          {isSw ? 'Alama Zako' : 'Your Score'}: <span className="font-bold text-navy">{result.score_percent}%</span>
        </p>

        {result.passed ? (
          <div className="bg-gold/10 border border-gold/30 rounded-xl p-6">
            <p className="text-sm font-semibold text-ink mb-1">
              🏆 {isSw ? 'Cheti chako kimetengenezwa!' : 'Your certificate has been generated!'}
            </p>
            {result.certificate?.certificate_image ? (
              <>
                <p className="text-xs text-ink-muted mb-4">
                  {isSw ? 'Namba ya cheti' : 'Certificate no.'}: <b>{result.certificate.certificate_number}</b>
                </p>
                <a
                  href={result.certificate.certificate_image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-navy text-white font-extrabold text-sm px-6 py-3 rounded-md"
                >
                  ⬇️ {isSw ? 'Pakua Cheti' : 'Download Certificate'}
                </a>
                <p className="text-[11px] text-ink-muted mt-3">
                  {isSw
                    ? 'Kinafunguka kwenye ukurasa mpya - bonyeza na ushikilie picha (au chagua "Save image") kukihifadhi.'
                    : 'Opens in a new tab - long-press the image (or choose "Save image") to keep it.'}
                </p>
              </>
            ) : (
              <p className="text-xs text-ink-muted">
                {isSw
                  ? 'Picha ya cheti inaandaliwa. Itaonekana kwenye Dashibodi Yako baada ya muda mfupi.'
                  : 'Your certificate image is being prepared. It will appear on your Dashboard shortly.'}
              </p>
            )}
            <a href="/dashboard" className="inline-block mt-4 text-sm font-bold text-navy border-b-2 border-gold">
              {isSw ? 'Angalia Dashibodi →' : 'View Dashboard →'}
            </a>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            {isSw ? 'Jaribu tena baadaye kuboresha alama zako.' : 'Try again later to improve your score.'}
          </p>
        )}
      </section>
    )
  }

  return (
    <section className="max-w-xl mx-auto px-5 py-14 md:py-20">
      <div className="text-center mb-10">
        <h1 className="font-serif font-bold text-2xl md:text-3xl text-navy">{quiz.title}</h1>
        {quiz.instructions && <p className="text-sm text-ink-muted mt-3">{quiz.instructions}</p>}
        <p className="text-xs text-ink-muted mt-2">
          {isSw ? 'Alama ya Kufaulu' : 'Passing Score'}: {quiz.passing_score_percent}%
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="border border-black/10 rounded-xl p-5">
            <p className="text-sm font-bold text-navy mb-4">
              {idx + 1}. {q.question_text}
            </p>

            {q.question_type === 'short_answer' ? (
              <input
                type="text"
                value={answers[q.id] || ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                className="w-full border border-black/15 rounded-md px-4 py-2.5 text-sm"
                placeholder={isSw ? 'Andika jibu lako...' : 'Type your answer...'}
              />
            ) : (
              <div className="space-y-2">
                {q.choices.map((choice) => (
                  <label
                    key={choice.id}
                    className={`flex items-center gap-3 border rounded-md px-4 py-2.5 cursor-pointer transition-colors ${
                      answers[q.id] === choice.id ? 'border-gold bg-gold/5' : 'border-black/10'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={answers[q.id] === choice.id}
                      onChange={() => setAnswer(q.id, choice.id)}
                      className="accent-gold"
                    />
                    <span className="text-sm">{choice.choice_text}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        {submitError && (
          <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta text-sm rounded-lg px-4 py-3">
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gold hover:bg-gold-dark text-navy-deep font-extrabold text-sm py-4 rounded-md transition-colors disabled:opacity-60"
        >
          {submitting ? (isSw ? 'Inatuma...' : 'Submitting...') : isSw ? 'Wasilisha Majibu' : 'Submit Answers'}
        </button>
      </form>
    </section>
  )
}
