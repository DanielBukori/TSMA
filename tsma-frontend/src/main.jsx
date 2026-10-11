import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { SiteSettingsProvider } from './context/SiteSettingsContext.jsx'
import { BackgroundImagesProvider } from './context/BackgroundImagesContext.jsx'
import './i18n.js'
import './index.css'

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
    <SiteSettingsProvider>
      <BackgroundImagesProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BackgroundImagesProvider>
    </SiteSettingsProvider>
  </React.StrictMode>,
)
