import { useEffect } from 'react'
import './revoked-letter.css'

function applyRevokedState() {
  const revoked = Boolean(document.querySelector('.details-status .status-revoked'))
  document.querySelectorAll('.letter-preview').forEach((letter) => {
    letter.classList.toggle('letter-preview--revoked', revoked)
    let watermark = letter.querySelector('.revoked-watermark')
    if (revoked && !watermark) {
      watermark = document.createElement('div')
      watermark.className = 'revoked-watermark'
      watermark.setAttribute('aria-label', 'القبول ملغى')
      watermark.textContent = 'ملغى'
      letter.appendChild(watermark)
    } else if (!revoked && watermark) {
      watermark.remove()
    }
  })
}

export default function RevokedLetterRuntime() {
  useEffect(() => {
    let scheduled = false
    const schedule = () => {
      if (scheduled) return
      scheduled = true
      window.requestAnimationFrame(() => {
        scheduled = false
        applyRevokedState()
      })
    }
    schedule()
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return null
}
