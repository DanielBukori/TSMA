import { useCallback, useEffect, useRef, useState } from 'react'
import apiClient from '../api/client.js'
import Icon from '../components/Icon.jsx'
import Field from './Field.jsx'
import {
  UPLOAD_LIMIT,
  describeError,
  fieldErrorsOf,
  formatStamp,
  pickedFiles,
  seedForm,
  toFormData,
  uploadAll,
  validateForm,
  changedScalars,
} from './helpers.js'

function detailUrl(module, item) {
  if (module.singleton) return module.endpoint
  if (module.detail) return module.detail(item)
  return `${module.endpoint}${item.id}/`
}

function AttachmentRow({ attach, child, onDeleted }) {
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!armed) return undefined
    const timer = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(timer)
  }, [armed])

  const media = child.video || child.image
  const isVideo = Boolean(child.video)

  async function remove() {
    setBusy(true)
    setError('')
    try {
      await apiClient.delete(attach.deleteUrl(child.id))
      onDeleted(child.id)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
      setArmed(false)
    }
  }

  return (
    <li className="w-32 rounded-lg border border-slate-200 bg-white p-1.5">
      {media ? (
        isVideo ? (
          <video src={media} preload="metadata" className="h-20 w-full rounded bg-slate-900 object-cover" />
        ) : (
          <img src={media} alt={child.caption || ''} loading="lazy" className="h-20 w-full rounded bg-slate-100 object-cover" />
        )
      ) : (
        <span className="flex h-20 items-center justify-center rounded bg-slate-100">
          <Icon name="image" className="h-5 w-5 text-slate-400" />
        </span>
      )}
      <p className="mt-1 truncate text-[11px] text-slate-600" title={child.caption || ''}>
        {child.caption || 'Bila maelezo'}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => (armed ? remove() : setArmed(true))}
        className={`mt-1 w-full rounded px-2 py-1 text-[11px] font-semibold ${armed ? 'bg-rose-600 text-white' : 'border border-rose-200 text-rose-700 hover:bg-rose-50'} disabled:opacity-60`}
      >
        {busy ? 'Inafuta...' : armed ? 'Thibitisha' : 'Futa'}
      </button>
      {error ? <p className="mt-1 text-[11px] text-rose-700">{error}</p> : null}
    </li>
  )
}

