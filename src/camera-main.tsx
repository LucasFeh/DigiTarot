import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './lib/AuthProvider'
import AppCameraPage from './pages/AppCameraPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider><AppCameraPage /></AuthProvider>
  </StrictMode>,
)
