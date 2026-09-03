import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import VerificationPage from './VerificationPage.jsx'
import AdminArchiveActions from './AdminArchiveActions.jsx'
import './styles.css'
import './letter-verification.css'

const params = new URLSearchParams(window.location.search)
const verificationToken = params.get('verify')
const showVerificationPortal = params.has('verification')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {verificationToken || showVerificationPortal ? (
      <VerificationPage token={verificationToken} />
    ) : (
      <>
        <App />
        <AdminArchiveActions />
      </>
    )}
  </StrictMode>,
)
