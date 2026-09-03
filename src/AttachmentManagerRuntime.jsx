import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, FileUp, LoaderCircle, Paperclip, Trash2 } from 'lucide-react'
import { supabase } from './lib/supabase'
import './attachment-manager.css'

const MAX_FILE_SIZE = 25 * 1024 * 1024

function formatSize(bytes) {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function safeStorageName(name) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-120) || 'attachment'
}

export default function AttachmentManagerRuntime() {
  const [target, setTarget] = useState(null)
  const [acceptance, setAcceptance] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState('')
  const currentNumber = useRef('')
  const fileInputRef = useRef(null)

  const loadAttachments = async (acceptanceId) => {
    const { data, error } = await supabase
      .from('attachments')
      .select('id, file_name, storage_path, mime_type, file_size_bytes, description, created_at')
      .eq('acceptance_id', acceptanceId)
      .order('created_at', { ascending: false })
    if (error) setNotice('تعذر تحميل المرفقات.')
    setAttachments(data ?? [])
  }

  useEffect(() => {
    let active = true
    let scheduled = false

    const locate = async () => {
      scheduled = false
      const modal = document.querySelector('.advanced-modal')
      const number = modal?.querySelector('.advanced-modal-title h2')?.textContent?.trim() ?? ''
      setTarget(modal)

      if (!modal || !number || number === currentNumber.current) return
      currentNumber.current = number
      setLoading(true)
      setNotice('')
      const { data, error } = await supabase
        .from('acceptances')
        .select('id, acceptance_number')
        .eq('acceptance_number', number)
        .maybeSingle()
      if (!active) return
      if (error || !data) {
        setAcceptance(null)
        setAttachments([])
        setNotice('تعذر ربط المرفقات بهذا القبول.')
        setLoading(false)
        return
      }
      setAcceptance(data)
      await loadAttachments(data.id)
      if (active) setLoading(false)
    }

    const schedule = () => {
      if (scheduled) return
      scheduled = true
      window.requestAnimationFrame(locate)
    }

    schedule()
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      active = false
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!target) {
      currentNumber.current = ''
      setAcceptance(null)
      setAttachments([])
      setNotice('')
    }
  }, [target])

  const upload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !acceptance?.id) return
    if (file.size > MAX_FILE_SIZE) {
      setNotice('حجم الملف يتجاوز الحد الأقصى المسموح وهو 25 MB.')
      return
    }

    setLoading(true)
    setNotice('')
    const storagePath = `${acceptance.id}/${crypto.randomUUID()}-${safeStorageName(file.name)}`
    const { error: storageError } = await supabase.storage
      .from('acceptance-attachments')
      .upload(storagePath, file, { contentType: file.type || undefined, upsert: false })

    if (storageError) {
      setNotice('تعذر رفع المرفق إلى التخزين.')
      setLoading(false)
      return
    }

    const { error: recordError } = await supabase.from('attachments').insert({
      acceptance_id: acceptance.id,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      file_size_bytes: file.size,
    })

    if (recordError) {
      await supabase.storage.from('acceptance-attachments').remove([storagePath])
      setNotice('تم إيقاف الرفع لأن بيانات المرفق لم تُحفظ بشكل صحيح.')
      setLoading(false)
      return
    }

    await loadAttachments(acceptance.id)
    setNotice('تم رفع المرفق وحفظه مع القبول.')
    setLoading(false)
  }

  const openAttachment = async (attachment) => {
    setBusyId(attachment.id)
    setNotice('')
    const { data, error } = await supabase.storage
      .from('acceptance-attachments')
      .createSignedUrl(attachment.storage_path, 60)
    if (error || !data?.signedUrl) {
      setNotice('تعذر إنشاء رابط آمن للمرفق.')
    } else {
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    }
    setBusyId(null)
  }

  const removeAttachment = async (attachment) => {
    if (!acceptance?.id) return
    const approved = window.confirm(`حذف المرفق «${attachment.file_name}»؟`)
    if (!approved) return

    setBusyId(attachment.id)
    setNotice('')
    const { error: dbError } = await supabase.from('attachments').delete().eq('id', attachment.id)
    if (dbError) {
      setNotice('تعذر حذف سجل المرفق.')
      setBusyId(null)
      return
    }

    const { error: storageError } = await supabase.storage
      .from('acceptance-attachments')
      .remove([attachment.storage_path])
    await loadAttachments(acceptance.id)
    setNotice(storageError ? 'حُذف المرفق من السجل، لكن تعذر تنظيف الملف من التخزين.' : 'تم حذف المرفق.')
    setBusyId(null)
  }

  if (!target || !acceptance) return null

  return createPortal(
    <section className="attachment-manager">
      <div className="attachment-heading">
        <div><Paperclip size={20} /><div><h3>المرفقات الداخلية</h3><p>ملفات خاصة بحساب المجلة ولا تظهر في صفحة التحقق العامة.</p></div></div>
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading}>
          {loading ? <LoaderCircle className="spin" size={18} /> : <FileUp size={18} />}
          رفع مرفق
        </button>
        <input ref={fileInputRef} type="file" hidden onChange={upload} />
      </div>

      {notice && <div className="attachment-notice">{notice}</div>}

      {loading && attachments.length === 0 ? (
        <div className="attachment-empty"><LoaderCircle className="spin" size={22} /> جارٍ تحميل المرفقات...</div>
      ) : attachments.length === 0 ? (
        <div className="attachment-empty">لا توجد مرفقات لهذا القبول.</div>
      ) : (
        <div className="attachment-list">
          {attachments.map((attachment) => (
            <article key={attachment.id}>
              <div className="attachment-file"><Paperclip size={17} /><div><strong>{attachment.file_name}</strong><span>{formatSize(attachment.file_size_bytes)} · {formatDate(attachment.created_at)}</span></div></div>
              <div className="attachment-actions">
                <button type="button" onClick={() => openAttachment(attachment)} disabled={busyId === attachment.id}><Download size={17} /> فتح</button>
                <button className="attachment-delete" type="button" onClick={() => removeAttachment(attachment)} disabled={busyId === attachment.id}><Trash2 size={17} /> حذف</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>,
    target,
  )
}
