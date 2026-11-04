import { useCallback, useEffect, useState } from 'react'
import { fetchManualSettings, saveManualSettings } from '../api/finance.js'
import { describeError, serverMessage } from './options.js'
import { formatDateTime } from './format.js'
import { Badge, Card, Field, Notice, StateBlock, ghostButtonClass, goldButtonClass, inputClass } from './ui.jsx'

const BLANK = {
  bank_name: '',
  account_name: '',
  account_number: '',
  swift_code: '',
  confirm_phone: '',
  confirm_deadline_hours: '24',
  extra_instructions_sw: '',
  extra_instructions_en: '',
}

// Ni hizi nne zinazofanya `is_ready` kuwa kweli upande wa backend.
const REQUIRED_FIELDS = [
  ['bank_name', 'Jina la Benki (bank_name)'],
  ['account_name', 'Jina la Akaunti (account_name)'],
  ['account_number', 'Namba ya Akaunti (account_number)'],
  ['confirm_phone', 'Namba ya Uthibitisho (confirm_phone)'],
]

export default function ManualSettingsSection({ language, onSaved }) {
  const [values, setValues] = useState(BLANK)
  const [meta, setMeta] = useState({ is_ready: false, updated_at: null })
  const [state, setState] = useState({ kind: 'loading' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchManualSettings()
      const data = res.data || {}
      setValues({ ...BLANK, ...Object.fromEntries(Object.entries(BLANK).map(([key, fallback]) => [key, data[key] ?? fallback])) })
      setMeta({ is_ready: Boolean(data.is_ready), updated_at: data.updated_at || null })
      setState({ kind: 'ok' })
    } catch (error) {
      setState(describeError(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const update = (patch) => {
    setValues((current) => ({ ...current, ...patch }))
    setNotice(null)
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setNotice(null)
    try {
      const res = await saveManualSettings({
        bank_name: values.bank_name.trim(),
        account_name: values.account_name.trim(),
        account_number: values.account_number.trim(),
        swift_code: values.swift_code.trim(),
        confirm_phone: values.confirm_phone.trim(),
        confirm_deadline_hours: Number(values.confirm_deadline_hours) || 24,
        extra_instructions_sw: values.extra_instructions_sw,
        extra_instructions_en: values.extra_instructions_en,
      })
      const data = res.data || {}
      setMeta({ is_ready: Boolean(data.is_ready), updated_at: data.updated_at || null })
      setNotice({
        tone: data.is_ready ? 'green' : 'amber',
        text: data.is_ready
          ? 'Taarifa za benki zimehifadhiwa. Wanachama wanaweza kuchagua «Malipo ya Mkono» sasa.'
          : 'Zimehifadhiwa, lakini taarifa hazijakamilika — «Malipo ya Mkono» bado haupatikani kwa wanachama.',
      })
      onSaved()
    } catch (error) {
      setNotice({ tone: 'red', text: serverMessage(error) || describeError(error).message })
    } finally {
      setSaving(false)
    }
  }

  const missing = REQUIRED_FIELDS.filter(([key]) => !String(values[key] || '').trim())

  if (state.kind === 'loading') {
    return (
      <Card>
        <StateBlock kind="loading" />
      </Card>
    )
  }
  if (state.kind !== 'ok') {
    return (
      <Card title="Mipangilio ya Malipo ya Mkono">
        <StateBlock
          kind={state.kind}
          message={state.kind === 'request' ? state.message : undefined}
          action={
            <button type="button" onClick={load} className={ghostButtonClass}>
              Jaribu tena
            </button>
          }
        />
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <Card
        title="Mipangilio ya Malipo ya Mkono"
        subtitle="Hizi ndizo taarifa ambazo mwanachama anaona anapochagua «Malipo ya Mkono» ukurasa wa malipo — anapeleka pesa kwenye akaunti hii."
        actions={
          <>
            {meta.is_ready ? <Badge tone="green">Tayari</Badge> : <Badge tone="amber">Inahitaji taarifa za benki</Badge>}
            <button type="button" onClick={load} disabled={loading} className={ghostButtonClass}>
              Onyesha upya
            </button>
          </>
        }
      >
        {!meta.is_ready && (
          <div className="border-b border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-bold text-amber-900">Weka taarifa za benki ili upate Malipo ya Mkono</p>
            <p className="mt-1 text-sm text-amber-800">
              Mratibu wa malipo haonyeshi chaguo la «Malipo ya Mkono» kwa umma hadi nne hizi zijazwe:{' '}
              {missing.length > 0 ? missing.map(([, label]) => label.split(' (')[0]).join(', ') : 'hakikisha thamani zinaendeshwa.'}
            </p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4 p-5">
          {notice && <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.text}</Notice>}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Jina la Benki (bank_name)" required>
              <input value={values.bank_name} onChange={(event) => update({ bank_name: event.target.value })} className={inputClass} />
            </Field>
            <Field label="Jina la Akaunti (account_name)" required hint="Jina kamili lililosajiliwa benki">
              <input value={values.account_name} onChange={(event) => update({ account_name: event.target.value })} className={inputClass} />
            </Field>
            <Field label="Namba ya Akaunti (account_number)" required hint="Andika namba halisi; ukiona wima hapa, maana yake haijawekwa bado">
              <input value={values.account_number} onChange={(event) => update({ account_number: event.target.value })} className={inputClass} />
            </Field>
            <Field label="SWIFT/BIC (swift_code)" hint="Hiari — inahitajika kwa uhamisho wa kimataifa">
              <input value={values.swift_code} onChange={(event) => update({ swift_code: event.target.value.toUpperCase() })} className={inputClass} />
            </Field>
            <Field label="Namba ya kutuma uthibitisho (confirm_phone)" required hint="WhatsApp/SMS ambapo mwanachama hutuma risiti">
              <input value={values.confirm_phone} onChange={(event) => update({ confirm_phone: event.target.value })} className={inputClass} />
            </Field>
            <Field label="Muda wa kuthibitisha (confirm_deadline_hours)" hint="Masaa ya kutuma ushahidi baada ya kulipa">
              <input type="number" min="1" step="1" value={values.confirm_deadline_hours} onChange={(event) => update({ confirm_deadline_hours: event.target.value })} className={inputClass} />
            </Field>
            <Field label="Maelezo ya ziada — Kiswahili (extra_instructions_sw)" className="sm:col-span-2">
              <textarea rows={3} value={values.extra_instructions_sw} onChange={(event) => update({ extra_instructions_sw: event.target.value })} className={inputClass} />
            </Field>
            <Field label="Maelezo ya ziada — Kiingereza (extra_instructions_en)" className="sm:col-span-2">
              <textarea rows={3} value={values.extra_instructions_en} onChange={(event) => update({ extra_instructions_en: event.target.value })} className={inputClass} />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={saving} className={goldButtonClass}>
              {saving ? 'Inahifadhi...' : 'Hifadhi taarifa za benki'}
            </button>
            <span className="text-xs text-slate-500">
              {meta.updated_at ? `Mwisho kubadilishwa: ${formatDateTime(meta.updated_at, language)}` : 'Haijabadilishwa bado'}
            </span>
          </div>
        </form>
      </Card>

      <Card title="Utendakazi wa uthibitisha" subtitle="Mchakato unaotumika kwa kila malipo ya mkono uliyoweka hapa.">
        <ol className="space-y-3 p-5 text-sm text-slate-700">
          {[
            'Mwanachama huchagua «Malipo ya Mkono» na kupokea taarifa hizi za akaunti kwenye ukurasa wa malipo.',
            'Anafanya uhamisho au kulipa ofisini, kisha hutuma risiti kwenye namba ya uthibitisho ulioweka.',
            'Unapokea pesa benki, kisha uthibitishe malipo hayo kwenye Daftari la Malipo — mfumo huamsha uanachama, hutoa risiti na hukaa kiti cha conference.',
            'Ukiona pesa haijafika, kataa malipo ukiwa umeweka sababu; sababu hiyo huhifadhiwa kwenye rekodi.',
          ].map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#101d36] text-xs font-bold text-white">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}
