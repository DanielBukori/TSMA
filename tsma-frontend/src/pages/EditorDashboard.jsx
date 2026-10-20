import { useCallback, useEffect, useMemo, useState } from 'react'
import apiClient from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

const MODULES = [
  { key: 'about-content', roles: ['board_admin', 'super_admin'], singleton: true, label: 'Maudhui ya About', description: 'Hariri historia, maono na dhamira za TSMA kwa Kiswahili na Kiingereza.', endpoint: '/content/admin/about/', fields: [
    { name: 'history_title_sw', label: 'Kichwa cha historia (SW)', required: true }, { name: 'history_title_en', label: 'History heading (EN)', required: true },
    { name: 'history_body_sw', label: 'Historia (SW)', type: 'textarea', required: true }, { name: 'history_body_en', label: 'History (EN)', type: 'textarea', required: true },
    { name: 'vision_sw', label: 'Maono (SW)', type: 'textarea' }, { name: 'vision_en', label: 'Vision (EN)', type: 'textarea' },
    { name: 'mission_sw', label: 'Dhamira (SW)', type: 'textarea' }, { name: 'mission_en', label: 'Mission (EN)', type: 'textarea' },
  ], title: () => 'Maudhui ya ukurasa wa About', subtitle: (x) => x.updated_at ? `Imesasishwa: ${new Date(x.updated_at).toLocaleDateString()}` : 'Maudhui ya msingi' },
  { key: 'values', roles: ['board_admin', 'super_admin'], label: 'Core values', description: 'Simamia thamani kuu za chama katika lugha zote mbili.', endpoint: '/content/admin/values/', fields: [
    { name: 'title_sw', label: 'Jina (SW)', required: true }, { name: 'title_en', label: 'Name (EN)', required: true },
    { name: 'description_sw', label: 'Maelezo (SW)', type: 'textarea' }, { name: 'description_en', label: 'Description (EN)', type: 'textarea' },
    { name: 'icon', label: 'Icon name' }, { name: 'display_order', label: 'Mpangilio', type: 'number' },
  ], title: (x) => x.title_sw, subtitle: (x) => x.title_en },
  { key: 'milestones', roles: ['board_admin', 'super_admin'], label: 'Historia / milestones', description: 'Simamia matukio muhimu ya historia ya TSMA.', endpoint: '/content/admin/milestones/', fields: [
    { name: 'year', label: 'Mwaka', type: 'number', required: true }, { name: 'title_sw', label: 'Kichwa (SW)', required: true }, { name: 'title_en', label: 'Title (EN)', required: true },
    { name: 'description_sw', label: 'Maelezo (SW)', type: 'textarea' }, { name: 'description_en', label: 'Description (EN)', type: 'textarea' },
    { name: 'display_order', label: 'Mpangilio', type: 'number' },
  ], title: (x) => `${x.year || ''} · ${x.title_sw || ''}`, subtitle: (x) => x.title_en },
  { key: 'banners', roles: ['board_admin', 'super_admin'], readOnlyCreateDelete: true, keyField: 'page_key', label: 'Banners za kurasa', description: 'Hariri vichwa, maelezo na vitufe vya banner za kurasa zilizopo.', endpoint: '/content/admin/banners/', detailEndpoint: (item) => `/content/admin/banners/${item.page_key}/`, fields: [
    { name: 'badge_sw', label: 'Badge (SW)' }, { name: 'badge_en', label: 'Badge (EN)' }, { name: 'title_sw', label: 'Kichwa (SW)', required: true }, { name: 'title_en', label: 'Title (EN)', required: true },
    { name: 'subtitle_sw', label: 'Maelezo (SW)', type: 'textarea' }, { name: 'subtitle_en', label: 'Subtitle (EN)', type: 'textarea' },
    { name: 'cta_text_sw', label: 'Maandishi ya kitufe (SW)' }, { name: 'cta_text_en', label: 'Button text (EN)' }, { name: 'cta_url', label: 'Kiungo cha kitufe' },
  ], title: (x) => x.title_sw || x.page_key, subtitle: (x) => `${x.page_key} · ${x.title_en || ''}` },
  { key: 'site-settings', roles: ['board_admin', 'super_admin'], singleton: true, label: 'Logo na favicon', description: 'Badilisha alama ya tovuti na favicon.', endpoint: '/content/admin/settings/', fields: [
    { name: 'logo_image', label: 'Logo ya kawaida', type: 'file' }, { name: 'logo_on_dark', label: 'Logo kwa background nyeusi', type: 'file' }, { name: 'favicon', label: 'Favicon', type: 'file' },
  ], title: () => 'Mipangilio ya alama ya tovuti', subtitle: () => 'Logo na favicon' },
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
  { key: 'gallery', label: 'Picha na albamu', description: 'Tengeneza albamu, weka jalada na dhibiti uchapishaji.', endpoint: '/gallery/admin/albums/', fields: [
    { name: 'title', label: 'Jina la albamu', required: true }, { name: 'description', label: 'Maelezo', type: 'textarea' },
    { name: 'cover_image', label: 'Picha ya jalada', type: 'file' }, { name: 'event_year', label: 'Mwaka wa tukio', type: 'number', required: true },
    { name: 'event_date', label: 'Tarehe ya tukio', type: 'date' }, { name: 'is_published', label: 'Imechapishwa', type: 'checkbox' },
    { name: 'display_order', label: 'Mpangilio', type: 'number' },
  ], title: (x) => x.title, subtitle: (x) => `${x.event_year || ''} · ${x.is_published ? 'Imechapishwa' : 'Rasimu'}` },
  { key: 'conference-memories', label: 'Conference memories (picha/video)', description: 'Ongeza na hariri picha au viungo vya video za matukio ya conference; weka published ili zionekane hadharani.', endpoint: '/conferences/admin/memories/', fields: [
    { name: 'conference', label: 'Conference ID', type: 'number', required: true }, { name: 'event_title', label: 'Jina la tukio', required: true }, { name: 'description', label: 'Maelezo', type: 'textarea' }, { name: 'media_type', label: 'Aina ya media (image/youtube/tiktok/instagram)', required: true }, { name: 'image', label: 'Picha ya kumbukumbu', type: 'file' }, { name: 'video_url', label: 'Kiungo cha video', type: 'url' }, { name: 'display_order', label: 'Mpangilio', type: 'number' }, { name: 'is_published', label: 'Imechapishwa', type: 'checkbox' },
  ], title: (x) => x.event_title, subtitle: (x) => `${x.media_type || ''} · ${x.is_published ? 'Imechapishwa' : 'Rasimu'} · Conference #${x.conference || ''}` },
  { key: 'conference-days', label: 'Siku za conference', description: 'Panga siku, tarehe na vichwa vya ratiba ya conference.', endpoint: '/conferences/admin/days/', fields: [
    { name: 'conference', label: 'Conference ID', type: 'number', required: true }, { name: 'day_number', label: 'Namba ya siku', type: 'number', required: true }, { name: 'date', label: 'Tarehe', type: 'date', required: true }, { name: 'title', label: 'Kichwa cha siku', required: true },
  ], title: (x) => `Siku ${x.day_number || ''} · ${x.title || ''}`, subtitle: (x) => `${x.date || ''} · Conference #${x.conference || ''}` },
  { key: 'conference-sessions', label: 'Ratiba na wazungumzaji', description: 'Hariri vipindi, muda, ukumbi na taarifa za wazungumzaji.', endpoint: '/conferences/admin/sessions/', fields: [
    { name: 'day', label: 'Conference day ID', type: 'number', required: true }, { name: 'title', label: 'Jina la kipindi', required: true }, { name: 'description', label: 'Maelezo', type: 'textarea' }, { name: 'session_type', label: 'Aina ya kipindi' }, { name: 'start_time', label: 'Muda wa kuanza', type: 'time' }, { name: 'end_time', label: 'Muda wa kumaliza', type: 'time' }, { name: 'speaker_name', label: 'Jina la mzungumzaji' }, { name: 'speaker_title', label: 'Cheo/taaluma ya mzungumzaji' }, { name: 'speaker_bio', label: 'Wasifu wa mzungumzaji', type: 'textarea' }, { name: 'speaker_photo', label: 'Picha ya mzungumzaji', type: 'file' }, { name: 'venue_hall', label: 'Ukumbi/room' }, { name: 'display_order', label: 'Mpangilio', type: 'number' },
  ], title: (x) => x.title, subtitle: (x) => `${x.speaker_name || 'Mzungumzaji hajawekwa'} · ${x.start_time || ''}` },
  { key: 'ticket-types', roles: ['board_admin', 'super_admin'], label: 'Aina za tiketi', description: 'Simamia aina na bei za tiketi. Hii inabaki kwa Board Admin/Super Admin.', endpoint: '/conferences/admin/ticket-types/', fields: [
    { name: 'conference', label: 'Conference ID', type: 'number', required: true }, { name: 'name', label: 'Jina la tiketi', required: true }, { name: 'description', label: 'Maelezo', type: 'textarea' }, { name: 'price', label: 'Bei', type: 'number', required: true }, { name: 'currency', label: 'Sarafu', required: true }, { name: 'max_quantity', label: 'Idadi ya juu', type: 'number' }, { name: 'sales_start', label: 'Mauzo yanaanza', type: 'datetime' }, { name: 'sales_end', label: 'Mauzo yanaisha', type: 'datetime' }, { name: 'is_active', label: 'Inauzwa', type: 'checkbox' }, { name: 'display_order', label: 'Mpangilio', type: 'number' },
  ], title: (x) => x.name, subtitle: (x) => `${x.price ?? ''} ${x.currency || ''} · ${x.is_active ? 'Inauzwa' : 'Haipo hewani'}` },
  { key: 'home-stats', roles: ['board_admin', 'super_admin'], label: 'Takwimu za Home', description: 'Hariri namba na maandishi yanayoonekana kwenye sehemu ya takwimu ya Home.', endpoint: '/content/admin/home-stats/', fields: [
    { name: 'kind', label: 'Aina (andika big au tile)', required: true }, { name: 'value', label: 'Thamani inayoonekana', required: true },
    { name: 'label_sw', label: 'Maelezo kwa Kiswahili', required: true }, { name: 'label_en', label: 'Maelezo kwa Kiingereza', required: true },
    { name: 'display_order', label: 'Mpangilio', type: 'number' },
  ], title: (x) => x.label_sw || x.value, subtitle: (x) => `${x.kind}: ${x.value}` },
  { key: 'partners', roles: ['board_admin', 'super_admin'], label: 'Washirika', description: 'Ongeza logo na taarifa za washirika.', endpoint: '/partners/admin/', fields: [
    { name: 'name', label: 'Jina la mshirika', required: true }, { name: 'logo', label: 'Logo', type: 'file' },
    { name: 'website_url', label: 'Tovuti', type: 'url' }, { name: 'description', label: 'Maelezo', type: 'textarea' },
    { name: 'is_active', label: 'Aonekane kwenye tovuti', type: 'checkbox' }, { name: 'display_order', label: 'Mpangilio', type: 'number' },
  ], title: (x) => x.name, subtitle: (x) => x.is_active ? 'Anaonekana kwenye tovuti' : 'Amefichwa' },
  { key: 'board', roles: ['board_admin', 'super_admin'], label: 'Board members', description: 'Hariri wasifu na picha za viongozi.', endpoint: '/board/admin/', fields: [
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
    { name: 'physical_address', label: 'Anwani', type: 'textarea' }, { name: 'start_date', label: 'Tarehe ya kuanza', type: 'date' },
    { name: 'end_date', label: 'Tarehe ya kumaliza', type: 'date' }, { name: 'registration_deadline', label: 'Mwisho wa usajili', type: 'datetime' },
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
  const availableModules = useMemo(() => MODULES.filter((module) => !module.roles || module.roles.includes(user?.role) || user?.is_superuser), [user])
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
  const [galleryAlbumForImages, setGalleryAlbumForImages] = useState(null)
  const [galleryFiles, setGalleryFiles] = useState([])
  const [galleryCaption, setGalleryCaption] = useState('')
  const [galleryImageBusy, setGalleryImageBusy] = useState(false)
  const [galleryImageError, setGalleryImageError] = useState('')
  const [galleryImageNotice, setGalleryImageNotice] = useState('')
  const active = availableModules.find((m) => m.key === activeKey) || availableModules[0] || MODULES[0]

  const loadItems = useCallback(async () => {
    setLoading(true); setLoadError(''); setNotice('')
    try {
      const response = await apiClient.get(active.endpoint, { params: { _nocache: Date.now() } })
      const data = response.data
      setItems(active.singleton ? [data] : Array.isArray(data) ? data : data?.results || [])
    } catch (error) {
      setItems([]); setLoadError(errorMessage(error))
    } finally { setLoading(false) }
  }, [active])

  useEffect(() => { if (!availableModules.some((m) => m.key === activeKey)) setActiveKey(availableModules[0]?.key || 'news') }, [availableModules, activeKey])
  useEffect(() => { setEditing(null); setForm(blankForm(active)); setFormError(''); loadItems() }, [active, loadItems])

  const filteredItems = useMemo(() => items.filter((item) => JSON.stringify(item).toLowerCase().includes(query.toLowerCase())), [items, query])

  function startCreate() { if (active.singleton || active.readOnlyCreateDelete) return; setEditing('new'); setForm(blankForm(active)); setFormError(''); setNotice('') }
  function startEdit(item) {
    setEditing(active.singleton ? 'singleton' : (active.keyField ? item[active.keyField] : item.id))
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
      const usesMultipart = active.fields.some((f) => ['file', 'files'].includes(f.type))
      let payload = form
      let config = {}
      if (usesMultipart) {
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
      else if (active.singleton) await apiClient.patch(active.endpoint, payload, config)
      else await apiClient.patch(active.detailEndpoint ? active.detailEndpoint({ ...form, [active.keyField]: editing }) : `${active.endpoint}${editing}/`, payload, config)
      setNotice(editing === 'new' ? 'Taarifa imeongezwa kikamilifu.' : 'Mabadiliko yamehifadhiwa.')
      setEditing(null); await loadItems()
    } catch (error) { setFormError(errorMessage(error)) }
    finally { setSaving(false) }
  }

  async function uploadGalleryImages(event) {
    event.preventDefault()
    if (!galleryAlbumForImages || galleryFiles.length === 0) return
    setGalleryImageBusy(true); setGalleryImageError(''); setGalleryImageNotice('')
    try {
      for (let index = 0; index < galleryFiles.length; index += 1) {
        const payload = new FormData()
        payload.append('album', String(galleryAlbumForImages.id))
        if (galleryFiles[index].type.startsWith('video/')) payload.append('video', galleryFiles[index])
        else payload.append('image', galleryFiles[index])
        payload.append('caption', galleryCaption)
        payload.append('display_order', String((galleryAlbumForImages.images?.length || 0) + index))
        await apiClient.post('/gallery/admin/images/', payload, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      setGalleryFiles([]); setGalleryCaption('')
      await loadItems()
      setGalleryImageNotice('Picha zimepakiwa kikamilifu kwenye albamu.')
    } catch (error) {
      setGalleryImageError(errorMessage(error))
    } finally { setGalleryImageBusy(false) }
  }

  async function deleteGalleryImage(image) {
    if (!window.confirm('Una uhakika unataka kufuta picha hii kwenye albamu?')) return
    setGalleryImageError(''); setGalleryImageNotice('')
    try {
      await apiClient.delete(`/gallery/admin/images/${image.id}/`)
      await loadItems()
      setGalleryImageNotice('Picha imefutwa kwenye albamu.')
    } catch (error) { setGalleryImageError(errorMessage(error)) }
  }

  async function deleteItem(item) {
    if (active.singleton || active.readOnlyCreateDelete) return
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
      <div className="mb-7"><p className="text-sm font-semibold text-amber-700">CONTENT MANAGEMENT</p><h2 className="text-2xl sm:text-3xl font-bold mt-1">Karibu kwenye ukurasa wa editing</h2><p className="text-slate-600 mt-2 max-w-3xl">Simamia maudhui uliyoidhinishwa. Uthibitisho wa hatua mbili unahitajika wakati wa kuingia, na ruhusa za kila kitendo zinathibitishwa na Django API.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-7">{availableModules.map((m) => <button key={m.key} onClick={() => { setActiveKey(m.key); setQuery('') }} className={`text-left rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${activeKey === m.key ? 'bg-[#101d36] text-white border-[#101d36] shadow-md' : 'bg-white border-slate-200'}`}><span className="text-xs uppercase tracking-wider opacity-70">{m.key === 'board' ? 'Watu' : 'Maudhui'}</span><span className="block font-bold mt-2">{m.label}</span><span className="block text-sm mt-1 opacity-75">{m.key === activeKey ? `${items.length} rekodi` : 'Fungua sehemu'}</span></button>)}</div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,.9fr)] gap-6 items-start">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h3 className="text-xl font-bold">{active.label}</h3><p className="text-sm text-slate-500 mt-1">{active.description}</p></div>{!active.singleton && !active.readOnlyCreateDelete && <button onClick={startCreate} className="rounded-lg bg-amber-400 hover:bg-amber-300 px-4 py-2.5 font-bold text-slate-950">+ Ongeza mpya</button>}</div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tafuta taarifa..." className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-amber-400" /></div>
          {active.key === 'gallery' && galleryAlbumForImages && <div className="m-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><div><h4 className="font-bold text-slate-900">Picha za albamu: {items.find((x) => x.id === galleryAlbumForImages.id)?.title || galleryAlbumForImages.title}</h4><p className="mt-1 text-sm text-slate-600">Pakia picha au video moja au nyingi. Kila faili itahifadhiwa kwenye albamu uliyochagua.</p></div><button type="button" onClick={() => { setGalleryAlbumForImages(null); setGalleryFiles([]); setGalleryImageError(''); setGalleryImageNotice('') }} className="text-sm underline">Funga</button></div>
            {galleryImageError && <p role="alert" className="mt-3 rounded-lg bg-red-100 p-3 text-sm text-red-800">{galleryImageError}</p>}{galleryImageNotice && <p role="status" className="mt-3 rounded-lg bg-emerald-100 p-3 text-sm text-emerald-800">{galleryImageNotice}</p>}
            <form onSubmit={uploadGalleryImages} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">Chagua picha au video<input type="file" accept="image/*,video/mp4,video/webm,video/quicktime,video/x-m4v" multiple required onChange={(e) => setGalleryFiles(Array.from(e.target.files || []))} className="mt-1 block w-full text-sm" /></label>
              <label className="text-sm font-semibold">Maelezo ya picha (hiari)<input value={galleryCaption} onChange={(e) => setGalleryCaption(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" /></label>
              <button type="submit" disabled={galleryImageBusy || galleryFiles.length === 0} className="rounded-lg bg-[#101d36] px-4 py-2.5 font-bold text-white disabled:opacity-50 sm:col-span-2">{galleryImageBusy ? 'Inapakia picha...' : `Pakia picha ${galleryFiles.length ? `(${galleryFiles.length})` : ''}`}</button>
            </form>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{(items.find((x) => x.id === galleryAlbumForImages.id)?.images || galleryAlbumForImages.images || []).map((image) => <div key={image.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">{image.video ? <video src={image.video} controls preload="metadata" className="h-28 w-full object-cover" /> : image.image && <img src={image.image} alt={image.caption || 'Picha ya albamu'} className="h-28 w-full object-cover" />}<div className="p-2"><p className="truncate text-xs text-slate-600">{image.caption || 'Bila maelezo'}</p><button type="button" onClick={() => deleteGalleryImage(image)} className="mt-2 text-xs font-semibold text-red-700 hover:underline">Futa picha</button></div></div>)}</div>
          </div>}
          {loadError && <div className="m-5 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{loadError}</div>}{notice && <div className="m-5 rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{notice}</div>}{formError && <div className="m-5 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{formError}</div>}
          {loading ? <div className="p-8 text-center text-slate-500">Inapakia taarifa...</div> : filteredItems.length === 0 ? <div className="p-10 text-center"><div className="text-3xl mb-2">✦</div><p className="font-semibold">Hakuna taarifa za kuonyesha</p><p className="text-sm text-slate-500 mt-1">Ikiwa umeona kosa la ruhusa, sehemu hii inahitaji role maalumu.</p></div> : <div className="divide-y divide-slate-100">{filteredItems.map((item) => <article key={active.keyField ? item[active.keyField] : (item.id ?? active.key)} className="p-4 sm:p-5 flex gap-3 items-start"><div className="min-w-0 flex-1"><h4 className="font-semibold break-words">{active.title(item) || `Rekodi #${item.id}`}</h4><p className="text-sm text-slate-500 mt-1">{active.subtitle(item) || `ID: ${item.id}`}</p>{item.images?.length > 0 && <p className="text-xs text-slate-400 mt-1">{item.images.length} picha</p>}</div><div className="flex gap-2 shrink-0">{active.key === 'gallery' && <button onClick={() => { setGalleryAlbumForImages(item); setGalleryImageError(''); setGalleryImageNotice('') }} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 hover:bg-amber-100">Media ({item.images?.length || 0})</button>}<button onClick={() => startEdit(item)} className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">Hariri</button>{!active.singleton && !active.readOnlyCreateDelete && <button onClick={() => deleteItem(item)} className="rounded-lg border border-red-200 text-red-700 px-3 py-2 text-sm hover:bg-red-50">Futa</button>}</div></article>)}</div>}
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
