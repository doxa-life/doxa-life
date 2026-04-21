// Port of the `.highlight` word-highlighter from marketing-theme/js/theme.js.
// Walks `.highlight` elements and wraps a word at `data-highlight-index`
// (1-based) and/or the last word (`data-highlight-last`) in a span coloured
// via `data-highlight-color` (defaults to "primary").
//
// Usage: call `applyTextHighlights()` in an `onMounted` hook of any page
// that renders `.highlight` headings. Idempotent — marks the element with
// a flag so re-runs are cheap.

const PROCESSED_FLAG = 'highlightProcessed'

export function applyTextHighlights(root: ParentNode = document) {
  if (!import.meta.client) return

  const nodes = root.querySelectorAll<HTMLElement>('.highlight')
  nodes.forEach((item) => {
    if (item.dataset[PROCESSED_FLAG] === 'true') return

    const words = (item.textContent ?? '').split(' ')
    const highlightIndex = item.dataset.highlightIndex ? parseInt(item.dataset.highlightIndex, 10) - 1 : -1
    const highlightLast = 'highlightLast' in item.dataset
    const color = item.dataset.highlightColor || 'primary'

    const out = words.reduce<string[]>((acc, word, index) => {
      if (highlightIndex > -1 && index === highlightIndex) {
        acc.push(`<span class="color-${color}">${word}</span>`)
      } else if (highlightLast && index === words.length - 1) {
        acc.push(`<span class="color-${color}">${word}</span>`)
      } else {
        acc.push(word)
      }
      return acc
    }, [])

    item.innerHTML = out.join(' ')
    item.dataset[PROCESSED_FLAG] = 'true'
  })
}

// Convenience composable that applies highlights on mount. Call once in a
// page/component's `<script setup>`.
export function useTextHighlight() {
  onMounted(() => applyTextHighlights())
}
