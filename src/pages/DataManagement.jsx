import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import useStore from '../store/useStore'
import { syncModule } from '../security/sync'
import { pushModule } from '../security/push'

const IS_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname)

function ConfirmModal({ title, message, confirmLabel, danger, onConfirm, onClose }) {
    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-end justify-center pointer-events-auto">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="modal-centered relative w-full max-w-md mx-auto bg-white rounded-t-[32px] p-6 pb-10 space-y-4 shadow-2xl">
                <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />
                <h2 className="text-slate-900 text-xl font-black" style={{textAlign:'center'}}>{title}</h2>
                <p className="text-slate-500 text-sm leading-relaxed" style={{textAlign:'center'}}>{message}</p>
                <div className="flex gap-3 pt-1">
                    <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm active:scale-95 transition-transform">
                        Annulla
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose() }}
                        className={`flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-transform ${danger ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-primary text-white shadow-lg shadow-primary/30'}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default function DataManagement() {
    const navigate = useNavigate()
    const { mergeState, replaceState, setIsUnsynced, isUnsynced, showToast, clearStore, config } = useStore()
    const [backups, setBackups] = useState([])
    const [loadingBackups, setLoadingBackups] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [confirmAction, setConfirmAction] = useState(null)

    useEffect(() => {
        loadBackups()
        // Sync session PIN from config
        if (config.pin) syncModule.setSessionPIN(config.pin)
    }, [])

    const loadBackups = async () => {
        setLoadingBackups(true)
        const list = await syncModule.listBackups()
        setBackups(list)
        setLoadingBackups(false)
    }

    const handleFullSync = async () => {
        setSyncing(true)
        // Imposta il PIN prima di qualsiasi operazione
        if (config.pin) syncModule.setSessionPIN(config.pin)
        // 1. Pull
        const cloudData = await syncModule.pullFromCloud()
        if (cloudData?.state) {
            mergeState(cloudData.state)
        }
        // 2. Push merged state
        const s = useStore.getState()
        // Sicurezza: se il pull ha fallito e lo stato locale è vuoto, non sovrascrivere il cloud
        if (!cloudData && s.products.length === 0 && s.supermarkets.length === 0) {
            setSyncing(false)
            showToast('Impossibile sincronizzare: dati cloud non raggiungibili', 'error')
            return
        }
        const success = await syncModule.pushToCloud({
            products: s.products,
            supermarkets: s.supermarkets,
            user: s.user,
            config: s.config,
            readNotificationIds: s.readNotificationIds,
        })
        setSyncing(false)
        if (success) {
            setIsUnsynced(false)
            showToast('Sincronizzazione completata!', 'success')
            await loadBackups()
            // Controlla prodotti in scadenza e invia push se necessario
            const s2 = useStore.getState()
            pushModule.checkProducts({ products: s2.products, supermarkets: s2.supermarkets })
        } else {
            showToast('Errore di sincronizzazione', 'error')
        }
    }

    const handleForcePush = async () => {
        const s = useStore.getState()
        const success = await syncModule.pushToCloud({
            products: s.products,
            supermarkets: s.supermarkets,
            user: s.user,
            config: s.config,
            readNotificationIds: s.readNotificationIds,
        })
        if (success) {
            setIsUnsynced(false)
            showToast('Cloud sovrascritto con i dati locali', 'success')
            await loadBackups()
        } else {
            showToast('Errore durante il caricamento', 'error')
        }
    }

    const handleRestore = async (backup) => {
        const state = await syncModule.restoreBackup(backup.filename)
        if (state) {
            replaceState(state)
            showToast('Ripristino completato!', 'success')
            setTimeout(() => navigate('/'), 500)
        } else {
            showToast('Errore durante il ripristino', 'error')
        }
    }

    const formatSize = (bytes) => {
        if (!bytes) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    return (
        <div className="pb-20 -mx-4">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-4 flex items-center gap-3">
                <button
                    onClick={() => navigate('/settings')}
                    className="size-10 rounded-full bg-primary/5 flex items-center justify-center text-primary active:scale-90 transition-transform"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Backup & Sincro</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Gestione dati cloud</p>
                </div>
            </div>

            {IS_LOCAL && (
                <div className="mx-4 mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                    <span className="material-symbols-outlined !text-xl text-amber-500 shrink-0 mt-0.5">info</span>
                    <div>
                        <p className="text-sm font-black text-amber-800">Modalità sviluppo</p>
                        <p className="text-xs font-bold text-amber-600 mt-0.5 leading-relaxed">Sync e backup non disponibili su localhost. Funzioneranno correttamente una volta distribuita l'app sul server.</p>
                    </div>
                </div>
            )}

            <div className="px-4 mt-6 space-y-8">

                {/* Operazioni Principali */}
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Operazioni</p>
                    <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">

                        {/* Sincronizza */}
                        <button
                            onClick={handleFullSync}
                            disabled={syncing}
                            className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors group"
                        >
                            <div className={`size-12 rounded-2xl flex items-center justify-center transition-colors ${syncing ? 'bg-orange-50 text-orange-500' : isUnsynced ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'}`}>
                                <span className={`material-symbols-outlined ${syncing ? 'animate-spin' : ''}`}>
                                    {syncing ? 'sync' : 'cloud_sync'}
                                </span>
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-sm font-black text-slate-900">Sincronizza Cloud</p>
                                <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                                    {syncing ? 'Sincronizzazione in corso...' : isUnsynced ? 'Ci sono modifiche da sincronizzare' : 'Unisce i dati di tutti i dispositivi'}
                                </p>
                            </div>
                            <span className="material-symbols-outlined !text-[20px] text-slate-300 group-hover:text-slate-400">chevron_right</span>
                        </button>

                        {/* Forza Push */}
                        <button
                            onClick={() => setConfirmAction({
                                title: 'Sovrascrivi Cloud',
                                type: 'force_push',
                                message: 'Caricherà i dati di questo dispositivo sul Cloud, ignorando quelli già presenti. Sicuro?',
                                label: 'Carica e Sovrascrivi'
                            })}
                            className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors group"
                        >
                            <div className="size-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                                <span className="material-symbols-outlined">cloud_upload</span>
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-sm font-black text-slate-900">Forza Caricamento</p>
                                <p className="text-[11px] font-bold text-slate-400 mt-0.5">Usa questi dati come unici validi</p>
                            </div>
                            <span className="material-symbols-outlined !text-[20px] text-slate-300 group-hover:text-slate-400">chevron_right</span>
                        </button>

                    </div>
                </div>

                {/* Backup Cloud */}
                <div>
                    <div className="flex justify-between items-center mb-4 ml-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Backup Cloud</p>
                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    const ok = await syncModule.createManualBackup()
                                    ok ? showToast('Backup creato!', 'success') : showToast('Errore creazione backup', 'error')
                                    await loadBackups()
                                }}
                                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 transition-transform shadow-md shadow-primary/20"
                            >
                                <span className="material-symbols-outlined !text-sm">add_circle</span> Crea
                            </button>
                            <button
                                onClick={loadBackups}
                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 transition-transform"
                            >
                                <span className="material-symbols-outlined !text-sm">refresh</span> Aggiorna
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
                        {loadingBackups ? (
                            <div className="p-10 text-center flex flex-col items-center gap-3">
                                <div className="size-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm font-bold text-slate-400">Lettura cronologia...</p>
                            </div>
                        ) : backups.length === 0 ? (
                            <div className="p-10 text-center flex flex-col items-center gap-2">
                                <span className="material-symbols-outlined !text-4xl text-slate-200">settings_backup_restore</span>
                                <p className="text-sm font-bold text-slate-400 italic">Nessun backup trovato</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {backups.map((b, idx) => (
                                    <div key={b.filename} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`size-9 rounded-xl flex items-center justify-center ${idx === 0 ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-400'}`}>
                                                <span className="material-symbols-outlined !text-base">history</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900">{b.date} <span className="font-normal text-slate-400 text-xs">({formatSize(b.size)})</span></p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {idx === 0 ? 'Ultimo backup' : `Punto #${backups.length - idx}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => setConfirmAction({
                                                    title: 'Ripristina Backup',
                                                    type: 'restore',
                                                    message: `Vuoi ripristinare i dati del ${b.date}? I dati locali verranno sostituiti.`,
                                                    label: 'Ripristina',
                                                    data: b
                                                })}
                                                className="px-3 py-1.5 bg-primary/5 hover:bg-primary/10 text-primary text-[10px] font-black uppercase rounded-xl transition-all active:scale-90"
                                            >
                                                Ripristina
                                            </button>
                                            <button
                                                onClick={() => setConfirmAction({
                                                    title: 'Elimina Backup',
                                                    type: 'delete_backup',
                                                    message: `Eliminare definitivamente il backup del ${b.date}?`,
                                                    label: 'Elimina',
                                                    danger: true,
                                                    data: b
                                                })}
                                                className="size-8 flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                                            >
                                                <span className="material-symbols-outlined !text-base">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <p className="mt-3 text-[10px] text-slate-400 text-center px-4 italic leading-relaxed">
                        I backup vengono creati automaticamente ogni 4 ore durante l'uso dell'app e conservati sul server (max 10).
                    </p>
                </div>
            </div>

            {confirmAction && (
                <ConfirmModal
                    title={confirmAction.title}
                    message={confirmAction.message}
                    confirmLabel={confirmAction.label}
                    danger={confirmAction.danger}
                    onConfirm={async () => {
                        if (confirmAction.type === 'force_push') handleForcePush()
                        if (confirmAction.type === 'restore') handleRestore(confirmAction.data)
                        if (confirmAction.type === 'delete_backup') {
                            const ok = await syncModule.deleteBackup(confirmAction.data.filename)
                            ok ? showToast('Backup eliminato', 'success') : showToast('Errore eliminazione', 'error')
                            await loadBackups()
                        }
                    }}
                    onClose={() => setConfirmAction(null)}
                />
            )}
        </div>
    )
}
