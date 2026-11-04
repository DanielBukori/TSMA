import { useCallback, useEffect, useMemo, useState } from 'react'
import { createMembershipTier, fetchMembers, fetchMembershipTiers, updateMembershipTier } from '../api/finance.js'
import { formatDate, formatMoney } from './format.js'
import { describeError, MEMBER_STATUS_OPTIONS, MEMBER_STATUS_LOOKUP, serverMessage, statusTone } from './options.js'
import {
  Badge,
  Card,
  Field,
  Notice,
  Pager,
  Select,
  StateBlock,
  Toggle,
  ghostButtonClass,
  goldButtonClass,
  inputClass,
  primaryButtonClass,
} from './ui.jsx'

const TIER_BLANK = {
  name: '',
  description: '',
  annual_fee: '',
  currency: 'TZS',
  requires_payment: true,
  benefits: '',
  is_active: true,
  display_order: '0',
}

function tierToForm(tier) {
  return {
    ...TIER_BLANK,
    ...tier,
    annual_fee: tier.annual_fee ?? '',
    // `benefits` ni JSONField (orodha); inaonyeshwa kama mstari mmoja kwa faida.
    benefits: Array.isArray(tier.benefits) ? tier.benefits.join('\n') : '',
    display_order: String(tier.display_order ?? 0),
  }
}

