import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { SiteSettingsProvider } from './context/SiteSettingsContext.jsx'
import { BackgroundImagesProvider } from './context/BackgroundImagesContext.jsx'
import './i18n.js'
import './index.css'

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
