/**
 * Spesa App - Sync Module
 * Gestisce: push/pull cloud via Firebase Firestore
 */

import { db } from '../firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'

const APP_STORAGE_KEY = 'spesa-storage'
const FIRESTORE_DOC = 'users/default'

export const syncModule = {

  // --- Cloud Sync ---

  pushToCloud: async (manualData = null) => {
    try {
      let payload
      if (manualData) {
        payload = JSON.stringify({ state: manualData })
      } else {
        const raw = localStorage.getItem(APP_STORAGE_KEY)
        if (!raw) return false
        payload = raw
      }
      const ref = doc(db, FIRESTORE_DOC)
      await setDoc(ref, { data: payload, lastUpdated: Date.now() }, { merge: true })
      return true
    } catch (e) {
      console.warn('[Sync] Push Firestore fallito:', e)
      return false
    }
  },

  pullFromCloud: async () => {
    try {
      const ref = doc(db, FIRESTORE_DOC)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const cloud = snap.data()
        if (cloud?.data) {
          const parsed = JSON.parse(cloud.data)
          const state = parsed.state || parsed
          if (state.products || state.supermarkets) {
            return { state, lastUpdated: cloud.lastUpdated }
          }
        }
      }
    } catch (e) {
      console.warn('[Sync] Pull Firestore fallito:', e)
    }
    return null
  },

  // --- Backups (non supportati su Firestore, stub per compatibilità) ---

  listBackups: async () => [],

  createManualBackup: async () => {
    // Firestore mantiene la cronologia automaticamente
    return syncModule.pushToCloud()
  },

  restoreBackup: async () => null,

  deleteBackup: async () => false,

  // Stub per compatibilità con il vecchio codice
  setSessionPIN: () => {},
  getSessionPIN: () => null,
}
