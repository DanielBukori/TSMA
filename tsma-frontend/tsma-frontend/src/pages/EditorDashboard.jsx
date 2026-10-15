import { useCallback, useEffect, useMemo, useState } from 'react'
import apiClient from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

const MODULES = [
  { key: 'news', label: 'Habari', description: 'Andika, hariri na chapisha habari.', endpoint: '/news/admin/', fields: [
    { name: 'title', label: 'Kichwa cha habari', required: true },
    { name: 'category', label: 'Category ID (hiari)', type: 'number' },
    { name: 'excerpt', label: 'Muhtasari', type: 'textarea' },
    { name: 'content', label: 'Maudhui', type: 'textarea', required: true },
    { name: 'uploaded_images', label: 'Picha za habari (unaweza kuchagua nyingi)', type: 'files' },
    { name: 'is_published', label: 'Imechapishwa', type: 'checkbox' },
    { name: 'published_at', label: 'Tarehe ya kuchapisha', type: 'datetime' },
  ], title: (x) => x.title, subtitle: (x) => x.is_published ? 'Imechapishwa' : 'Rasimu' },
  { key: 'courses', label: 'Kozi na mafunzo', description: 'Simamia kozi na cover image zake.', endpoint: '/teaching/admin/courses/', fields: [
    { name: 'title', label: 'Jina la kozi', required: true }, { name: 'description', label: 'Maelezo', type: 'textarea' },
    { name: 'cover_image', label: 'Picha ya cover', type: 'file' }, { name: 'is_published', label: 'Imechapishwa', type: 'checkbox' },
    { name: 'display_order', label: 'Mpangilio', type: 'number' },
  ], title: (x) => x.title, subtitle: (x) => x.is_published ? 'Imechapishwa' : 'Haijachapishwa' },
  { key: 'partners', label: 'Washirika', description: 'Ongeza logo na taarifa za washirika.', endpoint: '/partners/admin/', fields: [
    { name: 'name', label: 'Jina la mshirika', required: true }, { name: 'logo', label: 'Logo', type: 'file' },
    { name: 'website_url', label: 'Tovuti', type: 'url' }, { name: 'description', label: 'Maelezo', type: 'textarea' },
    { name: 'is_active', label: 'Aonekane kwenye tovuti', type: 'checkbox' }, { name: 'display_order', label: 'Mpangilio', type: 'number' },
  ], title: (x) => x.name, subtitle: (x) => x.is_active ? 'Anaonekana kwenye tovuti' : 'Amefichwa' },
  { key: 'board', label: 'Board members', description: 'Hariri wasifu na picha za viongozi.', endpoint: '/board/admin/', fields: [
    { name: 'full_name', label: 'Jina kamili', required: true }, { name: 'position', label: 'Nafasi', required: true },
    { name: 'photo', label: 'Picha', type: 'file' }, { name: 'bio', label: 'Wasifu', type: 'textarea' },
    { name: 'education', label: 'Elimu', type: 'textarea' }, { name: 'experience', label: 'Uzoefu', type: 'textarea' },
    { name: 'contribution', label: 'Mchango', type: 'textarea' }, { name: 'email', label: 'Barua pepe', type: 'email' },
    { name: 'linkedin_url', label: 'LinkedIn URL', type: 'url' }, { name: 'is_founder', label: 'Mwanzilishi', type: 'checkbox' },
    { name: 'is_active', label: 'Aonekane kwenye tovuti', type: 'checkbox' }, { name: 'display_order', label: 'Mpangilio', type: 'number' },
    { name: 'joined_board_date', label: 'Tarehe ya kujiunga', type: 'date' },
  ], title: (x) => x.full_name, subtitle: (x) => x.position },
  { key: 'conferences', label: 'Conferences', description: 'Simamia taarifa za mikutano. Tiketi na malipo hazihaririwi hapa.', endpoint: '/conferences/admin/', fields: [
    { name: 'title', label: 'Jina la conference', required: true }, { name: 'description', label: 'Maelezo', type: 'textarea' },
    { name: 'theme', label: 'Theme', type: 'textarea' }, { name: 'banner_image', label: 'Picha ya conference', type: 'file' },
    { name: 'venue_name', label: 'Ukumbi', }, { name: 'city', label: 'Jiji' }, { name: 'country', label: 'Nchi' },
    { name: 'physical_address', label: 'Anwani', type: 'textarea' }, { name: 'start_date', label: 'Tarehe ya kuanza', type: 'datetime' },
    { name: 'end_date', label: 'Tarehe ya kumaliza', type: 'datetime' }, { name: 'registration_deadline', label: 'Mwisho wa usajili', type: 'datetime' },
    { name: 'is_published', label: 'Imechapishwa', type: 'checkbox' }, { name: 'registration_open', label: 'Usajili uko wazi', type: 'checkbox' },
  ], title: (x) => x.title, subtitle: (x) => x.registration_open ? 'Usajili uko wazi' : 'Usajili umefungwa' },
]