function Attachments({ attach, row, list }) {
  const [files, setFiles] = useState([])
  const [caption, setCaption] = useState('')
  const [progress, setProgress] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const children = Array.isArray(row?.[attach.itemsKey]) ? row[attach.itemsKey] : []

  async function upload() {
    if (!files.length) return
    setFeedback(null)
    setProgress({ done: 0, total: files.length })
    const base = children.length
    const result = await uploadAll(
      Array.from(files),
      (file, index) => {
        const body = new FormData()
        body.append(attach.parentField, String(row.id))
        const isVideo = file.type?.startsWith('video')
        body.append(isVideo ? attach.videoField : attach.fileField, file)
        if (attach.captionField && caption.trim()) body.append(attach.captionField, caption.trim())
        if (attach.orderField) body.append(attach.orderField, String(base + index))
        return apiClient.post(attach.url, body, { headers: { 'Content-Type': 'multipart/form-data' } }).then((res) => res.data)
      },
      { limit: UPLOAD_LIMIT, onProgress: (done, total) => setProgress({ done, total }) },
    )
    result.ok.forEach((child) => list.appendChild(row, attach.itemsKey, child))
    if (result.failed.length) {
      setFeedback({ tone: 'error', text: `${result.ok.length} zimepakiwa, ${result.failed.length} zimeshindwa: ${describeError(result.failed[0])}` })
    } else {
      setFeedback({ tone: 'ok', text: `Picha ${result.ok.length} zimepakiwa.` })
    }
    setFiles([])
    setCaption('')
    setProgress(null)
  }

  return (
    <section className="border-t border-slate-100 px-4 py-4">
      <h3 className="text-sm font-bold text-slate-900">{attach.label}</h3>
      <p className="mt-1 text-xs text-slate-500">{attach.hint}</p>
      {children.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {children.map((child) => (
            <AttachmentRow key={child.id} attach={attach} child={child} onDeleted={(id) => list.dropChild(row, attach.itemsKey, id)} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500">
          Hakuna taarifa za kuonyesha
        </p>
      )}

      {attach.mode === 'child' ? (
        <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
          <label className="block text-xs font-semibold text-slate-700">
            Chagua faili (picha au video)
            <input
              type="file"
              multiple
              accept={attach.accept}
              onChange={(event) => setFiles(Array.from(event.target.files || []))}
              className="mt-1 block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#101d36] file:px-3 file:py-2 file:text-white"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Maelezo ya faili zilizochaguliwa (hiari)
            <input value={caption} onChange={(event) => setCaption(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!files.length || Boolean(progress)}
              onClick={upload}
              className="rounded-lg bg-[#101d36] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {progress ? `Inapakia ${progress.done}/${progress.total}` : `Pakia${files.length ? ` (${files.length})` : ''}`}
            </button>
            {progress ? <progress value={progress.done} max={progress.total} className="h-2 w-32" /> : null}
          </div>
        </div>
      ) : null}

      {feedback ? (
        <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${feedback.tone === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
          {feedback.text}
        </p>
      ) : null}
    </section>
  )
}

export default function EditorPanel({ module, row, isNew, list, onClose, onSaved, onNotify, dismissible = true }) {
  const singletonRow = module.singleton ? row || list.rows[0] || null : row
  const [form, setForm] = useState(() => seedForm(module, singletonRow).values)
  const [original, setOriginal] = useState(() => seedForm(module, singletonRow).original)
  const [errors, setErrors] = useState({})
  const [general, setGeneral] = useState('')
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(null)
  const [askDiscard, setAskDiscard] = useState(false)
  const panelRef = useRef(null)
  const headingRef = useRef(null)

  useEffect(() => {
    const target = panelRef.current?.querySelector('input:not([type="file"]):not([type="checkbox"]), textarea, select')
    if (target) target.focus()
    else headingRef.current?.focus()
  }, [])

  const requestClose = useCallback(() => {
    const dirty = module.fields.some((field) => {
      if (field.type === 'file' || field.type === 'files') return Boolean(form[field.name])
      const before = original[field.name]
      const after = form[field.name]
      if (field.type === 'checkbox') return Boolean(before) !== Boolean(after)
      return String(before ?? '') !== String(after ?? '')
    })
    if (dirty) {
      setAskDiscard(true)
      return
    }
    onClose()
  }, [form, module.fields, onClose, original])

  useEffect(() => {
    if (!dismissible) return undefined
    function onKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismissible, requestClose])

  const uploadDeferred = useCallback(
    async (saved, fields) => {
      const jobs = fields.flatMap((field) => Array.from(form[field.name] || []).map((file) => ({ field, file })))
      if (!jobs.length) return saved
      let current = saved
      setProgress({ done: 0, total: jobs.length })
      const result = await uploadAll(
        jobs,
        (job) => {
          const body = new FormData()
          body.append(job.field.name, job.file)
          return apiClient
            .patch(detailUrl(module, current), body, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then((res) => {
              current = { ...current, ...res.data }
              return res.data
            })
        },
        { limit: UPLOAD_LIMIT, onProgress: (done, total) => setProgress({ done, total }) },
      )
      setProgress(null)
      if (result.failed.length) {
        onNotify({ tone: 'error', text: `${result.ok.length} kati ya ${jobs.length} zimepakiwa. ${describeError(result.failed[0])}` })
      }
      return current
    },
    [form, module, onNotify],
  )

  async function submit(event) {
    event?.preventDefault()
    if (saving) return
    if (!isNew && !module.singleton && !singletonRow) return
    const local = validateForm(module, form, isNew, { requireFile: module.requireFile })
    setErrors(local)
    setGeneral('')
    if (Object.keys(local).length) {
      const first = Object.keys(local)[0]
      panelRef.current
        ?.querySelector(`[data-field="${first}"] input:not([type="hidden"]), [data-field="${first}"] textarea, [data-field="${first}"] select`)
        ?.focus()
      return
    }
    const scalars = changedScalars(module, form, original, { isNew })
    const files = pickedFiles(module, form)
    const deferredFields = module.fields.filter((field) => field.defer && form[field.name]?.length)
    const nothingTodo = isNew ? false : !files.length && !deferredFields.length && !Object.keys(scalars).length
    if (nothingTodo) {
      onNotify({ tone: 'ok', text: 'Hakuna kitu kilichobadilika.' })
      onClose()
      return
    }
    const multipart = Boolean(module.multipart) || files.length > 0
    const body = multipart ? toFormData(scalars, files) : scalars
    const config = multipart ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined
    setSaving(true)
    try {
      const response = isNew
        ? await apiClient.post(module.endpoint, body, config)
        : await apiClient.patch(detailUrl(module, singletonRow), body, config)
      let saved = response.data
      if (deferredFields.length) saved = await uploadDeferred(saved, deferredFields)
      list.upsert(saved)
      // Thamani za seva ndizo zenye mkono baada ya kuhifadhi (picha mpya, slug, n.k.).
      const reseed = seedForm(module, saved)
      setForm(reseed.values)
      setOriginal(reseed.original)
      onSaved(saved, isNew)
    } catch (error) {
      setErrors(fieldErrorsOf(error))
      setGeneral(describeError(error))
    } finally {
      setSaving(false)
    }
  }

  const stamp = module.updated ? formatStamp(singletonRow?.[module.updated]) : ''

  return (
    <section
      ref={panelRef}
      aria-labelledby="editor-panel-title"
      className="flex max-h-[75vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
        <div className="min-w-0">
          <h2 id="editor-panel-title" ref={headingRef} tabIndex={-1} className="truncate text-base font-bold text-slate-900 outline-none">
            {isNew ? `Ongeza ${module.itemLabel || 'rekodi'}` : module.panelTitle || `Hariri ${module.itemLabel || 'rekodi'}`}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {stamp ? `Imesasishwa: ${stamp}` : module.hint}
          </p>
        </div>
        {dismissible ? (
          <button
            type="button"
            onClick={requestClose}
            aria-label="Funga panel ya kuhariri"
            className="rounded-lg border border-slate-200 px-2.5 py-2 text-slate-600 hover:bg-slate-50"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        ) : null}
      </header>

      {askDiscard ? (
        <div role="alert" className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          <span>Una maandishi ambayo hajahifadhiwa.</span>
          <span className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-md bg-amber-900 px-3 py-1.5 font-bold text-white">
              Ondoa mabadiliko
            </button>
            <button type="button" onClick={() => setAskDiscard(false)} className="rounded-md border border-amber-400 px-3 py-1.5 font-bold">
              Endelea kuhariri
            </button>
          </span>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto">
        <form
          onSubmit={submit}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
              event.preventDefault()
              submit(event)
            }
          }}
        >
          <div className="space-y-3.5 px-4 py-4">
            {general ? (
              <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                {general}
              </p>
            ) : null}
            {module.fields.map((field) => (
              <FieldBlock key={field.name} module={module} field={field}>
                <Field
                  field={field}
                  value={form[field.name]}
                  existingUrl={field.existing ? singletonRow?.[field.name] : undefined}
                  error={errors[field.name]}
                  disabled={saving}
                  onChange={(value) => {
                    setForm((current) => ({ ...current, [field.name]: value }))
                    setErrors((current) => {
                      if (!current[field.name]) return current
                      const next = { ...current }
                      delete next[field.name]
                      return next
                    })
                  }}
                />
              </FieldBlock>
            ))}
          </div>

          <footer className="sticky bottom-0 border-t border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving || Boolean(progress)}
                className="flex-1 rounded-lg bg-[#101d36] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1c3e63] disabled:opacity-60"
              >
                {saving ? 'Inahifadhi...' : progress ? `Inapakia ${progress.done}/${progress.total}` : 'Hifadhi'}
              </button>
              <button type="button" onClick={requestClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Ghairi
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              {navigator.platform?.includes('Mac') ? 'Cmd' : 'Ctrl'}+S = hifadhi · Esc = funga
            </p>
          </footer>
        </form>

        {module.attach && !isNew && singletonRow ? (
          <Attachments attach={module.attach} row={singletonRow} list={list} />
        ) : null}
      </div>
    </section>
  )
}

function FieldBlock({ module, field, children }) {
  const index = module.fields.indexOf(field)
  const previous = index > 0 ? module.fields[index - 1] : null
  const showSection = field.section && field.section !== previous?.section
  return (
    <div data-field={field.name}>
      {showSection ? (
        <p className="mb-2 mt-1 border-b border-slate-100 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">{field.section}</p>
      ) : null}
      {children}
    </div>
  )
}
