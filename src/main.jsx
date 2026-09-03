import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import VerificationPage from './VerificationPage.jsx'
import AdminArchiveActions from './AdminArchiveActions.jsx'
import AdminQuickAccess from './AdminQuickAccess.jsx'
import AdminToolsGate from './AdminToolsGate.jsx'
import LetterSettingsRuntime from './LetterSettingsRuntime.jsx'
import './styles.css'
import './letter-verification.css'

const params = new URLSearchParams(window.location.search)
const verificationToken = params.get('verify')
const showVerificationPortal = params.has('verification')
const showAdminTools = params.has('admin')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {verificationToken || showVerificationPortal ? (
      <VerificationPage token={verificationToken} />
    ) : showAdminTools ? (
      <AdminToolsGate />
    ) : (
      <>
        <App />
        <AdminArchiveActions />
        <AdminQuickAccess />
        <LetterSettingsRuntime />
      </>
    )}
  </StrictMode>,
)
