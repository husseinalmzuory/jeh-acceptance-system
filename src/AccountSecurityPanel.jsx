import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { KeyRound, LoaderCircle, LogOut, ShieldCheck } from 'lucide-react'
import { supabase } from './lib/supabase'

export default function AccountSecurityPanel() {
  const [target, setTarget] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let lastTarget = null
    const locate = () => {
      const next = document.querySelector('.admin-tools-shell')
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

  const updatePassword = async (event) => {
    event.preventDefault()
    setMessage('')
    if (password.length < 8) {
      setMessage('يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.')
      return
    }
    if (password !== confirmPassword) {
      setMessage('كلمتا المرور غير متطابقتين.')
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) {
      setMessage('تعذر تغيير كلمة المرور. حاول مرة أخرى.')
      return
    }
    setPassword('')
    setConfirmPassword('')
    setMessage('تم تغيير كلمة مرور حساب المجلة بنجاح.')
  }

  const signOutEverywhere = async () => {
    const approved = window.confirm('تسجيل خروج حساب المجلة من جميع الجلسات والأجهزة؟')
    if (!approved) return
    setSaving(true)
    await supabase.auth.signOut({ scope: 'global' })
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = ''
    window.location.assign(url.toString())
  }

  if (!target) return null

  return createPortal(
    <section className="admin-tools-card account-security-card">
      <div className="admin-tools-card-heading"><ShieldCheck size={22} /><div><h2>أمان حساب المجلة</h2><p>تغيير كلمة المرور أو إنهاء الجلسات المفتوحة عند تسليم الحساب لموظف آخر.</p></div></div>
      {message && <div className="admin-tools-message">{message}</div>}
      <form className="account-security-form" onSubmit={updatePassword}>
        <label>كلمة المرور الجديدة<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required /></label>
        <label>تأكيد كلمة المرور<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required /></label>
        <button type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" size={18} /> : <KeyRound size={18} />} تغيير كلمة المرور</button>
      </form>
      <div className="account-security-global">
        <div><strong>إنهاء جميع الجلسات</strong><span>استخدم هذا الخيار إذا تم تغيير الموظف المسؤول أو فُتح الحساب على جهاز غير موثوق.</span></div>
        <button type="button" onClick={signOutEverywhere} disabled={saving}><LogOut size={18} /> تسجيل خروج شامل</button>
      </div>
    </section>,
    target,
  )
}
