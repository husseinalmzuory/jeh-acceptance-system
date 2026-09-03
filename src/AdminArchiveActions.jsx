import { useEffect, useRef, useState } from 'react'
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
  const lastNumberRef = useRef('')

  useEffect(() => {
    let observer
    let lookupSequence = 0

    const locate = async () => {
      const actions = document.querySelector('.archive-detail-actions')
      const numberNode = document.querySelector('.page-heading h1 span[dir="ltr"]')
      const acceptanceNumber = numberNode?.textContent?.trim() ?? ''

      setTarget((current) => (current === actions ? current : actions))

      if (!actions || !acceptanceNumber || !supabase) {
        lastNumberRef.current = ''
        setRecord(null)
        setNotice('')
        setShowRevoke(false)
        setReason('')
        return
      }

      if (lastNumberRef.current === acceptanceNumber) return
      lastNumberRef.current = acceptanceNumber
      const sequence = ++lookupSequence

      const { data } = await supabase
        .from('acceptances')
        .select('id, acceptance_number, document_status')
        .eq('acceptance_number', acceptanceNumber)
        .maybeSingle()

      if (sequence !== lookupSequence || lastNumberRef.current !== acceptanceNumber) return
      setRecord(data ?? null)
      setNotice('')
      setShowRevoke(false)
      setReason('')
    }

    locate()
    observer = new MutationObserver(() => {
      window.requestAnimationFrame(locate)
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      lookupSequence += 1
      observer.disconnect()
    }
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

    setRecord((current) => current ? { ...current, document_status: 'revoked' } : current)
    setShowRevoke(false)
    setReason('')
    setNotice('تم إلغاء القبول وحفظ السبب في السجل.')
    setLoading(false)
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
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !loading) setShowRevoke(false)
        }}>
          <form className="admin-modal" onSubmit={revoke}>
            <button className="admin-modal-close" type="button" onClick={() => setShowRevoke(false)} aria-label="إغلاق" disabled={loading}><X size={20} /></button>
            <div className="admin-modal-icon"><Ban size={25} /></div>
            <h2>إلغاء كتاب القبول</h2>
            <p>سيبقى القبول محفوظًا في الأرشيف، لكن صفحة التحقق ستوضح أنه ملغى.</p>
            <label>
              سبب الإلغاء *
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows="4" placeholder="اكتب سبب إلغاء القبول" required disabled={loading} />
            </label>
            <div className="admin-modal-actions">
              <button className="outline-button" type="button" onClick={() => setShowRevoke(false)} disabled={loading}>تراجع</button>
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
