import { useEffect, useId, useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { useRefOptions } from './useModuleResources.js'

const CONTROL =
  'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-400/60'

function controlClass(hasError) {
  return `${CONTROL} ${hasError ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200'}`
}

function SelectControl({ field, value, error, onChange, disabled, id, describedBy }) {
  const remote = useRefOptions(field.optionsFrom)
  const options = field.options || remote.options
  return (
    <select
      id={id}
      value={value ?? ''}
      disabled={disabled || remote.loading}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedBy}
      className={controlClass(Boolean(error))}
    >
      <option value="">{remote.loading ? 'Inapakia chaguo...' : field.placeholder || '— Chagua —'}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function FileControl({ field, value, existingUrl, onChange, disabled, id, describedBy }) {
  const [preview, setPreview] = useState('')

  useEffect(() => {
    if (!value || typeof value === 'string' || !value.type?.startsWith('image')) {
      setPreview('')
      return undefined
    }
    const url = URL.createObjectURL(value)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  const shown = preview || existingUrl
  const multiple = field.type === 'files'

  return (
    <div className="space-y-2">
      {shown ? (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <img src={shown} alt={existingUrl && !preview ? `Picha iliyowekwa: ${field.label}` : 'Onyesho la faili ulilochagua'} className="h-14 w-14 rounded object-cover bg-white" />
          <p className="text-xs text-slate-600">
            {preview ? 'Faili jipya litatumika unhifadhishe.' : 'Hii ndiyo picha iliyo kwenye tovuti sasa.'}
          </p>
        </div>
      ) : null}
      <input
        id={id}
        type="file"
        accept={field.accept}
        multiple={multiple}
        disabled={disabled}
        aria-describedby={describedBy}
        onChange={(event) => onChange(multiple ? event.target.files : event.target.files?.[0] || null)}
        className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#101d36] file:px-3 file:py-2 file:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
      />
      {multiple && value?.length ? <p className="text-xs font-semibold text-slate-600">Faili {value.length} zimechaguliwa.</p> : null}
    </div>
  )
}

export default function Field({ field, value, existingUrl, error, onChange, disabled, highlight }) {
  const id = useId()
  const helpId = field.help ? `${id}-help` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined
  const isFile = field.type === 'file' || field.type === 'files'

  const labelText = useMemo(
    () => (
      <span className="flex flex-wrap items-center gap-x-1.5 text-sm font-semibold text-slate-800">
        {field.label}
        {field.required ? (
          <span className="text-rose-600" aria-hidden="true">*</span>
        ) : field.optional ? (
          <span className="text-xs font-normal text-slate-400">(hiari)</span>
        ) : null}
      </span>
    ),
    [field.label, field.required, field.optional],
  )

  if (field.readOnly) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{field.label}</p>
        <p className="mt-0.5 font-mono text-sm text-slate-800">{value || '—'}</p>
      </div>
    )
  }

  let control = null
  if (field.type === 'textarea') {
    control = (
      <textarea
        id={id}
        rows={field.rows || 4}
        value={value ?? ''}
        maxLength={field.maxLength}
        disabled={disabled}
        aria-required={field.required ? 'true' : undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        className={`${controlClass(Boolean(error))} resize-y`}
      />
    )
  } else if (field.type === 'checkbox') {
    return (
      <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        />
        <span>
          <span className="block text-sm font-semibold text-slate-800">{field.label}</span>
          {field.help ? <span className="block text-xs text-slate-500 mt-0.5">{field.help}</span> : null}
        </span>
      </label>
    )
  } else if (isFile) {
    control = <FileControl field={field} value={value} existingUrl={existingUrl} onChange={onChange} disabled={disabled} id={id} describedBy={describedBy} />
  } else if (field.type === 'select') {
    control = <SelectControl field={field} value={value} error={error} onChange={onChange} disabled={disabled} id={id} describedBy={describedBy} />
  } else {
    const type = field.type || 'text'
    control = (
      <input
        id={id}
        type={type}
        step={field.step || (type === 'number' ? 'any' : undefined)}
        value={value ?? ''}
        maxLength={field.maxLength}
        disabled={disabled}
        placeholder={field.placeholder}
        aria-required={field.required ? 'true' : undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        className={controlClass(Boolean(error))}
      />
    )
  }

  return (
    <div className={highlight ? 'rounded-lg ring-2 ring-amber-400/60 p-1 -m-1' : undefined}>
      <label htmlFor={id} className="mb-1.5 block">
        {labelText}
      </label>
      {control}
      {error ? (
        <p id={errorId} className="mt-1 flex items-start gap-1.5 text-xs font-semibold text-rose-700">
          <Icon name="alert" className="mt-0.5 h-3.5 w-3.5" />
          {error[0]}
          {error.length > 1 ? ` (${error.length})` : ''}
        </p>
      ) : field.help && field.type !== 'checkbox' ? (
        <p id={helpId} className="mt-1 text-xs text-slate-500">
          {field.help}
        </p>
      ) : null}
    </div>
  )
}
