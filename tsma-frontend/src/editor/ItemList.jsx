import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { DEFAULT_EMPTY } from './modules.js'
import { ROW_BATCH, formatStamp } from './helpers.js'

function DeleteButton({ label, onConfirm }) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return undefined
    const timer = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(timer)
  }, [armed])

  return (
    <button
      type="button"
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      className={
        armed
          ? 'rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white'
          : 'rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50'
      }
    >
      {armed ? `Thibitisha kufuta ${label}` : 'Futa'}
    </button>
  )
}

function Skeleton() {
  return (
    <ul className="divide-y divide-slate-100">
      {Array.from({ length: 4 }).map((_, index) => (
        <li key={index} className="flex items-center gap-3 p-4">
          <span className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-slate-200" />
          <span className="min-w-0 flex-1">
            <span className="block h-3 w-2/5 animate-pulse rounded bg-slate-200" />
            <span className="mt-2 block h-3 w-3/5 animate-pulse rounded bg-slate-100" />
          </span>
        </li>
      ))}
    </ul>
  )
}

function Notice({ tone, title, hint, action }) {
  const isError = tone === 'error'
  return (
    <div
      role="status"
      className={`m-4 rounded-xl border px-5 py-8 text-center ${isError ? 'border-rose-200 bg-rose-50/70' : 'border-dashed border-slate-300 bg-slate-50'}`}
    >
      <Icon name={isError ? 'alert' : 'dot'} className={`mx-auto mb-2 h-5 w-5 ${isError ? 'text-rose-600' : 'text-slate-400'}`} />
      <p className={`font-bold ${isError ? 'text-rose-800' : 'text-slate-800'}`}>{title}</p>
      {hint ? <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">{hint}</p> : null}
      {action ? (
        <button type="button" onClick={action.onClick} className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
          {action.label}
        </button>
      ) : null}
    </div>
  )
}

export default function ItemList({ module, rows, status, error, count, hasMore, query, user, onEdit, onDelete, onToggle, onReload, onLoadMore }) {
  const [visible, setVisible] = useState(ROW_BATCH)

  useEffect(() => {
    setVisible(ROW_BATCH)
  }, [query, module.key])

  if (status === 'loading' && rows.length === 0) return <Skeleton />

  if (error && rows.length === 0) {
    return <Notice tone="error" title="Mfumo haupatikani kwa sasa" hint={error} action={{ label: 'Jaribu tena', onClick: onReload }} />
  }

  if (rows.length === 0) {
    const empty = module.empty || DEFAULT_EMPTY
    return <Notice title={empty.title} hint={empty.hint} />
  }

  if (rows.length === 1 && module.singleton) {
    const item = rows[0]
    const stamp = module.updated ? formatStamp(item[module.updated]) : ''
    return (
      <div className="p-5">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-amber-400 hover:bg-amber-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        >
          <Icon name={module.icon || 'edit'} className="mt-0.5 h-5 w-5 text-[#101d36]" />
          <span className="min-w-0">
            <span className="block font-bold text-slate-900">{module.panelTitle || module.label}</span>
            <span className="mt-1 block text-sm text-slate-600">
              {stamp ? `Imesasishwa mwisho: ${stamp}` : 'Bonyeza kufungua fomu ya kuhariri.'}
            </span>
          </span>
        </button>
      </div>
    )
  }

  const shown = rows.slice(0, visible)

  return (
    <>
      <ul className="divide-y divide-slate-100">
        {shown.map((item) => {
          const writable = module.rowWritable ? module.rowWritable(item, user) : true
          const key = module.keyField ? item[module.keyField] : item.id
          const thumb = module.thumbnail?.(item)
          const title = module.title?.(item) || `Rekodi #${item.id}`
          const subtitle = module.subtitle?.(item)
          const stamp = module.updated ? formatStamp(item[module.updated]) : ''
          const toggleOn = module.toggle ? Boolean(item[module.toggle.field]) : false
          return (
            <li key={`${key}`} className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50/80">
              {thumb ? (
                <img src={thumb} alt="" className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-cover" loading="lazy" />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <Icon name={module.icon || 'dot'} className="h-4 w-4 text-slate-600" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{title}</p>
                {subtitle ? <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{subtitle}</p> : null}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  {module.toggle ? (
                    <span className={`rounded-full px-2 py-0.5 font-bold ${toggleOn ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                      {toggleOn ? module.toggle.on : module.toggle.off}
                    </span>
                  ) : null}
                  {item.images?.length ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">picha {item.images.length}</span> : null}
                  {stamp ? <span className="text-slate-400">Sasisho: {stamp}</span> : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                {module.toggle && writable ? (
                  <button
                    type="button"
                    onClick={() => onToggle(item, !toggleOn)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {toggleOn ? 'Ficha' : 'Onyesha'}
                  </button>
                ) : null}
                {writable && !module.noDelete ? <DeleteButton label={module.itemLabel || 'rekodi'} onConfirm={() => onDelete(item)} /> : null}
                {writable ? (
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="rounded-lg border border-[#101d36]/20 bg-white px-3 py-2 text-xs font-bold text-[#101d36] hover:bg-slate-100"
                  >
                    Hariri
                  </button>
                ) : (
                  <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">Ruhusa ya Mhazini</span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
        <span>
          {count > rows.length ? `Zimepakia ${rows.length} kati ya ${count}` : `Rekodi ${rows.length}`}
          {rows.length > visible ? ` · zinaonyeshwa ${visible}` : ''}
        </span>
        {rows.length > visible ? (
          <button type="button" onClick={() => setVisible((current) => current + ROW_BATCH)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100">
            Onyesha zaidi
          </button>
        ) : null}
        {hasMore ? (
          <button type="button" onClick={onLoadMore} className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100">
            Pakia ukurasa ufuatao
          </button>
        ) : null}
      </div>
    </>
  )
}
