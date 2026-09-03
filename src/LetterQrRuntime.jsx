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

function findAcceptanceNumber(letter) {
  const firstMetaBlock = letter.querySelector('.letter-meta > div')
  const numberNode = firstMetaBlock?.querySelector('span[dir="ltr"]')
  return numberNode?.textContent?.trim() ?? ''
}

function ensureQrContainer(letter) {
  const contact = letter.querySelector('.letter-contact')
  if (!contact) return null
  let container = contact.querySelector('.letter-qr-runtime')
  if (!container) {
    container = document.createElement('div')
    container.className = 'letter-qr-runtime'
    contact.appendChild(container)
  }
  return container
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
      const container = ensureQrContainer(letter)
      if (!container || container.dataset.acceptanceNumber === acceptanceNumber) return

      container.dataset.acceptanceNumber = acceptanceNumber
      container.innerHTML = '<span class="letter-qr-loading">جارٍ تجهيز رمز التحقق...</span>'

      const factory = await loadFactory()
      if (disposed || !factory) {
        if (container) container.innerHTML = ''
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
            <strong>التحقق الإلكتروني</strong>
            <span>امسح الرمز للتحقق من صحة كتاب القبول</span>
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
