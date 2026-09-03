import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ImagePlus, LoaderCircle, RotateCcw, Upload } from 'lucide-react'
import { supabase } from './lib/supabase'
import './logo-settings.css'

const MAX_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const fallbackLogo = `${import.meta.env.BASE_URL}jeh-official-logo.png`

function publicLogoUrl(path) {
  if (!path || !supabase) return fallbackLogo
  const { data } = supabase.storage.from('journal-assets').getPublicUrl(path)
  return data?.publicUrl || fallbackLogo
}

export default function LogoSettingsPanel() {
  const inputRef = useRef(null)
  const [target, setTarget] = useState(null)
  const [logoPath, setLogoPath] = useState('')
  const [previewUrl, setPreviewUrl] = useState(fallbackLogo)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const locate = () => setTarget(document.querySelector('.admin-tools-shell'))
    locate()
    const observer = new MutationObserver(locate)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!supabase) return
      const { data } = await supabase.from('settings').select('value').eq('key', 'journal').maybeSingle()
      if (!active) return
      const path = data?.value?.logo_path ?? ''
      setLogoPath(path)
      setPreviewUrl(publicLogoUrl(path))
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  const status = useMemo(() => logoPath ? 'شعار مخصص مرفوع إلى Supabase' : 'الشعار الافتراضي للمجلة', [logoPath])
  const chooseFile = () => inputRef.current?.click()

  const uploadLogo = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !supabase) return

    setMessage('')
    if (!ALLOWED_TYPES.includes(file.type)) {
      setMessage('اختر صورة PNG أو JPG أو WebP فقط.')
      return
    }
    if (file.size > MAX_SIZE) {
      setMessage('حجم الشعار يجب ألا يتجاوز 2 MB.')
      return
    }

    setUploading(true)
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `logos/journal-logo-${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('journal-assets')
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })

    if (uploadError) {
      setMessage('تعذر رفع الشعار. تأكد من تنفيذ آخر ملف SQL في Supabase.')
      setUploading(false)
      return
    }

    const { error: saveError } = await supabase.rpc('set_journal_logo', { p_logo_path: path })
    if (saveError) {
      await supabase.storage.from('journal-assets').remove([path])
      setMessage('تم رفع الصورة لكن تعذر اعتمادها كشعار.')
      setUploading(false)
      return
    }

    const previousPath = logoPath
    const url = publicLogoUrl(path)
    const freshUrl = `${url}?v=${Date.now()}`
    setLogoPath(path)
    setPreviewUrl(freshUrl)
    setMessage('تم استبدال الشعار بنجاح. سيظهر تلقائيًا في كتب القبول.')
    window.dispatchEvent(new CustomEvent('jeh-logo-changed', { detail: { url: freshUrl } }))

    if (previousPath && previousPath !== path) {
      await supabase.storage.from('journal-assets').remove([previousPath])
    }
    setUploading(false)
  }

  const restoreDefault = async () => {
    if (!logoPath || !supabase) return
    setUploading(true)
    setMessage('')
    const previousPath = logoPath
    const { error } = await supabase.rpc('set_journal_logo', { p_logo_path: null })
    if (error) {
      setMessage('تعذر استعادة الشعار الافتراضي.')
      setUploading(false)
      return
    }
    setLogoPath('')
    setPreviewUrl(fallbackLogo)
    window.dispatchEvent(new CustomEvent('jeh-logo-changed', { detail: { url: fallbackLogo } }))
    await supabase.storage.from('journal-assets').remove([previousPath])
    setMessage('تمت استعادة الشعار الافتراضي.')
    setUploading(false)
  }

  if (!target) return null

  const content = loading ? (
    <section className="admin-tools-card logo-settings-card">
      <div className="logo-settings-loading"><LoaderCircle className="spin" size={22} /> جارٍ تحميل إعداد الشعار...</div>
    </section>
  ) : (
    <section className="admin-tools-card logo-settings-card" dir="rtl">
      <div className="admin-tools-card-heading">
        <ImagePlus size={22} />
        <div><h2>شعار كتاب القبول</h2><p>يمكن اختيار صورة من الكمبيوتر واستبدال الشعار الحالي دون تعديل الكود.</p></div>
      </div>

      <div className="logo-settings-layout">
        <div className="logo-settings-preview">
          <img src={previewUrl} alt="الشعار الحالي لكتاب القبول" />
          <span>{status}</span>
        </div>
        <div className="logo-settings-controls">
          <input ref={inputRef} className="logo-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} />
          <button type="button" onClick={chooseFile} disabled={uploading}>
            {uploading ? <LoaderCircle className="spin" size={19} /> : <Upload size={19} />}
            {uploading ? 'جارٍ رفع الشعار...' : 'اختيار شعار من الكمبيوتر'}
          </button>
          {logoPath && (
            <button className="logo-default-button" type="button" onClick={restoreDefault} disabled={uploading}>
              <RotateCcw size={18} /> استعادة الشعار الافتراضي
            </button>
          )}
          <small>الأنواع المقبولة: PNG / JPG / WebP — الحد الأقصى 2 MB.</small>
        </div>
      </div>
      {message && <div className="logo-settings-message">{message}</div>}
    </section>
  )

  return createPortal(content, target)
}
