import Icon from '../components/Icon.jsx'
import { GROUPS, MODULES } from './modules.js'
import { peekState, useStoreVersion } from './useModuleResources.js'

function moduleIcon(module) {
  return <Icon name={module.icon || 'dot'} className="h-4 w-4 shrink-0" />
}

export default function Sidebar({ activeKey, onSelect, variant = 'rail', className = '' }) {
  // Huduma ya kurasa: idadi za rekodi huonekana mara orodha inapopakiwa.
  useStoreVersion()
  const groups = GROUPS.map((group) => ({ ...group, modules: MODULES.filter((module) => module.group === group.key) }))

  if (variant === 'scroller') {
    return (
      <nav aria-label="Sehemu za kuhariri" className={`-mx-4 overflow-x-auto px-4 pb-1 ${className}`}>
        <ul className="flex gap-2">
          {MODULES.map((module) => {
            const active = module.key === activeKey
            return (
              <li key={module.key} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onSelect(module.key)}
                  aria-current={active ? 'true' : undefined}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold whitespace-nowrap ${
                    active ? 'border-[#101d36] bg-[#101d36] text-white' : 'border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  {moduleIcon(module)}
                  {module.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    )
  }

  return (
    <nav aria-label="Sehemu za kuhariri" className={className}>
      {groups.map((group) => (
        <div key={group.key} className="mb-5">
          <p className="px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{group.label}</p>
          <ul className="mt-2 space-y-0.5">
            {group.modules.map((module) => {
              const state = peekState(module.endpoint)
              const loaded = state && state.rows.length > 0
              const active = module.key === activeKey
              return (
                <li key={module.key}>
                  <button
                    type="button"
                    onClick={() => onSelect(module.key)}
                    aria-current={active ? 'true' : undefined}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
                      active ? 'bg-[#101d36] font-bold text-white' : 'font-semibold text-slate-700 hover:bg-white'
                    }`}
                  >
                    {moduleIcon(module)}
                    <span className="min-w-0 flex-1 truncate">{module.label}</span>
                    {loaded ? (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {state.count}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
