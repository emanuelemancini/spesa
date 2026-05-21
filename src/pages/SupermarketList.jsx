import React from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import SupermarketLogo from '../components/ui/SupermarketLogo';
import { createPortal } from 'react-dom';

const STORE_LIST = [
  'Bennet','Carrefour','Castoro','Conad','Coop','Crai',
  'Despar','Esselunga','Eurospin','Famila',"In's Mercato",
  'Iper','Lidl','MD','Oasi Tigre','Pam','Penny','Todis','Unes'
];

const DAY_NAMES = ['sun','mon','tue','wed','thu','fri','sat'];

// Restituisce: { isOpen, closingSoon, label, color }
function getStoreStatus(supermarket) {
  const now     = new Date();
  const todayKey = DAY_NAMES[now.getDay()];
  const h        = supermarket.hours?.[todayKey];
  if (!h) return { isOpen: false, closingSoon: false, label: '', color: 'closed' };

  const [hO, mO] = h.open.split(':').map(Number);
  const [hC, mC] = h.close.split(':').map(Number);
  const cur   = now.getHours() * 60 + now.getMinutes();
  const open  = hO * 60 + mO;
  const close = hC * 60 + mC;

  if (cur >= open && cur < close) {
    const closingSoon = (close - cur) <= 30;
    return {
      isOpen: true,
      closingSoon,
      label: closingSoon ? `Chiude alle ${h.close}` : `Chiude alle ${h.close}`,
      color: closingSoon ? 'closing' : 'open',
    };
  }
  if (cur < open) return { isOpen: false, closingSoon: false, label: `Apre alle ${h.open}`, color: 'closed' };
  return { isOpen: false, closingSoon: false, label: 'Chiuso per oggi', color: 'closed' };
}

const STATUS_BADGE = {
  open:    'bg-green-50 text-green-600 border border-green-100',
  closing: 'bg-orange-50 text-orange-500 border border-orange-100',
  closed:  'bg-red-50 text-red-500 border border-red-100',
};
const STATUS_DOT = {
  open:    'bg-green-400 shadow-[0_0_6px_rgb(74,222,128)]',
  closing: 'bg-orange-400 shadow-[0_0_6px_rgb(251,146,60)]',
  closed:  'bg-red-400',
};
const STATUS_LABEL = {
  open:    'Aperto',
  closing: 'Chiude presto',
  closed:  'Chiuso',
};

// ── Add Store Modal ───────────────────────────────────────────────────────────

