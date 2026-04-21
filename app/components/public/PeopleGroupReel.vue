<script setup lang="ts">
// Port of the `#reel-people-groups` carousel from marketing-theme/js/theme.js.
// Fetches up to 20 random people groups with photos, dedupes multiple "deaf"
// entries, renders them into the `.reel` container, then starts a
// setInterval auto-scroll (20ms tick, RTL-aware). Matches the original
// CUBE classes (`reel`, `reel__item`, `stack stack--sm`, `light-link`,
// `square rounded-md size-md`, etc.) so the existing SCSS applies.

import type { Uupg } from '~/types/uupg'

const props = withDefaults(defineProps<{
  researchUrl?: string
  languageCode?: string
}>(), {
  researchUrl: '/research/',
  languageCode: 'en'
})

const config = useRuntimeConfig()
const prayBaseUrl = config.public.prayBaseUrl as string
const NUMBER_OF_PEOPLE_GROUPS = 20

const reelRef = ref<HTMLDivElement | null>(null)
const items = ref<Uupg[]>([])
let tickHandle: ReturnType<typeof setInterval> | null = null
let isFadedIn = false

async function fetchReel(): Promise<Uupg[]> {
  const url = `${prayBaseUrl}/api/people-groups/list?lang=${props.languageCode}`
  const response = await fetch(url)
  const data = await response.json()
  const withPhoto: Uupg[] = data.posts.filter((g: Uupg) => g.has_photo)
  withPhoto.sort(() => Math.random() - 0.5)

  let hasDeaf = false
  const filtered = withPhoto.filter((g: Uupg) => {
    if (g.name.toLowerCase().includes('deaf')) {
      if (hasDeaf) return false
      hasDeaf = true
    }
    return true
  })
  return filtered.slice(0, NUMBER_OF_PEOPLE_GROUPS)
}

async function waitForImages(reel: HTMLElement) {
  const images = Array.from(reel.querySelectorAll('img'))
  await Promise.all(images.map(img => new Promise<void>((resolve) => {
    if (img.complete) resolve()
    else img.onload = () => resolve()
  })))
}

function startAutoScroll() {
  if (!reelRef.value) return
  const reel = reelRef.value

  // Apply initial `style.order` to each child (mirrors theme.js)
  Array.from(reel.children).forEach((child, index) => {
    (child as HTMLElement).style.order = String(index)
  })

  if (!isFadedIn) {
    reel.classList.add('in')
    isFadedIn = true
  }

  const isRtl = document.documentElement.getAttribute('dir') === 'rtl'
  const scrollDirection = isRtl ? -1 : 1

  tickHandle = setInterval(() => {
    const children = Array.from(reel.children) as HTMLElement[]
    if (children.length === 0) return

    const firstImage = children.reduce((prev, current) =>
      Number(prev.style.order) < Number(current.style.order) ? prev : current
    )

    if (firstImage.offsetWidth < reel.scrollLeft) {
      reel.scrollLeft = reel.scrollLeft - firstImage.offsetWidth * scrollDirection
      firstImage.style.order = String(reel.children.length)
      for (const img of children) {
        if (img !== firstImage) img.style.order = String(Number(img.style.order) - 1)
      }
    } else {
      reel.scrollLeft += 1 * scrollDirection
    }
  }, 20)
}

onMounted(async () => {
  items.value = await fetchReel()
  await nextTick()
  if (!reelRef.value) return
  await waitForImages(reelRef.value)
  startAutoScroll()
})

onBeforeUnmount(() => {
  if (tickHandle) {
    clearInterval(tickHandle)
    tickHandle = null
  }
})
</script>

<template>
  <div
    ref="reelRef"
    class="reel"
    id="reel-people-groups"
    data-reel-mode="auto-scroll"
    :data-research-url="researchUrl"
  >
    <a
      v-for="group in items"
      :key="group.slug"
      class="stack stack--sm reel__item light-link"
      :href="`${researchUrl}${group.slug}`"
      target="_blank"
    >
      <div><img class="square rounded-md size-md" :src="group.image_url" :alt="group.name"></div>
      <p class="text-center uppercase width-md">{{ group.name }}</p>
    </a>
  </div>
</template>
