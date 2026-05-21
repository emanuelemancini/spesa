import React from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore';
import { syncModule } from '../../security/sync';

const Header = () => {
  const { user, products, readNotificationIds, isUnsynced, setIsUnsynced, setLastPushedAt, showToast, replaceState } = useStore();
  const navigate = useNavigate();
  const [syncing, setSyncing] = React.useState(false);

  const readSet = new Set(readNotificationIds);
  const unreadCount = [
    ...products.filter(p => p.expiryDate && new Date(p.expiryDate) < new Date()).map(p => `exp-${p.id}`),
    ...products.filter(p => p.status === 'opened').map(p => `open-${p.id}`)
  ].filter(id => !readSet.has(id)).length;

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);

    const currentIsUnsynced = useStore.getState().isUnsynced;

    // Sia rosso che grigio: push locale sul cloud
    // (rosso = ho modifiche, grigio = confermo stato attuale)
    const s = useStore.getState();
    const success = await syncModule.pushToCloud({
      products: s.products,
      supermarkets: s.supermarkets,
      user: s.user,
      config: s.config,
      readNotificationIds: s.readNotificationIds,
    });
    setSyncing(false);
    if (success) {
      setLastPushedAt(Date.now());
      setIsUnsynced(false);
      showToast('Dati sincronizzati!', 'success');
    } else {
      showToast('Errore di sincronizzazione', 'error');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-[0_3px_12px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between px-4 py-4 max-w-md mx-auto">
        <div
          onClick={() => navigate('/settings')}
          className="flex items-center gap-3 cursor-pointer active:scale-95 transition-all"
        >
          <div className="size-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-primary shadow-sm border-2 border-white">
            <img src={user?.avatar || '/avatar.jpg'} className="w-full h-full object-cover" alt="" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 leading-none mb-1">Bentornato,</p>
            <h1 className="text-base font-black leading-none">{user?.name || 'Utente'}</h1>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`size-10 rounded-full border flex items-center justify-center active:scale-90 transition-all ${
              syncing
                ? 'bg-white border-slate-200 text-slate-400'
                : isUnsynced
                  ? 'bg-red-50 border-red-200 text-red-500'
                  : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <span className={`material-symbols-outlined text-[22px] ${syncing ? 'animate-spin' : ''}`}>sync</span>
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="size-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 relative active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
