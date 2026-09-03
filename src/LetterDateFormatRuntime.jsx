import { useEffect } from 'react'

const DAY_FIRST_DATE = /\b(\d{2})\/(\d{2})\/(\d{4})\b/g

function convertText(text) {
  return text.replace(DAY_FIRST_DATE, (_match, day, month, year) => `${year}/${month}/${day}`)
}

function applyLetterDateFormat(letter) {
  if (!letter) return

  const walker = document.createTreeWalker(letter, NodeFilter.SHOW_TEXT)
  const nodes = []
  let node = walker.nextNode()
  while (node) {
    nodes.push(node)
    node = walker.nextNode()
  }

  nodes.forEach((textNode) => {
    const current = textNode.nodeValue ?? ''
    if (!DAY_FIRST_DATE.test(current)) {
      DAY_FIRST_DATE.lastIndex = 0
      return
    }
    DAY_FIRST_DATE.lastIndex = 0
    const next = convertText(current)
    if (next !== current) textNode.nodeValue = next
    DAY_FIRST_DATE.lastIndex = 0
  })
}

export default function LetterDateFormatRuntime() {
  useEffect(() => {
    let scheduled = false

    const applyAll = () => {
      scheduled = false
      document.querySelectorAll('.letter-preview').forEach(applyLetterDateFormat)
    }

    const schedule = () => {
      if (scheduled) return
      scheduled = true
      window.requestAnimationFrame(applyAll)
    }

    schedule()
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    return () => observer.disconnect()
  }, [])

  return null
}
