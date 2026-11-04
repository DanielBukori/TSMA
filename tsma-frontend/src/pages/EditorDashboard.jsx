import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'
import ModuleWorkspace from '../editor/ModuleWorkspace.jsx'
import Sidebar from '../editor/Sidebar.jsx'
import { MODULES, MODULE_BY_KEY } from '../editor/modules.js'

const ROLE_LABEL = {
  content_editor: 'Mhariri wa maudhui',
  board_admin: 'Meneja wa bodi',
  super_admin: 'Msimamizi Mkuu',
}

const LAST_SECTION_KEY = 'tsma:editor:section'

export default function EditorDashboard() {
  const { user, logout } = useAuth()
  const { logoOnDarkUrl, logoUrl } = useSiteSettings()
  const [activeKey, setActiveKey] = useState(() => {
    const saved = localStorage.getItem(LAST_SECTION_KEY)
    return MODULE_BY_KEY[saved] ? saved : MODULES[0].key
  })

  useEffect(() => {
    localStorage.setItem(LAST_SECTION_KEY, activeKey)
  }, [activeKey])

  const module = MODULE_BY_KEY[activeKey] || MODULES[0]
  const logo = logoOnDarkUrl || logoUrl
  const displayName = user?.full_name || user?.email || 'Mhariri'

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-30 border-b-4 border-amber-400 bg-[#101d36] text-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {logo ? (
              <img src={logo} alt="TSMA" className="h-9 w-auto max-w-[140px] object-contain" />
            ) : (
              <span className="font-serif text-lg font-black uppercase tracking-[0.18em]">TSMA</span>
            )}
            <span className="hidden border-l border-white/20 pl-3 sm:block">
              <span className="block text-[11px] uppercase tracking-[0.18em] text-slate-300">Dashibodi</span>
              <span className="block text-sm font-bold">Ukurasa wa Mhariri</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-semibold">{displayName}</span>
              <span className="block text-xs text-slate-300">{ROLE_LABEL[user?.role] || (user?.is_superuser ? ROLE_LABEL.super_admin : 'Mhariri')}</span>
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-white/25 px-3 py-2 text-sm font-semibold transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            >
              Toka
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:grid lg:grid-cols-[244px_minmax(0,1fr)] lg:gap-6 lg:py-7">
        <aside className="hidden lg:block">
          <Sidebar activeKey={activeKey} onSelect={setActiveKey} className="sticky top-24" />
        </aside>
        <div className="mb-4 lg:hidden">
          <Sidebar activeKey={activeKey} onSelect={setActiveKey} variant="scroller" />
        </div>
        <ModuleWorkspace key={module.key} module={module} user={user} />
      </div>

      <p className="pb-8 text-center text-[11px] text-slate-500">
        Ruhusa za kila kitendo zinathibitishwa na Django API — dashboard hii haina malipo wala taarifa za wanachama.
      </p>
    </main>
  )
}
