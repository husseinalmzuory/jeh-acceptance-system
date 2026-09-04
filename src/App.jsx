import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  FileCheck2,
  FilePlus2,
  Eye,
  Download,
  History,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Plus,
  Pencil,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <div className="brand__seal" aria-hidden="true">JEH</div>
      <div>
        <strong>مجلة التربية للعلوم الإنسانية</strong>
        <span>جامعة الموصل</span>
      </div>
    </div>
  )
}

function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage('تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.')
    setLoading(false)
  }

  return (
    <main className="login-page">
      <section className="login-intro">
        <Brand />
        <div className="login-intro__content">
          <span className="eyebrow">نظام داخلي آمن</span>
          <h1>إصدار قبولات النشر<br />وحفظها في مكان واحد</h1>
          <p>إنشاء كتاب القبول، أرشفته، والرجوع إليه بسهولة عند الحاجة.</p>
        </div>
        <div className="login-intro__foot">ISSN 2710-124X</div>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div className="login-card__icon"><ShieldCheck size={27} /></div>
          <h2>تسجيل الدخول</h2>
          <p>استخدم حساب المجلة المعتمد للدخول إلى منظومة القبولات.</p>

          <label>
            البريد الإلكتروني
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="journal@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            كلمة المرور
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="أدخل كلمة المرور"
              autoComplete="current-password"
              required
            />
          </label>

          {message && <div className="form-error" role="alert">{message}</div>}

          <button className="primary-button" disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={20} /> : <ShieldCheck size={20} />}
            {loading ? 'جارٍ التحقق...' : 'دخول إلى المنظومة'}
          </button>
          <small>هذه المنظومة مخصصة لموظفي المجلة المخولين فقط.</small>
        </form>
      </section>
    </main>
  )
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <article className="stat-card">
      <div className={`stat-card__icon ${tone}`}><Icon size={23} /></div>
      <div><span>{label}</span><strong>{value}</strong></div>
    </article>
  )
}

