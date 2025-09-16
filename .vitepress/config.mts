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
      { text: '基础手册', link: '/basis/lng' },
      { text: '接收站', link: '/terminal' }
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

      "/terminal/":[

            { text: '中国LNG接收站', link:'/terminal/',items:[

              { text: '1. 国网大连LNG', link: '/terminal/rt001' },
              { text: '2. 国网北海LNG', link: '/terminal/rt002' },
              { text: '3. 国网迭福LNG', link: '/terminal/rt003' },
              { text: '4. 国网天津LNG', link: '/terminal/rt004' },
              { text: '5. 国网海南LNG', link: '/terminal/rt005' },
              { text: '6. 国网粤东LNG', link: '/terminal/rt006' },
              { text: '7. 国网漳州LNG', link: '/terminal/rt007' },
              { text: '8. 国网防城港LNG', link: '/terminal/rt008' },
              { text: '9. 中海油大鹏LNG', link: '/terminal/rt009' },
              { text: '10. 中海油莆田LNG', link: '/terminal/rt010' },
              { text: '11. 中海油宁波LNG', link: '/terminal/rt011' },
              { text: '12. 中海油珠海LNG', link: '/terminal/rt012' },
              { text: '13. 中海油滨海LNG', link: '/terminal/rt013' },
              { text: '14. 中石油如东LNG', link: '/terminal/rt014' },
              { text: '15. 中石油曹妃甸LNG', link: '/terminal/rt015' },
              { text: '16. 中石油深南LNG', link: '/terminal/rt016' },
              { text: '17. 中石化青岛LNG', link: '/terminal/rt017' },
              { text: '18. 中石化天津LNG', link: '/terminal/rt018' },
              { text: '19. 申能洋山港LNG', link: '/terminal/rt019' },
              { text: '20. 申能五号沟LNG', link: '/terminal/rt020' },
              { text: '21. 新奥舟山LNG', link: '/terminal/rt021' },
              { text: '22. 广汇启东LNG', link: '/terminal/rt022' },
              { text: '23. 新天曹妃甸LNG', link: '/terminal/rt023'},
              { text: '24. 北燃天津LNG', link: '/terminal/rt024' },
              { text: '25. 浙能温州LNG', link: '/terminal/rt025' },
              { text: '26. 广能惠州LNG', link: '/terminal/rt026' },
              { text: '27. 华瀛潮州LNG', link: '/terminal/rt027' },
              { text: '28. 深燃华安LNG', link: '/terminal/rt028' },
              { text: '29. 东莞九丰LNG', link: '/terminal/rt029' },
              { text: '30. 杭嘉鑫平湖LNG', link: '/terminal/rt030' },
              { text: '31. 广燃南沙LNG', link: '/terminal/rt031' }
            ]}

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
