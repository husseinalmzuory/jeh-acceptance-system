import { useEffect, useMemo, useState } from 'react'
import { Archive, Download, FileJson, LoaderCircle, Save, ShieldCheck } from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './admin-tools.css'

const defaultJournal = {
  name_ar: 'مجلة التربية للعلوم الإنسانية',
  name_en: 'Journal of Education for Humanities',
  university_ar: 'جامعة الموصل',
  college_ar: 'كلية التربية للعلوم الإنسانية',
  issn: '2710-124X',
  deposit_number: '2425 لسنة 2020',
  established_year: 2021,
  email: 'mzuory@gmail.com',
  phone: '+9647503496549',
  editor_name_ar: 'أ.د. إبراهيم محمد محمود الحمداني',
  editor_title_ar: 'رئيس هيئة التحرير',
  acceptance_text_ar: 'في مجلة التربية للعلوم الإنسانية، وسيُنشر في أحد الأعداد القادمة بعد استكمال الإجراءات العلمية والإدارية المعتمدة.',
}

function downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function csvCell(value) {
  const text = value == null ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export default function AdminToolsPage({ session }) {
  const [journal, setJournal] = useState(defaultJournal)
  const [stats, setStats] = useState({ total: 0, year: 0, month: 0, active: 0, revoked: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState('')

  const today = new Date()
  const yearStart = `${today.getFullYear()}-01-01`
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!isSupabaseConfigured || !supabase || !session) {
        if (active) {
          setMessage('تعذر فتح أدوات الإدارة. يجب تسجيل الدخول أولًا.')
          setLoading(false)
        }
        return
      }

      const [settingsResult, totalResult, yearResult, monthResult, activeResult, revokedResult, recentResult] = await Promise.all([
        supabase.from('settings').select('value').eq('key', 'journal').maybeSingle(),
        supabase.from('acceptances').select('*', { count: 'exact', head: true }),
        supabase.from('acceptances').select('*', { count: 'exact', head: true }).gte('accepted_on', yearStart),
        supabase.from('acceptances').select('*', { count: 'exact', head: true }).gte('accepted_on', monthStart),
        supabase.from('acceptances').select('*', { count: 'exact', head: true }).eq('document_status', 'active'),
        supabase.from('acceptances').select('*', { count: 'exact', head: true }).eq('document_status', 'revoked'),
        supabase.from('acceptances').select('id, acceptance_number, research_title_ar, accepted_on, document_status').order('created_at', { ascending: false }).limit(8),
      ])

      if (!active) return
      if (settingsResult.data?.value) setJournal({ ...defaultJournal, ...settingsResult.data.value })
      setStats({
        total: totalResult.count ?? 0,
        year: yearResult.count ?? 0,
        month: monthResult.count ?? 0,
        active: activeResult.count ?? 0,
        revoked: revokedResult.count ?? 0,
      })
      setRecent(recentResult.data ?? [])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [session, yearStart, monthStart])

  const update = (key, value) => setJournal((current) => ({ ...current, [key]: value }))

  const saveSettings = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    const { error } = await supabase.from('settings').upsert({
      key: 'journal',
      value: {
        ...journal,
        established_year: Number(journal.established_year) || 2021,
      },
      description: 'البيانات الرسمية الثابتة للمجلة',
    }, { onConflict: 'key' })
    setSaving(false)
    setMessage(error ? 'تعذر حفظ الإعدادات. حاول مرة أخرى.' : 'تم حفظ بيانات المجلة بنجاح.')
  }

  const exportRecords = async (format) => {
    setExporting(true)
    setMessage('')
    const { data, error } = await supabase
      .from('acceptances')
      .select(`
        id, acceptance_number, research_title_ar, research_title_en,
        received_on, reviewed_on, accepted_on, letter_date,
        document_status, revoked_at, revocation_reason, created_at, updated_at,
        acceptance_researchers (
          author_order,
          researchers (name_ar, workplace)
        )
      `)
      .order('created_at', { ascending: true })

    if (error) {
      setMessage('تعذر تجهيز ملف التصدير.')
      setExporting(false)
      return
    }

    const rows = (data ?? []).map((item) => {
      const researchers = [...(item.acceptance_researchers ?? [])]
        .sort((a, b) => a.author_order - b.author_order)
        .map((link) => link.researchers)
        .filter(Boolean)
      return {
        id: item.id,
        acceptance_number: item.acceptance_number,
        research_title_ar: item.research_title_ar,
        research_title_en: item.research_title_en ?? '',
        researchers: researchers.map((researcher) => researcher.name_ar).join(' | '),
        workplaces: researchers.map((researcher) => researcher.workplace).join(' | '),
        received_on: item.received_on,
        reviewed_on: item.reviewed_on,
        accepted_on: item.accepted_on,
        letter_date: item.letter_date,
        status: item.document_status,
        revoked_at: item.revoked_at ?? '',
        revocation_reason: item.revocation_reason ?? '',
        created_at: item.created_at,
        updated_at: item.updated_at,
      }
    })

    const stamp = new Date().toISOString().slice(0, 10)
    if (format === 'json') {
      downloadText(`jeh-acceptances-backup-${stamp}.json`, JSON.stringify({ exported_at: new Date().toISOString(), journal, acceptances: rows }, null, 2), 'application/json;charset=utf-8')
    } else {
      const headers = Object.keys(rows[0] ?? {
        id: '', acceptance_number: '', research_title_ar: '', research_title_en: '', researchers: '', workplaces: '', received_on: '', reviewed_on: '', accepted_on: '', letter_date: '', status: '', revoked_at: '', revocation_reason: '', created_at: '', updated_at: '',
      })
      const csv = '\ufeff' + [headers.map(csvCell).join(','), ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(','))].join('\r\n')
      downloadText(`jeh-acceptances-${stamp}.csv`, csv, 'text/csv;charset=utf-8')
    }
    setExporting(false)
  }

  const latestNumber = useMemo(() => recent[0]?.acceptance_number ?? '—', [recent])

  if (loading) {
    return <main className="admin-tools-page"><div className="admin-tools-loading"><LoaderCircle className="spin" size={34} /> جارٍ تحميل أدوات الإدارة...</div></main>
  }

  return (
    <main className="admin-tools-page" dir="rtl">
      <div className="admin-tools-shell">
        <header className="admin-tools-header">
          <div><p>منظومة قبولات النشر</p><h1>الإدارة والإعدادات</h1></div>
          <a className="admin-tools-back" href={window.location.pathname}>العودة إلى المنظومة</a>
        </header>

        {message && <div className="admin-tools-message">{message}</div>}

        <section className="admin-stats-grid">
          <article><span>إجمالي القبولات</span><strong>{stats.total}</strong></article>
          <article><span>قبولات السنة الحالية</span><strong>{stats.year}</strong></article>
          <article><span>قبولات الشهر الحالي</span><strong>{stats.month}</strong></article>
          <article><span>السارية</span><strong>{stats.active}</strong></article>
          <article><span>الملغاة</span><strong>{stats.revoked}</strong></article>
          <article><span>أحدث رقم قبول</span><strong dir="ltr">{latestNumber}</strong></article>
        </section>

        <section className="admin-tools-card">
          <div className="admin-tools-card-heading"><ShieldCheck size={22} /><div><h2>بيانات المجلة الثابتة</h2><p>تُحفظ مركزيًا في Supabase تمهيدًا لاستخدامها في جميع الكتب والواجهات.</p></div></div>
          <form className="journal-settings-form" onSubmit={saveSettings}>
            <label>اسم المجلة بالعربية<input value={journal.name_ar} onChange={(e) => update('name_ar', e.target.value)} required /></label>
            <label>اسم المجلة بالإنجليزية<input dir="ltr" value={journal.name_en} onChange={(e) => update('name_en', e.target.value)} required /></label>
            <label>الجامعة<input value={journal.university_ar} onChange={(e) => update('university_ar', e.target.value)} required /></label>
            <label>الكلية<input value={journal.college_ar} onChange={(e) => update('college_ar', e.target.value)} required /></label>
            <label>ISSN<input dir="ltr" value={journal.issn} onChange={(e) => update('issn', e.target.value)} required /></label>
            <label>رقم الإيداع<input value={journal.deposit_number} onChange={(e) => update('deposit_number', e.target.value)} required /></label>
            <label>سنة التأسيس<input type="number" min="1900" max="2100" value={journal.established_year} onChange={(e) => update('established_year', e.target.value)} required /></label>
            <label>البريد الإلكتروني<input dir="ltr" type="email" value={journal.email} onChange={(e) => update('email', e.target.value)} required /></label>
            <label>رقم الهاتف<input dir="ltr" value={journal.phone} onChange={(e) => update('phone', e.target.value)} required /></label>
            <label>اسم رئيس التحرير<input value={journal.editor_name_ar} onChange={(e) => update('editor_name_ar', e.target.value)} required /></label>
            <label>صفة رئيس التحرير<input value={journal.editor_title_ar} onChange={(e) => update('editor_title_ar', e.target.value)} required /></label>
            <label className="journal-settings-wide">النص الرسمي للقبول<textarea rows="3" value={journal.acceptance_text_ar} onChange={(e) => update('acceptance_text_ar', e.target.value)} required /></label>
            <div className="journal-settings-actions"><button type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" size={19} /> : <Save size={19} />}{saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</button></div>
          </form>
        </section>

        <section className="admin-tools-card">
          <div className="admin-tools-card-heading"><Archive size={22} /><div><h2>التصدير والنسخة الاحتياطية</h2><p>لا يتم تخزين PDF؛ هذه الملفات تحفظ بيانات السجل الأساسية فقط.</p></div></div>
          <div className="admin-export-actions">
            <button type="button" onClick={() => exportRecords('csv')} disabled={exporting}><Download size={19} /> تصدير CSV</button>
            <button type="button" onClick={() => exportRecords('json')} disabled={exporting}><FileJson size={19} /> نسخة احتياطية JSON</button>
          </div>
        </section>

        <section className="admin-tools-card">
          <div className="admin-tools-card-heading"><Archive size={22} /><div><h2>آخر القبولات</h2><p>ملخص سريع لأحدث السجلات المحفوظة.</p></div></div>
          <div className="admin-recent-list">
            {recent.map((item) => <div key={item.id}><strong dir="ltr">{item.acceptance_number}</strong><span>{item.research_title_ar}</span><small>{item.accepted_on} · {item.document_status === 'revoked' ? 'ملغى' : 'ساري'}</small></div>)}
          </div>
        </section>
      </div>
    </main>
  )
}
