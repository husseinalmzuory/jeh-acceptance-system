import { useEffect, useMemo, useState } from 'react'
import { Archive, ChevronLeft, ChevronRight, Copy, LoaderCircle, Search, ShieldCheck, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import './advanced-archive.css'

function formatDate(value) {
  if (!value) return '—'
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

function researchersOf(item) {
  return [...(item.acceptance_researchers ?? [])]
    .sort((a, b) => a.author_order - b.author_order)
    .map((link) => link.researchers)
    .filter(Boolean)
}

export default function AdvancedArchivePage({ session }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('all')
  const [status, setStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const pageSize = 20

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!session) return
      const { data, error } = await supabase
        .from('acceptances')
        .select(`
          id, acceptance_number, research_title_ar, research_title_en,
          recipient_name, recipient_affiliation, received_on, reviewed_on,
          accepted_on, letter_date, document_status, internal_notes,
          revoked_at, revocation_reason, created_at, updated_at,
          acceptance_researchers (
            author_order,
            researchers (name_ar, workplace)
          )
        `)
        .order('created_at', { ascending: false })
      if (!active) return
      if (error) setMessage('تعذر تحميل الأرشيف المتقدم.')
      setItems(data ?? [])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [session])

  const years = useMemo(() => [...new Set(items.map((item) => item.accepted_on?.slice(0, 4)).filter(Boolean))].sort().reverse(), [items])

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('ar')
    const result = items.filter((item) => {
      const researchers = researchersOf(item)
      const searchable = [
        item.acceptance_number,
        item.research_title_ar,
        item.research_title_en,
        item.recipient_name,
        item.recipient_affiliation,
        ...researchers.flatMap((researcher) => [researcher.name_ar, researcher.workplace]),
      ]
      const matchesText = !term || searchable.some((value) => value?.toLocaleLowerCase('ar').includes(term))
      const matchesYear = year === 'all' || item.accepted_on?.startsWith(year)
      const matchesStatus = status === 'all' || item.document_status === status
      const matchesFrom = !dateFrom || item.accepted_on >= dateFrom
      const matchesTo = !dateTo || item.accepted_on <= dateTo
      return matchesText && matchesYear && matchesStatus && matchesFrom && matchesTo
    })
    result.sort((a, b) => {
      const left = new Date(a.created_at).getTime()
      const right = new Date(b.created_at).getTime()
      return sort === 'oldest' ? left - right : right - left
    })
    return result
  }, [items, query, year, status, dateFrom, dateTo, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => { setPage(1) }, [query, year, status, dateFrom, dateTo, sort])

  const clearFilters = () => {
    setQuery('')
    setYear('all')
    setStatus('all')
    setDateFrom('')
    setDateTo('')
    setSort('newest')
  }

  const copyVerificationLink = async (item) => {
    setMessage('')
    const { data, error } = await supabase.rpc('get_acceptance_verification_token', { p_acceptance_id: item.id })
    if (error || !data) {
      setMessage('تعذر إنشاء رابط التحقق لهذا القبول.')
      return
    }
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = ''
    url.searchParams.set('verify', data)
    try {
      await navigator.clipboard.writeText(url.toString())
      setMessage('تم نسخ رابط التحقق.')
    } catch {
      setMessage(url.toString())
    }
  }

  return (
    <main className="advanced-archive-page" dir="rtl">
      <div className="advanced-archive-shell">
        <header className="advanced-archive-header">
          <div><p>منظومة قبولات النشر</p><h1>الأرشيف المتقدم</h1></div>
          <a href={window.location.pathname}>العودة إلى المنظومة</a>
        </header>

        <section className="advanced-filters">
          <label className="advanced-search"><Search size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="رقم القبول، الباحث، مكان العمل، أو عنوان البحث" /></label>
          <label>السنة<select value={year} onChange={(e) => setYear(e.target.value)}><option value="all">الكل</option>{years.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>الحالة<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">الكل</option><option value="active">ساري</option><option value="revoked">ملغى</option></select></label>
          <label>من تاريخ<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
          <label>إلى تاريخ<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
          <label>الترتيب<select value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">الأحدث أولًا</option><option value="oldest">الأقدم أولًا</option></select></label>
          <button type="button" onClick={clearFilters}>مسح الفلاتر</button>
        </section>

        <div className="advanced-summary"><strong>{filtered.length}</strong> نتيجة من أصل {items.length} قبول</div>
        {message && <div className="advanced-message">{message}</div>}

        <section className="advanced-table-card">
          {loading ? <div className="advanced-empty"><LoaderCircle className="spin" size={30} /> جارٍ تحميل السجلات...</div>
            : pageItems.length === 0 ? <div className="advanced-empty"><Archive size={30} /> لا توجد نتائج مطابقة.</div>
              : <div className="advanced-table-wrap"><table><thead><tr><th>رقم القبول</th><th>الباحثون</th><th>عنوان البحث</th><th>تاريخ القبول</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>
                {pageItems.map((item) => {
                  const researchers = researchersOf(item)
                  return <tr key={item.id}><td dir="ltr">{item.acceptance_number}</td><td>{researchers.map((researcher) => researcher.name_ar).join('، ') || item.recipient_name}</td><td>{item.research_title_ar}</td><td>{formatDate(item.accepted_on)}</td><td><span className={item.document_status === 'revoked' ? 'advanced-status advanced-status--revoked' : 'advanced-status'}>{item.document_status === 'revoked' ? 'ملغى' : 'ساري'}</span></td><td><button className="advanced-open" type="button" onClick={() => setSelected(item)}>فتح</button></td></tr>
                })}
              </tbody></table></div>}
        </section>

        {pageCount > 1 && <nav className="advanced-pagination" aria-label="صفحات الأرشيف"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}><ChevronRight size={18} /> السابق</button><span>صفحة {currentPage} من {pageCount}</span><button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount}>التالي <ChevronLeft size={18} /></button></nav>}

        {selected && <div className="advanced-modal-backdrop"><section className="advanced-modal" role="dialog" aria-modal="true"><button className="advanced-modal-close" type="button" onClick={() => setSelected(null)}><X size={20} /></button><div className="advanced-modal-title"><ShieldCheck size={25} /><div><p>تفاصيل القبول</p><h2 dir="ltr">{selected.acceptance_number}</h2></div></div><dl><div><dt>الحالة</dt><dd>{selected.document_status === 'revoked' ? 'ملغى' : 'ساري'}</dd></div><div><dt>تاريخ الكتاب</dt><dd>{formatDate(selected.letter_date)}</dd></div><div className="wide"><dt>عنوان البحث</dt><dd>{selected.research_title_ar}</dd></div>{selected.research_title_en && <div className="wide"><dt>Research title</dt><dd dir="ltr">{selected.research_title_en}</dd></div>}<div><dt>الاستلام</dt><dd>{formatDate(selected.received_on)}</dd></div><div><dt>المراجعة</dt><dd>{formatDate(selected.reviewed_on)}</dd></div><div><dt>القبول</dt><dd>{formatDate(selected.accepted_on)}</dd></div></dl><div className="advanced-modal-researchers"><h3>الباحثون</h3>{researchersOf(selected).map((researcher, index) => <div key={`${researcher.name_ar}-${index}`}><strong>{researcher.name_ar}</strong><span>{researcher.workplace}</span></div>)}</div>{selected.document_status === 'revoked' && <div className="advanced-revoked"><strong>سبب الإلغاء</strong><p>{selected.revocation_reason || '—'}</p><small>{selected.revoked_at ? formatDate(selected.revoked_at) : ''}</small></div>}<div className="advanced-modal-actions"><button type="button" onClick={() => copyVerificationLink(selected)}><Copy size={18} /> نسخ رابط التحقق</button></div></section></div>}
      </div>
    </main>
  )
}
