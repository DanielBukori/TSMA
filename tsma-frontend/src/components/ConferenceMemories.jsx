import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'

function embedUrl(type, raw) {
  try {
    const u = new URL(raw)
    if (type === 'youtube') {
      const id = u.hostname.includes('youtu.be') ? u.pathname.slice(1) : (u.searchParams.get('v') || u.pathname.match(/\/embed\/([^/]+)/)?.[1])
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : ''
    }
    if (type === 'tiktok') {
      const id = u.pathname.match(/\/video\/(\d+)/)?.[1]
      return id ? `https://www.tiktok.com/player/v1/${id}` : ''
    }
    if (type === 'instagram') {
      const match = u.pathname.match(/\/(?:p|reel|tv)\/([^/]+)/)
      return match ? `https://www.instagram.com/${u.pathname.includes('/reel/') ? 'reel' : u.pathname.includes('/tv/') ? 'tv' : 'p'}/${match[1]}/embed` : ''
    }
  } catch { return '' }
  return ''
}

export default function ConferenceMemories() {
  const { i18n } = useTranslation()
  const sw = i18n.language?.startsWith('sw')
  const [conferences, setConferences] = useState([])
  const [year, setYear] = useState('')
  const [conferenceId, setConferenceId] = useState('')
  const [items, setItems] = useState([])
  const [active, setActive] = useState(null)
  const years = useMemo(() => [...new Set(conferences.map(c => String(new Date(c.start_date).getFullYear())))].sort((a,b) => Number(b)-Number(a)), [conferences])
  const yearConferences = conferences.filter(c => String(new Date(c.start_date).getFullYear()) === year)

  useEffect(() => { apiClient.get('/conferences/').then(r => { const data = r.data?.results || r.data || []; if (Array.isArray(data)) { setConferences(data); const ys = [...new Set(data.map(c => String(new Date(c.start_date).getFullYear())))].sort((a,b)=>Number(b)-Number(a)); if (ys[0]) setYear(ys[0]) } }).catch(() => {}) }, [])
  useEffect(() => { setConferenceId(''); setItems([]); setActive(null) }, [year])
  useEffect(() => { if (!conferenceId) return; apiClient.get('/conferences/memories/', { params: { conference: conferenceId } }).then(r => { const d = r.data?.results || r.data || []; setItems(Array.isArray(d) ? d : []) }).catch(() => setItems([])) }, [conferenceId])
  return <section className="max-w-6xl mx-auto px-5 md:px-8 py-14" id="conference-memories">
    <div className="mb-7"><p className="text-terracotta text-xs font-extrabold tracking-widest">{sw ? 'HIFADHI YA HISTORIA' : 'THE ARCHIVE'}</p><h2 className="font-serif text-3xl font-bold text-navy mt-2">{sw ? 'Kumbukumbu za Conferences' : 'Conference Memories'}</h2><p className="text-ink-muted mt-2">{sw ? 'Chagua mwaka na conference kuona picha na video.' : 'Choose a year and conference to explore photos and videos.'}</p></div>
    {!years.length ? <p className="text-sm text-ink-muted">{sw ? 'Hakuna conferences zilizochapishwa bado.' : 'No published conferences yet.'}</p> : <>
      <div className="flex flex-wrap gap-2 mb-5">{years.map(y => <button key={y} onClick={() => setYear(y)} className={`px-5 py-2 rounded-full border font-bold ${year===y?'bg-navy text-white border-navy':'border-black/15 text-navy'}`}>{y}</button>)}</div>
      <div className="flex flex-wrap gap-3 mb-7">{yearConferences.map(c => <button key={c.id} onClick={() => setConferenceId(String(c.id))} className={`px-4 py-3 rounded-lg border text-sm font-bold ${conferenceId===String(c.id)?'bg-gold border-gold text-navy':'bg-white border-black/10 text-navy'}`}>{c.title}</button>)}</div>
      {conferenceId && !items.length && <p className="text-sm text-ink-muted">{sw ? 'Hakuna picha au video zilizowekwa kwa conference hii bado.' : 'No memories have been added for this conference yet.'}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{items.map(item => <article key={item.id} className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm"><button className="block w-full text-left" onClick={() => setActive(item)}>{item.media_type==='image' && item.image ? <img src={item.image} alt={item.event_title} className="w-full h-52 object-cover" loading="lazy"/> : <div className="h-52 bg-gradient-to-br from-navy to-green-dark text-white flex items-center justify-center"><span className="text-5xl">▶</span><span className="sr-only">Play</span></div>}<div className="p-4"><h3 className="font-bold text-navy">{item.event_title}</h3>{item.description && <p className="text-sm text-ink-muted mt-1">{item.description}</p>}</div></button></article>)}</div>
    </>}
    {active && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/85 p-4 flex items-center justify-center" onClick={() => setActive(null)}><div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-auto" onClick={e=>e.stopPropagation()}><div className="p-4 flex justify-between gap-4"><h3 className="font-bold text-navy">{active.event_title}</h3><button onClick={()=>setActive(null)} aria-label="Close" className="font-bold text-xl">×</button></div>{active.media_type==='image' && active.image ? <img src={active.image} alt={active.event_title} className="w-full max-h-[70vh] object-contain bg-black"/> : embedUrl(active.media_type, active.video_url) ? <div className="aspect-video"><iframe title={active.event_title} src={embedUrl(active.media_type, active.video_url)} className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div> : <p className="p-6 text-sm">{sw ? 'Link hii haiwezi ku-embed moja kwa moja. Fungua jukwaa husika kupitia link:' : 'This link cannot be embedded. Open the original platform:'} <a className="underline" href={active.video_url} target="_blank" rel="noreferrer">{active.video_url}</a></p>}{active.description && <p className="p-4 text-sm text-ink-muted">{active.description}</p>}</div></div>}
  </section>
}
