import { useEffect, useState } from 'react'
import apiClient from '../api/client.js'

/**
 * UserAvatar.jsx — picha ya mtumiaji (duara) kwa Navbar.
 * - useProfilePhoto: user.photo (kama ipo) au /members/me/profile/ mara moja;
 *   inasikiliza tukio 'tsma:profile-updated' kutoka Dashboard.
 * - UserAvatar: picha, au herufi za jina kama picha haipo/haipakiki.
 */

function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function useProfilePhoto(user) {
  const [photo, setPhoto] = useState(user?.photo || user?.avatar || null)

  useEffect(() => {
    if (!user) {
      setPhoto(null)
      return undefined
    }
    let cancelled = false
    const fromUser = user.photo || user.avatar
    if (fromUser) {
      setPhoto(fromUser)
    } else {
      apiClient
        .get('/members/me/profile/')
        .then((res) => {
          if (!cancelled) setPhoto(res.data?.photo || null)
        })
        .catch(() => {})
    }
    function onUpdated(e) {
      setPhoto(e.detail?.photo || null)
    }
    window.addEventListener('tsma:profile-updated', onUpdated)
    return () => {
      cancelled = true
      window.removeEventListener('tsma:profile-updated', onUpdated)
    }
  }, [user])

  return photo
}

export default function UserAvatar({ src, name, size = 28 }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [src])

  const box = { width: size, height: size }
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        style={box}
        onError={() => setFailed(true)}
        className="rounded-full object-cover ring-2 ring-gold shrink-0 bg-cream"
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...box, fontSize: Math.round(size * 0.4) }}
      className="rounded-full ring-2 ring-gold shrink-0 flex items-center justify-center bg-gradient-to-br from-navy to-green text-white font-serif font-bold"
    >
      {initialsOf(name)}
    </span>
  )
}
