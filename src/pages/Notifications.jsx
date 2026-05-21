import React from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const Notifications = () => {
  const navigate = useNavigate();
  const { products, readNotificationIds, markNotificationsRead } = useStore();

  const notifications = [
    ...products
      .filter(p => p.expiryDate && new Date(p.expiryDate) < new Date())
      .map(p => ({
        id: `exp-${p.id}`,
        title: 'Prodotto Scaduto',
        message: `${p.name} è scaduto il ${format(new Date(p.expiryDate), 'dd MMMM', { locale: it })}.`,
        type: 'error',
        time: 'Oggi',
        icon: 'warning'
      })),
    ...products
      .filter(p => p.status === 'opened')
      .map(p => ({
        id: `open-${p.id}`,
        title: 'Prodotto Aperto',
        message: `Ricordati di consumare ${p.name} al più presto.`,
        type: 'warning',
        time: 'Ieri',
        icon: 'inventory_2'
      }))
  ].slice(0, 8);

  const readSet = new Set(readNotificationIds);
  const unreadCount = notifications.filter(n => !readSet.has(n.id)).length;

  return (
    <div className="pb-[70px] -mx-4">
      <div className="px-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="size-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-600 active:scale-90 transition-transform"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black">Notifiche</h1>
              {unreadCount > 0 && (
                <span className="size-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={() => markNotificationsRead(notifications.map(n => n.id))}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/5 text-primary text-[11px] font-black active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined !text-base">done_all</span>
              Segna tutte come lette
            </button>
          )}
        </div>

        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((n) => {
              const isRead = readSet.has(n.id);
              return (
                <div
                  key={n.id}
                  onClick={() => markNotificationsRead([n.id])}
                  className={`p-4 rounded-3xl shadow-sm border flex gap-4 transition-all active:scale-[0.98] cursor-pointer ${
                    isRead
                      ? 'bg-white border-slate-100 opacity-60'
                      : 'bg-white border-slate-100'
                  }`}
                >
                  <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    n.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
                  }`}>
                    <span className="material-symbols-outlined !text-2xl">{n.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-sm">{n.title}</h3>
                        {!isRead && (
                          <span className="size-2 rounded-full bg-red-500 shrink-0"></span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight shrink-0 ml-2">{n.time}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
                      "{n.message}"
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="size-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <span className="material-symbols-outlined !text-4xl">notifications_off</span>
            </div>
            <p className="font-bold text-slate-400">Non hai nuove notifiche</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