function NewAcceptanceForm({ initialDraft, onPreview, onCancel }) {
  const today = new Date().toISOString().slice(0, 10)
  const isEditing = initialDraft?.mode === 'edit'
  const [form, setForm] = useState(initialDraft?.form ?? {
    acceptance_number: 'تجريبي-001',
    research_title_ar: 'التحليل المكاني للخدمات التعليمية في مدينة الموصل باستخدام نظم المعلومات الجغرافية',
    research_title_en: 'Spatial Analysis of Educational Services in Mosul City Using Geographic Information Systems',
    received_on: '2026-08-20',
    reviewed_on: '2026-08-28',
    accepted_on: today,
    letter_date: today,
    internal_notes: 'بيانات تجريبية مؤقتة لاختبار شاشة المعاينة.',
  })
  const [researchers, setResearchers] = useState(initialDraft?.researchers ?? [
    { name: 'أ.م.د. أحمد محمد علي', workplace: 'قسم الجغرافية / كلية التربية للعلوم الإنسانية / جامعة الموصل' },
    { name: 'م.د. سارة محمود حسن', workplace: 'قسم الجغرافية / كلية الآداب / جامعة بغداد' },
  ])
  const [changeReason, setChangeReason] = useState(initialDraft?.changeReason ?? '')
  const [message, setMessage] = useState('')

  const update = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const updateResearcher = (index, field, value) => {
    setResearchers((current) => current.map((researcher, itemIndex) => (
      itemIndex === index ? { ...researcher, [field]: value } : researcher
    )))
  }

  const addResearcher = () => {
    if (researchers.length < 6) {
      setResearchers((current) => [...current, { name: '', workplace: '' }])
    }
  }

  const removeResearcher = (index) => {
    if (researchers.length > 1) {
      setResearchers((current) => current.filter((_name, itemIndex) => itemIndex !== index))
    }
  }

  const submit = (event) => {
    event.preventDefault()
    setMessage('')
    const normalizedResearchers = researchers.map((researcher) => ({
      name: researcher.name.trim(),
      workplace: researcher.workplace.trim(),
    }))
    if (normalizedResearchers.some((researcher) => !researcher.name || !researcher.workplace)) {
      setMessage('يجب إدخال اسم ومكان عمل لكل باحث مضاف.')
      return
    }
    if (form.received_on > form.reviewed_on || form.reviewed_on > form.accepted_on) {
      setMessage('يجب أن يكون ترتيب التواريخ: الاستلام، ثم المراجعة، ثم القبول.')
      return
    }
    if (isEditing && !changeReason.trim()) {
      setMessage('يجب كتابة سبب التعديل قبل الانتقال إلى المعاينة.')
      return
    }
    onPreview({
      form: {
        ...form,
        acceptance_number: form.acceptance_number.trim(),
        research_title_ar: form.research_title_ar.trim(),
        research_title_en: form.research_title_en.trim(),
        internal_notes: form.internal_notes.trim(),
      },
      researchers: normalizedResearchers,
      mode: isEditing ? 'edit' : 'create',
      acceptanceId: initialDraft?.acceptanceId ?? null,
      changeReason: changeReason.trim(),
    })
  }

  return (
    <section className="form-page">
      <div className="page-heading">
        <div><p>قبولات النشر</p><h1>{isEditing ? 'تعديل قبول محفوظ' : 'إصدار قبول جديد'}</h1></div>
        <button className="outline-button" type="button" onClick={onCancel}>العودة إلى لوحة التحكم</button>
      </div>

      <form className="acceptance-form" onSubmit={submit}>
        <div className="form-section">
          <div className="form-section__title"><span>1</span><div><h2>بيانات الكتاب</h2><p>رقم وتاريخ كتاب القبول الرسمي</p></div></div>
          <div className="form-grid form-grid--2">
            <label>رقم القبول الرسمي *
              <input name="acceptance_number" value={form.acceptance_number} onChange={update} placeholder="مثال: 157/8" required />
            </label>
            <label>تاريخ الكتاب *
              <input type="date" name="letter_date" value={form.letter_date} onChange={update} required />
            </label>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section__title"><span>2</span><div><h2>بيانات الباحثين</h2><p>يمكن إضافة ما يصل إلى ستة باحثين بالترتيب الذي سيظهر في القبول</p></div></div>
          <div className="researchers-list">
            {researchers.map((researcher, index) => (
              <div className="researcher-row" key={index}>
                <div className="researcher-fields">
                  <label>اسم الباحث {index + 1} مع اللقب العلمي *
                    <input value={researcher.name} onChange={(event) => updateResearcher(index, 'name', event.target.value)} placeholder={index === 0 ? 'مثال: أ.م.د. نبراس حسين مهاوش' : 'اسم الباحث المشارك'} required />
                  </label>
                  <label>مكان عمل الباحث {index + 1} *
                    <input value={researcher.workplace} onChange={(event) => updateResearcher(index, 'workplace', event.target.value)} placeholder="مثال: كلية الإعلام / جامعة بغداد" required />
                  </label>
                </div>
                {researchers.length > 1 && (
                  <button type="button" className="remove-researcher" onClick={() => removeResearcher(index)} aria-label={`حذف الباحث ${index + 1}`} title="حذف الباحث">
                    <Trash2 size={19} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="researcher-tools">
            <button type="button" className="add-researcher" onClick={addResearcher} disabled={researchers.length >= 6}>
              <Plus size={18} /> إضافة باحث
            </button>
            <span>{researchers.length} من 6</span>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section__title"><span>3</span><div><h2>بيانات البحث</h2><p>عنوان البحث وتواريخ الاستلام والقبول</p></div></div>
          <div className="form-grid">
            <label>عنوان البحث باللغة العربية *
              <textarea name="research_title_ar" value={form.research_title_ar} onChange={update} rows="3" required />
            </label>
            <label>عنوان البحث باللغة الإنجليزية
              <textarea name="research_title_en" value={form.research_title_en} onChange={update} rows="2" dir="ltr" />
            </label>
          </div>
          <div className="form-grid form-grid--3 dates-row">
            <label>تاريخ الاستلام *
              <input type="date" name="received_on" value={form.received_on} onChange={update} required />
            </label>
            <label>تاريخ المراجعة *
              <input type="date" name="reviewed_on" value={form.reviewed_on} onChange={update} required />
            </label>
            <label>تاريخ القبول *
              <input type="date" name="accepted_on" value={form.accepted_on} onChange={update} required />
            </label>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section__title"><span>4</span><div><h2>ملاحظات داخلية</h2><p>لا تظهر هذه الملاحظات في كتاب القبول</p></div></div>
          <label><textarea name="internal_notes" value={form.internal_notes} onChange={update} rows="3" placeholder="اختياري" /></label>
        </div>

        {isEditing && (
          <div className="form-section form-section--change-reason">
            <div className="form-section__title"><span>5</span><div><h2>سبب التعديل</h2><p>سيظهر السبب في سجل الإصدارات الداخلي</p></div></div>
            <label>سبب التعديل *
              <textarea value={changeReason} onChange={(event) => setChangeReason(event.target.value)} rows="3" placeholder="مثال: تصحيح اسم الباحث أو تعديل عنوان البحث" required />
            </label>
          </div>
        )}

        {message && <div className="form-error" role="alert">{message}</div>}
        <div className="form-actions">
          <button className="outline-button" type="button" onClick={onCancel}>إلغاء</button>
          <button className="primary-button">
            <FileCheck2 size={20} />
            {isEditing ? 'معاينة النسخة المعدلة' : 'معاينة كتاب القبول'}
          </button>
        </div>
      </form>
    </section>
  )
}

function formatArabicDate(value) {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function cleanFilenamePart(value) {
  return String(value ?? '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildPdfFilename(researcherName, researchTitle, acceptanceNumber) {
  const extension = '.pdf'
  const maxTotalLength = 225
  const maxBaseLength = maxTotalLength - extension.length
  const researcher = cleanFilenamePart(researcherName)
  const title = cleanFilenamePart(researchTitle)
  const fallback = cleanFilenamePart(acceptanceNumber) || 'قبول نشر'
  let base = [researcher, title].filter(Boolean).join(' - ') || fallback
  base = base.slice(0, maxBaseLength).replace(/[\s.\-_–—]+$/g, '').trim()
  if (!base) base = fallback.slice(0, maxBaseLength) || 'قبول نشر'
  return `${base.slice(0, maxBaseLength)}${extension}`
}

async function exportAcceptancePdf(element, acceptanceNumber, researcherName, researchTitle) {
  if (!element) return
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])
  await document.fonts?.ready
  const filename = buildPdfFilename(researcherName, researchTitle, acceptanceNumber)
  const fitClasses = ['pdf-fit--compact', 'pdf-fit--tight', 'pdf-fit--maximum']
  element.classList.add('pdf-exporting')
  try {
    // Long titles, several researchers, the signature and the QR can together
    // exceed A4. Tighten the layout only as much as needed before capturing it.
    for (const fitClass of fitClasses) {
      await new Promise((resolve) => requestAnimationFrame(resolve))
      if (element.scrollHeight <= element.clientHeight + 1) break
      element.classList.add(fitClass)
    }
    await new Promise((resolve) => requestAnimationFrame(resolve))
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
    })
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const pageWidth = 210
    const pageHeight = 297
    const imageRatio = canvas.width / canvas.height
    const pageRatio = pageWidth / pageHeight
    const imageWidth = imageRatio > pageRatio ? pageWidth : pageHeight * imageRatio
    const imageHeight = imageRatio > pageRatio ? pageWidth / imageRatio : pageHeight
    const offsetX = (pageWidth - imageWidth) / 2
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', offsetX, 0, imageWidth, imageHeight, undefined, 'FAST')
    pdf.save(filename)
  } finally {
    element.classList.remove('pdf-exporting', ...fitClasses)
  }
}

function AcceptanceLetter({ form, researchers, letterRef }) {
  return (
    <article
      className={`letter-preview letter-preview--researchers-${Math.min(researchers.length, 6)}`}
      data-researcher-count={researchers.length}
      ref={letterRef}
    >
      <header className="letter-header">
        <div className="letter-header__english" dir="ltr">
          <strong>Republic of Iraq</strong>
          <span>Ministry of Higher Education</span>
          <span>University of Mosul</span>
          <span>College of Education for Humanities</span>
        </div>
        <img className="letter-logo" src={`${import.meta.env.BASE_URL}jeh-official-logo.png`} alt="شعار كلية التربية للعلوم الإنسانية ومجلة التربية للعلوم الإنسانية" />
        <div className="letter-header__arabic">
          <strong>جمهورية العراق</strong>
          <span>وزارة التعليم العالي والبحث العلمي</span>
          <span>جامعة الموصل</span>
          <span>كلية التربية للعلوم الإنسانية</span>
        </div>
      </header>

      <div className="journal-heading">
        <h2>مجلة التربية للعلوم الإنسانية</h2>
        <p>مجلة أكاديمية فصلية محكمة تأسست سنة 2021م</p>
      </div>

      <div className="letter-meta">
        <div><strong>العدد:</strong> <span dir="ltr">{form.acceptance_number}</span><br /><strong>التاريخ:</strong> <span dir="ltr">{formatArabicDate(form.letter_date)}</span></div>
        <div>رقم الإيداع في دار الكتب والوثائق ببغداد<br /><strong>2425 لسنة 2020</strong></div>
        <div dir="ltr"><strong>ISSN 2710-124X</strong></div>
      </div>

      <div className="letter-body">
        <h3>م/ قبول نشر بحث</h3>
        <p className="recipient-label">{researchers.length === 1 ? 'إلى الباحث:' : 'إلى الباحثين:'}</p>
        <div className="recipient-table">
          {researchers.map((researcher, index) => (
            <div className="recipient-row" key={`${researcher.name}-${index}`}>
              <strong>{researcher.name}</strong>
              <span>{researcher.workplace}</span>
            </div>
          ))}
        </div>
        <p className="greeting">تحية طيبة...</p>
        <p>نود إعلامكم بقبول نشر بحثكم الموسوم:</p>
        <p className="research-title">{form.research_title_ar}</p>
        {form.research_title_en && <p className="research-title research-title--english" dir="ltr">{form.research_title_en}</p>}
        <p>في مجلة التربية للعلوم الإنسانية، وسيُنشر في أحد الأعداد القادمة بعد استكمال الإجراءات العلمية والإدارية المعتمدة.</p>
        <p>مع التقدير...</p>
      </div>

      <footer className="letter-footer">
        <div className="letter-dates">
          <span><strong>تاريخ الاستلام:</strong> {formatArabicDate(form.received_on)}</span>
          <span><strong>تاريخ المراجعة:</strong> {formatArabicDate(form.reviewed_on)}</span>
          <span><strong>تاريخ القبول:</strong> {formatArabicDate(form.accepted_on)}</span>
        </div>
        <div className="letter-signature">
          <strong>أ.د. إبراهيم محمد محمود الحمداني</strong>
          <span>رئيس هيئة التحرير</span>
        </div>
      </footer>

      <div className="letter-contact">
        <strong>مجلة التربية للعلوم الإنسانية</strong>
        <span>جامعة الموصل / كلية التربية للعلوم الإنسانية / الموصل - العراق</span>
        <span>البريد الإلكتروني: <b dir="ltr">mzuory@gmail.com</b></span>
        <span>الهاتف: <b dir="ltr">+9647503496549</b></span>
      </div>
    </article>
  )
}

function AcceptancePreview({ draft, onEdit, onConfirmed }) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [issuedId, setIssuedId] = useState(null)
  const letterRef = useRef(null)
  const { form, researchers, mode = 'create', acceptanceId, changeReason = '' } = draft
  const isEditing = mode === 'edit'

  const downloadPdf = async () => {
    await exportAcceptancePdf(
      letterRef.current,
      form.acceptance_number,
      researchers[0]?.name,
      form.research_title_ar,
    )
  }

  const confirmIssue = async () => {
    setSaving(true)
    setMessage('')
    if (issuedId) {
      try {
        await downloadPdf()
        onConfirmed(issuedId)
      } catch {
        setMessage('القبول محفوظ، لكن تعذر تنزيل PDF. اسمح بالتنزيلات من المتصفح ثم حاول مجددًا.')
      }
      setSaving(false)
      return
    }

    const parameters = {
      p_acceptance_number: form.acceptance_number,
      p_research_title_ar: form.research_title_ar,
      p_research_title_en: form.research_title_en,
      p_received_on: form.received_on,
      p_reviewed_on: form.reviewed_on,
      p_accepted_on: form.accepted_on,
      p_letter_date: form.letter_date,
      p_internal_notes: form.internal_notes,
      p_researchers: researchers,
    }
    const { data, error } = isEditing
      ? await supabase.rpc('update_acceptance', {
          p_acceptance_id: acceptanceId,
          ...parameters,
          p_change_reason: changeReason,
        })
      : await supabase.rpc('create_acceptance', parameters)
    if (error) {
      setSaving(false)
      setMessage(error.code === '23505'
        ? 'رقم القبول مستخدم في سجل آخر. ارجع للتعديل وأدخل رقمًا آخر.'
        : `تعذر ${isEditing ? 'حفظ التعديل' : 'حفظ القبول'}. تحقق من الاتصال وحاول مرة أخرى.`)
      return
    }
    setIssuedId(data)
    try {
      await downloadPdf()
      onConfirmed(data)
    } catch {
      setMessage('تم حفظ القبول في الأرشيف، لكن تعذر تنزيل PDF. اسمح بالتنزيلات من المتصفح ثم اضغط «إعادة تنزيل PDF».')
    }
    setSaving(false)
  }

  return (
    <section className="preview-page">
      <div className="page-heading">
        <div><p>الخطوة الأخيرة</p><h1>{isEditing ? 'معاينة النسخة المعدلة' : 'معاينة كتاب القبول'}</h1></div>
        <button className="outline-button" type="button" onClick={onEdit} disabled={Boolean(issuedId)}>الرجوع لتعديل البيانات</button>
      </div>

      <div className="preview-notice">
        {isEditing
          ? <>راجع النسخة المعدلة. عند اعتمادها ستُحفظ كإصدار جديد، وستبقى النسخة السابقة في سجل الإصدارات. <strong>سبب التعديل:</strong> {changeReason}</>
          : 'راجع الأسماء وأماكن العمل والعنوان والتواريخ. لن يُحفظ القبول قبل الضغط على زر الإصدار.'}
      </div>

      <AcceptanceLetter form={form} researchers={researchers} letterRef={letterRef} />

      {message && <div className="form-error" role="alert">{message}</div>}
      <div className="preview-actions">
        <button className="outline-button" type="button" onClick={onEdit} disabled={saving || Boolean(issuedId)}>تعديل البيانات</button>
        <button className="outline-button" type="button" onClick={() => window.print()} disabled={saving}>
          <Printer size={19} /> طباعة المعاينة
        </button>
        <button className="primary-button" type="button" onClick={confirmIssue} disabled={saving}>
          {saving ? <LoaderCircle className="spin" size={20} /> : issuedId ? <Download size={20} /> : <FileCheck2 size={20} />}
          {saving ? 'جارٍ إنشاء ملف PDF...' : issuedId ? 'إعادة تنزيل PDF' : isEditing ? 'اعتماد التعديل وتنزيل PDF' : 'إصدار القبول وتنزيل PDF'}
        </button>
      </div>
    </section>
  )
}

function AcceptanceArchive({ initialSearch = false, onBack, onEditRecord }) {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [yearFilter, setYearFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [versionPreview, setVersionPreview] = useState(null)
  const archiveLetterRef = useRef(null)

  useEffect(() => {
    let active = true
    const loadArchive = async () => {
      const { data, error } = await supabase
        .from('acceptances')
        .select(`
          id, acceptance_number, research_title_ar, research_title_en,
          recipient_name, recipient_affiliation, received_on, reviewed_on,
          accepted_on, letter_date, document_status, internal_notes, created_at, updated_at,
          acceptance_researchers (
            author_order,
            researchers (name_ar, workplace)
          ),
          acceptance_versions (
            id, version_number, data_snapshot, change_reason, created_at
          )
        `)
        .order('created_at', { ascending: false })

      if (!active) return
      if (error) setMessage('تعذر تحميل الأرشيف. حاول تحديث الصفحة.')
      setItems(data ?? [])
      setLoading(false)
    }
    loadArchive()
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('ar')
    return items.filter((item) => {
      const matchesText = !term || [
        item.acceptance_number,
        item.research_title_ar,
        item.research_title_en,
        item.recipient_name,
        item.recipient_affiliation,
      ].some((value) => value?.toLocaleLowerCase('ar').includes(term))
      const matchesYear = yearFilter === 'all' || item.accepted_on?.startsWith(yearFilter)
      const matchesStatus = statusFilter === 'all' || item.document_status === statusFilter
      return matchesText && matchesYear && matchesStatus
    })
  }, [items, query, yearFilter, statusFilter])

  const availableYears = useMemo(() => (
    [...new Set(items.map((item) => item.accepted_on?.slice(0, 4)).filter(Boolean))].sort().reverse()
  ), [items])

  if (selected) {
    const currentResearchers = [...(selected.acceptance_researchers ?? [])]
      .sort((a, b) => a.author_order - b.author_order)
      .map((link) => link.researchers)
      .filter(Boolean)
      .map((researcher) => ({ name: researcher.name_ar, workplace: researcher.workplace }))
    const currentForm = {
      acceptance_number: selected.acceptance_number,
      research_title_ar: selected.research_title_ar,
      research_title_en: selected.research_title_en ?? '',
      received_on: selected.received_on,
      reviewed_on: selected.reviewed_on,
      accepted_on: selected.accepted_on,
      letter_date: selected.letter_date,
      internal_notes: selected.internal_notes ?? '',
    }
    const versions = [...(selected.acceptance_versions ?? [])]
      .sort((a, b) => b.version_number - a.version_number)
    const displayedForm = versionPreview?.data_snapshot
      ? { ...currentForm, ...versionPreview.data_snapshot }
      : currentForm
    const displayedResearchers = versionPreview?.data_snapshot?.researchers?.length
      ? versionPreview.data_snapshot.researchers
      : currentResearchers.length
        ? currentResearchers
        : [{ name: selected.recipient_name, workplace: selected.recipient_affiliation }]
    const currentVersion = versions[0]?.version_number ?? 1

    const downloadArchivedPdf = async () => {
      setDownloading(true)
      setMessage('')
      try {
        await exportAcceptancePdf(
          archiveLetterRef.current,
          displayedForm.acceptance_number,
          displayedResearchers[0]?.name,
          displayedForm.research_title_ar,
        )
      } catch {
        setMessage('تعذر إنشاء ملف PDF. حاول مرة أخرى أو استخدم زر الطباعة.')
      }
      setDownloading(false)
    }

    const editCurrentAcceptance = () => {
      onEditRecord({
        mode: 'edit',
        acceptanceId: selected.id,
        form: currentForm,
        researchers: currentResearchers.length
          ? currentResearchers
          : [{ name: selected.recipient_name, workplace: selected.recipient_affiliation }],
        changeReason: '',
      })
    }

    return (
      <section className="archive-page">
        <div className="page-heading">
          <div><p>أرشيف القبولات</p><h1>تفاصيل القبول رقم <span dir="ltr">{selected.acceptance_number}</span></h1></div>
          <button className="outline-button" type="button" onClick={() => setSelected(null)}>العودة إلى الأرشيف</button>
        </div>
        <div className="archive-detail-actions">
          <button className="outline-button edit-record-button" type="button" onClick={editCurrentAcceptance} disabled={downloading}>
            <Pencil size={18} /> تعديل القبول
          </button>
          <button className="outline-button" type="button" onClick={() => window.print()} disabled={downloading}>
            <Printer size={19} /> طباعة القبول
          </button>
          <button className="primary-button" type="button" onClick={downloadArchivedPdf} disabled={downloading}>
            {downloading ? <LoaderCircle className="spin" size={20} /> : <Download size={20} />}
            {downloading ? 'جارٍ إنشاء PDF...' : 'تنزيل PDF مجددًا'}
          </button>
        </div>
        {message && <div className="form-error archive-detail-error" role="alert">{message}</div>}
        <article className="details-card">
          <div className="details-status">
            <div>قبول محفوظ <small>الإصدار الحالي: {currentVersion}</small></div>
            <span className={selected.document_status === 'revoked' ? 'status-revoked' : ''}>{selected.document_status === 'revoked' ? 'ملغى' : 'ساري'}</span>
          </div>
          <dl className="details-grid">
            <div><dt>رقم القبول</dt><dd dir="ltr">{selected.acceptance_number}</dd></div>
            <div><dt>تاريخ الكتاب</dt><dd>{formatArabicDate(selected.letter_date)}</dd></div>
            <div className="details-grid__wide"><dt>عنوان البحث</dt><dd>{selected.research_title_ar}</dd></div>
            {selected.research_title_en && <div className="details-grid__wide"><dt>العنوان بالإنجليزية</dt><dd dir="ltr">{selected.research_title_en}</dd></div>}
            <div><dt>تاريخ الاستلام</dt><dd>{formatArabicDate(selected.received_on)}</dd></div>
            <div><dt>تاريخ المراجعة</dt><dd>{formatArabicDate(selected.reviewed_on)}</dd></div>
            <div><dt>تاريخ القبول</dt><dd>{formatArabicDate(selected.accepted_on)}</dd></div>
          </dl>
          <div className="details-researchers">
            <h2>{currentResearchers.length === 1 ? 'الباحث' : 'الباحثون'}</h2>
            {currentResearchers.length ? currentResearchers.map((researcher, index) => (
              <div key={`${researcher.name}-${index}`}><strong>{researcher.name}</strong><span>{researcher.workplace}</span></div>
            )) : <p>{selected.recipient_name} — {selected.recipient_affiliation}</p>}
          </div>
          {selected.internal_notes && <div className="details-notes"><strong>ملاحظات داخلية</strong><p>{selected.internal_notes}</p></div>}
        </article>

        <section className="versions-card">
          <div className="versions-card__heading"><History size={21} /><div><h2>سجل الإصدارات</h2><p>كل تعديل محفوظ ويمكن فتح نسخته السابقة</p></div></div>
          <div className="versions-list">
            <button className={!versionPreview ? 'version-item version-item--active' : 'version-item'} type="button" onClick={() => setVersionPreview(null)}>
              <strong>النسخة الحالية</strong><span>الإصدار {currentVersion}</span><small>{formatArabicDate(selected.updated_at?.slice(0, 10))}</small>
            </button>
            {versions.filter((version) => version.version_number < currentVersion).map((version) => (
              <button className={versionPreview?.id === version.id ? 'version-item version-item--active' : 'version-item'} type="button" key={version.id} onClick={() => setVersionPreview(version)}>
                <strong>الإصدار {version.version_number}</strong>
                <span>{version.change_reason || 'بدون ملاحظة'}</span>
                <small>{formatArabicDate(version.created_at?.slice(0, 10))}</small>
              </button>
            ))}
          </div>
        </section>

        <div className="archive-letter-title">
          <span>{versionPreview ? `معاينة الإصدار ${versionPreview.version_number}` : 'نسخة كتاب القبول الحالية'}</span>
          <small>{versionPreview ? versionPreview.change_reason : 'يمكن تنزيل هذه النسخة أو طباعتها في أي وقت'}</small>
        </div>
        <AcceptanceLetter form={displayedForm} researchers={displayedResearchers} letterRef={archiveLetterRef} />
      </section>
    )
  }

  return (
    <section className="archive-page">
      <div className="page-heading">
        <div><p>القبولات المحفوظة</p><h1>{initialSearch ? 'البحث المتقدم' : 'أرشيف القبولات'}</h1></div>
        <button className="outline-button" type="button" onClick={onBack}>العودة إلى لوحة التحكم</button>
      </div>
      <div className="archive-toolbar">
        <label className="archive-search">
          <Search size={20} />
          <input autoFocus={initialSearch} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث برقم القبول أو اسم الباحث أو عنوان البحث أو مكان العمل" />
        </label>
        <label className="archive-filter">السنة
          <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
            <option value="all">جميع السنوات</option>
            {availableYears.map((year) => <option value={year} key={year}>{year}</option>)}
          </select>
        </label>
        <label className="archive-filter">الحالة
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">جميع الحالات</option>
            <option value="active">ساري</option>
            <option value="revoked">ملغى</option>
          </select>
        </label>
        <span>{filtered.length} قبول</span>
      </div>
      {message && <div className="form-error">{message}</div>}
      <div className="archive-card">
        {loading ? <div className="empty-state"><LoaderCircle className="spin" /><p>جارٍ تحميل الأرشيف...</p></div>
          : filtered.length === 0 ? <div className="empty-state"><Archive size={30} /><h3>لا توجد نتائج</h3><p>غيّر كلمات البحث أو أصدر قبولًا جديدًا.</p></div>
            : <div className="archive-table-wrap"><table className="archive-table">
              <thead><tr><th>رقم القبول</th><th>الباحثون</th><th>عنوان البحث</th><th>تاريخ القبول</th><th>التفاصيل</th></tr></thead>
              <tbody>{filtered.map((item) => <tr key={item.id}>
                <td dir="ltr">{item.acceptance_number}</td>
                <td>{item.recipient_name}</td>
                <td>{item.research_title_ar}</td>
                <td>{formatArabicDate(item.accepted_on)}</td>
                <td><button className="view-button" type="button" onClick={() => { setVersionPreview(null); setSelected(item) }}><Eye size={17} /> فتح</button></td>
              </tr>)}</tbody>
            </table></div>}
      </div>
    </section>
  )
}

function Dashboard({ session }) {
  const [view, setView] = useState('dashboard')
  const [count, setCount] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    const load = async () => {
      const [{ count: total }, { data }] = await Promise.all([
        supabase.from('acceptances').select('*', { count: 'exact', head: true }),
        supabase
          .from('acceptances')
          .select('id, acceptance_number, research_title_ar, recipient_name, accepted_on')
          .order('created_at', { ascending: false })
          .limit(5),
      ])
      if (active) {
        setCount(total ?? 0)
        setRecent(data ?? [])
        setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [refreshKey])

  const currentYear = new Date().getFullYear()
  const thisYear = useMemo(
    () => recent.filter((item) => new Date(item.accepted_on).getFullYear() === currentYear).length,
    [recent, currentYear],
  )

  const openNew = () => {
    setDraft(null)
    setView('new')
  }

  const showPreview = (nextDraft) => {
    setDraft(nextDraft)
    setView('preview')
  }

  const editAcceptance = (acceptanceDraft) => {
    setDraft(acceptanceDraft)
    setView('new')
  }

  const finishIssue = () => {
    setDraft(null)
    setView('dashboard')
    setLoading(true)
    setRefreshKey((current) => current + 1)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand compact />
        <nav aria-label="التنقل الرئيسي">
          <button className={`nav-item ${view === 'dashboard' ? 'nav-item--active' : ''}`} onClick={() => setView('dashboard')}><LayoutDashboard size={20} /> لوحة التحكم</button>
          <button className={`nav-item ${view === 'new' || view === 'preview' ? 'nav-item--active' : ''}`} onClick={openNew}><FilePlus2 size={20} /> إصدار قبول جديد</button>
          <button className={`nav-item ${view === 'archive' ? 'nav-item--active' : ''}`} onClick={() => setView('archive')}><Archive size={20} /> أرشيف القبولات</button>
          <button className={`nav-item ${view === 'search' ? 'nav-item--active' : ''}`} onClick={() => setView('search')}><Search size={20} /> البحث المتقدم</button>
        </nav>
        <button className="logout-button" onClick={() => supabase.auth.signOut()}>
          <LogOut size={19} /> تسجيل الخروج
        </button>
      </aside>

      <main className="dashboard">
        <header className="topbar">
          <div>
            <span>منظومة قبولات النشر <em className="version-label">الإصدار التجريبي 0.10</em></span>
            <small>{session.user.email}</small>
          </div>
          <div className="status-pill"><span /> متصل بقاعدة البيانات</div>
        </header>

        <div className="dashboard__content">
          {view === 'new' ? (
            <NewAcceptanceForm initialDraft={draft} onCancel={() => setView('dashboard')} onPreview={showPreview} />
          ) : view === 'preview' && draft ? (
            <AcceptancePreview draft={draft} onEdit={() => setView('new')} onConfirmed={finishIssue} />
          ) : view === 'archive' || view === 'search' ? (
            <AcceptanceArchive key={view} initialSearch={view === 'search'} onBack={() => setView('dashboard')} onEditRecord={editAcceptance} />
          ) : <>
          <section className="welcome-row">
            <div><p>مرحبًا بك</p><h1>لوحة قبولات النشر</h1></div>
            <button className="primary-button" onClick={openNew}><FilePlus2 size={20} /> إصدار قبول جديد</button>
          </section>

          <section className="stats-grid">
            <StatCard icon={FileCheck2} label="إجمالي القبولات" value={loading ? '—' : count} tone="blue" />
            <StatCard icon={CalendarDays} label={`قبولات ${currentYear}`} value={loading ? '—' : thisYear} tone="teal" />
            <StatCard icon={BookOpen} label="آخر رقم قبول" value={recent[0]?.acceptance_number ?? 'لا يوجد'} tone="gold" />
          </section>

          <section className="content-card">
            <div className="content-card__header">
              <div><h2>أحدث القبولات</h2><p>آخر الكتب التي أضيفت إلى الأرشيف</p></div>
              <button className="text-button" onClick={() => setView('archive')}>عرض الأرشيف <ChevronLeft size={17} /></button>
            </div>

            {loading ? (
              <div className="empty-state"><LoaderCircle className="spin" /><p>جارٍ تحميل القبولات...</p></div>
            ) : recent.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon"><Archive size={30} /></div>
                <h3>الأرشيف فارغ حاليًا</h3>
                <p>ابدأ بإصدار أول كتاب قبول ليظهر هنا تلقائيًا.</p>
                <button className="secondary-button" onClick={openNew}><FilePlus2 size={18} /> إصدار أول قبول</button>
              </div>
            ) : (
              <div className="acceptance-list">
                {recent.map((item) => (
                  <article key={item.id}>
                    <div className="acceptance-number">{item.acceptance_number}</div>
                    <div><strong>{item.research_title_ar}</strong><span>{item.recipient_name}</span></div>
                    <time>{item.accepted_on}</time>
                  </article>
                ))}
              </div>
            )}
          </section>
          </>}
        </div>
      </main>
    </div>
  )
}

function ConfigurationNotice() {
  return (
    <main className="configuration-page">
      <div className="configuration-card">
        <Brand />
        <h1>الواجهة جاهزة للاتصال</h1>
        <p>أضف عنوان مشروع Supabase والمفتاح القابل للنشر إلى إعدادات البيئة لتفعيل تسجيل الدخول.</p>
      </div>
    </main>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured) return <ConfigurationNotice />
  if (session === undefined) return <main className="loading-page"><LoaderCircle className="spin" /></main>
  return session ? <Dashboard session={session} /> : <LoginScreen />
}
