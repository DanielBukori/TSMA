import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { SiteSettingsProvider } from './context/SiteSettingsContext.jsx'
import { BackgroundImagesProvider } from './context/BackgroundImagesContext.jsx'
import './i18n.js'
import './index.css'

function ScrollRevealObserver() {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('[data-reveal]').forEach((target) => target.classList.add('is-revealed'))
      return undefined
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' })
    const observeTargets = (root) => {
      if (root.matches?.('[data-reveal]')) observer.observe(root)
      root.querySelectorAll?.('[data-reveal]').forEach((target) => observer.observe(target))
    }
    observeTargets(document)
    // Observe cards/sections inserted after API requests finish (news and board members).
    const mutations = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) observeTargets(node)
      }))
    })
    mutations.observe(document.getElementById('root'), { childList: true, subtree: true })
    return () => { observer.disconnect(); mutations.disconnect() }
  }, [])
  return null
}

// Baada ya deploy mpya, kichupo kilichofunguliwa kabla kinaweza kuomba faili (chunk) za zamani
// ambazo hazipo tena -> skrini nyeupe. Tunapakia upya mara moja ili kupata toleo jipya.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  if (!sessionStorage.getItem('tsma:chunk-reload')) {
    sessionStorage.setItem('tsma:chunk-reload', '1')
    window.location.reload()
  }
})
setTimeout(() => sessionStorage.removeItem('tsma:chunk-reload'), 15000)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ScrollRevealObserver />
    <SiteSettingsProvider>
      <BackgroundImagesProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BackgroundImagesProvider>
    </SiteSettingsProvider>
  </React.StrictMode>,
)
