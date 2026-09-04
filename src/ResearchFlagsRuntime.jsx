import { useEffect } from 'react'
import { supabase } from './lib/supabase'
import './research-flags.css'

const STORAGE_KEY = 'jeh-research-flags-draft'

function readStoredFlags() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

function writeStoredFlags(flags) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
  window.dispatchEvent(new CustomEvent('jeh-acceptance-options-changed', { detail: flags }))
}

function readFormNumber(page) {
  return page?.querySelector('input[name="acceptance_number"]')?.value?.trim() || ''
}

function getSelectedValue(container, name) {
  const checked = container?.querySelector(`input[name="${name}"]:checked`)
  if (!checked) return null
  return checked.value === 'yes'
}

function collectFlags(container, acceptanceNumber) {
  return {
    acceptanceNumber,
    isExtractedResearch: getSelectedValue(container, 'research_is_extracted'),
    isIraqiResearch: getSelectedValue(container, 'research_is_iraqi'),
    isNonArabicLanguage: getSelectedValue(container, 'research_is_non_arabic'),
    includeSignatureStamp: getSelectedValue(container, 'acceptance_include_signature_stamp'),
  }
}

function setChoice(container, name, value) {
  if (value !== true && value !== false) return
  const selector = `input[name="${name}"][value="${value ? 'yes' : 'no'}"]`
  const input = container.querySelector(selector)
  if (input) input.checked = true
}

function buildQuestion(name, labelText) {
  const block = document.createElement('fieldset')
  block.className = 'research-flag-card'

  const legend = document.createElement('legend')
  legend.textContent = `${labelText} *`
  block.appendChild(legend)

  const choices = document.createElement('div')
  choices.className = 'research-flag-choices'

  ;[
    ['yes', 'نعم'],
    ['no', 'لا'],
  ].forEach(([value, text]) => {
    const label = document.createElement('label')
    label.className = 'research-flag-choice'

    const input = document.createElement('input')
    input.type = 'radio'
    input.name = name
    input.value = value
    input.required = true

    const span = document.createElement('span')
    span.textContent = text

    label.append(input, span)
    choices.appendChild(label)
  })

  block.appendChild(choices)
  return block
}

function createFlagsSection() {
  const section = document.createElement('div')
  section.className = 'form-section research-flags-section'
  section.dataset.researchFlags = 'true'

  const title = document.createElement('div')
  title.className = 'form-section__title'
  title.innerHTML = '<span>✓</span><div><h2>تصنيف وخيارات القبول</h2><p>يجب الإجابة عن جميع الخيارات قبل الانتقال إلى المعاينة</p></div>'

  const grid = document.createElement('div')
  grid.className = 'research-flags-grid'
  grid.append(
    buildQuestion('research_is_extracted', 'هل البحث مستل؟'),
    buildQuestion('research_is_iraqi', 'هل البحث عراقي؟'),
    buildQuestion('research_is_non_arabic', 'هل البحث مكتوب بلغة غير العربية؟'),
    buildQuestion('acceptance_include_signature_stamp', 'قبول بتوقيع وختم؟'),
  )

  section.append(title, grid)
  return section
}

async function loadExistingFlags(page, container) {
  const acceptanceNumber = readFormNumber(page)
  const stored = readStoredFlags()
  const heading = page.querySelector('.page-heading h1')?.textContent?.trim()
  const isEditing = heading === 'تعديل قبول محفوظ'

  // Every new acceptance must start with all four choices unanswered. Do not
  // reuse a previous draft or silently assume a signature/stamp preference.
  if (!isEditing) {
    sessionStorage.removeItem(STORAGE_KEY)
    return
  }

  if (stored?.acceptanceNumber === acceptanceNumber && acceptanceNumber) {
    setChoice(container, 'research_is_extracted', stored.isExtractedResearch)
    setChoice(container, 'research_is_iraqi', stored.isIraqiResearch)
    setChoice(container, 'research_is_non_arabic', stored.isNonArabicLanguage)
    setChoice(container, 'acceptance_include_signature_stamp', stored.includeSignatureStamp ?? true)
    return
  }

  if (!acceptanceNumber || !supabase) {
    sessionStorage.removeItem(STORAGE_KEY)
    return
  }

  const { data } = await supabase
    .from('acceptances')
    .select('is_extracted_research,is_iraqi_research,is_non_arabic_language,include_signature_stamp')
    .eq('acceptance_number', acceptanceNumber)
    .maybeSingle()

  if (!data) return

  setChoice(container, 'research_is_extracted', data.is_extracted_research)
  setChoice(container, 'research_is_iraqi', data.is_iraqi_research)
  setChoice(container, 'research_is_non_arabic', data.is_non_arabic_language)
  setChoice(container, 'acceptance_include_signature_stamp', data.include_signature_stamp ?? true)

  writeStoredFlags({
    acceptanceNumber,
    isExtractedResearch: data.is_extracted_research,
    isIraqiResearch: data.is_iraqi_research,
    isNonArabicLanguage: data.is_non_arabic_language,
    includeSignatureStamp: data.include_signature_stamp ?? true,
  })
}

function injectFlagsSection() {
  const page = document.querySelector('.form-page')
  if (!page || page.querySelector('[data-research-flags="true"]')) return

  const sections = page.querySelectorAll('.form-section')
  const researchersSection = sections[1]
  if (!researchersSection) return

  const section = createFlagsSection()
  researchersSection.insertAdjacentElement('afterend', section)

  section.addEventListener('change', () => {
    writeStoredFlags(collectFlags(section, readFormNumber(page)))
  })

  loadExistingFlags(page, section)
}

export default function ResearchFlagsRuntime() {
  useEffect(() => {
    if (!supabase) return undefined

    const originalRpc = supabase.rpc.bind(supabase)
    const patchedRpc = (fn, args = {}, options) => {
      if (fn === 'create_acceptance' || fn === 'update_acceptance') {
        const stored = readStoredFlags()
        args = {
          ...args,
          p_is_extracted_research: stored?.isExtractedResearch ?? null,
          p_is_iraqi_research: stored?.isIraqiResearch ?? null,
          p_is_non_arabic_language: stored?.isNonArabicLanguage ?? null,
          p_include_signature_stamp: stored?.includeSignatureStamp ?? null,
        }
      }
      return originalRpc(fn, args, options)
    }

    supabase.rpc = patchedRpc

    let scheduled = false
    const schedule = () => {
      if (scheduled) return
      scheduled = true
      requestAnimationFrame(() => {
        scheduled = false
        injectFlagsSection()
      })
    }

    schedule()
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      supabase.rpc = originalRpc
    }
  }, [])

  return null
}
