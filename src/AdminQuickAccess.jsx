import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Archive, Settings } from 'lucide-react'

export default function AdminQuickAccess() {
  const [target, setTarget] = useState(null)

  useEffect(() => {
    let lastTarget = null
    const locate = () => {
      const next = document.querySelector('.sidebar nav')
      if (next !== lastTarget) {
        lastTarget = next
        setTarget(next)
      }
    }
    locate()
    const observer = new MutationObserver(locate)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  if (!target) return null

  const openPage = (key) => {
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = ''
    url.searchParams.set(key, '1')
    window.location.assign(url.toString())
  }

  return createPortal(
    <>
      <button className="nav-item" type="button" onClick={() => openPage('advancedArchive')}>
        <Archive size={20} /> الأرشيف المتقدم
      </button>
      <button className="nav-item" type="button" onClick={() => openPage('admin')}>
        <Settings size={20} /> الإدارة والإعدادات
      </button>
    </>,
    target,
  )
}
