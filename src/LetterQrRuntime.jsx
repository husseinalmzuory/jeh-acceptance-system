import { useEffect } from 'react'
import './letter-qr.css'

const QR_MODULE_URL = 'https://cdn.jsdelivr.net/npm/qrcode-generator@2.0.4/+esm'

function buildVerificationUrl(acceptanceNumber) {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('verification', '1')
  url.searchParams.set('number', acceptanceNumber)
  return url.toString()
}

function shortVerificationUrl(acceptanceNumber) {
  return `husseinalmzuory.github.io/jeh-acceptance-system/?verification=1&number=${encodeURIComponent(acceptanceNumber)}`
}

function findAcceptanceNumber(letter) {
  const firstMetaBlock = letter.querySelector('.letter-meta > div')
  const numberNode = firstMetaBlock?.querySelector('span[dir="ltr"]')
  return numberNode?.textContent?.trim() ?? ''
}

function extractContactValue(contact, label, fallback) {
  const span = [...contact.querySelectorAll(':scope > span')]
    .find((node) => node.textContent?.includes(label))
  if (!span) return fallback
  const separatorIndex = span.textContent.indexOf(':')
  return separatorIndex >= 0 ? span.textContent.slice(separatorIndex + 1).trim() : fallback
}

function ensureContactIdentity(contact) {
  let identity = contact.querySelector('.letter-contact-identity')
  if (!identity) {
    identity = document.createElement('div')
    identity.className = 'letter-contact-identity'
    const title = contact.querySelector(':scope > strong')
    if (title) title.insertAdjacentElement('afterend', identity)
    else contact.prepend(identity)
  }
  return identity
}

function ensureQrContainer(letter) {
  const contact = letter.querySelector('.letter-contact')
  if (!contact) return null

  contact.classList.add('letter-contact--qr-layout')

  let container = contact.querySelector('.letter-qr-runtime')
  if (!container) {
    container = document.createElement('div')
    container.className = 'letter-qr-runtime'
    contact.appendChild(container)
  }
  return { container, contact }
}

export default function LetterQrRuntime() {
  useEffect(() => {
    let disposed = false
    let qrcodeFactory = null
    let loadingPromise = null
    let scheduled = false

    const loadFactory = async () => {
      if (qrcodeFactory) return qrcodeFactory
      if (!loadingPromise) {
        loadingPromise = import(/* @vite-ignore */ QR_MODULE_URL)
          .then((module) => module.default ?? module.qrcode ?? module)
          .catch(() => null)
      }
      qrcodeFactory = await loadingPromise
      return qrcodeFactory
    }

    const renderQr = async (letter) => {
      const acceptanceNumber = findAcceptanceNumber(letter)
      if (!acceptanceNumber) return

      const result = ensureQrContainer(letter)
      if (!result) return
      const { container, contact } = result
      const email = extractContactValue(contact, 'البريد الإلكتروني', 'mzuory@gmail.com')
      const phone = extractContactValue(contact, 'الهاتف', '+9647503496549')
      const identity = ensureContactIdentity(contact)
      identity.innerHTML = `
        <span class="letter-contact-email" dir="ltr">${email}</span>
        <span class="letter-contact-phone" dir="ltr">${phone}</span>
      `

      if (container.dataset.acceptanceNumber === acceptanceNumber) return
      container.dataset.acceptanceNumber = acceptanceNumber
      container.innerHTML = '<span class="letter-qr-loading">جارٍ تجهيز رمز التحقق...</span>'

      const factory = await loadFactory()
      if (disposed || !factory) {
        container.innerHTML = ''
        return
      }

      try {
        const verificationUrl = buildVerificationUrl(acceptanceNumber)
        const qr = factory(0, 'M')
        qr.addData(verificationUrl)
        qr.make()

        container.innerHTML = `
          <div class="letter-qr-image" aria-label="رمز QR للتحقق من القبول">${qr.createSvgTag({ cellSize: 2, margin: 0, scalable: true })}</div>
          <div class="letter-qr-copy">
            <strong>امسح الرمز للتحقق من صحة قبول النشر</strong>
            <span>أو أدخل الرابط للتحقق من صحة القبول:</span>
            <b class="letter-qr-url" dir="ltr">${shortVerificationUrl(acceptanceNumber)}</b>
          </div>
        `
      } catch {
        container.innerHTML = ''
      }
    }

    const renderAll = () => {
      scheduled = false
      document.querySelectorAll('.letter-preview').forEach((letter) => renderQr(letter))
    }

    const schedule = () => {
      if (scheduled) return
      scheduled = true
      window.requestAnimationFrame(renderAll)
    }

    schedule()
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      disposed = true
      observer.disconnect()
    }
  }, [])

  return null
}
