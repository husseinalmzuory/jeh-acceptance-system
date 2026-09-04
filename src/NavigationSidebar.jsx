import {
  Archive,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
} from 'lucide-react'
import { supabase } from './lib/supabase'

function SidebarBrand() {
  return (
    <div className="brand brand--compact">
      <div className="brand__seal" aria-hidden="true">JEH</div>
      <div>
        <strong>مجلة التربية للعلوم الإنسانية</strong>
        <span>جامعة الموصل</span>
      </div>
    </div>
  )
}

function openMainView(view) {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  if (view !== 'dashboard') url.searchParams.set('view', view)
  window.location.assign(url.toString())
}

function openStandalonePage(key) {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set(key, '1')
  window.location.assign(url.toString())
}

export default function NavigationSidebar({
  active = 'dashboard',
  onDashboard,
  onNew,
  onArchive,
  onSearch,
}) {
  const runOrOpen = (callback, view) => {
    if (callback) callback()
    else openMainView(view)
  }

  const logout = async () => {
    await supabase?.auth.signOut()
    openMainView('dashboard')
  }

  return (
    <aside className="sidebar">
      <SidebarBrand />
      <nav aria-label="التنقل الرئيسي">
        <button className={`nav-item ${active === 'dashboard' ? 'nav-item--active' : ''}`} type="button" onClick={() => runOrOpen(onDashboard, 'dashboard')}>
          <LayoutDashboard size={20} /> لوحة التحكم
        </button>
        <button className={`nav-item ${active === 'new' || active === 'preview' ? 'nav-item--active' : ''}`} type="button" onClick={() => runOrOpen(onNew, 'new')}>
          <FilePlus2 size={20} /> إصدار قبول جديد
        </button>
        <button className={`nav-item ${active === 'archive' ? 'nav-item--active' : ''}`} type="button" onClick={() => runOrOpen(onArchive, 'archive')}>
          <Archive size={20} /> أرشيف القبولات
        </button>
        <button className={`nav-item ${active === 'search' ? 'nav-item--active' : ''}`} type="button" onClick={() => runOrOpen(onSearch, 'search')}>
          <Search size={20} /> البحث المتقدم
        </button>
        <button className={`nav-item ${active === 'advancedArchive' ? 'nav-item--active' : ''}`} type="button" onClick={() => openStandalonePage('advancedArchive')}>
          <Archive size={20} /> الأرشيف المتقدم
        </button>
        <button className={`nav-item ${active === 'admin' ? 'nav-item--active' : ''}`} type="button" onClick={() => openStandalonePage('admin')}>
          <Settings size={20} /> الإدارة والإعدادات
        </button>
      </nav>
      <button className="logout-button" type="button" onClick={logout}>
        <LogOut size={19} /> تسجيل الخروج
      </button>
    </aside>
  )
}
