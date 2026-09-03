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
  Search,
  ShieldCheck,
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

function Dashboard({ session }) {
  const [count, setCount] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

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
  }, [])

  const currentYear = new Date().getFullYear()
  const thisYear = useMemo(
    () => recent.filter((item) => new Date(item.accepted_on).getFullYear() === currentYear).length,
    [recent, currentYear],
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand compact />
        <nav aria-label="التنقل الرئيسي">
          <button className="nav-item nav-item--active"><LayoutDashboard size={20} /> لوحة التحكم</button>
          <button className="nav-item"><FilePlus2 size={20} /> إصدار قبول جديد</button>
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
          <section className="welcome-row">
            <div><p>مرحبًا بك</p><h1>لوحة قبولات النشر</h1></div>
            <button className="primary-button"><FilePlus2 size={20} /> إصدار قبول جديد</button>
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
                <button className="secondary-button"><FilePlus2 size={18} /> إصدار أول قبول</button>
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
