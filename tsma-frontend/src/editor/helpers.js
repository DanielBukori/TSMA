export const UPLOAD_LIMIT = 3
export const ROW_BATCH = 25
export const SEARCH_DEBOUNCE_MS = 150
export const NOTICE_DISMISS_MS = 2600

export function listRows(data) {
  if (Array.isArray(data)) return data
  return data?.results || []
}

const MESSAGES = {
  403: 'Ruhusa yako haitoshi kwa sehemu hii. Uliza Board Admin au Super Admin akupatie ruhusa.',
  404: 'Taarifa hii haipatikani kwenye seva. Inawezekana imefutwa — jaribu kupakia orodha upya.',
  405: 'Kitendo hiki hairuhusiwi kwenye sehemu hii.',
  429: 'Ombi nyingi kwa mpigo. Subiri sekunde chache kisha jaribu tena.',
}

export function describeError(error) {
  const status = error?.response?.status
  if (status && MESSAGES[status]) return MESSAGES[status]
  if (!error?.response) return 'Mfumo haupatikani kwa sasa — angalia muunganisho wako wa mtandao.'
  if (status >= 500) return 'Mfumo haupatikani kwa sasa (kosa la seva). Jaribu tena baadaye.'
  const data = error.response.data
  if (typeof data === 'string') return data.slice(0, 300)
  const detail = data?.detail || data?.non_field_errors
  if (detail) return Array.isArray(detail) ? detail.join(' ') : String(detail)
  return 'Ombi halikufanikiwa.'
}

// DRF hurudisha { field: [mistereo] } — tutumie hapo kila uwanja badala ya ujumbe mmoja mkubwa.
export function fieldErrorsOf(error) {
  const data = error?.response?.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
  const out = {}
  Object.entries(data).forEach(([key, value]) => {
    const list = Array.isArray(value) ? value : [value]
    out[key] = list.map((item) => (typeof item === 'string' ? item : String(item?.message || item)))
  })
  return out
}

export function toInputValue(field, raw) {
  if (raw === null || raw === undefined) return ''
  if (field.type === 'checkbox') return Boolean(raw)
  if (field.type === 'datetime') {
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return ''
    const pad = (n) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }
  if (field.type === 'date') return String(raw).slice(0, 10)
  if (field.type === 'time') return String(raw).slice(0, 5)
  return String(raw)
}

function sameValue(field, before, after) {
  if (field.type === 'checkbox') return Boolean(before) === Boolean(after)
  const a = before === null || before === undefined ? '' : String(before).trim()
  const b = after === null || after === undefined ? '' : String(after).trim()
  return a === b
}

export function seedForm(module, item) {
  const values = {}
  const original = {}
  module.fields.forEach((field) => {
    if (field.type === 'file' || field.type === 'files') {
      values[field.name] = null
      original[field.name] = ''
      return
    }
    const raw = item ? item[field.name] : field.default ?? (field.type === 'checkbox' ? false : '')
    const value = toInputValue(field, raw)
    values[field.name] = value
    original[field.name] = value
  })
  return { values, original }
}

export function changedScalars(module, form, original, options = {}) {
  const { isNew } = options
  const payload = {}
  module.fields.forEach((field) => {
    if (field.type === 'file' || field.type === 'files' || field.readOnly) return
    if (!isNew && sameValue(field, original[field.name], form[field.name])) return
    const value = form[field.name]
    if (field.type === 'checkbox') {
      payload[field.name] = Boolean(value)
      return
    }
    const text = value === null || value === undefined ? '' : String(value).trim()
    if (text === '') {
      if (isNew && !field.required) return
      // Chaguo tupu (foreign key) = null kwa DRF, si maandishi matupu.
      payload[field.name] = field.type === 'number' || field.type === 'select' ? null : ''
      return
    }
    payload[field.name] = field.type === 'number' ? Number(text) : text
  })
  return payload
}

export function pickedFiles(module, form) {
  const out = []
  module.fields.forEach((field) => {
    if (field.type !== 'file' && field.type !== 'files') return
    if (field.defer) return
    const value = form[field.name]
    if (!value) return
    if (field.type === 'files') {
      Array.from(value).forEach((file) => out.push({ name: field.name, file }))
      return
    }
    out.push({ name: field.name, file: value })
  })
  return out
}

export function deferredFileFields(module) {
  return module.fields.filter((field) => field.defer && (field.type === 'file' || field.type === 'files'))
}

export function toFormData(scalars, files) {
  const body = new FormData()
  // FormData haiwezi kubeba null — thamani tupu za namba huachwa, DRF
  // itaruhusu uga ukae kama ulivyo badala ya kuweka "''".
  Object.entries(scalars).forEach(([key, value]) => {
    if (value === null || value === undefined) return
    body.append(key, typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value))
  })
  files.forEach(({ name, file }) => body.append(name, file))
  return body
}

export function validateForm(module, form, isNew, options = {}) {
  const requireFile = Boolean(options.requireFile)
  const errors = {}
  module.fields.forEach((field) => {
    if (field.readOnly) return
    if (field.type === 'file' || field.type === 'files') {
      if (isNew && field.required && !form[field.name]) errors[field.name] = ['Chagua faili kwanza.']
      return
    }
    const value = form[field.name]
    const empty = field.type === 'checkbox' ? false : value === '' || value === null || value === undefined
    if (field.required && empty) {
      errors[field.name] = ['Uwanja huu unahitajika.']
      return
    }
    if (!empty && field.type === 'number' && Number.isNaN(Number(value))) {
      errors[field.name] = ['Weka namba sahihi.']
    }
    if (!empty && field.pattern && !field.pattern.test(String(value))) {
      errors[field.name] = [field.patternMessage || 'Muundo si sahihi.']
    }
  })
  if (requireFile && module.fields.every((f) => (f.type === 'file' || f.type === 'files') && !form[f.name])) {
    errors[module.fields[0]?.name] = ['Chagua faili (picha/logo/favicon) kwanza.']
  }
  return errors
}

export async function uploadAll(files, worker, { limit = UPLOAD_LIMIT, onProgress } = {}) {
  const ok = []
  const failed = []
  let cursor = 0
  let done = 0
  const run = files.length ? Math.min(limit, files.length) : 0
  const lanes = Array.from({ length: run }, async () => {
    while (cursor < files.length) {
      const index = cursor
      cursor += 1
      try {
        ok.push(await worker(files[index], index))
      } catch (error) {
        failed.push(error)
      }
      done += 1
      onProgress?.(done, files.length)
    }
  })
  await Promise.all(lanes)
  return { ok, failed }
}

export function pickText(item, names) {
  return names
    .map((name) => item[name])
    .filter((value) => typeof value === 'string' || typeof value === 'number')
    .join(' ')
    .toLowerCase()
}

export function rowKey(module, item) {
  if (module.keyField) return item[module.keyField]
  return item.id ?? item.pk
}

export function formatStamp(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('sw-TZ', { dateStyle: 'medium', timeStyle: 'short' })
}

export function hasAnyValue(module, item) {
  return module.fields.some((field) => {
    const value = item?.[field.name]
    if (field.type === 'checkbox') return false
    if (field.type === 'file' || field.type === 'files') return typeof value === 'string' && value.trim() !== ''
    return value !== null && value !== undefined && String(value).trim() !== ''
  })
}
