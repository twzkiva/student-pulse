import { createApp } from 'vue'
import { Capacitor } from '@capacitor/core'
import { registerSW } from 'virtual:pwa-register'
import './style.css'
import App from './App.vue'
import { initializeAppUpdater } from './services/appUpdater'

if (!Capacitor.isNativePlatform()) registerSW({ immediate: true })

createApp(App).mount('#app')
initializeAppUpdater()
