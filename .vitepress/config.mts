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
      link: '/en/', // 默认 /fr/ -- 显示在导航栏翻译菜单上，可以是外部的,
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
      { text: '基础手册', link: '/basis/lng' }
    ],
    //aside:"left",
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
          text:"基础手册",

          items:[
            { text: '1 LNG', link: '/basis/lng' ,
                items:[
                  {text:'1.1 质量标准', link:'/basis/lng-2'},
                  {text:'1.2 单位换算' ,link:'/basis/lng-1'}
                ]

             },

            { text: '2 国际贸易', link: '/basis/trade',items:[

              { text: '2.1 发展趋势', link: '/basis/trade2024' },
              { text: '2.2 发展历史', link: '/basis/history' },
              { text: '2.3 贸易类型' , link:'/basis/types'}
            ] },

            { text: 'LNG产业链', link: '/basis/lng-industry' },
         
            { text: '主要玩家', items:[
              { text: '卡塔尔', link: '/basis/player/qatar' },
              { text: 'ADNOC', link: '/basis/player/adnoc' }


            ]}

          ]

        }
      ]

    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/cowbook/lng' }
    ]
  }
})
