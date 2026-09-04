import { useEffect } from 'react'
import { supabase } from './lib/supabase'
import './signature-stamp.css'

function publicAssetUrl(path) {
  if (!path || !supabase) return ''
  const { data } = supabase.storage.from('journal-assets').getPublicUrl(path)
  return data?.publicUrl || ''
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

function applyAssets(signatureUrl, stampUrl) {
  document.querySelectorAll('.letter-preview').forEach((letter) => {
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
  })
}

export default function SignatureStampRuntime() {
  useEffect(() => {
    let active = true
    let signatureUrl = ''
    let stampUrl = ''
    let scheduled = false

    const applyAll = () => {
      scheduled = false
      applyAssets(signatureUrl, stampUrl)
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

    const handleChanged = (event) => {
      if (event.detail?.kind === 'signature') signatureUrl = event.detail.url || ''
      if (event.detail?.kind === 'stamp') stampUrl = event.detail.url || ''
      schedule()
    }

    const refreshAssets = () => load()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshAssets()
    }

    window.addEventListener('jeh-signature-stamp-changed', handleChanged)
    window.addEventListener('focus', refreshAssets)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      active = false
      observer.disconnect()
      window.removeEventListener('jeh-signature-stamp-changed', handleChanged)
      window.removeEventListener('focus', refreshAssets)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return null
}
