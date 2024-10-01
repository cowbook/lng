// .vitepress/theme/index.js
import DefaultTheme from 'vitepress/theme'
import './custom.css'
import myLayout from './Layout.vue'

//export default DefaultTheme

export default {
    extends: DefaultTheme,
    //Layout: myLayout
    enhanceApp({ app }) {
        // 注册自定义全局组件
        app.component('doc2',myLayout)
      }
  }