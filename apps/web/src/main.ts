import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router/index.js'
import { initPwaUpdate } from './lib/pwa-update.js'
import './style.css'

const app = createApp(App)
app.config.errorHandler = (err) => {
  console.error('[minha-leitura] erro na interface:', err)
}
// v-busy="flag" disables the element and injects a spinner (see .btn[data-busy]).
app.directive('busy', {
  mounted(el, binding) {
    if (binding.value) el.setAttribute('data-busy', '')
  },
  updated(el, binding) {
    if (binding.value) el.setAttribute('data-busy', '')
    else el.removeAttribute('data-busy')
  },
})
app.use(createPinia())
app.use(router)
app.mount('#app')
initPwaUpdate()