function AddStoreModal({ onClose, onAdd }) {
  const [selected, setSelected]   = React.useState('');
  const [customMode, setCustomMode] = React.useState(false);
  const [customName, setCustomName] = React.useState('');

  const finalName = customMode ? customName.trim() : selected;

  const handleConfirm = () => {
    if (!finalName) return;
    onAdd(finalName);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-auto bg-white rounded-t-[32px] shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="px-5 pt-2 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Aggiungi negozio</h2>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">
              {customMode ? 'Inserisci il nome del negozio' : 'Seleziona dalla lista'}
            </p>
          </div>
          {finalName && (
            <div className="flex items-center gap-2">
              <SupermarketLogo name={finalName} className="size-9" />
              <span className="text-sm font-black text-slate-900 max-w-[80px] truncate">{finalName}</span>
            </div>
          )}
        </div>

        {customMode ? (
          <div className="px-5 pb-4">
            <input
              autoFocus
              type="text"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
              placeholder="Es. Mercato di via Roma..."
              className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 font-black text-slate-900 text-base outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30"
            />
            <button
              onClick={() => { setCustomMode(false); setCustomName(''); }}
              className="mt-3 text-[11px] font-black text-primary flex items-center gap-1"
            >
              <span className="material-symbols-outlined !text-[14px]">arrow_back</span>
              Torna alla lista
            </button>
          </div>
        ) : (
          <>
            <div className="px-4 pb-2 grid grid-cols-4 gap-2 max-h-[55vh] overflow-y-auto">
              {STORE_LIST.map(name => (
                <button
                  key={name}
                  onClick={() => setSelected(selected === name ? '' : name)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 transition-all active:scale-95 ${
                    selected === name
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <SupermarketLogo name={name} className="size-12" />
                  <span className="text-[9px] font-black text-slate-700 text-center leading-tight">{name}</span>
                </button>
              ))}
            </div>

            {/* Negozio non in lista */}
            <div className="px-5 pb-2 pt-3">
              <button
                onClick={() => { setCustomMode(true); setSelected(''); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-dashed border-slate-300 text-slate-500 text-[11px] font-black active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined !text-[16px]">add_circle</span>
                Il mio negozio non è in lista
              </button>
            </div>
          </>
        )}

        <div className="px-4 pb-8 pt-1 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm active:scale-95 transition-transform">
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={!finalName}
            className={`flex-1 py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 ${
              finalName ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'bg-slate-100 text-slate-300'
            }`}
          >
            Aggiungi
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

const SupermarketList = () => {
  const navigate = useNavigate();
  const { supermarkets, products, addSupermarket } = useStore();
  const [isAdding, setIsAdding] = React.useState(false);

  const now = new Date();

  return (
    <div className="pb-24 -mx-4">
      {/* Header */}
      <div className="px-5 mb-6 mt-2 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-0.5">I miei negozi</h1>
          <p className="text-sm font-bold text-slate-400">
            {supermarkets.length === 0
              ? 'Nessun negozio salvato'
              : `${supermarkets.length} ${supermarkets.length === 1 ? 'negozio' : 'negozi'}`}
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="size-10 rounded-full bg-primary text-white flex items-center justify-center active:scale-95 transition-transform shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>

      {/* Empty state */}
      {supermarkets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="size-24 rounded-3xl bg-slate-100 flex items-center justify-center mb-5">
            <span className="material-symbols-outlined !text-5xl text-slate-300">storefront</span>
          </div>
          <h3 className="text-lg font-black text-slate-700 mb-2">Nessun negozio ancora</h3>
          <p className="text-sm font-bold text-slate-400 mb-6 leading-relaxed">
            Aggiungi i supermercati dove fai la spesa per tenere traccia dei prodotti.
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-black text-sm shadow-lg shadow-primary/25 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined !text-[20px]">add</span>
            Aggiungi negozio
          </button>
        </div>
      ) : (
        <div className="grid gap-3 px-4">
          {supermarkets.map((store) => {
            const storeProducts = products.filter(p => p.supermarketId === store.id);
            const daComprareCount = storeProducts.filter(p => p.status === 'skipped').length;
            const toBuyCount    = storeProducts.filter(p => p.status === 'to-buy').length;
            const boughtCount   = storeProducts.filter(p => p.status === 'bought').length;
            const expiredCount  = storeProducts.filter(p => p.expiryDate && new Date(p.expiryDate) < now).length;
            const expiringCount = storeProducts.filter(p => {
              if (!p.expiryDate) return false;
              const d = new Date(p.expiryDate) - now;
              return d > 0 && d < 2 * 86400000;
            }).length;
            const openedCount = storeProducts.filter(p => p.status === 'opened').length;

            const { isOpen, color, label } = getStoreStatus(store);
            const hasStatus = !!label;

            return (
              <div
                key={store.id}
                onClick={() => navigate(`/stores/${store.id}`)}
                className="bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all"
              >
                <SupermarketLogo name={store.name} className="size-14 shrink-0" />

                <div className="flex-1 min-w-0">
                  {/* Nome + badge stato + orario inline */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-base font-black truncate text-slate-900">{store.name}</h3>
                    {hasStatus && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full ${STATUS_BADGE[color]}`}>
                          <span className={`size-1.5 rounded-full shrink-0 ${STATUS_DOT[color]}`}></span>
                          {STATUS_LABEL[color]}
                        </span>
                        {label && (
                          <span className="text-[10px] font-bold text-slate-400">
                            {label}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Badge prodotti */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      {daComprareCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-lg">
                          <span className="material-symbols-outlined !text-[11px]">add_shopping_cart</span>
                          {daComprareCount} da comprare
                        </span>
                      )}
                      {toBuyCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-black text-orange-500 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-lg">
                          <span className="material-symbols-outlined !text-[11px]">shopping_cart</span>
                          {toBuyCount} in lista
                        </span>
                      )}
                      {openedCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-black text-blue-500 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">
                          <span className="material-symbols-outlined !text-[11px]">grocery</span>
                          {openedCount} apert{openedCount === 1 ? 'o' : 'i'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {expiringCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg">
                          <span className="material-symbols-outlined !text-[11px]">schedule</span>
                          {expiringCount} in scadenza
                        </span>
                      )}
                      {expiredCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-black text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded-lg">
                          <span className="material-symbols-outlined !text-[11px]">warning</span>
                          {expiredCount} scadut{expiredCount === 1 ? 'o' : 'i'}
                        </span>
                      )}
                    </div>
                    {storeProducts.length === 0 && (
                      <span className="text-[10px] font-bold text-slate-400">Nessun prodotto</span>
                    )}
                  </div>

                </div>

                <span className="material-symbols-outlined text-slate-300 shrink-0">chevron_right</span>
              </div>
            );
          })}
        </div>
      )}

      {isAdding && (
        <AddStoreModal onClose={() => setIsAdding(false)} onAdd={(name) => addSupermarket({ name })} />
      )}
    </div>
  );
};

export default SupermarketList;
