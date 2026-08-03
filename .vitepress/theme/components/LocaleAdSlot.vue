<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

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

const isEnglish = computed(() => props.locale === 'en')
const blockTitle = computed(() => {
  if (props.title) return props.title
  return isEnglish.value ? 'Advertisement' : '赞助与广告'
})

const enClient = computed(() => props.adsenseClient || import.meta.env.VITE_ADSENSE_CLIENT || '')
const enSlot = computed(() => props.adsenseSlot || import.meta.env.VITE_ADSENSE_SLOT_HOME_EN || '')
const canRenderAdsense = computed(() => Boolean(enClient.value && enSlot.value))

function ensureAdsenseScript(client: string) {
  if (typeof window === 'undefined') return
  const marker = `adsense-${client}`
  if (document.querySelector(`script[data-ad-marker="${marker}"]`)) return

  const script = document.createElement('script')
  script.async = true
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`
  script.crossOrigin = 'anonymous'
  script.setAttribute('data-ad-marker', marker)
  document.head.appendChild(script)
}

onMounted(() => {
  if (!isEnglish.value || !canRenderAdsense.value) {
    return
  }

  ensureAdsenseScript(enClient.value)

  try {
    ;(window as any).adsbygoogle = (window as any).adsbygoogle || []
    ;(window as any).adsbygoogle.push({})
    isReady.value = true
  } catch (_) {
    isReady.value = false
  }
})
</script>

<template>
  <section class="locale-ad-slot" :class="isEnglish ? 'locale-ad-slot-en' : 'locale-ad-slot-zh'">
    <div class="locale-ad-head">
      <h3>{{ blockTitle }}</h3>
      <span v-if="isEnglish">For global audiences</span>
      <span v-else>面向中国区读者</span>
    </div>

    <div v-if="isEnglish" class="locale-ad-body">
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
      <p v-if="canRenderAdsense && !isReady" class="locale-ad-note">
        Ad is loading and may take a few seconds to render.
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
