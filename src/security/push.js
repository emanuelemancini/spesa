const getBase = () => {
  const base = window.__SPESA_BASE__ || '/'
  return base.endsWith('/') ? base : base + '/'
}

const PUSH_URL = () => getBase() + 'push.php'

// Converti chiave pubblica VAPID (base64url) in Uint8Array per subscribe()
function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export const pushModule = {

  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  },

  async getPermission() {
    return Notification.permission // 'default' | 'granted' | 'denied'
  },

  async requestPermission() {
    if (!this.isSupported()) return 'unsupported'
    return await Notification.requestPermission()
  },

  async getVapidKey() {
    try {
      const res = await fetch(PUSH_URL() + '?action=vapid-key')
      const data = await res.json()
      return data.publicKey
    } catch {
      return null
    }
  },

  async subscribe() {
    if (!this.isSupported()) return { ok: false, reason: 'unsupported' }

    const permission = await this.requestPermission()
    if (permission !== 'granted') return { ok: false, reason: 'denied' }

    try {
      const reg = await navigator.serviceWorker.ready
      const publicKey = await this.getVapidKey()
      if (!publicKey || publicKey === 'SOSTITUISCI_CON_LA_CHIAVE_PUBBLICA') {
        return { ok: false, reason: 'vapid-not-configured' }
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(publicKey),
      })

      // Invia subscription al server
      await fetch(PUSH_URL() + '?action=subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })

      return { ok: true, subscription }
    } catch (e) {
      console.error('[push] subscribe error', e)
      return { ok: false, reason: e.message }
    }
  },

  async unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return true

      await fetch(PUSH_URL() + '?action=unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })

      await sub.unsubscribe()
      return true
    } catch (e) {
      console.error('[push] unsubscribe error', e)
      return false
    }
  },

  async isSubscribed() {
    if (!this.isSupported()) return false
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      return !!sub
    } catch {
      return false
    }
  },

  async sendTest() {
    try {
      const res = await fetch(PUSH_URL() + '?action=test', { method: 'POST' })
      const data = await res.json()
      return data.ok === true
    } catch {
      return false
    }
  },

  // Chiamato dopo ogni sync per far controllare al server i prodotti in scadenza
  async checkProducts(state) {
    try {
      await fetch(PUSH_URL() + '?action=check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      })
    } catch {
      // silenzioso
    }
  },
}
