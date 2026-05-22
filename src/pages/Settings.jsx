import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import useStore from '../store/useStore';
import { User, Settings, Check, Plus, X, Camera, Palette, ChevronRight, Bell } from 'lucide-react';
import { pushModule } from '../security/push';

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
                        onClick={() => { onConfirm(); onClose(); }}
                        className={`flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-transform ${danger ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-primary text-white shadow-lg shadow-primary/30'}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

const SettingsPage = () => {
    const navigate = useNavigate();
    const { user, config, products, updateUser, updateConfig, updateProduct, clearStore, logout, showToast } = useStore();

    const [editName, setEditName] = useState(user.name);
    const [kitchenCats, setKitchenCats] = useState(config.kitchenCategories);
    const [homeCats, setHomeCats] = useState(config.homeCategories);
    const [newCat, setNewCat] = useState({ kitchen: '', home: '' });
    const [editingCat, setEditingCat] = useState(null); // { type, oldName, value }
    const [showDataManagement, setShowDataManagement] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);

    // Notification settings local state
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifState, setNotifState] = useState(config.notifications || {
        pushEnabled: true,
        alertExpiring: true,
        alertLowStock: true,
        alertBargains: false
    });

    // Push subscription state
    const [pushSupported, setPushSupported] = useState(false);
    const [pushSubscribed, setPushSubscribed] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);

    useEffect(() => {
        setPushSupported(pushModule.isSupported());
        pushModule.isSubscribed().then(setPushSubscribed);
    }, []);

    const handleTogglePush = async () => {
        setPushLoading(true);
        if (pushSubscribed) {
            const ok = await pushModule.unsubscribe();
            if (ok) { setPushSubscribed(false); showToast('Notifiche push disattivate', 'success'); }
            else showToast('Errore nella disattivazione', 'error');
        } else {
            const result = await pushModule.subscribe();
            if (result.ok) {
                setPushSubscribed(true);
                showToast('Notifiche push attivate!', 'success');
            } else if (result.reason === 'denied') {
                showToast('Permesso negato dal browser', 'error');
            } else if (result.reason === 'vapid-not-configured') {
                showToast('Push non ancora configurato sul server', 'error');
            } else {
                showToast('Errore nell\'attivazione', 'error');
            }
        }
        setPushLoading(false);
    };

    const handleTestPush = async () => {
        setPushLoading(true);
        const ok = await pushModule.sendTest();
        showToast(ok ? 'Notifica di test inviata!' : 'Errore: subscription non trovata sul server', ok ? 'success' : 'error');
        setPushLoading(false);
    };

    const handleToggleNotification = (key) => {
        const newState = { ...notifState, [key]: !notifState[key] };
        setNotifState(newState);
        updateConfig({ notifications: newState });
    };

    // Security Settings
    const [showSecurity, setShowSecurity] = useState(false);
    const [tempPin, setTempPin] = useState(config.pin || '');
    const [tempPinConfirm, setTempPinConfirm] = useState(config.pin || '');
    const [pinError, setPinError] = useState('');

    const handleSavePin = () => {
        if (tempPin && tempPin !== tempPinConfirm) {
            setPinError('Le password non combaciano');
            return;
        }
        updateConfig({ pin: tempPin });
        alert(tempPin ? 'Password aggiornata con successo! Verrà richiesta al prossimo accesso.' : 'Password rimossa.');
        setShowSecurity(false);
        setPinError('');
    };

    const handleSaveProfile = () => {
        updateUser({ name: editName });
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                updateUser({ avatar: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddCat = (type) => {
        if (!newCat[type].trim()) return;
        const target = type === 'kitchen' ? kitchenCats : homeCats;
        if (target.includes(newCat[type])) return;
        
        const newList = [...target, newCat[type].trim()];
        if (type === 'kitchen') {
            setKitchenCats(newList);
            updateConfig({ kitchenCategories: newList });
        } else {
            setHomeCats(newList);
            updateConfig({ homeCategories: newList });
        }
        setNewCat({ ...newCat, [type]: '' });
    };

    const handleRenameCat = (type, oldName, newName) => {
        const trimmed = newName.trim();
        if (!trimmed || trimmed === oldName) { setEditingCat(null); return; }
        const target = type === 'kitchen' ? kitchenCats : homeCats;
        if (target.includes(trimmed)) { setEditingCat(null); return; }
        // Aggiorna lista categorie
        const newList = target.map(c => c === oldName ? trimmed : c);
        if (type === 'kitchen') { setKitchenCats(newList); updateConfig({ kitchenCategories: newList }); }
        else { setHomeCats(newList); updateConfig({ homeCategories: newList }); }
        // Aggiorna tutti i prodotti con la vecchia categoria
        products
            .filter(p => p.category === oldName)
            .forEach(p => updateProduct(p.id, { category: trimmed }));
        setEditingCat(null);
    };

    const [updateStatus, setUpdateStatus] = useState('idle'); // idle | checking | available | updated | latest

    const handleCheckUpdate = async () => {
        if (!('serviceWorker' in navigator)) { setUpdateStatus('checking'); setTimeout(() => { window.location.reload(); }, 500); return; }
        setUpdateStatus('checking');
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) await reg.update();
        } catch {}
        // Con skipWaiting il nuovo SW è già attivo — basta ricaricare
        setTimeout(() => { window.location.reload(); }, 800);
    };

    const handleRemoveCat = (type, cat) => {
        const target = type === 'kitchen' ? kitchenCats : homeCats;
        const newList = target.filter(c => c !== cat);
        if (type === 'kitchen') {
            setKitchenCats(newList);
            updateConfig({ kitchenCategories: newList });
        } else {
            setHomeCats(newList);
            updateConfig({ homeCategories: newList });
        }
    };

    return (
        <div className="pb-20 -mx-4">
            {/* Clean Header */}
            <div className="px-5 mb-8 mt-2 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-0.5">Impostazioni</h1>
                    <p className="text-sm font-bold text-slate-400">Gestisci il tuo profilo e preferenze</p>
                </div>
            </div>

            {/* Profile Card Compact */}
            <section className="px-4 mb-8">
                <div className="bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:border-primary/20 transition-colors">
                        <label className="cursor-pointer relative overflow-hidden group/avatar block">
                            <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden border border-slate-50 relative">
                                {user.avatar ? (
                                    <img src={user.avatar} className="w-full h-full object-cover" alt="Profile" />
                                ) : (
                                    <span className="material-symbols-rounded text-primary text-3xl opacity-50">person</span>
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 size-7 rounded-xl bg-primary text-white flex items-center justify-center border-2 border-white shadow-sm active:scale-95 transition-transform">
                                <span className="material-symbols-rounded !text-[14px]">photo_camera</span>
                            </div>
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleAvatarChange} 
                            />
                        </label>
                    
                    <div className="flex-1 min-w-0 flex items-center">
                        <input 
                            type="text" 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleSaveProfile}
                            className="bg-transparent text-xl font-black text-slate-900 w-full border-none focus:ring-0 outline-none p-0 truncate"
                        />
                    </div>
                </div>
            </section>

            {/* Configurazione Categorie */}
            <section className="px-4 mb-8 space-y-4">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">Personalizzazione</h2>
                
                {/* Categorie Cucina */}
                <div className="bg-white rounded-[28px] p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Palette size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900">Categorie Cucina</h3>
                            <p className="text-[10px] font-bold text-slate-400">Gestisci i filtri della dispensa</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                        {kitchenCats.map(cat => (
                            editingCat?.type === 'kitchen' && editingCat?.oldName === cat ? (
                                <div key={cat} className="flex items-center gap-1 bg-primary/5 border border-primary/30 rounded-xl px-2 py-1">
                                    <input
                                        autoFocus
                                        value={editingCat.value}
                                        onChange={e => setEditingCat({ ...editingCat, value: e.target.value })}
                                        onKeyDown={e => { if (e.key === 'Enter') handleRenameCat('kitchen', cat, editingCat.value); if (e.key === 'Escape') setEditingCat(null); }}
                                        onBlur={() => handleRenameCat('kitchen', cat, editingCat.value)}
                                        className="text-[11px] font-black uppercase tracking-wider text-primary bg-transparent outline-none w-24"
                                    />
                                </div>
                            ) : (
                                <span key={cat} onClick={() => setEditingCat({ type: 'kitchen', oldName: cat, value: cat })} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 text-primary rounded-xl text-[11px] font-black uppercase tracking-wider border border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors">
                                    {cat}
                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveCat('kitchen', cat); }} className="hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 transition-colors">
                                        <X size={12} />
                                    </button>
                                </span>
                            )
                        ))}
                    </div>
                    <div className="flex gap-2 relative">
                        <input 
                            type="text"
                            placeholder="Nuova categoria..."
                            value={newCat.kitchen}
                            onChange={(e) => setNewCat({...newCat, kitchen: e.target.value})}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCat('kitchen')}
                            className="flex-1 h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 font-bold text-sm outline-none transition-all placeholder:text-slate-400"
                        />
                        <button 
                            onClick={() => handleAddCat('kitchen')}
                            className="size-12 shrink-0 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20 active:scale-95 transition-transform"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>

                {/* Categorie Casa */}
                <div className="bg-white rounded-[28px] p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="size-10 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                            <span className="material-symbols-rounded !text-[20px]">cleaning_services</span>
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900">Categorie Casa</h3>
                            <p className="text-[10px] font-bold text-slate-400">Organizza i prodotti per la casa</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                        {homeCats.map(cat => (
                            editingCat?.type === 'home' && editingCat?.oldName === cat ? (
                                <div key={cat} className="flex items-center gap-1 bg-blue-50 border border-blue-300 rounded-xl px-2 py-1">
                                    <input
                                        autoFocus
                                        value={editingCat.value}
                                        onChange={e => setEditingCat({ ...editingCat, value: e.target.value })}
                                        onKeyDown={e => { if (e.key === 'Enter') handleRenameCat('home', cat, editingCat.value); if (e.key === 'Escape') setEditingCat(null); }}
                                        onBlur={() => handleRenameCat('home', cat, editingCat.value)}
                                        className="text-[11px] font-black uppercase tracking-wider text-blue-600 bg-transparent outline-none w-24"
                                    />
                                </div>
                            ) : (
                                <span key={cat} onClick={() => setEditingCat({ type: 'home', oldName: cat, value: cat })} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[11px] font-black uppercase tracking-wider border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors">
                                    {cat}
                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveCat('home', cat); }} className="hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 transition-colors">
                                        <X size={12} />
                                    </button>
                                </span>
                            )
                        ))}
                    </div>
                    <div className="flex gap-2 relative">
                        <input 
                            type="text"
                            placeholder="Nuova categoria..."
                            value={newCat.home}
                            onChange={(e) => setNewCat({...newCat, home: e.target.value})}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCat('home')}
                            className="flex-1 h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/5 font-bold text-sm outline-none transition-all placeholder:text-slate-400"
                        />
                        <button 
                            onClick={() => handleAddCat('home')}
                            className="size-12 shrink-0 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 active:scale-95 transition-transform"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>
            </section>

            {/* Account / Support Section */}
            <section className="px-4 mb-8 space-y-4">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">Sistema</h2>
                
                <div className="bg-white rounded-[28px] overflow-hidden border border-slate-100 shadow-sm divide-y divide-slate-50 transition-all">
                    <div>
                        <button 
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                                    <span className="material-symbols-rounded">notifications</span>
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-slate-900">Notifiche</p>
                                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">Gestisci avvisi scadenze</p>
                                </div>
                            </div>
                            <div className={`size-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all ${showNotifications ? 'rotate-90' : ''}`}>
                                <span className="material-symbols-rounded !text-[20px]">chevron_right</span>
                            </div>
                        </button>
                        
                        {/* Expanded Settings Panel */}
                        {showNotifications && (
                            <div className="bg-slate-50/50 p-4 pt-3 space-y-3 px-5 shadow-inner border-t border-slate-100 pb-5">

                                {/* Push reali */}
                                {pushSupported ? (
                                    <div className={`p-3 rounded-2xl border flex items-center gap-3 ${pushSubscribed ? 'bg-primary/5 border-primary/20' : 'bg-white border-slate-200'}`}>
                                        <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${pushSubscribed ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            <span className="material-symbols-rounded !text-[18px]">{pushSubscribed ? 'notifications_active' : 'notifications_off'}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-slate-900 leading-none mb-0.5">
                                                {pushSubscribed ? 'Push attive su questo dispositivo' : 'Attiva notifiche push'}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400">
                                                {pushSubscribed ? 'Ricevi avvisi anche con l\'app chiusa' : 'Funziona anche con l\'app chiusa'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleTogglePush}
                                            disabled={pushLoading}
                                            className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-black active:scale-95 transition-all ${pushSubscribed ? 'bg-red-50 text-red-500' : 'bg-primary text-white shadow-sm shadow-primary/30'} ${pushLoading ? 'opacity-50' : ''}`}
                                        >
                                            {pushLoading ? '...' : pushSubscribed ? 'Disattiva' : 'Attiva'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 flex items-center gap-3">
                                        <span className="material-symbols-rounded !text-xl text-amber-500 shrink-0">info</span>
                                        <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
                                            {navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')
                                                ? 'Su iOS installa l\'app sulla home screen per abilitare le push.'
                                                : 'Il tuo browser non supporta le notifiche push.'}
                                        </p>
                                    </div>
                                )}

                                {pushSubscribed && (
                                    <button
                                        onClick={handleTestPush}
                                        disabled={pushLoading}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-[11px] font-black active:scale-95 transition-all"
                                    >
                                        <span className="material-symbols-rounded !text-base">send</span>
                                        Invia notifica di prova
                                    </button>
                                )}

                                <div className="w-full h-px bg-slate-200/50"></div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">Scadenze imminenti</p>
                                        <p className="text-[10px] text-slate-400">Avvisa oggi e domani</p>
                                    </div>
                                    <button
                                        onClick={() => handleToggleNotification('alertExpiring')}
                                        className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${notifState.alertExpiring ? 'bg-orange-400' : 'bg-slate-200'}`}
                                    >
                                        <div className={`size-5 bg-white rounded-full shadow-sm absolute transition-all duration-300 ${notifState.alertExpiring ? 'translate-x-6' : 'translate-x-1'}`}></div>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">Prodotti scaduti</p>
                                        <p className="text-[10px] text-slate-400">Avvisa quando scade</p>
                                    </div>
                                    <button
                                        onClick={() => handleToggleNotification('alertLowStock')}
                                        className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${notifState.alertLowStock ? 'bg-red-400' : 'bg-slate-200'}`}
                                    >
                                        <div className={`size-5 bg-white rounded-full shadow-sm absolute transition-all duration-300 ${notifState.alertLowStock ? 'translate-x-6' : 'translate-x-1'}`}></div>
                                    </button>
                                </div>

                            </div>
                        )}
                    </div>
                    
                    <button onClick={() => navigate('/data-management')} className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors group">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <span className="material-symbols-rounded">cloud_sync</span>
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-black text-slate-900">Backup & Sincro</p>
                                <p className="text-[11px] font-bold text-slate-400 mt-0.5">Salva i tuoi dati in cloud</p>
                            </div>
                        </div>
                        <div className="size-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                            <span className="material-symbols-rounded !text-[20px]">chevron_right</span>
                        </div>
                    </button>
                    
                    <div>
                        <button 
                            onClick={() => setShowSecurity(!showSecurity)}
                            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                                    <span className="material-symbols-rounded">shield_lock</span>
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-slate-900">Sicurezza</p>
                                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">Gestisci password {config.pin && '(Attiva)'}</p>
                                </div>
                            </div>
                            <div className={`size-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all ${showSecurity ? 'rotate-90' : ''}`}>
                                <span className="material-symbols-rounded !text-[20px]">chevron_right</span>
                            </div>
                        </button>
                        
                        {/* Expanded Security Panel */}
                        {showSecurity && (
                            <div className="bg-slate-50/50 p-4 pt-1 space-y-4 px-6 shadow-inner border-t border-slate-100 pb-6">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 mb-2">Nuova Password (max 6 caratteri, {tempPin ? tempPin.length : 0}/6)</p>
                                    <input 
                                        type="password"
                                        maxLength={6}
                                        value={tempPin}
                                        onChange={(e) => { setTempPin(e.target.value); setPinError(''); }}
                                        placeholder="Inserisci la password"
                                        className="w-full h-12 bg-white border border-slate-200 rounded-2xl px-4 text-sm font-bold tracking-widest focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                    />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 mb-2">Conferma Password</p>
                                    <input 
                                        type="password"
                                        maxLength={6}
                                        value={tempPinConfirm}
                                        onChange={(e) => { setTempPinConfirm(e.target.value); setPinError(''); }}
                                        placeholder="Ripeti la password"
                                        className="w-full h-12 bg-white border border-slate-200 rounded-2xl px-4 text-sm font-bold tracking-widest focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                                    />
                                    {pinError && <p className="text-xs text-red-500 font-bold mt-1">{pinError}</p>}
                                </div>
                                
                                <div className="pt-2 flex gap-2 w-full">
                                    {config.pin && (
                                        <button 
                                            onClick={() => { setTempPin(''); setTempPinConfirm(''); handleSavePin(); }}
                                            className="h-12 px-6 rounded-full bg-red-50 hover:bg-red-100 text-red-500 text-xs font-bold transition-colors"
                                        >
                                            Rimuovi
                                        </button>
                                    )}
                                    <button 
                                        onClick={handleSavePin}
                                        className="flex-1 h-12 px-4 rounded-full bg-indigo-500 text-white shadow-md shadow-indigo-500/20 text-xs font-bold active:scale-95 transition-transform"
                                    >
                                        Salva Password
                                    </button>
                                </div>
                            </div>
                        )}
                    <div>
                        <button
                            onClick={() => setShowDataManagement(!showDataManagement)}
                            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                                    <span className="material-symbols-rounded">storage</span>
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-slate-900">Gestione dati</p>
                                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">Svuota o ripristina i dati locali</p>
                                </div>
                            </div>
                            <div className={`size-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all ${showDataManagement ? 'rotate-90' : ''}`}>
                                <span className="material-symbols-rounded !text-[20px]">chevron_right</span>
                            </div>
                        </button>

                        {showDataManagement && (
                            <div className="bg-slate-50/50 px-4 py-4 space-y-3 shadow-inner border-t border-slate-100">
                                <button
                                    onClick={() => setConfirmAction({
                                        title: 'Svuota Dati',
                                        message: 'Verranno eliminati tutti i tuoi prodotti. Questa azione non può essere annullata.',
                                        confirmLabel: 'Svuota',
                                        danger: true,
                                        onConfirm: () => { clearStore(); window.location.reload(); }
                                    })}
                                    className="w-full flex items-center gap-3 p-3 bg-white rounded-2xl border border-red-100 text-red-500 active:scale-[0.98] transition-all shadow-sm"
                                >
                                    <div className="size-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-rounded !text-[18px]">mop</span>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-black">Svuota Dati</p>
                                        <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Inizia pulito</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setConfirmAction({
                                        title: 'Resetta App',
                                        message: 'Verranno ripristinati i dati demo e perderai tutti i prodotti inseriti. Sicuro?',
                                        confirmLabel: 'Resetta',
                                        danger: true,
                                        onConfirm: () => { localStorage.removeItem('spesa-storage'); window.location.reload(); }
                                    })}
                                    className="w-full flex items-center gap-3 p-3 bg-white rounded-2xl border border-red-100 text-red-500 active:scale-[0.98] transition-all shadow-sm"
                                >
                                    <div className="size-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-rounded !text-[18px]">delete_forever</span>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-black">Resetta App</p>
                                        <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Torna a demo</p>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                    </div>
                </div>
            </section>

            {/* Aggiornamento App */}
            <section className="px-4 mb-4">
                <button
                    onClick={handleCheckUpdate}
                    disabled={updateStatus === 'checking'}
                    className="w-full flex items-center gap-4 p-4 bg-white rounded-[28px] border border-slate-100 shadow-sm hover:bg-slate-50 active:bg-slate-100 transition-colors group disabled:opacity-60"
                >
                    <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                        <span className={`material-symbols-rounded ${updateStatus === 'checking' ? 'animate-spin' : ''}`}>
                            {updateStatus === 'checking' ? 'sync' : 'system_update'}
                        </span>
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-black text-slate-900">
                            {updateStatus === 'checking' ? 'Aggiornamento in corso...' : 'Aggiorna app'}
                        </p>
                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                            {updateStatus === 'checking' ? 'L\'app si ricaricherà tra un momento' : 'Scarica e applica l\'ultima versione'}
                        </p>
                    </div>
                    {updateStatus !== 'checking' && (
                        <div className="ml-auto size-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                            <span className="material-symbols-rounded !text-[20px]">chevron_right</span>
                        </div>
                    )}
                </button>
            </section>

            {/* Logout */}
            <section className="px-4 mb-4">
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-4 p-4 bg-white rounded-[28px] border border-slate-100 shadow-sm hover:bg-slate-50 active:bg-slate-100 transition-colors group"
                >
                    <div className="size-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <span className="material-symbols-rounded">logout</span>
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-black text-red-600">Esci</p>
                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">Torna alla schermata di accesso</p>
                    </div>
                    <div className="ml-auto size-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                        <span className="material-symbols-rounded !text-[20px]">chevron_right</span>
                    </div>
                </button>
            </section>

        {confirmAction && (
            <ConfirmModal
                title={confirmAction.title}
                message={confirmAction.message}
                confirmLabel={confirmAction.confirmLabel}
                danger={confirmAction.danger}
                onConfirm={confirmAction.onConfirm}
                onClose={() => setConfirmAction(null)}
            />
        )}
        </div>
    );
};

export default SettingsPage;
