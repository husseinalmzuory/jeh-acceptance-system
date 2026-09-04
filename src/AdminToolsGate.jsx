import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import AdminToolsPage from './AdminToolsPage.jsx'
import NavigationSidebar from './NavigationSidebar.jsx'
import { isSupabaseConfigured, supabase } from './lib/supabase'

export default function AdminToolsGate() {
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

  if (session === undefined) {
    return <main className="admin-tools-page"><div className="admin-tools-loading"><LoaderCircle className="spin" size={34} /> جارٍ التحقق من جلسة الدخول...</div></main>
  }

  if (!session) {
    const back = () => {
      const url = new URL(window.location.href)
      url.search = ''
      url.hash = ''
      window.location.assign(url.toString())
    }
    return (
      <main className="admin-tools-page" dir="rtl">
        <div className="admin-tools-shell">
          <section className="admin-tools-card">
            <h2>يجب تسجيل الدخول</h2>
            <p>أدوات الإدارة والإعدادات متاحة لحساب المجلة فقط.</p>
            <button className="admin-tools-login" type="button" onClick={back}>العودة إلى صفحة تسجيل الدخول</button>
          </section>
        </div>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <NavigationSidebar active="admin" />
      <div className="standalone-page-content">
        <AdminToolsPage session={session} />
      </div>
    </div>
  )
}
