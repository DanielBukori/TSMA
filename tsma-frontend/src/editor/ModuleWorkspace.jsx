import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import apiClient from '../api/client.js'
import Icon from '../components/Icon.jsx'
import EditorPanel from './EditorPanel.jsx'
import ItemList from './ItemList.jsx'
import { UPLOAD_LIMIT, SEARCH_DEBOUNCE_MS, NOTICE_DISMISS_MS, describeError, hasAnyValue, pickText, rowKey, uploadAll } from './helpers.js'
import { useDebounced, useResourceList } from './useModuleResources.js'

function Toolbar({ module, count, shown, query, onQuery, onCreate, onBulkFiles, bulkBusy, showSearch, showRoleNotice }) {
  const canCreate = !module.singleton && !module.noCreate
  return (
    <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900">{module.label}</h2>
          <p className="mt-1 text-sm text-slate-600">{module.hint}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {module.bulk ? (
            <label className={`cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 ${bulkBusy ? 'pointer-events-none opacity-60' : ''}`}>
              {bulkBusy ? bulkBusy : module.bulk.label}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(event) => {
                  const files = Array.from(event.target.files || [])
                  if (files.length) onBulkFiles(files)
                  event.target.value = ''
                }}
              />
            </label>
          ) : null}
          {canCreate ? (
            <button
              type="button"
              onClick={onCreate}
              className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            >
              + {module.addLabel || 'Ongeza'}
            </button>
          ) : null}
        </div>
      </div>
      {showRoleNotice ? (
        <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">{module.notice}</p>
      ) : null}
      {showSearch ? (
        <div className="relative mt-4">
          <Icon name="search" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <label className="sr-only" htmlFor={`${module.key}-search`}>
            Tafuta katika {module.label}
          </label>
          <input
            id={`${module.key}-search`}
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Tafuta kwa kichwa au maudhui..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-400/60"
          />
          <span className="absolute right-3 top-3 text-xs text-slate-400">
            {shown === count ? `${count} rekodi` : `${shown} matokeo`}
          </span>
        </div>
      ) : null}
    </div>
  )
}

