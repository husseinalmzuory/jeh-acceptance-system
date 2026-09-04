import { useEffect } from 'react'
import { supabase } from './lib/supabase'
import './signature-stamp.css'

const OPTIONS_STORAGE_KEY = 'jeh-research-flags-draft'

function publicAssetUrl(path) {
  if (!path || !supabase) return ''
  const { data } = supabase.storage.from('journal-assets').getPublicUrl(path)
  return data?.publicUrl || ''
}

function readStoredOptions() {
  try {
    return JSON.parse(sessionStorage.getItem(OPTIONS_STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

function acceptanceNumberFromLetter(letter) {
  return letter
    ?.querySelector('.letter-meta > div:first-child span[dir="ltr"]')
    ?.textContent
    ?.trim() || ''
}

function ensureImage(container, className, alt, url, beforeNode = null) {
  if (!container) return
  let image = container.querySelector(`.${className}`)

  if (!url) {
    image?.remove()
    return
  }

  if (!image) {
    image = document.createElement('img')
    image.className = className
    image.alt = alt
    image.decoding = 'async'
    if (beforeNode) container.insertBefore(image, beforeNode)
    else container.appendChild(image)
  }

  if (image.src !== url) image.src = url
}

function removeAssets(letter) {
  letter?.querySelector('.editor-signature-image')?.remove()
  letter?.querySelector('.journal-stamp-image')?.remove()
}

function applyAssetsToLetter(letter, signatureUrl, stampUrl, enabled) {
  if (!enabled) {
    removeAssets(letter)
    return
  }

  const signatureBlock = letter.querySelector('.letter-signature')
  const editorName = signatureBlock?.querySelector('strong') ?? null

  ensureImage(
    signatureBlock,
    'editor-signature-image',
    'توقيع رئيس هيئة التحرير',
    signatureUrl,
    editorName,
  )

  const footer = letter.querySelector('.letter-footer')
  ensureImage(
    footer,
    'journal-stamp-image',
    'ختم المجلة الرسمي',
    stampUrl,
  )
}

export default function SignatureStampRuntime() {
  useEffect(() => {
    let active = true
    let signatureUrl = ''
    let stampUrl = ''
    let scheduled = false
    const choiceCache = new Map()

    const resolveEnabled = async (letter) => {
      const acceptanceNumber = acceptanceNumberFromLetter(letter)
      const stored = readStoredOptions()

      // New/edit preview: the form choice takes priority so the preview and PDF
      // immediately reflect the user's selection before the record is saved.
      if (
        stored &&
        stored.acceptanceNumber === acceptanceNumber &&
        typeof stored.includeSignatureStamp === 'boolean'
      ) {
        return stored.includeSignatureStamp
      }

      if (!acceptanceNumber || !supabase) return true
      if (choiceCache.has(acceptanceNumber)) return choiceCache.get(acceptanceNumber)

      const { data, error } = await supabase
        .from('acceptances')
        .select('include_signature_stamp')
        .eq('acceptance_number', acceptanceNumber)
        .maybeSingle()

      const enabled = error || !data ? true : data.include_signature_stamp !== false
      choiceCache.set(acceptanceNumber, enabled)
      return enabled
    }

    const applyAll = async () => {
      scheduled = false
      const letters = [...document.querySelectorAll('.letter-preview')]
      await Promise.all(letters.map(async (letter) => {
        const enabled = await resolveEnabled(letter)
        if (!active) return
        applyAssetsToLetter(letter, signatureUrl, stampUrl, enabled)
      }))
    }

    const schedule = () => {
      if (scheduled) return
      scheduled = true
      window.requestAnimationFrame(applyAll)
    }

    const load = async () => {
      if (!supabase) return
      const [signatureResult, stampResult] = await Promise.all([
        supabase.rpc('get_editor_signature_path'),
        supabase.rpc('get_journal_stamp_path'),
      ])
      if (!active) return

      const cacheBust = `v=${Date.now()}`
      const signaturePath = signatureResult.error ? '' : signatureResult.data
      const stampPath = stampResult.error ? '' : stampResult.data

      signatureUrl = signaturePath
        ? `${publicAssetUrl(signaturePath)}?${cacheBust}`
        : ''
      stampUrl = stampPath
        ? `${publicAssetUrl(stampPath)}?${cacheBust}`
        : ''

      schedule()
    }

    load()
    schedule()

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.type === 'childList')) schedule()
    })
    observer.observe(document.body, { childList: true, subtree: true })

    const handleAssetChanged = (event) => {
      if (event.detail?.kind === 'signature') signatureUrl = event.detail.url || ''
      if (event.detail?.kind === 'stamp') stampUrl = event.detail.url || ''
      schedule()
    }

    const handleOptionsChanged = (event) => {
      const number = event.detail?.acceptanceNumber
      if (number && typeof event.detail?.includeSignatureStamp === 'boolean') {
        choiceCache.set(number, event.detail.includeSignatureStamp)
      }
      schedule()
    }

    const refreshAssets = () => {
      choiceCache.clear()
      load()
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshAssets()
    }

    window.addEventListener('jeh-signature-stamp-changed', handleAssetChanged)
    window.addEventListener('jeh-acceptance-options-changed', handleOptionsChanged)
    window.addEventListener('focus', refreshAssets)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      active = false
      observer.disconnect()
      window.removeEventListener('jeh-signature-stamp-changed', handleAssetChanged)
      window.removeEventListener('jeh-acceptance-options-changed', handleOptionsChanged)
      window.removeEventListener('focus', refreshAssets)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return null
}
