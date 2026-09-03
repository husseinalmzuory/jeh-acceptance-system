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
        schedule()
        return
      }
      const { data } = await supabase.from('settings').select('value').eq('key', 'journal').maybeSingle()
      if (!active) return
      currentUrl = resolveLogoUrl(data?.value?.logo_path)
      schedule()
    }

    load()
    schedule()
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })

    const handleLogoChanged = (event) => {
      currentUrl = event.detail?.url || fallbackLogo
      schedule()
    }
    window.addEventListener('jeh-logo-changed', handleLogoChanged)

    return () => {
      active = false
      observer.disconnect()
      window.removeEventListener('jeh-logo-changed', handleLogoChanged)
    }
  }, [])

  return null
}