export default function ModuleWorkspace({ module, user }) {
  const list = useResourceList(module)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounced(query, SEARCH_DEBOUNCE_MS)
  const [editing, setEditing] = useState(null)
  const [notice, setNotice] = useState(null)
  const [bulk, setBulk] = useState(null)
  const returnFocus = useRef(null)

  const index = useMemo(() => list.rows.map((row) => pickText(row, module.search || [])), [list.rows, module.search])
  const rows = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase()
    if (!needle || !module.search?.length) return list.rows
    return list.rows.filter((row, position) => index[position].includes(needle))
  }, [debouncedQuery, index, list.rows, module.search])

  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(null), NOTICE_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [notice])

  const keyOf = useCallback((row) => String(rowKey(module, row)), [module])

  const activeRow = useMemo(() => {
    if (module.singleton) return list.rows[0] || null
    if (!editing || editing === 'new') return null
    return list.rows.find((row) => keyOf(row) === editing) || null
  }, [editing, keyOf, list.rows, module.singleton])

  const panelOpen = Boolean(module.singleton ? list.rows.length : editing !== null) && !list.firstLoad

  function openEditor(row) {
    returnFocus.current = document.activeElement
    setEditing(module.singleton ? 'singleton' : keyOf(row))
  }

  function closeEditor() {
    setEditing(null)
    returnFocus.current?.focus?.()
    returnFocus.current = null
  }

  async function saveToggle(row, value) {
    const field = module.toggle.field
    try {
      const response = await apiClient.patch(module.detail ? module.detail(row) : `${module.endpoint}${row.id}/`, { [field]: value })
      list.upsert(response.data)
      setNotice({ tone: 'ok', text: 'Imehifadhiwa' })
    } catch (error) {
      setNotice({ tone: 'error', text: describeError(error) })
    }
  }

  async function deleteRow(row) {
    try {
      await apiClient.delete(module.detail ? module.detail(row) : `${module.endpoint}${row.id}/`)
      list.remove(row)
      if (editing === keyOf(row)) setEditing(null)
      setNotice({ tone: 'ok', text: 'Imefutwa.' })
    } catch (error) {
      setNotice({ tone: 'error', text: describeError(error) })
    }
  }

  async function bulkUpload(files) {
    setBulk({ done: 0, total: files.length })
    const result = await uploadAll(
      files,
      (file) => {
        const body = new FormData()
        body.append(module.bulk.fileField, file)
        body.append('is_active', 'true')
        return apiClient.post(module.bulk.endpoint, body, { headers: { 'Content-Type': 'multipart/form-data' } }).then((res) => res.data)
      },
      { limit: UPLOAD_LIMIT, onProgress: (done, total) => setBulk({ done, total }) },
    )
    setBulk(null)
    result.ok.forEach((row) => list.upsert(row))
    setNotice({
      tone: result.failed.length ? 'error' : 'ok',
      text: result.failed.length
        ? `Zimepakiwa ${result.ok.length}, kumefeli ${result.failed.length}. ${describeError(result.failed[0])}`
        : `Picha ${result.ok.length} zimepakiwa.`,
    })
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Toolbar
        module={module}
        count={list.count}
        shown={rows.length}
        query={query}
        onQuery={setQuery}
        onCreate={() => {
          returnFocus.current = document.activeElement
          setEditing('new')
        }}
        onBulkFiles={bulkUpload}
        bulkBusy={bulk ? `Inapakia ${bulk.done}/${bulk.total}` : null}
        showSearch={!module.singleton && Boolean(module.search?.length)}
        showRoleNotice={Boolean(module.notice) && module.rowWritable?.(null, user) === false}
      />

      <div aria-live="polite" className="px-4 pt-3 empty:hidden">
        {notice ? (
          <p
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${notice.tone === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}
          >
            {notice.text}
          </p>
        ) : null}
      </div>

      {list.firstLoad ? (
        <ItemList
          module={module}
          rows={[]}
          status="loading"
          error={null}
          count={0}
          hasMore={false}
          query={query}
          user={user}
          onEdit={openEditor}
          onDelete={deleteRow}
          onToggle={saveToggle}
          onReload={list.reload}
          onLoadMore={list.loadMore}
        />
      ) : (
        <div className={`grid ${panelOpen && !module.singleton ? 'xl:grid-cols-[minmax(0,1fr)_440px]' : 'grid-cols-1'}`}>
          {module.singleton && panelOpen ? null : (
            <ItemList
              module={module}
              rows={rows}
              status={list.status}
              error={list.error}
              count={list.count}
              hasMore={list.hasMore}
              query={query}
              user={user}
              onEdit={openEditor}
              onDelete={deleteRow}
              onToggle={saveToggle}
              onReload={list.reload}
              onLoadMore={list.loadMore}
            />
          )}

          {panelOpen ? (
            <div className={module.singleton ? 'bg-slate-50/60 p-3 sm:p-4' : 'border-t border-slate-200 bg-slate-50/60 p-3 xl:sticky xl:top-24 xl:self-start xl:border-l xl:border-t-0'}>
              <EditorPanel
                key={`${module.key}:${editing || 'singleton'}`}
                module={module}
                row={activeRow}
                isNew={editing === 'new'}
                list={list}
                dismissible={!module.singleton}
                onClose={closeEditor}
                onSaved={(row, wasNew) => {
                  setNotice({ tone: 'ok', text: 'Imehifadhiwa' })
                  if (wasNew) setEditing(keyOf(row))
                }}
                onNotify={setNotice}
              />
              {module.untouched && !hasAnyValue(module, activeRow) ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{module.untouched}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <p className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500">
        {list.status === 'refreshing' ? 'Inasasisha kutoka seva...' : 'Taarifa zinatoka kwenye Django API ya TSMA. Orodha huhifadhiwa kwenye kumbukumbu wakati unabadilisha sehemu.'}
      </p>
    </section>
  )
}
