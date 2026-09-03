import { useEffect } from 'react'
import { supabase } from './lib/supabase'

const defaults = {
  name_ar: 'مجلة التربية للعلوم الإنسانية',
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

function setText(node, value) {
  if (node && value != null) node.textContent = String(value)
}

function applySettings(letter, settings) {
  if (!letter) return

  setText(letter.querySelector('.journal-heading h2'), settings.name_ar)
  setText(letter.querySelector('.journal-heading p'), `مجلة أكاديمية فصلية محكمة تأسست سنة ${settings.established_year}م`)

  const arabicHeaderSpans = letter.querySelectorAll('.letter-header__arabic span')
  setText(arabicHeaderSpans[1], settings.university_ar)
  setText(arabicHeaderSpans[2], settings.college_ar)

  const metaBlocks = letter.querySelectorAll('.letter-meta > div')
  if (metaBlocks[1]) {
    metaBlocks[1].replaceChildren(
      document.createTextNode('رقم الإيداع في دار الكتب والوثائق ببغداد'),
      document.createElement('br'),
      Object.assign(document.createElement('strong'), { textContent: settings.deposit_number }),
    )
  }
  const issnStrong = metaBlocks[2]?.querySelector('strong')
  if (issnStrong) setText(issnStrong, `ISSN ${settings.issn}`)

  const signature = letter.querySelector('.letter-signature')
  if (signature) {
    setText(signature.querySelector('strong'), settings.editor_name_ar)
    setText(signature.querySelector('span'), settings.editor_title_ar)
  }

  const contact = letter.querySelector('.letter-contact')
  if (contact) {
    setText(contact.querySelector('strong'), settings.name_ar)
    const spans = contact.querySelectorAll(':scope > span')
    setText(spans[0], `${settings.university_ar} / ${settings.college_ar} / الموصل - العراق`)
    setText(spans[1], `البريد الإلكتروني: ${settings.email}`)
    spans[1]?.setAttribute('dir', 'ltr')
    setText(spans[2], `الهاتف: ${settings.phone}`)
    spans[2]?.setAttribute('dir', 'ltr')
  }

  const bodyParagraphs = [...letter.querySelectorAll('.letter-body > p')]
  const officialText = bodyParagraphs.find((paragraph) => paragraph.textContent?.trim().startsWith('في مجلة التربية للعلوم الإنسانية'))
  setText(officialText, settings.acceptance_text_ar)
}

export default function LetterSettingsRuntime() {
  useEffect(() => {
    let active = true
    let settings = defaults
    let scheduled = false

    const applyAll = () => {
      scheduled = false
      document.querySelectorAll('.letter-preview').forEach((letter) => applySettings(letter, settings))
    }

    const scheduleApply = () => {
      if (scheduled) return
      scheduled = true
      window.requestAnimationFrame(applyAll)
    }

    const load = async () => {
      if (!supabase) return
      const { data } = await supabase.from('settings').select('value').eq('key', 'journal').maybeSingle()
      if (!active) return
      settings = { ...defaults, ...(data?.value ?? {}) }
      scheduleApply()
    }

    load()
    scheduleApply()
    const observer = new MutationObserver(scheduleApply)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      active = false
      observer.disconnect()
    }
  }, [])

  return null
}
