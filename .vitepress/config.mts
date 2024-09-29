import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Lng Cool",
  //base: '/lng/',
  description: "LNG Cookbook",
  markdown: {
    math: true
  },
  locales: {
    root: {
      label: '中文',
      lang: 'zh'
    },
    en: {
      label: 'English',
      lang: 'en', // 可选，将作为 `lang` 属性添加到 `html` 标签中
      link: '/en/index', // 默认 /fr/ -- 显示在导航栏翻译菜单上，可以是外部的,
      themeConfig:{
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Basis', link: '/basis/lng' }
        ]
      }

      // 其余 locale 特定属性...
    }
  },
  head: [
      ['link', { rel: 'icon', href: '/lng.ico'}],
  ], // 加上 /vite-press-demo 前缀
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    i18nRouting:true,
    logo:"/images/lng.png",
    nav: [
      { text: '主页', link: '/' },
      { text: '基础', link: '/basis/lng' }
    ],

    sidebar: {

      "/test/":[
        {
          text: 'Examples',
          items: [
            { text: 'Markdown Examples', link: '/markdown-examples' },
            { text: 'Runtime API Examples', link: '/api-examples' }
          ]
        }
      ],

      "/basis/":[
        {
          text:"基本概念",
          items:[
            { text: 'LNG', link: '/basis/lng' },
            { text: 'LNG贸易', link: '/basis/trade' },

          ]

        }
      ]

    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
