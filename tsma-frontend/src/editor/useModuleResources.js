import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import apiClient from '../api/client.js'
import { describeError, listRows } from './helpers.js'
import { REFS } from './modules.js'

const LIST_TTL_MS = 15_000
const REF_MAX_PAGES = 5
const EMPTY_STATE = { rows: [], count: 0, page: 0, hasMore: false, status: 'idle', error: null, fetchedAt: 0 }

const store = new Map()
const watchers = new Set()
let version = 0

function entryFor(url, singleton) {
  let entry = store.get(url)
  if (!entry) {
    entry = {
      url,
      singleton: Boolean(singleton),
      inflight: null,
      listeners: new Set(),
      state: { ...EMPTY_STATE },
    }
    store.set(url, entry)
  }
  return entry
}

function commit(entry, patch) {
  entry.state = { ...entry.state, ...patch }
  version += 1
  entry.listeners.forEach((listener) => listener())
  watchers.forEach((listener) => listener())
}

function load(entry, page) {
  if (entry.inflight?.page === page) return entry.inflight.promise
  commit(entry, { status: entry.state.rows.length ? 'refreshing' : 'loading', error: null })
  const promise = apiClient
    .get(entry.url, page > 1 ? { params: { page } } : undefined)
    .then((response) => {
      const body = response.data
      const paginated = !Array.isArray(body) && !entry.singleton
      const rows = entry.singleton ? [body] : listRows(body)
      const merged = page > 1 ? [...entry.state.rows, ...rows] : rows
      commit(entry, {
        rows: merged,
        count: paginated ? Number(body.count ?? merged.length) : merged.length,
        hasMore: paginated ? Boolean(body.next) : false,
        page,
        status: 'ready',
        error: null,
        fetchedAt: Date.now(),
      })
    })
    .catch((error) => {
      commit(entry, {
        status: entry.state.rows.length ? 'ready' : 'error',
        error: describeError(error),
        fetchedAt: Date.now(),
      })
    })
    .finally(() => {
      entry.inflight = null
    })
  entry.inflight = { page, promise }
  return promise
}

export function peekState(url) {
  const entry = store.get(url)
  return entry ? entry.state : null
}

export function useStoreVersion() {
  return useSyncExternalStore(
    (listener) => {
      watchers.add(listener)
      return () => watchers.delete(listener)
    },
    () => version,
    () => version,
  )
}

export function useResourceList(module) {
  const entry = entryFor(module.endpoint, module.singleton)
  const key = module.keyField || 'id'
  const sameRow = useCallback(
    (item, target) => String(item?.[key] ?? item?.id) === String(target?.[key] ?? target?.id),
    [key],
  )

  const subscribe = useCallback((listener) => {
    entry.listeners.add(listener)
    return () => entry.listeners.delete(listener)
  }, [entry])

  const state = useSyncExternalStore(
    subscribe,
    () => entry.state,
    () => entry.state,
  )

  useEffect(() => {
    const { status, fetchedAt } = entry.state
    // Walio katika kumbukumbu huonyeshwa papo hapo, kisha seva inaitwa tena nyuma
    // ya pazuli (stale-while-revalidate) badala ya kupanuka panel.
    if (status === 'loading' || status === 'refreshing') return
    if (status === 'idle' || Date.now() - fetchedAt > LIST_TTL_MS) load(entry, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry])

  const reload = useCallback(() => load(entry, 1), [entry])
  const loadMore = useCallback(() => load(entry, entry.state.page + 1), [entry])

  const upsert = useCallback(
    (row) => {
      if (entry.singleton) {
        commit(entry, { rows: [row], count: 1 })
        return
      }
      const rows = [...entry.state.rows]
      const index = rows.findIndex((item) => sameRow(item, row))
      if (index >= 0) rows[index] = { ...rows[index], ...row }
      else rows.unshift(row)
      commit(entry, { rows, count: index >= 0 ? entry.state.count : entry.state.count + 1 })
    },
    [entry, sameRow],
  )

  const remove = useCallback(
    (row) => {
      if (entry.singleton) return
      commit(entry, { rows: entry.state.rows.filter((item) => !sameRow(item, row)), count: Math.max(0, entry.state.count - 1) })
    },
    [entry, sameRow],
  )

  const mergeInto = useCallback(
    (target, patch) => {
      commit(entry, {
        rows: entry.state.rows.map((item) => (sameRow(item, target) ? { ...item, ...patch } : item)),
      })
    },
    [entry, sameRow],
  )

  const appendChild = useCallback(
    (target, listField, child) => {
      commit(entry, {
        rows: entry.state.rows.map((item) => {
          if (!sameRow(item, target)) return item
          const list = Array.isArray(item[listField]) ? item[listField] : []
          return { ...item, [listField]: [...list, child] }
        }),
      })
    },
    [entry, sameRow],
  )

  const dropChild = useCallback(
    (target, listField, childId) => {
      commit(entry, {
        rows: entry.state.rows.map((item) => {
          if (!sameRow(item, target)) return item
          const list = Array.isArray(item[listField]) ? item[listField] : []
          return { ...item, [listField]: list.filter((child) => child.id !== childId) }
        }),
      })
    },
    [entry, sameRow],
  )

  return {
    rows: state.rows,
    count: state.count,
    hasMore: state.hasMore,
    status: state.status,
    error: state.error,
    firstLoad: state.status === 'loading' || (state.status === 'idle' && state.rows.length === 0),
    reload,
    loadMore,
    upsert,
    remove,
    mergeInto,
    appendChild,
    dropChild,
  }
}

export function useRefOptions(refKey) {
  const ref = refKey ? REFS[refKey] : null
  const entry = ref ? entryFor(ref.url) : null

  const subscribe = useCallback((listener) => {
    if (!entry) return () => undefined
    entry.listeners.add(listener)
    return () => entry.listeners.delete(listener)
  }, [entry])

  const state = useSyncExternalStore(
    subscribe,
    () => (entry ? entry.state : EMPTY_STATE),
    () => (entry ? entry.state : EMPTY_STATE),
  )

  // Orodha za marejeo (mikutano, vikundi, siku, washirika) hubadilika kwa uchache:
  // zapakiwa mara moja, zinashirikiwa na panel zote kutoka kwenye kumbukumbu.
  useEffect(() => {
    if (!entry || entry.state.status !== 'idle') return undefined
    let cancelled = false
    load(entry, 1).then(() => {
      const grabNext = () => {
        if (cancelled || !entry.state.hasMore || entry.state.page >= REF_MAX_PAGES) return
        load(entry, entry.state.page + 1).then(grabNext)
      }
      grabNext()
    })
    return () => {
      cancelled = true
    }
  }, [entry])

  if (!ref) return { options: [], loading: false, error: null }
  return {
    options: state.rows.map((row) => ({ value: row.id, label: ref.label(row) })),
    loading: state.status === 'idle' || state.status === 'loading',
    error: state.error,
  }
}

export function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value)
  const timer = useRef(null)
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer.current)
  }, [value, delay])
  return debounced
}
