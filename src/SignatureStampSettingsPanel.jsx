import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LoaderCircle, PenTool, RotateCcw, Stamp, Upload } from 'lucide-react'
import { supabase } from './lib/supabase'
import './signature-stamp-settings.css'

const MAX_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

function publicAssetUrl(path) {
  if (!path || !supabase) return ''
  const { data } = supabase.storage.from('journal-assets').getPublicUrl(path)
  return data?.publicUrl || ''
}

function extensionFor(file) {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

function AssetControl({
  kind,
  title,
  description,
  icon: Icon,
  path,
  setPath,
  rpcSet,
  folder,
}) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const previewUrl = publicAssetUrl(path)

  const notify = (url) => {
    window.dispatchEvent(new CustomEvent('jeh-signature-stamp-changed', {
      detail: { kind, url },
    }))
  }

  const upload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !supabase) return

    setMessage('')
    if (!ALLOWED_TYPES.includes(file.type)) {
      setMessage('اختر صورة PNG أو JPG أو WebP فقط.')
      return
    }
    if (file.size > MAX_SIZE) {
      setMessage('حجم الصورة يجب ألا يتجاوز 2 MB.')
      return
    }

    setUploading(true)
    const newPath = `${folder}/${kind}-${Date.now()}.${extensionFor(file)}`
    const { error: uploadError } = await supabase.storage
      .from('journal-assets')
      .upload(newPath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      setMessage('تعذر رفع الصورة. تأكد من تنفيذ ملف SQL الجديد في Supabase.')
      setUploading(false)
      return
    }

    const { error: saveError } = await supabase.rpc(rpcSet, { p_path: newPath })
    if (saveError) {
      await supabase.storage.from('journal-assets').remove([newPath])
      setMessage('تم رفع الصورة لكن تعذر اعتمادها في الإعدادات.')
      setUploading(false)
      return
    }

    const previousPath = path
    setPath(newPath)
    const url = `${publicAssetUrl(newPath)}?v=${Date.now()}`
    notify(url)
    if (previousPath && previousPath !== newPath) {
      await supabase.storage.from('journal-assets').remove([previousPath])
    }
    setMessage('تم الحفظ بنجاح. ستظهر الصورة تلقائيًا في كتب القبول.')
    setUploading(false)
  }

  const remove = async () => {
    if (!path || !supabase) return
    setUploading(true)
    setMessage('')
    const previousPath = path
    const { error } = await supabase.rpc(rpcSet, { p_path: null })
    if (error) {
      setMessage('تعذر حذف الصورة من الإعدادات.')
      setUploading(false)
      return
    }
    setPath('')
    notify('')
    await supabase.storage.from('journal-assets').remove([previousPath])
    setMessage('تم حذف الصورة من كتب القبول.')
    setUploading(false)
  }

  return (
    <div className="signature-stamp-setting">
      <div className="signature-stamp-setting__heading">
        <Icon size={21} />
        <div><h3>{title}</h3><p>{description}</p></div>
      </div>

      <div className="signature-stamp-setting__body">
        <div className="signature-stamp-setting__preview">
          {previewUrl ? <img src={previewUrl} alt={title} /> : <span>لم تُرفع صورة بعد</span>}
        </div>
        <div className="signature-stamp-setting__controls">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={upload}
            hidden
          />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <LoaderCircle className="spin" size={18} /> : <Upload size={18} />}
            {uploading ? 'جارٍ الحفظ...' : path ? 'استبدال الصورة' : 'اختيار صورة من الكمبيوتر'}
          </button>
          {path && (
            <button className="signature-stamp-remove" type="button" onClick={remove} disabled={uploading}>
              <RotateCcw size={17} /> حذف الصورة
            </button>
          )}
          <small>تُستخدم الصورة في القبول بحجمها الأصلي دون فرض عرض أو ارتفاع عليها.</small>
        </div>
      </div>
      {message && <div className="signature-stamp-setting__message">{message}</div>}
    </div>
  )
}

export default function SignatureStampSettingsPanel() {
  const [target, setTarget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signaturePath, setSignaturePath] = useState('')
  const [stampPath, setStampPath] = useState('')

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
      const [signatureResult, stampResult] = await Promise.all([
        supabase.rpc('get_editor_signature_path'),
        supabase.rpc('get_journal_stamp_path'),
      ])
      if (!active) return
      setSignaturePath(signatureResult.error ? '' : (signatureResult.data ?? ''))
      setStampPath(stampResult.error ? '' : (stampResult.data ?? ''))
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  if (!target) return null

  const content = (
    <section className="admin-tools-card signature-stamp-settings-card" dir="rtl">
      <div className="admin-tools-card-heading">
        <Stamp size={22} />
        <div>
          <h2>الختم وتوقيع رئيس هيئة التحرير</h2>
          <p>ارفع الصور كما أعددتها؛ المنظومة لا تغيّر أبعادها عند إدراجها في كتاب القبول.</p>
        </div>
      </div>

      {loading ? (
        <div className="signature-stamp-loading"><LoaderCircle className="spin" size={21} /> جارٍ تحميل الإعدادات...</div>
      ) : (
        <div className="signature-stamp-settings-list">
          <AssetControl
            kind="signature"
            title="توقيع رئيس هيئة التحرير"
            description="يظهر فوق اسم أ.د. إبراهيم محمد محمود الحمداني."
            icon={PenTool}
            path={signaturePath}
            setPath={setSignaturePath}
            rpcSet="set_editor_signature"
            folder="signatures"
          />
          <AssetControl
            kind="stamp"
            title="الختم الرسمي"
            description="يظهر في منتصف المسافة بين تواريخ الاستلام/المراجعة/القبول واسم رئيس هيئة التحرير."
            icon={Stamp}
            path={stampPath}
            setPath={setStampPath}
            rpcSet="set_journal_stamp"
            folder="stamps"
          />
        </div>
      )}
    </section>
  )

  return createPortal(content, target)
}
