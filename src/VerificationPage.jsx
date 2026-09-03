import { useEffect, useState } from 'react'
import { CheckCircle2, LoaderCircle, ShieldCheck, XCircle } from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './verification.css'

function formatArabicDate(value) {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

export default function VerificationPage({ token }) {
  const [state, setState] = useState({ loading: true, data: null, error: '' })

  useEffect(() => {
    let active = true

    const verify = async () => {
      if (!isSupabaseConfigured || !supabase) {
        if (active) setState({ loading: false, data: null, error: 'تعذر الاتصال بخدمة التحقق.' })
        return
      }

      if (!token) {
        if (active) setState({ loading: false, data: null, error: 'رابط التحقق غير مكتمل.' })
        return
      }

      const { data, error } = await supabase.rpc('verify_acceptance', { token })
      if (!active) return

      if (error) {
        setState({ loading: false, data: null, error: 'تعذر التحقق من كتاب القبول. تأكد من صحة الرابط وحاول مرة أخرى.' })
        return
      }

      const record = Array.isArray(data) ? data[0] : data
      if (!record) {
        setState({ loading: false, data: null, error: 'لم يتم العثور على كتاب قبول مطابق لهذا الرابط.' })
        return
      }

      setState({ loading: false, data: record, error: '' })
    }

    verify()
    return () => { active = false }
  }, [token])

  const { loading, data, error } = state
  const isRevoked = data?.document_status === 'revoked'

  return (
    <main className="verification-page">
      <section className="verification-card">
        <header className="verification-brand">
          <div className="verification-seal">JEH</div>
          <div>
            <strong>مجلة التربية للعلوم الإنسانية</strong>
            <span>جامعة الموصل / كلية التربية للعلوم الإنسانية</span>
          </div>
        </header>

        <div className="verification-heading">
          <ShieldCheck size={30} />
          <div>
            <p>التحقق الإلكتروني</p>
            <h1>التحقق من كتاب قبول النشر</h1>
          </div>
        </div>

        {loading && (
          <div className="verification-state">
            <LoaderCircle className="spin" size={34} />
            <p>جارٍ التحقق من السجل الرسمي...</p>
          </div>
        )}

        {!loading && error && (
          <div className="verification-state verification-state--error">
            <XCircle size={38} />
            <h2>تعذر التحقق</h2>
            <p>{error}</p>
          </div>
        )}

        {!loading && data && (
          <>
            <div className={`verification-result ${isRevoked ? 'verification-result--revoked' : ''}`}>
              {isRevoked ? <XCircle size={30} /> : <CheckCircle2 size={30} />}
              <div>
                <strong>{isRevoked ? 'كتاب القبول ملغى' : 'كتاب قبول صحيح ومسجل'}</strong>
                <span>{isRevoked ? 'هذا الكتاب موجود في السجل ولكنه لم يعد ساريًا.' : 'تمت مطابقة بيانات الكتاب مع سجل مجلة التربية للعلوم الإنسانية.'}</span>
              </div>
            </div>

            <dl className="verification-details">
              <div><dt>رقم القبول</dt><dd dir="ltr">{data.acceptance_number}</dd></div>
              <div><dt>تاريخ الكتاب</dt><dd>{formatArabicDate(data.letter_date)}</dd></div>
              <div className="verification-details__wide"><dt>عنوان البحث</dt><dd>{data.research_title_ar}</dd></div>
              {data.research_title_en && <div className="verification-details__wide"><dt>Research title</dt><dd dir="ltr">{data.research_title_en}</dd></div>}
              <div><dt>تاريخ الاستلام</dt><dd>{formatArabicDate(data.received_on)}</dd></div>
              <div><dt>تاريخ المراجعة</dt><dd>{formatArabicDate(data.reviewed_on)}</dd></div>
              <div><dt>تاريخ القبول</dt><dd>{formatArabicDate(data.accepted_on)}</dd></div>
            </dl>

            <section className="verification-researchers">
              <h2>{data.researchers?.length === 1 ? 'الباحث' : 'الباحثون'}</h2>
              {(data.researchers ?? []).map((researcher, index) => (
                <div key={`${researcher.name}-${index}`}>
                  <strong>{researcher.name}</strong>
                  <span>{researcher.workplace}</span>
                </div>
              ))}
            </section>

            {isRevoked && (
              <div className="verification-revocation">
                <strong>سبب الإلغاء</strong>
                <p>{data.revocation_reason || 'لم يذكر سبب.'}</p>
                {data.revoked_at && <small>تاريخ الإلغاء: {formatArabicDate(data.revoked_at.slice(0, 10))}</small>}
              </div>
            )}
          </>
        )}

        <footer className="verification-footer">
          هذه الصفحة مخصصة للتحقق من صحة كتب قبول النشر الصادرة عن مجلة التربية للعلوم الإنسانية.
        </footer>
      </section>
    </main>
  )
}
