<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    locale: 'zh' | 'en'
    title?: string
    adsenseClient?: string
    adsenseSlot?: string
  }>(),
  {
    title: '',
    adsenseClient: '',
    adsenseSlot: ''
  }
)

const isReady = ref(false)
const isDisabled = ref(false)
const disableReason = ref('')
const adBodyRef = ref<HTMLElement | null>(null)
const hasStartedLoad = ref(false)
let viewportObserver: IntersectionObserver | null = null

const isEnglish = computed(() => props.locale === 'en')
const blockTitle = computed(() => {
  if (props.title) return props.title
  return isEnglish.value ? 'Advertisement' : '赞助与广告'
})

const enClient = computed(() => props.adsenseClient || import.meta.env.VITE_ADSENSE_CLIENT || '')
const enSlot = computed(() => props.adsenseSlot || import.meta.env.VITE_ADSENSE_SLOT_HOME_EN || '')
const canRenderAdsense = computed(() => Boolean(enClient.value && enSlot.value))

function isLikelyMainlandUser() {
  if (typeof window === 'undefined') return false

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  const inChinaTimezone = /^(Asia\/(Shanghai|Chongqing|Harbin|Urumqi))$/.test(tz)

  const langs = [navigator.language, ...(navigator.languages || [])]
    .filter(Boolean)
    .map((item) => item.toLowerCase())
  const hasMainlandZh = langs.some((lang) => lang === 'zh-cn' || lang === 'zh-hans-cn')

  return inChinaTimezone && hasMainlandZh
}

async function canReachAdsense(timeoutMs = 1200) {
  if (typeof window === 'undefined') return false
  if (!('fetch' in window) || !('AbortController' in window)) return true

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    // Fast connectivity probe: if this fails quickly, skip AdSense script loading.
    await fetch('https://pagead2.googlesyndication.com/favicon.ico', {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    })
    return true
  } catch (_) {
    return false
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function ensureAdsenseScript(client: string, timeoutMs = 1500) {
  if (typeof window === 'undefined') return Promise.resolve(false)
  const marker = `adsense-${client}`
  const existing = document.querySelector(`script[data-ad-marker="${marker}"]`) as HTMLScriptElement | null
  if (existing) {
    const loaded = existing.getAttribute('data-loaded') === 'true'
    return Promise.resolve(loaded || Boolean((window as any).adsbygoogle))
  }

  return new Promise<boolean>((resolve) => {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`
    script.crossOrigin = 'anonymous'
    script.setAttribute('data-ad-marker', marker)

    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      if (ok) {
        script.setAttribute('data-loaded', 'true')
      }
      resolve(ok)
    }

    const timer = window.setTimeout(() => finish(false), timeoutMs)
    script.onload = () => {
      window.clearTimeout(timer)
      finish(true)
    }
    script.onerror = () => {
      window.clearTimeout(timer)
      finish(false)
    }

    document.head.appendChild(script)
  })
}

function scheduleAdLoad(task: () => Promise<void>) {
  if (typeof window === 'undefined') return

  if ('requestIdleCallback' in window) {
    ;(window as any).requestIdleCallback(() => {
      void task()
    }, { timeout: 1200 })
    return
  }

  window.setTimeout(() => {
    void task()
  }, 120)
}

onMounted(() => {
  if (!isEnglish.value || !canRenderAdsense.value) {
    return
  }

  const startLoad = () => {
    if (hasStartedLoad.value) return
    hasStartedLoad.value = true

    scheduleAdLoad(async () => {
    if (isLikelyMainlandUser()) {
      const canReach = await canReachAdsense()
      if (!canReach) {
        isDisabled.value = true
        disableReason.value = 'unreachable'
        return
      }
    }

    const loaded = await ensureAdsenseScript(enClient.value)
    if (!loaded) {
      isDisabled.value = true
      disableReason.value = 'unreachable'
      return
    }

    try {
      ;(window as any).adsbygoogle = (window as any).adsbygoogle || []
      ;(window as any).adsbygoogle.push({})
      isReady.value = true
    } catch (_) {
      isReady.value = false
      isDisabled.value = true
      disableReason.value = 'unreachable'
    }
    })
  }

  if (!('IntersectionObserver' in window) || !adBodyRef.value) {
    startLoad()
    return
  }

  viewportObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      viewportObserver?.disconnect()
      viewportObserver = null
      startLoad()
    }
  }, {
    root: null,
    rootMargin: '240px 0px',
    threshold: 0
  })

  viewportObserver.observe(adBodyRef.value)
})

onBeforeUnmount(() => {
  viewportObserver?.disconnect()
  viewportObserver = null
})
</script>

<template>
  <section class="locale-ad-slot" :class="isEnglish ? 'locale-ad-slot-en' : 'locale-ad-slot-zh'">
    <div class="locale-ad-head">
      <h3>{{ blockTitle }}</h3>
      <span v-if="isEnglish">For global audiences</span>
      <span v-else>面向中国区读者</span>
    </div>

    <div v-if="isEnglish" ref="adBodyRef" class="locale-ad-body">
      <ins
        v-if="canRenderAdsense"
        class="adsbygoogle locale-adsense"
        style="display:block"
        data-ad-format="auto"
        data-full-width-responsive="true"
        :data-ad-client="enClient"
        :data-ad-slot="enSlot"
      />
      <p v-else class="locale-ad-note">
        AdSense slot reserved. Set <code>VITE_ADSENSE_CLIENT</code> and <code>VITE_ADSENSE_SLOT_HOME_EN</code> to enable.
      </p>
      <p v-if="canRenderAdsense && !isReady && !isDisabled" class="locale-ad-note">
        Ad is loading and may take a few seconds to render.
      </p>
      <p v-if="isDisabled && disableReason === 'unreachable'" class="locale-ad-note">
        AdSense endpoint is unreachable in your network, so this ad slot is disabled for faster page loading.
      </p>
    </div>

    <div v-else class="locale-ad-body">
      <p class="locale-ad-note">
        中国首页建议优先使用本地可投放方案（如百度联盟、腾讯广告或行业赞助位）。
      </p>
      <p class="locale-ad-note">
        当前为预留广告位，接入后可替换为正式广告脚本或直客赞助组件。
      </p>
    </div>
  </section>
</template>

<style scoped>
.locale-ad-slot {
  margin: 20px 0 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  padding: 14px;
  background: linear-gradient(135deg, rgba(86, 122, 168, 0.08), rgba(74, 128, 88, 0.06));
}

.locale-ad-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.locale-ad-head h3 {
  margin: 0;
  font-size: 16px;
}

.locale-ad-head span {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.locale-ad-body {
  margin-top: 10px;
}

.locale-adsense {
  min-height: 90px;
}

.locale-ad-note {
  margin: 6px 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}
</style>
