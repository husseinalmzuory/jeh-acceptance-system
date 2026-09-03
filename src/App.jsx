import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  FileCheck2,
  FilePlus2,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Plus,
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
  const [form, setForm] = useState(initialDraft?.form ?? {
    acceptance_number: '',
    research_title_ar: '',
    research_title_en: '',
    received_on: today,
    reviewed_on: today,
    accepted_on: today,
    letter_date: today,
    internal_notes: '',
  })
  const [researchers, setResearchers] = useState(initialDraft?.researchers ?? [{ name: '', workplace: '' }])
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
    onPreview({
      form: {
        ...form,
        acceptance_number: form.acceptance_number.trim(),
        research_title_ar: form.research_title_ar.trim(),
        research_title_en: form.research_title_en.trim(),
        internal_notes: form.internal_notes.trim(),
      },
      researchers: normalizedResearchers,
    })
  }

  return (
    <section className="form-page">
      <div className="page-heading">
        <div><p>قبولات النشر</p><h1>إصدار قبول جديد</h1></div>
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

        {message && <div className="form-error" role="alert">{message}</div>}
        <div className="form-actions">
          <button className="outline-button" type="button" onClick={onCancel}>إلغاء</button>
          <button className="primary-button">
            <FileCheck2 size={20} />
            معاينة كتاب القبول
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

function AcceptancePreview({ draft, onEdit, onConfirmed }) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const { form, researchers } = draft

  const confirmIssue = async () => {
    setSaving(true)
    setMessage('')
    const { data, error } = await supabase.rpc('create_acceptance', {
      p_acceptance_number: form.acceptance_number,
      p_research_title_ar: form.research_title_ar,
      p_research_title_en: form.research_title_en,
      p_received_on: form.received_on,
      p_reviewed_on: form.reviewed_on,
      p_accepted_on: form.accepted_on,
      p_letter_date: form.letter_date,
      p_internal_notes: form.internal_notes,
      p_researchers: researchers,
    })
    setSaving(false)
    if (error) {
      setMessage(error.code === '23505'
        ? 'رقم القبول مستخدم سابقًا. ارجع للتعديل وأدخل رقمًا آخر.'
        : 'تعذر حفظ القبول. تحقق من الاتصال وحاول مرة أخرى.')
      return
    }
    onConfirmed(data)
  }

  return (
    <section className="preview-page">
      <div className="page-heading">
        <div><p>الخطوة الأخيرة</p><h1>معاينة كتاب القبول</h1></div>
        <button className="outline-button" type="button" onClick={onEdit}>الرجوع لتعديل البيانات</button>
      </div>

      <div className="preview-notice">راجع الأسماء وأماكن العمل والعنوان والتواريخ. لن يُحفظ القبول قبل الضغط على «إصدار وحفظ القبول».</div>

      <article className="letter-preview">
        <header className="letter-header">
          <div className="letter-header__english" dir="ltr">
            <strong>Republic of Iraq</strong>
            <span>Ministry of Higher Education</span>
            <span>University of Mosul</span>
            <span>College of Education for Humanities</span>
          </div>
          <div className="letter-seal">JEH</div>
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
          <div className="qr-placeholder"><span>QR</span><small>رمز التحقق</small></div>
          <div className="letter-signature"><strong>رئيس هيئة التحرير</strong><span>مجلة التربية للعلوم الإنسانية</span></div>
        </footer>

        <div className="letter-dates">
          <span><strong>تاريخ الاستلام:</strong> {formatArabicDate(form.received_on)}</span>
          <span><strong>تاريخ المراجعة:</strong> {formatArabicDate(form.reviewed_on)}</span>
          <span><strong>تاريخ القبول:</strong> {formatArabicDate(form.accepted_on)}</span>
        </div>
      </article>

      {message && <div className="form-error" role="alert">{message}</div>}
      <div className="preview-actions">
        <button className="outline-button" type="button" onClick={onEdit} disabled={saving}>تعديل البيانات</button>
        <button className="primary-button" type="button" onClick={confirmIssue} disabled={saving}>
          {saving ? <LoaderCircle className="spin" size={20} /> : <FileCheck2 size={20} />}
          {saving ? 'جارٍ إصدار القبول...' : 'إصدار وحفظ القبول'}
        </button>
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
          <button className="nav-item nav-item--active"><LayoutDashboard size={20} /> لوحة التحكم</button>
          <button className={`nav-item ${view === 'new' || view === 'preview' ? 'nav-item--active' : ''}`} onClick={openNew}><FilePlus2 size={20} /> إصدار قبول جديد</button>
          <button className="nav-item"><Archive size={20} /> أرشيف القبولات</button>
          <button className="nav-item"><Search size={20} /> البحث المتقدم</button>
        </nav>
        <button className="logout-button" onClick={() => supabase.auth.signOut()}>
          <LogOut size={19} /> تسجيل الخروج
        </button>
      </aside>

      <main className="dashboard">
        <header className="topbar">
          <div>
            <span>منظومة قبولات النشر</span>
            <small>{session.user.email}</small>
          </div>
          <div className="status-pill"><span /> متصل بقاعدة البيانات</div>
        </header>

        <div className="dashboard__content">
          {view === 'new' ? (
            <NewAcceptanceForm initialDraft={draft} onCancel={() => setView('dashboard')} onPreview={showPreview} />
          ) : view === 'preview' && draft ? (
            <AcceptancePreview draft={draft} onEdit={() => setView('new')} onConfirmed={finishIssue} />
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
              <button className="text-button">عرض الأرشيف <ChevronLeft size={17} /></button>
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
