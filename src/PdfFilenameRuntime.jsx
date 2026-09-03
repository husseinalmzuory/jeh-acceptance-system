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
  const letters = [...document.querySelectorAll('.letter-preview')]
  const letter = letters.find((item) => item.offsetParent !== null) ?? letters.at(-1)
  if (!letter) return null

  const researcher = cleanPart(letter.querySelector('.recipient-row strong')?.textContent)
  const title = cleanPart(letter.querySelector('.research-title:not(.research-title--english)')?.textContent)
  if (!researcher && !title) return null

  const joined = [researcher, title].filter(Boolean).join(' - ')
  const maxBaseLength = MAX_TOTAL_LENGTH - EXTENSION.length
  let base = joined.slice(0, maxBaseLength).trim()
  base = base.replace(/[\s.\-_–—]+$/g, '').trim()
  if (!base) base = 'قبول نشر'

  return `${base.slice(0, maxBaseLength)}${EXTENSION}`
}

export default function PdfFilenameRuntime() {
  useEffect(() => {
    let active = true
    let restore = null

    const patch = async () => {
      try {
        const { jsPDF } = await import('jspdf')
        if (!active || !jsPDF?.API?.save || jsPDF.API.save.__jehFilenamePatched) return

        const originalSave = jsPDF.API.save
        function patchedSave(filename, options) {
          const customFilename = buildFilename()
          return originalSave.call(this, customFilename || filename, options)
        }
        patchedSave.__jehFilenamePatched = true
        jsPDF.API.save = patchedSave

        restore = () => {
          if (jsPDF.API.save === patchedSave) jsPDF.API.save = originalSave
        }
      } catch {
        // If jsPDF cannot be preloaded, the normal PDF flow remains untouched.
      }
    }

    patch()

    return () => {
      active = false
      restore?.()
    }
  }, [])

  return null
}
