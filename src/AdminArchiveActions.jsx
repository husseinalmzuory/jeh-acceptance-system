import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Ban, ClipboardCheck, Link2, LoaderCircle, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import './admin-actions.css'

export default function AdminArchiveActions() {
  const [target, setTarget] = useState(null)
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [showRevoke, setShowRevoke] = useState(false)
  const [reason, setReason] = useState('')

  useEffect(() => {
    let observer
    const locate = async () => {
      const actions = document.querySelector('.archive-detail-actions')
      const numberNode = document.querySelector('.page-heading h1 span[dir="ltr"]')
      setTarget(actions)
      if (!actions || !numberNode || !supabase) {
        setRecord(null)
        return
      }
      const acceptanceNumber = numberNode.textContent?.trim()
      if (!acceptanceNumber) return
      const { data } = await supabase
        .from('acceptances')
        .select('id, acceptance_number, document_status')
        .eq('acceptance_number', acceptanceNumber)
        .maybeSingle()
      setRecord(data ?? null)
    }

    locate()
    observer = new MutationObserver(() => locate())
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  const copyVerificationLink = async () => {
    if (!record?.id) return
    setLoading(true)
    setNotice('')
    const { data, error } = await supabase.rpc('get_acceptance_verification_token', {
      p_acceptance_id: record.id,
    })
    if (error || !data) {
      setNotice('تعذر إنشاء رابط التحقق.')
      setLoading(false)
      return
    }
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = ''
    url.searchParams.set('verify', data)
    try {
      await navigator.clipboard.writeText(url.toString())
      setNotice('تم نسخ رابط التحقق.')
    } catch {
      setNotice(url.toString())
    }
    setLoading(false)
  }

  const revoke = async (event) => {
    event.preventDefault()
    if (!record?.id || !reason.trim()) return
    setLoading(true)
    setNotice('')
    const { error } = await supabase.rpc('revoke_acceptance', {
      p_acceptance_id: record.id,
      p_reason: reason.trim(),
    })
    if (error) {
      setNotice('تعذر إلغاء القبول. قد يكون ملغى مسبقًا.')
      setLoading(false)
      return
    }
    setShowRevoke(false)
    setNotice('تم إلغاء القبول وحفظ السبب في السجل.')
    setLoading(false)
    window.setTimeout(() => window.location.reload(), 700)
  }

  if (!target || !record) return null

  return (
    <>
      {createPortal(
        <>
          <button className="outline-button admin-link-button" type="button" onClick={copyVerificationLink} disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={18} /> : <Link2 size={18} />}
            نسخ رابط التحقق
          </button>
          {record.document_status === 'active' && (
            <button className="outline-button admin-revoke-button" type="button" onClick={() => setShowRevoke(true)} disabled={loading}>
              <Ban size={18} /> إلغاء القبول
            </button>
          )}
          {notice && <span className="admin-action-notice"><ClipboardCheck size={15} /> {notice}</span>}
        </>,
        target,
      )}

      {showRevoke && createPortal(
        <div className="admin-modal-backdrop" role="presentation">
          <form className="admin-modal" onSubmit={revoke}>
            <button className="admin-modal-close" type="button" onClick={() => setShowRevoke(false)} aria-label="إغلاق"><X size={20} /></button>
            <div className="admin-modal-icon"><Ban size={25} /></div>
            <h2>إلغاء كتاب القبول</h2>
            <p>سيبقى القبول محفوظًا في الأرشيف، لكن صفحة التحقق ستوضح أنه ملغى.</p>
            <label>
              سبب الإلغاء *
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows="4" placeholder="اكتب سبب إلغاء القبول" required />
            </label>
            <div className="admin-modal-actions">
              <button className="outline-button" type="button" onClick={() => setShowRevoke(false)}>تراجع</button>
              <button className="admin-danger-button" type="submit" disabled={loading || !reason.trim()}>
                {loading ? <LoaderCircle className="spin" size={18} /> : <Ban size={18} />}
                تأكيد الإلغاء
              </button>
            </div>
          </form>
        </div>,
        document.body,
      )}
    </>
  )
}
