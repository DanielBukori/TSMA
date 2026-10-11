import { Component } from 'react'

// Ikitokea hitilafu ya ghafla ndani ya ukurasa, mgeni anaona ujumbe wa kueleweka
// na kitufe cha kupakia upya - si skrini nyeupe.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('TSMA UI error:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-5">
        <div className="max-w-md text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="font-serif font-bold text-xl text-navy mb-2">Kuna hitilafu imetokea / Something went wrong</h1>
          <p className="text-sm text-ink-muted mb-6">
            Pakia ukurasa upya. Tatizo likiendelea, tafadhali tuambie. / Please reload the page.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-navy text-white font-extrabold text-sm px-6 py-3 rounded-md"
            >
              Pakia upya / Reload
            </button>
            <a href="/" className="text-sm font-bold text-navy border-b-2 border-gold">
              Mwanzo / Home
            </a>
          </div>
        </div>
      </div>
    )
  }
}
