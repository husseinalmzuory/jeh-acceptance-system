import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

function setControlledValue(element, value) {
  if (!element || element.value === value) return
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  if (!setter) return
  setter.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

function localIsoDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function cleanNewAcceptanceForm() {
  const page = document.querySelector('.form-page')
  if (!page) return
  const heading = page.querySelector('.page-heading h1')?.textContent?.trim()
  if (heading !== 'إصدار قبول جديد' || page.dataset.productionCleaned === 'true') return

  const researcherRows = [...page.querySelectorAll('.researcher-row')]
  if (researcherRows.length > 1) {
    researcherRows.at(-1)?.querySelector('.remove-researcher')?.click()
    return
  }

  setControlledValue(page.querySelector('input[name="acceptance_number"]'), '')
  setControlledValue(page.querySelector('textarea[name="research_title_ar"]'), '')
  setControlledValue(page.querySelector('textarea[name="research_title_en"]'), '')
  setControlledValue(page.querySelector('textarea[name="internal_notes"]'), '')
  setControlledValue(page.querySelector('input[name="received_on"]'), '')
  setControlledValue(page.querySelector('input[name="reviewed_on"]'), '')

  const today = localIsoDate()
  setControlledValue(page.querySelector('input[name="accepted_on"]'), today)
  setControlledValue(page.querySelector('input[name="letter_date"]'), today)

  const researcherInputs = page.querySelectorAll('.researcher-row input')
  researcherInputs.forEach((input) => setControlledValue(input, ''))
  page.dataset.productionCleaned = 'true'
}

function applyStaticProductionLabels(yearCount) {
  const version = document.querySelector('.version-label')
  if (version && version.textContent !== 'الإصدار 1.0') version.textContent = 'الإصدار 1.0'

  if (yearCount != null) {
    const cards = document.querySelectorAll('.stats-grid .stat-card')
    const yearValue = cards[1]?.querySelector('strong')
    if (yearValue && yearValue.textContent !== String(yearCount)) yearValue.textContent = String(yearCount)
  }
}

export default function ProductionRuntime() {
  const [yearCount, setYearCount] = useState(null)

  useEffect(() => {
    let active = true
    const currentYear = new Date().getFullYear()
    const loadYearCount = async () => {
      if (!supabase) return
      const { count } = await supabase
        .from('acceptances')
        .select('*', { count: 'exact', head: true })
        .gte('accepted_on', `${currentYear}-01-01`)
        .lte('accepted_on', `${currentYear}-12-31`)
      if (active) setYearCount(count ?? 0)
    }
    loadYearCount()
    return () => { active = false }
  }, [])

  useEffect(() => {
    let scheduled = false
    const apply = () => {
      scheduled = false
      cleanNewAcceptanceForm()
      applyStaticProductionLabels(yearCount)
    }
    const schedule = () => {
      if (scheduled) return
      scheduled = true
      window.requestAnimationFrame(apply)
    }
    schedule()
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [yearCount])

  return null
}
