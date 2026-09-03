import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import VerificationPage from './VerificationPage.jsx'
import AdminArchiveActions from './AdminArchiveActions.jsx'
import AdminQuickAccess from './AdminQuickAccess.jsx'
import AdminToolsGate from './AdminToolsGate.jsx'
import AccountSecurityPanel from './AccountSecurityPanel.jsx'
import AdvancedArchiveGate from './AdvancedArchiveGate.jsx'
import AttachmentManagerRuntime from './AttachmentManagerRuntime.jsx'
import LetterSettingsRuntime from './LetterSettingsRuntime.jsx'
import LetterQrRuntime from './LetterQrRuntime.jsx'
import JournalLogoRuntime from './JournalLogoRuntime.jsx'
import LogoSettingsPanel from './LogoSettingsPanel.jsx'
import ProductionRuntime from './ProductionRuntime.jsx'
import RevokedLetterRuntime from './RevokedLetterRuntime.jsx'
import './styles.css'
import './letter-verification.css'

const params = new URLSearchParams(window.location.search)
const verificationToken = params.get('verify')
const showVerificationPortal = params.has('verification')
const showAdminTools = params.has('admin')
const showAdvancedArchive = params.has('advancedArchive')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {verificationToken || showVerificationPortal ? (
      <VerificationPage token={verificationToken} />
    ) : showAdvancedArchive ? (
      <>
        <AdvancedArchiveGate />
        <AttachmentManagerRuntime />
      </>
    ) : showAdminTools ? (
      <>
        <AdminToolsGate />
        <AccountSecurityPanel />
        <LogoSettingsPanel />
      </>
    ) : (
      <>
        <App />
        <AdminArchiveActions />
        <AdminQuickAccess />
        <LetterSettingsRuntime />
        <JournalLogoRuntime />
        <LetterQrRuntime />
        <ProductionRuntime />
        <RevokedLetterRuntime />
      </>
    )}
  </StrictMode>,
)
