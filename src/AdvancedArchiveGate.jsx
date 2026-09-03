import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import AdvancedArchivePage from './AdvancedArchivePage.jsx'
import { isSupabaseConfigured, supabase } from './lib/supabase'

export default function AdvancedArchiveGate() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setSession(null)
      return undefined
    }
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session ?? null)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession ?? null)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  if (session === undefined) return <main className="advanced-archive-page"><div className="advanced-empty"><LoaderCircle className="spin" size={32} /> جارٍ التحقق من جلسة الدخول...</div></main>
  if (!session) return <main className="advanced-archive-page" dir="rtl"><div className="advanced-archive-shell"><section className="advanced-table-card advanced-empty"><p>يجب تسجيل الدخول بحساب المجلة أولًا.</p><a href={window.location.pathname}>العودة إلى تسجيل الدخول</a></section></div></main>
  return <AdvancedArchivePage session={session} />
}
