import { useEffect } from 'react'
import { supabase } from './lib/supabase'

const fallbackLogo = `${import.meta.env.BASE_URL}jeh-official-logo.png`

function resolveLogoUrl(path) {
  if (!path || !supabase) return fallbackLogo
  const { data } = supabase.storage.from('journal-assets').getPublicUrl(path)
  return data?.publicUrl || fallbackLogo
}

function applyLogo(url) {
  document.querySelectorAll('.letter-logo').forEach((image) => {
    if (image.src !== url) image.src = url
  })
}

export default function JournalLogoRuntime() {
  useEffect(() => {
    let active = true
    let currentUrl = fallbackLogo
    let scheduled = false

    const applyAll = () => {
      scheduled = false
      applyLogo(currentUrl)
    }

    const schedule = () => {
      if (scheduled) return
      scheduled = true
      window.requestAnimationFrame(applyAll)
    }

    const load = async () => {
      if (!supabase) {
        currentUrl = fallbackLogo
        schedule()
        return
      }

      const { data, error } = await supabase.rpc('get_journal_logo_path')
      if (!active) return
      currentUrl = error ? fallbackLogo : resolveLogoUrl(data)
      schedule()
    }

    load()
    schedule()

    const observer = new MutationObserver((mutations) => {
      const relevant = mutations.some((mutation) => (
        mutation.type === 'childList'
        || (mutation.type === 'attributes' && mutation.target?.classList?.contains('letter-logo'))
      ))
      if (relevant) schedule()
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    })

    const handleLogoChanged = (event) => {
      currentUrl = event.detail?.url || fallbackLogo
      schedule()
    }
    window.addEventListener('jeh-logo-changed', handleLogoChanged)

    const refreshLogo = () => load()
    window.addEventListener('focus', refreshLogo)
    document.addEventListener('visibilitychange', refreshLogo)

    return () => {
      active = false
      observer.disconnect()
      window.removeEventListener('jeh-logo-changed', handleLogoChanged)
      window.removeEventListener('focus', refreshLogo)
      document.removeEventListener('visibilitychange', refreshLogo)
    }
  }, [])

  return null
}