export default function MembershipSection({ language }) {
  const [tiers, setTiers] = useState([])
  const [tierState, setTierState] = useState({ kind: 'ok' })
  const [tiersLoading, setTiersLoading] = useState(true)
  const [tierForm, setTierForm] = useState(null)
  const [tierSaving, setTierSaving] = useState(false)
  const [tierNotice, setTierNotice] = useState(null)

  const [members, setMembers] = useState([])
  const [memberState, setMemberState] = useState({ kind: 'ok' })
  const [membersLoading, setMembersLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', tier: '' })
  const [applied, setApplied] = useState({ status: '', tier: '' })
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ count: 0, hasNext: false, hasPrev: false, pageLength: 0 })

  const loadTiers = useCallback(async () => {
    setTiersLoading(true)
    try {
      setTiers(await fetchMembershipTiers())
      setTierState({ kind: 'ok' })
    } catch (error) {
      setTierState(describeError(error))
      setTiers([])
    } finally {
      setTiersLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTiers()
  }, [loadTiers])

  const loadMembers = useCallback(async () => {
    setMembersLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(applied).filter(([, value]) => value !== ''))
      const res = await fetchMembers({ ...params, page })
      const results = res.data?.results || []
      setMembers(results)
      setMeta({
        count: res.data?.count || 0,
        hasNext: Boolean(res.data?.next),
        hasPrev: Boolean(res.data?.previous),
        pageLength: results.length,
      })
      setMemberState({ kind: 'ok' })
    } catch (error) {
      setMemberState(describeError(error))
      setMembers([])
      setMeta({ count: 0, hasNext: false, hasPrev: false, pageLength: 0 })
    } finally {
      setMembersLoading(false)
    }
  }, [applied, page])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const tierOptions = useMemo(() => tiers.map((tier) => ({ value: String(tier.id), label: tier.name })), [tiers])

  async function saveTier(event) {
    event.preventDefault()
    if (!tierForm) return
    setTierSaving(true)
    setTierNotice(null)
    try {
      const source = tierForm.data
      const payload = {
        name: source.name.trim(),
        description: source.description || '',
        annual_fee: source.annual_fee === '' ? 0 : Number(source.annual_fee),
        currency: source.currency || 'TZS',
        requires_payment: Boolean(source.requires_payment),
        benefits: source.benefits.split('\n').map((line) => line.trim()).filter(Boolean),
        is_active: Boolean(source.is_active),
        display_order: Number(source.display_order) || 0,
      }
      const response = tierForm.id ? await updateMembershipTier(tierForm.id, payload) : await createMembershipTier(payload)
      const saved = response.data
      setTiers((current) =>
        current.some((item) => item.id === saved.id)
          ? current.map((item) => (item.id === saved.id ? { ...item, ...saved } : item))
          : [...current, saved],
      )
      setTierForm(null)
      setTierNotice({ tone: 'green', text: `Daraja «${saved.name}» limehifadhiwa.` })
    } catch (error) {
      setTierNotice({ tone: 'red', text: serverMessage(error) || describeError(error).message })
    } finally {
      setTierSaving(false)
    }
  }

  async function toggleTier(tier, checked) {
    setTierSaving(true)
    setTierNotice(null)
    try {
      const response = await updateMembershipTier(tier.id, { is_active: checked })
      setTiers((current) => current.map((item) => (item.id === tier.id ? { ...item, ...response.data } : item)))
    } catch (error) {
      setTierNotice({ tone: 'red', text: describeError(error).message })
    } finally {
      setTierSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card
        title="Madaraja ya uanachama"
        subtitle="Ada ya mwaka hutumwa hapa; usajili wa mwanachama hutegemea daraja hili."
        actions={
          <>
            <button type="button" onClick={() => setTierForm({ id: null, data: { ...TIER_BLANK } })} disabled={tierSaving} className={goldButtonClass}>
              + Daraja jipya
            </button>
            <button type="button" onClick={loadTiers} disabled={tiersLoading} className={ghostButtonClass}>
              Onyesha upya
            </button>
          </>
        }
      >
        <div className="space-y-3 p-5">
          {tierNotice && <Notice tone={tierNotice.tone} onDismiss={() => setTierNotice(null)}>{tierNotice.text}</Notice>}
          {tiersLoading ? (
            <StateBlock kind="loading" />
          ) : tierState.kind !== 'ok' ? (
            <StateBlock kind={tierState.kind} message={tierState.kind === 'request' ? tierState.message : undefined} />
          ) : tiers.length === 0 ? (
            <StateBlock kind="empty" message="Hakuna madaraja ya uanachama" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {tiers.map((tier) => (
                <li key={tier.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">
                      {tier.name}
                      <span className="ml-2 text-xs font-normal text-slate-400">#{tier.display_order}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {tier.requires_payment
                        ? `${formatMoney(tier.annual_fee, tier.currency, language)} kwa mwaka`
                        : 'Huhitaji malipo kuwa mwanachama hai'}
                      {Array.isArray(tier.benefits) && tier.benefits.length > 0 ? ` · faida ${tier.benefits.length}` : ''}
                    </p>
                    {tier.slug && <p className="text-[11px] text-slate-400">slug: {tier.slug}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={tier.is_active ? 'green' : 'slate'}>{tier.is_active ? 'Inapatikana' : 'Imezimwa'}</Badge>
                    <button type="button" onClick={() => toggleTier(tier, !tier.is_active)} disabled={tierSaving} className={ghostButtonClass}>
                      {tier.is_active ? 'Zima' : 'Washa'}
                    </button>
                    <button type="button" onClick={() => setTierForm({ id: tier.id, data: tierToForm(tier) })} disabled={tierSaving} className={ghostButtonClass}>
                      Hariri
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {tierForm && (
            <form onSubmit={saveTier} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-800">{tierForm.id ? 'Hariri daraja' : 'Daraja jipya'}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Jina (name)" required>
                  <input value={tierForm.data.name} onChange={(event) => setTierForm({ ...tierForm, data: { ...tierForm.data, name: event.target.value } })} required className={inputClass} />
                </Field>
                <Field label="Ada ya mwaka (annual_fee)" hint="Weka 0 kwa daraja lisilo na ada">
                  <input type="number" min="0" step="0.01" value={tierForm.data.annual_fee} onChange={(event) => setTierForm({ ...tierForm, data: { ...tierForm.data, annual_fee: event.target.value } })} className={inputClass} />
                </Field>
                <Field label="Sarafu (currency)">
                  <input value={tierForm.data.currency} onChange={(event) => setTierForm({ ...tierForm, data: { ...tierForm.data, currency: event.target.value.toUpperCase().slice(0, 3) } })} className={inputClass} />
                </Field>
                <Field label="Mpangilio (display_order)">
                  <input type="number" min="0" step="1" value={tierForm.data.display_order} onChange={(event) => setTierForm({ ...tierForm, data: { ...tierForm.data, display_order: event.target.value } })} className={inputClass} />
                </Field>
                <Field label="Maelezo (description)" className="sm:col-span-2">
                  <textarea rows={3} value={tierForm.data.description} onChange={(event) => setTierForm({ ...tierForm, data: { ...tierForm.data, description: event.target.value } })} className={inputClass} />
                </Field>
                <Field label="Faida (benefits)" hint="Mstari mmoja kwa kila faida" className="sm:col-span-2">
                  <textarea rows={4} value={tierForm.data.benefits} onChange={(event) => setTierForm({ ...tierForm, data: { ...tierForm.data, benefits: event.target.value } })} className={inputClass} />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle label="Inahitaji malipo (requires_payment)" checked={tierForm.data.requires_payment} onChange={(checked) => setTierForm({ ...tierForm, data: { ...tierForm.data, requires_payment: checked } })} />
                <Toggle label="Inapatikana kwa usajili (is_active)" checked={tierForm.data.is_active} onChange={(checked) => setTierForm({ ...tierForm, data: { ...tierForm.data, is_active: checked } })} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={tierSaving} className={primaryButtonClass}>
                  {tierSaving ? 'Inahifadhi...' : 'Hifadhi daraja'}
                </button>
                <button type="button" onClick={() => setTierForm(null)} disabled={tierSaving} className={ghostButtonClass}>
                  Ghairi
                </button>
              </div>
            </form>
          )}
        </div>
      </Card>

      <Card
        title="Orodha ya wanachama"
        subtitle="Hakikisha hali ya uanachama inalingana na malipo yaliyothibitishwa."
        actions={
          <button type="button" onClick={loadMembers} disabled={membersLoading} className={ghostButtonClass}>
            Onyesha upya
          </button>
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            setApplied({ ...filters })
            setPage(1)
          }}
          className="grid gap-3 border-b border-slate-100 bg-slate-50/70 p-5 sm:grid-cols-2 xl:grid-cols-4"
        >
          <Field label="Hali ya uanachama (status)">
            <Select value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })} options={MEMBER_STATUS_OPTIONS} placeholder="Hali zote" />
          </Field>
          <Field label="Daraja (tier)">
            <Select value={filters.tier} onChange={(value) => setFilters({ ...filters, tier: value })} options={tierOptions} placeholder="Madaraja yote" />
          </Field>
          <div className="flex flex-wrap items-end gap-2">
            <button type="submit" className={goldButtonClass}>
              Tafuta
            </button>
            <button
              type="button"
              onClick={() => {
                setFilters({ status: '', tier: '' })
                setApplied({ status: '', tier: '' })
                setPage(1)
              }}
              className={ghostButtonClass}
            >
              Ondoa
            </button>
          </div>
          <p className="self-end text-xs text-slate-500">Wanachama waliopatikana: {meta.count}</p>
        </form>

        {membersLoading && members.length === 0 ? (
          <StateBlock kind="loading" />
        ) : memberState.kind !== 'ok' ? (
          <StateBlock kind={memberState.kind} message={memberState.kind === 'request' ? memberState.message : undefined} />
        ) : members.length === 0 ? (
          <StateBlock kind="missing" message="Hakuna rekodi" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-bold">Nambari</th>
                  <th className="px-4 py-3 font-bold">Jina</th>
                  <th className="px-4 py-3 font-bold">Daraja</th>
                  <th className="px-4 py-3 font-bold">Hali</th>
                  <th className="px-4 py-3 font-bold">Alijiunga</th>
                  <th className="px-4 py-3 font-bold">Mwisho wa uanachama</th>
                </tr>
              </thead>
              <tbody className={membersLoading ? 'opacity-60' : ''}>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{member.membership_number || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{member.full_name || '—'}</p>
                      <p className="text-xs text-slate-500">{member.email || '—'}</p>
                      {member.organization_name && <p className="text-[11px] text-slate-500">{member.organization_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{member.tier?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(member.status)}>
                        {MEMBER_STATUS_LOOKUP[member.status] || member.status}
                        {member.is_active_member ? ' · hai' : ''}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(member.joined_date, language) || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(member.expiry_date, language) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {memberState.kind === 'ok' && members.length > 0 && (
          <Pager
            page={page}
            count={meta.count}
            pageLength={meta.pageLength}
            hasNext={meta.hasNext}
            hasPrev={meta.hasPrev}
            busy={membersLoading}
            onNext={() => setPage((current) => current + 1)}
            onPrev={() => setPage((current) => Math.max(1, current - 1))}
          />
        )}
      </Card>
    </div>
  )
}