const blankForm = (module) => Object.fromEntries(module.fields.map((f) => [f.name, f.type === 'checkbox' ? false : '']))
const errorMessage = (error) => {
  const data = error?.response?.data
  if (data && typeof data === 'object') return Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'string' ? v : JSON.stringify(v)}`).join(' · ')
  return error?.response?.status === 403 ? 'Huna ruhusa ya kusimamia sehemu hii. Muombe Super Admin akupe role inayofaa.' : error?.message || 'Ombi halikufanikiwa.'
}

export default function EditorDashboard() {
  const { user, logout } = useAuth()
  const [activeKey, setActiveKey] = useState('news')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [formError, setFormError] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const active = MODULES.find((m) => m.key === activeKey) || MODULES[0]

  const loadItems = useCallback(async () => {
    setLoading(true); setLoadError(''); setNotice('')
    try {
      const response = await apiClient.get(active.endpoint, { params: { _nocache: Date.now() } })
      const data = response.data
      setItems(Array.isArray(data) ? data : data?.results || [])
    } catch (error) {
      setItems([]); setLoadError(errorMessage(error))
    } finally { setLoading(false) }
  }, [active])

  useEffect(() => { setEditing(null); setForm(blankForm(active)); setFormError(''); loadItems() }, [active, loadItems])

  const filteredItems = useMemo(() => items.filter((item) => JSON.stringify(item).toLowerCase().includes(query.toLowerCase())), [items, query])

  function startCreate() { setEditing('new'); setForm(blankForm(active)); setFormError(''); setNotice('') }
  function startEdit(item) {
    setEditing(item.id)
    const next = blankForm(active)
    active.fields.forEach((field) => {
      const value = item[field.name]
      if (field.type === 'file' || field.type === 'files') next[field.name] = null
      else if (field.type === 'checkbox') next[field.name] = Boolean(value)
      else next[field.name] = value ?? ''
    })
    setForm(next); setFormError(''); setNotice('')
  }
  function updateField(name, value) { setForm((old) => ({ ...old, [name]: value })) }

  async function saveItem(event) {
    event.preventDefault(); setSaving(true); setFormError(''); setNotice('')
    try {
      const hasFiles = active.fields.some((f) => ['file', 'files'].includes(f.type) && form[f.name])
      let payload = form
      let config = {}
      if (hasFiles) {
        payload = new FormData()
        active.fields.forEach((field) => {
          const value = form[field.name]
          if (value === '' || value === null || value === undefined) return
          if (field.type === 'files') Array.from(value).forEach((file) => payload.append(field.name, file))
          else if (field.type === 'file') payload.append(field.name, value)
          else if (field.type === 'checkbox') payload.append(field.name, value ? 'true' : 'false')
          else payload.append(field.name, value)
        })
        config = { headers: { 'Content-Type': 'multipart/form-data' } }
      } else {
        payload = { ...form }
        active.fields.forEach((field) => { if (field.type === 'file' || field.type === 'files') delete payload[field.name] })
      }
      if (editing === 'new') await apiClient.post(active.endpoint, payload, config)
      else await apiClient.patch(`${active.endpoint}${editing}/`, payload, config)
      setNotice(editing === 'new' ? 'Taarifa imeongezwa kikamilifu.' : 'Mabadiliko yamehifadhiwa.')
      setEditing(null); await loadItems()
    } catch (error) { setFormError(errorMessage(error)) }
    finally { setSaving(false) }
  }

  async function deleteItem(item) {
    if (!window.confirm(`Una uhakika unataka kufuta “${active.title(item)}”?`)) return
    setFormError(''); setNotice('')
    try { await apiClient.delete(`${active.endpoint}${item.id}/`); setNotice('Taarifa imefutwa.'); await loadItems() }
    catch (error) { setFormError(errorMessage(error)) }
  }

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="bg-[#101d36] text-white border-b-4 border-amber-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">TS</div><div><p className="text-xs uppercase tracking-[.2em] text-slate-300">TSMA</p><h1 className="text-xl sm:text-2xl font-bold">Content Editor</h1></div></div>
        <div className="flex items-center gap-3"><div className="hidden sm:block text-right"><p className="text-sm font-semibold">{user?.full_name || user?.name || user?.email || 'Mhariri'}</p><p className="text-xs text-slate-300">Dashboard ya maudhui</p></div><button onClick={logout} className="rounded-lg border border-white/25 px-3 py-2 text-sm hover:bg-white/10">Toka</button></div>
      </div>
    </header>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-7"><p className="text-sm font-semibold text-amber-700">CONTENT MANAGEMENT</p><h2 className="text-2xl sm:text-3xl font-bold mt-1">Karibu kwenye ukurasa wa editing</h2><p className="text-slate-600 mt-2 max-w-3xl">Simamia habari, kozi, washirika, board members na taarifa za conference hapa. Ruhusa za kila sehemu zinathibitishwa na Django API.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-7">{MODULES.map((m) => <button key={m.key} onClick={() => { setActiveKey(m.key); setQuery('') }} className={`text-left rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${activeKey === m.key ? 'bg-[#101d36] text-white border-[#101d36] shadow-md' : 'bg-white border-slate-200'}`}><span className="text-xs uppercase tracking-wider opacity-70">{m.key === 'board' ? 'Watu' : 'Maudhui'}</span><span className="block font-bold mt-2">{m.label}</span><span className="block text-sm mt-1 opacity-75">{m.key === activeKey ? `${items.length} rekodi` : 'Fungua sehemu'}</span></button>)}</div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,.9fr)] gap-6 items-start">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h3 className="text-xl font-bold">{active.label}</h3><p className="text-sm text-slate-500 mt-1">{active.description}</p></div><button onClick={startCreate} className="rounded-lg bg-amber-400 hover:bg-amber-300 px-4 py-2.5 font-bold text-slate-950">+ Ongeza mpya</button></div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tafuta taarifa..." className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-amber-400" /></div>
          {loadError && <div className="m-5 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{loadError}</div>}{notice && <div className="m-5 rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{notice}</div>}{formError && <div className="m-5 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{formError}</div>}
          {loading ? <div className="p-8 text-center text-slate-500">Inapakia taarifa...</div> : filteredItems.length === 0 ? <div className="p-10 text-center"><div className="text-3xl mb-2">✦</div><p className="font-semibold">Hakuna taarifa za kuonyesha</p><p className="text-sm text-slate-500 mt-1">Ikiwa umeona kosa la ruhusa, sehemu hii inahitaji role maalumu.</p></div> : <div className="divide-y divide-slate-100">{filteredItems.map((item) => <article key={item.id} className="p-4 sm:p-5 flex gap-3 items-start"><div className="min-w-0 flex-1"><h4 className="font-semibold break-words">{active.title(item) || `Rekodi #${item.id}`}</h4><p className="text-sm text-slate-500 mt-1">{active.subtitle(item) || `ID: ${item.id}`}</p>{item.images?.length > 0 && <p className="text-xs text-slate-400 mt-1">{item.images.length} picha</p>}</div><div className="flex gap-2 shrink-0"><button onClick={() => startEdit(item)} className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">Hariri</button><button onClick={() => deleteItem(item)} className="rounded-lg border border-red-200 text-red-700 px-3 py-2 text-sm hover:bg-red-50">Futa</button></div></article>)}</div>}
          <div className="px-5 py-3 border-t bg-slate-50 text-xs text-slate-500">{items.length} rekodi · Taarifa zinatoka moja kwa moja kwenye Django API.</div>
        </section>
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between"><div><h3 className="text-xl font-bold">{editing === null ? 'Hariri maudhui' : editing === 'new' ? 'Ongeza taarifa' : 'Badilisha taarifa'}</h3><p className="text-sm text-slate-500 mt-1">{editing === null ? 'Chagua rekodi upande wa kushoto au bonyeza Ongeza mpya.' : 'Jaza taarifa kisha hifadhi mabadiliko.'}</p></div>{editing !== null && <button onClick={() => { setEditing(null); setFormError('') }} className="text-sm underline">Ghairi</button>}</div>
          {editing === null ? <div className="p-6"><div className="rounded-xl bg-slate-50 p-5"><div className="text-2xl mb-3">✎</div><p className="font-semibold">Editor moja, maudhui yako yote</p><p className="text-sm text-slate-600 mt-2">Chagua sehemu juu, kisha ongeza au hariri rekodi. Kwa picha, chagua faili kutoka kwenye kifaa chako. Kwa usalama, malipo na taarifa za wanachama hazijumuishwi kwenye dashboard hii.</p></div><div className="mt-5 text-sm text-slate-500"><p className="font-semibold text-slate-700 mb-2">Kumbuka</p><ul className="list-disc pl-5 space-y-1"><li>Baadhi ya sehemu zinahitaji role ya Content Editor au Board Admin.</li><li>Ikiwa API itakataa ombi, ujumbe wa kosa utaonekana hapa.</li><li>Django Admin ibaki kwa Super Admin na kazi za kiutawala.</li></ul></div></div> : <form onSubmit={saveItem} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">{active.fields.map((field) => <label key={field.name} className={`block ${field.type === 'checkbox' ? 'flex items-center gap-3 rounded-lg bg-slate-50 p-3' : ''}`}><span className={`${field.type === 'checkbox' ? 'order-2' : 'block'} text-sm font-semibold text-slate-700 mb-1.5`}>{field.label}{field.required ? ' *' : ''}</span>{field.type === 'textarea' ? <textarea required={field.required} value={form[field.name] ?? ''} onChange={(e) => updateField(field.name, e.target.value)} rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-amber-400" /> : field.type === 'checkbox' ? <input type="checkbox" checked={Boolean(form[field.name])} onChange={(e) => updateField(field.name, e.target.checked)} className="h-4 w-4 accent-amber-500" /> : field.type === 'file' || field.type === 'files' ? <><input type="file" accept="image/*" multiple={field.type === 'files'} onChange={(e) => updateField(field.name, field.type === 'files' ? e.target.files : e.target.files?.[0] || null)} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2" />{editing !== 'new' && <span className="block text-xs text-slate-400 mt-1">Acha tupu kama hutaki kubadilisha picha iliyopo.</span>}</> : <input required={field.required} type={field.type === 'datetime' ? 'datetime-local' : field.type || 'text'} value={form[field.name] ?? ''} onChange={(e) => updateField(field.name, e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-amber-400" />}</label>)}<button disabled={saving} className="w-full rounded-lg bg-[#101d36] text-white py-3 font-bold hover:bg-slate-800 disabled:opacity-60">{saving ? 'Inahifadhi...' : 'Hifadhi mabadiliko'}</button></form>}
        </section>
      </div>
      <p className="text-center text-xs text-slate-400 mt-8">TSMA Content Editor · Mfumo wa ruhusa unasimamiwa na Django API</p>
    </div>
  </main>
}
