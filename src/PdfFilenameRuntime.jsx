import { useEffect } from 'react'

const MAX_TOTAL_LENGTH = 49
const EXTENSION = '.pdf'

function cleanPart(value) {
  return String(value ?? '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildFilename() {
  const letter = document.querySelector('.letter-preview')
  if (!letter) return null

  const researcher = cleanPart(letter.querySelector('.recipient-row strong')?.textContent)
  const title = cleanPart(letter.querySelector('.research-title:not(.research-title--english)')?.textContent)
  if (!researcher && !title) return null

  const joined = [researcher, title].filter(Boolean).join(' - ')
  const maxBaseLength = MAX_TOTAL_LENGTH - EXTENSION.length
  let base = joined.slice(0, maxBaseLength).trim()

  // Avoid ending the filename with punctuation or a dangling separator after truncation.
  base = base.replace(/[\s.\-_–—]+$/g, '').trim()
  if (!base) base = 'قبول نشر'

  return `${base.slice(0, maxBaseLength)}${EXTENSION}`
}

export default function PdfFilenameRuntime() {
  useEffect(() => {
    const originalClick = HTMLAnchorElement.prototype.click

    HTMLAnchorElement.prototype.click = function patchedClick(...args) {
      try {
        const currentDownload = this.getAttribute('download') || ''
        if (/\.pdf$/i.test(currentDownload)) {
          const filename = buildFilename()
          if (filename) this.setAttribute('download', filename)
        }
      } catch {
        // Keep the original download behavior if filename customization fails.
      }
      return originalClick.apply(this, args)
    }

    return () => {
      HTMLAnchorElement.prototype.click = originalClick
    }
  }, [])

  return null
}
