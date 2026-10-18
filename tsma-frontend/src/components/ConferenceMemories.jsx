import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/client.js'

function getYouTubeId(raw) {
  try {
    const url = new URL(raw)
    if (url.hostname === 'youtu.be' || url.hostname.endsWith('.youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || ''
    if (url.hostname.includes('youtube.com')) {
      return url.searchParams.get('v') || url.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] || ''
    }
  } catch { /* invalid URL */ }
  return ''
}

function embedUrl(type, raw) {
  try {
    const url = new URL(raw)
    if (type === 'youtube') {
      const id = getYouTubeId(raw)
      return /^[\w-]{6,}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : ''
    }
    if (type === 'tiktok' && /(^|\.)tiktok\.com$/.test(url.hostname)) {
      const id = url.pathname.match(/\/video\/(\d+)/)?.[1]
      return id ? `https://www.tiktok.com/player/v1/${id}?autoplay=1` : ''
    }
    if (type === 'instagram' && /(^|\.)instagram\.com$/.test(url.hostname)) {
      const match = url.pathname.match(/\/(p|reel|tv)\/([^/]+)/)
      return match ? `https://www.instagram.com/${match[1]}/${match[2]}/embed` : ''
    }
  } catch { /* invalid URL */ }
  return ''
}

function youtubeThumbnail(item) {
  const id = item.media_type === 'youtube' ? getYouTubeId(item.video_url || '') : ''
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : ''
}

function formatDateRange(start, end) {
  if (!start) return ''
  const opts = { day: 'numeric', month: 'short', year: 'numeric' }
  const first = new Date(`${start}T00:00:00`)
  const last = new Date(`${end || start}T00:00:00`)
  const a = first.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  const b = last.toLocaleDateString(undefined, opts)
  return `${a} – ${b}`
}

export default function ConferenceMemories() {
  const { i18n } = useTranslation()
  const sw = i18n.language?.startsWith('sw')
  const [conferences, setConferences] = useState([])
  const [year, setYear] = useState('')
  const [conferenceId, setConferenceId] = useState('')
  const [memories, setMemories] = useState([])
  const [active, setActive] = useState(null)
  const [filter, setFilter] = useState('all')
  const [loadingConferences, setLoadingConferences] = useState(true)
  const [loadingMemories, setLoadingMemories] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const years = useMemo(() => [...new Set(conferences.map((c) => String(new Date(`${c.start_date}T00:00:00`).getFullYear())))].sort((a, b) => Number(b) - Number(a)), [conferences])
  const yearConferences = useMemo(() => conferences.filter((c) => String(new Date(`${c.start_date}T00:00:00`).getFullYear()) === year), [conferences, year])
  const selectedConference = yearConferences.find((c) => String(c.id) === conferenceId) || yearConferences[0] || null
  const conferenceMemories = useMemo(() => memories.filter((m) => String(m.conference) === String(selectedConference?.id)), [memories, selectedConference])
  const photos = conferenceMemories.filter((m) => m.media_type === 'image')
  const videos = conferenceMemories.filter((m) => m.media_type !== 'image')
  const visibleMemories = filter === 'photos' ? photos : filter === 'videos' ? videos : conferenceMemories

  useEffect(() => {
    let cancelled = false
    apiClient.get('/conferences/').then((response) => {
      const data = response.data?.results || response.data || []
      if (!cancelled && Array.isArray(data)) {
        const sorted = [...data].sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)))
        setConferences(sorted)
        const latestYear = sorted[0]?.start_date ? String(new Date(`${sorted[0].start_date}T00:00:00`).getFullYear()) : ''
        setYear(latestYear)
      }
    }).catch(() => {
      if (!cancelled) setLoadError(true)
    }).finally(() => {
      if (!cancelled) setLoadingConferences(false)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!yearConferences.length) {
      setConferenceId('')
      return
    }
    if (!yearConferences.some((c) => String(c.id) === conferenceId)) {
      setConferenceId(String(yearConferences[0].id))
    }
  }, [year, conferences]) // choose the first conference automatically when a year changes

  useEffect(() => {
    if (!year) {
      setMemories([])
      return
    }
    let cancelled = false
    setLoadingMemories(true)
    setFilter('all')
    apiClient.get('/conferences/memories/', { params: { year } }).then((response) => {
      const data = response.data?.results || response.data || []
      if (!cancelled) setMemories(Array.isArray(data) ? data : [])
    }).catch(() => {
      if (!cancelled) setMemories([])
    }).finally(() => {
      if (!cancelled) setLoadingMemories(false)
    })
    return () => { cancelled = true }
  }, [year])

  useEffect(() => {
    if (!active) return undefined
    const onKeyDown = (event) => { if (event.key === 'Escape') setActive(null) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active])

  return (
    <section id="conference-memories" className="relative overflow-hidden bg-[#071b2c] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
        <div className="absolute -top-40 -right-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.24em] text-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              {sw ? 'Kumbukumbu za TSMA' : 'The TSMA Archive'}
            </div>
            <h2 className="max-w-3xl font-serif text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
              {sw ? <>Historia ya michezo.<br /><span className="text-amber-300">Imekumbukwa.</span></> : <>The moments that<br /><span className="text-amber-300">move sport forward.</span></>}
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65 md:text-base">
              {sw ? 'Chunguza mikutano ya TSMA kwa miaka, rudi kwenye matukio muhimu, hotuba, picha na video zilizounda historia yetu.' : 'Explore TSMA conferences by year and revisit the people, conversations, photographs and videos shaping our sporting future.'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <ArchiveStat value={years.length} label={sw ? 'Miaka' : 'Years'} />
            <ArchiveStat value={conferences.length} label={sw ? 'Mikutano' : 'Conferences'} />
            <ArchiveStat value={memories.length} label={sw ? 'Kumbukumbu' : 'Media items'} />
          </div>
        </div>

        <div className="mt-12 border-y border-white/10 py-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-white/45">{sw ? 'VINJARI KWA MWAKA' : 'EXPLORE BY YEAR'}</p>
            <span className="text-xs text-white/40">{years.length ? `${years.length} ${sw ? 'miaka' : 'years'}` : ''}</span>
          </div>
          {loadingConferences ? <div className="h-10 animate-pulse rounded-lg bg-white/10" /> : years.length ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {years.map((itemYear) => (
                <button key={itemYear} type="button" onClick={() => setYear(itemYear)} className={`shrink-0 rounded-lg border px-5 py-3 text-sm font-black transition-all ${year === itemYear ? 'border-amber-300 bg-amber-300 text-[#071b2c] shadow-lg shadow-amber-300/10' : 'border-white/15 bg-white/[.04] text-white/70 hover:border-white/40 hover:text-white'}`} aria-pressed={year === itemYear}>
                  {itemYear}
                </button>
              ))}
            </div>
          ) : <p className="text-sm text-white/55">{loadError ? (sw ? 'Imeshindikana kupakia conferences. Jaribu tena baadaye.' : 'Could not load conferences. Please try again later.') : (sw ? 'Hakuna conferences zilizochapishwa bado.' : 'No published conferences yet.')}</p>}
        </div>

        {year && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[300px_1fr]">
            <aside>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">{sw ? 'Mwaka uliochaguliwa' : 'Selected year'}</p>
                  <h3 className="mt-1 font-serif text-3xl font-black">{year}</h3>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/65">{yearConferences.length}</span>
              </div>
              <div className="space-y-2">
                {yearConferences.map((conference, index) => {
                  const isSelected = String(selectedConference?.id) === String(conference.id)
                  const count = memories.filter((memory) => String(memory.conference) === String(conference.id)).length
                  return (
                    <button key={conference.id} type="button" onClick={() => { setConferenceId(String(conference.id)); setFilter('all') }} className={`group w-full rounded-xl border p-4 text-left transition-all ${isSelected ? 'border-amber-300/70 bg-white/10 shadow-lg shadow-black/10' : 'border-white/10 bg-white/[.025] hover:border-white/30 hover:bg-white/[.06]'}`} aria-pressed={isSelected}>
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${isSelected ? 'bg-amber-300 text-[#071b2c]' : 'bg-white/10 text-white/65'}`}>{String(index + 1).padStart(2, '0')}</span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm font-bold leading-5 ${isSelected ? 'text-white' : 'text-white/75'}`}>{conference.title}</span>
                          <span className="mt-1 block text-xs text-white/40">{conference.city || conference.venue_name || ''}</span>
                          <span className="mt-2 block text-[10px] font-bold uppercase tracking-wider text-emerald-300/80">{count} {sw ? 'kumbukumbu' : 'media items'}</span>
                        </span>
                        <span className={`text-lg transition-transform ${isSelected ? 'translate-x-0 text-amber-300' : '-translate-x-1 text-white/25 group-hover:translate-x-0'}`}>↗</span>
                      </div>
                    </button>
                  )
                })}
                {!yearConferences.length && <p className="rounded-xl border border-white/10 p-4 text-sm text-white/50">{sw ? 'Hakuna conference kwa mwaka huu.' : 'No conferences for this year.'}</p>}
              </div>
            </aside>

            <div className="min-w-0">
              {selectedConference && (
                <div className="relative mb-6 min-h-56 overflow-hidden rounded-2xl border border-white/10 bg-[#102c40] md:min-h-64">
                  {selectedConference.banner_image && <img src={selectedConference.banner_image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#071b2c] via-[#071b2c]/85 to-[#071b2c]/35" />
                  <div className="relative flex min-h-56 flex-col justify-end p-6 md:min-h-64 md:p-8">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-emerald-300/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-200">{year} {sw ? 'KUMBUKUMBU' : 'ARCHIVE'}</span>
                      {selectedConference.is_past && <span className="rounded-full border border-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/65">{sw ? 'Mkutano uliopita' : 'Past conference'}</span>}
                    </div>
                    <h3 className="max-w-2xl font-serif text-2xl font-black leading-tight md:text-4xl">{selectedConference.title}</h3>
                    {selectedConference.theme && <p className="mt-2 max-w-2xl text-sm italic text-amber-200">{selectedConference.theme}</p>}
                    <p className="mt-3 text-xs text-white/55">{formatDateRange(selectedConference.start_date, selectedConference.end_date)}{selectedConference.city ? ` · ${selectedConference.city}` : ''}</p>
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <span className="text-xs text-white/55">{photos.length} {sw ? 'picha' : 'photos'} · {videos.length} {sw ? 'video' : 'videos'}</span>
                      <Link to={`/conferences/${selectedConference.slug}`} className="inline-flex items-center gap-2 rounded-lg bg-amber-300 px-4 py-2.5 text-xs font-black text-[#071b2c] transition-transform hover:-translate-y-0.5">{sw ? 'Historia na ratiba kamili' : 'Full conference details'} <span aria-hidden="true">↗</span></Link>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/40">{sw ? 'Picha na video' : 'Photos & recordings'}</p>
                  <h4 className="mt-1 font-serif text-2xl font-bold">{sw ? 'Matukio yaliyochaguliwa' : 'Highlights & moments'}</h4>
                </div>
                <div className="flex rounded-lg border border-white/10 bg-black/10 p-1">
                  {[['all', sw ? 'Zote' : 'All'], ['photos', sw ? 'Picha' : 'Photos'], ['videos', sw ? 'Video' : 'Videos']].map(([key, label]) => (
                    <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-md px-3 py-2 text-xs font-bold transition-colors ${filter === key ? 'bg-white text-[#071b2c]' : 'text-white/55 hover:text-white'}`} aria-pressed={filter === key}>{label}</button>
                  ))}
                </div>
              </div>

              {loadingMemories ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((n) => <div key={n} className="aspect-[4/3] animate-pulse rounded-xl bg-white/10" />)}</div> : visibleMemories.length ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleMemories.map((item, index) => <MemoryCard key={item.id} item={item} index={index} onOpen={() => setActive(item)} sw={sw} />)}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/20 bg-white/[.025] px-6 py-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl">{filter === 'photos' ? '▧' : filter === 'videos' ? '▶' : '✦'}</div>
                  <h5 className="mt-4 font-bold text-white">{sw ? 'Kumbukumbu zitaonekana hapa' : 'The archive starts here'}</h5>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/45">{sw ? 'Hakuna media iliyochapishwa kwa uchaguzi huu bado. Editor anaweza kuongeza picha, video na maelezo kupitia Django Admin.' : 'No published media for this selection yet. An editor can add photos, video links and event descriptions in Django Admin.'}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {active && <MemoryModal item={active} sw={sw} onClose={() => setActive(null)} />}
    </section>
  )
}

function ArchiveStat({ value, label }) {
  return <div className="rounded-xl border border-white/10 bg-white/[.045] p-3 sm:p-4">
    <div className="font-serif text-2xl font-black text-amber-300 sm:text-3xl">{value}</div>
    <div className="mt-1 text-[9px] font-black uppercase tracking-[.15em] text-white/45 sm:text-[10px]">{label}</div>
  </div>
}

function MemoryCard({ item, index, onOpen, sw }) {
  const thumbnail = item.media_type === 'image' ? item.image : youtubeThumbnail(item)
  const isVideo = item.media_type !== 'image'
  return <button type="button" onClick={onOpen} className={`group relative overflow-hidden rounded-xl border border-white/10 bg-[#102c40] text-left transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/60 hover:shadow-xl hover:shadow-black/20 ${index % 5 === 0 ? 'sm:row-span-1' : ''}`}>
    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#15374b] to-[#071b2c]">
      {thumbnail ? <img src={thumbnail} alt={item.event_title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(event) => { event.currentTarget.style.display = 'none' }} /> : null}
      {(!thumbnail || isVideo) && <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-900/35 to-black/30"><span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-black/35 text-xl text-white shadow-lg backdrop-blur-sm">{isVideo ? '▶' : '▧'}</span></div>}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
      <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] text-white backdrop-blur-sm">{item.media_type === 'image' ? (sw ? 'Picha' : 'Photo') : item.media_type}</span>
      {isVideo && <span className="absolute bottom-3 right-3 rounded-full bg-amber-300 px-3 py-1.5 text-[10px] font-black text-[#071b2c]">{sw ? 'CHEZA VIDEO' : 'PLAY VIDEO'}</span>}
    </div>
    <div className="p-4">
      <h5 className="line-clamp-2 font-bold leading-5 text-white transition-colors group-hover:text-amber-200">{item.event_title}</h5>
      {item.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/50">{item.description}</p>}
      <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">{isVideo ? (sw ? 'Tazama' : 'Watch') : (sw ? 'Angalia picha' : 'View photo')} <span>↗</span></span>
    </div>
  </button>
}

function MemoryModal({ item, sw, onClose }) {
  const player = item.media_type === 'image' ? '' : embedUrl(item.media_type, item.video_url || '')
  return <div role="dialog" aria-modal="true" aria-label={item.event_title} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm md:p-6" onClick={onClose}>
    <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-[#071b2c] shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4 md:p-5">
        <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-emerald-300">{sw ? 'KUMBUKUMBU ZA TSMA' : 'TSMA ARCHIVE'}</p><h3 className="mt-1 font-serif text-lg font-bold text-white md:text-2xl">{item.event_title}</h3></div>
        <button type="button" onClick={onClose} aria-label={sw ? 'Funga' : 'Close'} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-xl text-white/70 hover:bg-white/10 hover:text-white">×</button>
      </div>
      {item.media_type === 'image' && item.image ? <img src={item.image} alt={item.event_title} className="max-h-[70vh] w-full bg-black object-contain" /> : player ? <div className="aspect-video bg-black"><iframe title={item.event_title} src={player} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /></div> : <div className="p-8 text-center text-sm text-white/70">{sw ? 'Video hii haiwezi kuchezwa ndani ya tovuti. Tumia link hapa chini.' : 'This video cannot be embedded here. Use the original link below.'}<br /><a href={item.video_url} target="_blank" rel="noreferrer" className="mt-3 inline-block break-all text-amber-300 underline">{item.video_url}</a></div>}
      {item.description && <div className="p-4 text-sm leading-6 text-white/65 md:p-5">{item.description}</div>}
    </div>
  </div>
}
