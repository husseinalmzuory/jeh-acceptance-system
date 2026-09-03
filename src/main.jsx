import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import VerificationPage from './VerificationPage.jsx'
import './styles.css'

const params = new URLSearchParams(window.location.search)
const verificationToken = params.get('verify')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {verificationToken ? <VerificationPage token={verificationToken} /> : <App />}
  </StrictMode>,
)
