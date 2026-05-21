/**
 * Spesa App - Sync Module
 * Gestisce: push/pull cloud via Firebase Firestore
 */

import { db } from '../firebase'
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore'

const APP_STORAGE_KEY = 'spesa-storage'
const MAX_BACKUPS = 10

// Helpers per riferimenti Firestore
const mainDocRef = (db) => doc(db, 'users', 'default')
const backupsColRef = (db) => collection(doc(db, 'users', 'default'), 'backups')
const backupDocRef = (db, id) => doc(doc(db, 'users', 'default'), 'backups', id)

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
      const ref = mainDocRef(db)
      await setDoc(ref, { data: payload, lastUpdated: Date.now() }, { merge: true })
      return true
    } catch (e) {
      console.warn('[Sync] Push Firestore fallito:', e)
      return false
    }
  },

  pullFromCloud: async () => {
    try {
      const ref = mainDocRef(db)
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

  // --- Backups ---

  listBackups: async () => {
    try {
      const colRef = backupsColRef(db)
      const snap = await getDocs(colRef)
      const items = snap.docs.map(d => {
        const data = d.data()
        const date = data.createdAt
          ? new Date(data.createdAt).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : d.id
        return {
          filename: d.id,
          date,
          size: data.size || 0,
          createdAt: data.createdAt || 0,
        }
      })
      // Ordina dal più recente, max MAX_BACKUPS
      return items.sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_BACKUPS)
    } catch (e) {
      console.error('[Sync] listBackups fallito:', e.code, e.message)
      return []
    }
  },

  createManualBackup: async (state) => {
    try {
      const payload = JSON.stringify({ state })
      const id = Date.now().toString()
      const ref = backupDocRef(db, id)
      await setDoc(ref, {
        data: payload,
        createdAt: Date.now(),
        size: new Blob([payload]).size,
      })
      // Tieni solo gli ultimi MAX_BACKUPS
      const colRef = backupsColRef(db)
      const snap = await getDocs(colRef)
      const sorted = snap.docs.sort((a, b) => (b.data().createdAt || 0) - (a.data().createdAt || 0))
      const toDelete = sorted.slice(MAX_BACKUPS)
      await Promise.all(toDelete.map(d => deleteDoc(d.ref)))
      return true
    } catch (e) {
      console.error('[Sync] createManualBackup fallito:', e.code, e.message)
      return false
    }
  },

  restoreBackup: async (id) => {
    try {
      const ref = backupDocRef(db, id)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const parsed = JSON.parse(snap.data().data)
        return parsed.state || parsed
      }
    } catch (e) {
      console.warn('[Sync] restoreBackup fallito:', e)
    }
    return null
  },

  deleteBackup: async (id) => {
    try {
      const ref = backupDocRef(db, id)
      await deleteDoc(ref)
      return true
    } catch (e) {
      console.warn('[Sync] deleteBackup fallito:', e)
      return false
    }
  },

  // Stub per compatibilità con il vecchio codice
  setSessionPIN: () => {},
  getSessionPIN: () => null,
}
