import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const EDITOR_ROLES = new Set(['content_editor', 'board_admin', 'super_admin'])
const canUseEditor = (candidate) => EDITOR_ROLES.has(candidate?.role) || candidate?.is_superuser === true

export default function EditorAccessGuard({ children }) {
  const { user, isAuthenticated, hasEditorMfa, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center"><p role="status" className="text-sm text-slate-300">Inakagua ruhusa...</p></main>
  }
  if (!isAuthenticated || !hasEditorMfa) {
    return <Navigate to="/editor-access/login" state={{ from: location.pathname }} replace />
  }
  if (!canUseEditor(user)) {
    return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-5"><section className="max-w-md rounded-xl border border-white/10 bg-slate-900 p-7"><h1 className="text-xl font-bold">Ruhusa imekataliwa</h1><p className="mt-2 text-sm text-slate-300">Akaunti hii haina ruhusa ya kuingia kwenye Editor Dashboard. Wasiliana na Super Admin wa TSMA.</p><a href="/" className="mt-5 inline-block rounded-lg bg-amber-400 px-4 py-2 font-bold text-slate-950">Rudi kwenye tovuti</a></section></main>
  }
  return children
}
