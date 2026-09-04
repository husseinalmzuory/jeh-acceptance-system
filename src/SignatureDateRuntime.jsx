import { useEffect } from 'react'

function syncSignatureDates() {
  document.querySelectorAll('.letter-preview').forEach((letter) => {
    const signature = letter.querySelector('.letter-signature')
    const dates = letter.querySelectorAll('.letter-dates span')
    if (!signature || dates.length < 3) return

    const acceptedText = dates[2]?.textContent ?? ''
    const acceptedDate = acceptedText.replace(/^.*?:\s*/, '').trim()
    if (!acceptedDate || acceptedDate === '—') return

    let dateNode = signature.querySelector('.letter-signature-date')
    if (!dateNode) {
      dateNode = document.createElement('span')
      dateNode.className = 'letter-signature-date'
      dateNode.style.fontSize = '12px'
      dateNode.style.fontWeight = '600'
      dateNode.style.marginTop = '2px'
      dateNode.style.direction = 'ltr'
      signature.appendChild(dateNode)
    }
    dateNode.textContent = acceptedDate
  })
}

export default function SignatureDateRuntime() {
  useEffect(() => {
    syncSignatureDates()
    const observer = new MutationObserver(syncSignatureDates)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [])

  return null
}
