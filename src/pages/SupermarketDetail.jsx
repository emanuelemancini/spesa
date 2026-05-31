import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import useStore from '../store/useStore';
import ProductDetailModal from '../components/ui/ProductDetailModal';
import ProductImage from '../components/ui/ProductImage';
import SupermarketLogo from '../components/ui/SupermarketLogo';
import { SortableList, ReorderButton, DragHandle } from '../components/ui/SortableList';

const DAY_NAMES = ['sun','mon','tue','wed','thu','fri','sat'];
const DAY_LABELS = { mon:'Lunedì', tue:'Martedì', wed:'Mercoledì', thu:'Giovedì', fri:'Venerdì', sat:'Sabato', sun:'Domenica' };
const DAY_ORDER  = ['mon','tue','wed','thu','fri','sat','sun'];

const STORE_LIST = [
  'Bennet','Carrefour','Castoro','Conad','Coop','Crai',
  'Despar','Esselunga','Eurospin','Famila',"In's Mercato",
  'Iper','Lidl','MD','Oasi Tigre','Pam','Penny','Todis','Unes'
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function getStoreStatus(supermarket) {
  const now = new Date();
  const todayKey = DAY_NAMES[now.getDay()];
  const h = supermarket.hours?.[todayKey];
  if (!h) return { isOpen: false, label: '' };
  const [hO, mO] = h.open.split(':').map(Number);
  const [hC, mC] = h.close.split(':').map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  if (cur >= hO * 60 + mO && cur < hC * 60 + mC) return { isOpen: true,  label: `Chiude alle ${h.close}` };
  if (cur < hO * 60 + mO) return { isOpen: false, closingSoon: false, color: 'closed', label: `Apre alle ${h.open}` };
  return { isOpen: false, closingSoon: false, color: 'closed', label: 'Chiuso per oggi' };
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
const STATUS_LABEL = { open: 'Aperto', closing: 'Chiude presto', closed: 'Chiuso' };

// ── Section badges ───────────────────────────────────────────────────────────

function SectionBadges({ products }) {
  const daComprare = products.filter(p => p.status === 'skipped').length;
  const inLista    = products.filter(p => p.status === 'to-buy').length;

  return (
    <div className="flex items-center gap-1.5">
      {daComprare > 0 && (
        <span className="text-[10px] font-black text-red-600 bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg">
          {daComprare} {daComprare === 1 ? 'prodotto' : 'prodotti'} da comprare
        </span>
      )}
      {inLista > 0 && (
        <span className="text-[10px] font-black text-orange-600 bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg">
          {inLista} {inLista === 1 ? 'prodotto' : 'prodotti'} in lista
        </span>
      )}
    </div>
  );
}

// ── Product row ──────────────────────────────────────────────────────────────

function ProductRow({ product, onOpen, onToggleBought, dragHandleProps, isReordering, isGlowing }) {
  const now = new Date();
  const isExpired  = product.expiryDate && new Date(product.expiryDate) < now;
  const isExpiring = !isExpired && product.expiryDate && (new Date(product.expiryDate) - now) < 2 * 86400000;
  const status     = product.status; // 'to-buy' | 'bought' | 'opened' | 'skipped'

  const borderColor =
    status === 'bought'  ? 'border-l-green-200' :
    status === 'to-buy'  ? 'border-l-orange-200' :
    status === 'opened'  ? 'border-l-blue-200' :
                           'border-l-red-200';

  return (
    <div
      id={`product-${product.id}`}
      onClick={() => !isReordering && onOpen(product)}
      style={isGlowing ? { backgroundColor: 'rgb(220,242,217)', transition: 'background-color 0.3s ease' } : { backgroundColor: 'white', transition: 'background-color 1.5s ease' }}
      className={`flex items-center gap-3 rounded-[22px] p-3 border border-l-4 ${borderColor} ${isGlowing ? 'border-primary/50 shadow-md shadow-primary/20' : 'border-slate-100 shadow-sm'} transition-[border,box-shadow] ${isReordering ? '' : 'active:scale-[0.98] cursor-pointer'}`}
    >
      <DragHandle dragHandleProps={dragHandleProps} />
      <ProductImage product={product} className="size-14 rounded-2xl shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-black truncate text-slate-900">{product.name}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wide">Quantità: {product.quantity ?? 0}</span>
          {product.category && (
            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wide">{product.category}</span>
          )}
          {isExpired && (
            <span className="text-[9px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-md">Scaduto</span>
          )}
          {isExpiring && (
            <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">Scade presto</span>
          )}
          {status === 'opened' && (
            <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md">Aperto</span>
          )}
        </div>
      </div>

      <div onClick={e => e.stopPropagation()} className="shrink-0">
        {status === 'opened' ? (
          <button
            onClick={() => onToggleBought(product.id, 'skipped')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-500 border border-blue-100 text-[10px] font-black rounded-2xl active:scale-90 transition-all"
          >
            <span className="material-symbols-outlined !text-sm">grocery</span>
            Aperto
          </button>
        ) : status === 'bought' ? (
          <button
            onClick={() => onToggleBought(product.id, 'skipped')}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-600 border border-green-100 text-[10px] font-black rounded-2xl active:scale-90 transition-all"
          >
            <span className="material-symbols-outlined !text-sm">check_circle</span>
            Comprato
          </button>
        ) : status === 'to-buy' ? (
          <button
            onClick={() => onToggleBought(product.id, 'bought')}
            className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 text-orange-500 border border-orange-100 text-[10px] font-black rounded-2xl active:scale-90 transition-all"
          >
            <span className="material-symbols-outlined !text-sm">shopping_cart</span>
            In lista
          </button>
        ) : (
          <button
            onClick={() => onToggleBought(product.id, 'to-buy')}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-500 border border-red-100 text-[10px] font-black rounded-2xl active:scale-90 transition-all"
          >
            <span className="material-symbols-outlined !text-sm">add_shopping_cart</span>
            Da comprare
          </button>
        )}
      </div>
    </div>
  );
}

// ── OSM hours sync ───────────────────────────────────────────────────────────

const OSM_DAY_MAP = { Mo: 'mon', Tu: 'tue', We: 'wed', Th: 'thu', Fr: 'fri', Sa: 'sat', Su: 'sun' };
const OSM_DAY_ORDER = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function expandOsmDayRange(range) {
  // e.g. "Mo-Fr" -> ['mon','tue','wed','thu','fri'], "Sa" -> ['sat']
  if (range.includes('-')) {
    const [start, end] = range.split('-');
    const si = OSM_DAY_ORDER.indexOf(start);
    const ei = OSM_DAY_ORDER.indexOf(end);
    if (si === -1 || ei === -1) return [];
    return OSM_DAY_ORDER.slice(si, ei + 1).map(d => OSM_DAY_MAP[d]);
  }
  return OSM_DAY_MAP[range] ? [OSM_DAY_MAP[range]] : [];
}

function parseOsmOpeningHours(str) {
  // e.g. "Mo-Fr 08:00-21:00; Sa 08:00-20:00; Su 09:00-20:00"
  const result = {};
  const segments = str.split(';').map(s => s.trim()).filter(Boolean);
  for (const seg of segments) {
    // Match: [day spec] [time range] or [time range] (applies to all)
    const m = seg.match(/^([A-Za-z,\-]+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    if (!m) continue;
    const [, daySpec, open, close] = m;
    // Handle comma-separated day specs: "Mo-Fr,Su"
    const dayParts = daySpec.split(',');
    for (const part of dayParts) {
      const days = expandOsmDayRange(part.trim());
      for (const day of days) {
        result[day] = { open, close };
      }
    }
  }
  return result;
}

async function fetchOsmHours(storeName) {
  // Cerca a Roma e provincia (raggio 40 km dal centro di Roma), senza filtro opening_hours
  const query = `[out:json][timeout:15];(node["name"~"${storeName}",i]["shop"](around:40000,41.9028,12.4964);way["name"~"${storeName}",i]["shop"](around:40000,41.9028,12.4964););out 10;`;
  const url = `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);
  const data = await res.json();

  if (!data.elements?.length) throw new Error('Negozio non trovato su OpenStreetMap');

  // Cerca prima un elemento con opening_hours
  const el = data.elements.find(e => e.tags?.opening_hours) || null;
  if (!el) throw new Error(`Negozio trovato (${data.elements.length} risultati) ma nessun orario disponibile su OpenStreetMap`);

  const parsed = parseOsmOpeningHours(el.tags.opening_hours);
  if (Object.keys(parsed).length === 0) throw new Error(`Formato orari non supportato: "${el.tags.opening_hours}"`);
  return { hours: parsed, raw: el.tags.opening_hours };
}

// ── Hours editor ─────────────────────────────────────────────────────────────

function HoursEditor({ hours, onChange, storeName }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(hours);
  const [syncing, setSyncing] = React.useState(false);
  const [syncResult, setSyncResult] = React.useState(null); // { hours, raw } | null
  const [syncError, setSyncError] = React.useState(null);
  const todayKey = DAY_NAMES[new Date().getDay()];

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const result = await fetchOsmHours(storeName);
      setSyncResult(result);
      setDraft(result.hours);
      setEditing(true);
    } catch (err) {
      setSyncError(err.message || 'Errore di sincronizzazione');
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = () => {
    onChange(draft);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="space-y-2 pt-3 border-t border-slate-100">
        {DAY_ORDER.map(day => {
          const isToday = day === todayKey;
          const h = hours?.[day];
          return (
            <div key={day} className={`flex items-center justify-between text-[12px] font-bold ${isToday ? 'text-slate-900' : 'text-slate-400'}`}>
              <span className={isToday ? 'font-black' : ''}>{DAY_LABELS[day]}</span>
              <span>{h ? `${h.open} – ${h.close}` : '—'}</span>
            </div>
          );
        })}
        {syncError && (
          <p className="text-[10px] font-bold text-red-500 text-center py-1">{syncError}</p>
        )}
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex-1 py-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-500 text-[11px] font-black active:scale-95 transition-transform flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {syncing
              ? <span className="material-symbols-outlined !text-[16px] animate-spin">progress_activity</span>
              : <span className="material-symbols-outlined !text-[16px]">sync</span>
            }
            {syncing ? 'Ricerca...' : 'Sincronizza orari'}
          </button>
          <button
            onClick={() => { setDraft(hours); setEditing(true); setSyncResult(null); setSyncError(null); }}
            className="flex-1 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-[11px] font-black active:scale-95 transition-transform flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined !text-[16px]">edit</span>
            Modifica orari
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-3 border-t border-slate-100">
      {syncResult && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mb-2">
          <span className="material-symbols-outlined !text-[14px] text-blue-500 shrink-0">location_on</span>
          <p className="text-[10px] font-bold text-blue-600 leading-tight">Orari da OpenStreetMap · verifica e salva</p>
        </div>
      )}
      {DAY_ORDER.map(day => {
        const isToday = day === todayKey;
        const h = draft?.[day] || { open: '08:00', close: '20:00' };
        return (
          <div key={day} className={`flex items-center gap-2 ${isToday ? 'font-black text-slate-900' : 'text-slate-500'}`}>
            <span className="text-[11px] font-black w-20 shrink-0">{DAY_LABELS[day]}</span>
            <input
              type="time"
              value={h.open}
              onChange={e => setDraft(d => ({ ...d, [day]: { ...d[day], open: e.target.value } }))}
              className="flex-1 h-8 text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-slate-300 text-[11px]">–</span>
            <input
              type="time"
              value={h.close}
              onChange={e => setDraft(d => ({ ...d, [day]: { ...d[day], close: e.target.value } }))}
              className="flex-1 h-8 text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        );
      })}
      <div className="flex gap-2 mt-3">
        <button onClick={() => { setEditing(false); setSyncResult(null); }} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-black active:scale-95 transition-transform">Annulla</button>
        <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-[11px] font-black shadow-sm shadow-primary/30 active:scale-95 transition-transform">Salva</button>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

const SupermarketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { supermarkets, products, updateProduct, updateSupermarket, deleteSupermarket, reorderProducts } = useStore();

  const supermarket    = supermarkets.find(s => s.id === id);
  const storeProducts  = products.filter(p => p.supermarketId === id);

  const [searchParams, setSearchParams] = useSearchParams();
  const [isEditingCard, setIsEditingCard]   = React.useState(false);
  const [newCardNumber, setNewCardNumber]   = React.useState(supermarket?.fidelityCard?.cardNumber || '');
  const [showHours, setShowHours]           = React.useState(false);
  const [isEditingName, setIsEditingName]   = React.useState(false);
  const [tempName, setTempName]             = React.useState(supermarket?.name || '');
  const [isShowingBarcode, setIsShowingBarcode] = React.useState(false);
  const [isDeleting, setIsDeleting]         = React.useState(false);
  const [activeFilter, setActiveFilter]     = React.useState(null); // null | 'to-buy' | 'expired' | 'expiring' | 'opened'
  const [isReordering, setIsReordering]     = React.useState(false);

  const selectedProductId = searchParams.get('productId');
  const selectedProduct   = products.find(p => p.id === selectedProductId);
  const highlightId       = searchParams.get('highlight');
  const [glowId, setGlowId] = React.useState(highlightId || null);

  React.useEffect(() => {
    if (supermarket) {
      setNewCardNumber(supermarket.fidelityCard?.cardNumber || '');
      setTempName(supermarket.name);
    }
  }, [supermarket]);

  // Scroll dall'inizio + highlight sul prodotto evidenziato
  React.useEffect(() => {
    if (!highlightId) return;
    // Prima vai in cima istantaneamente
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => {
      const el = document.getElementById(`product-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setGlowId(highlightId);
        setTimeout(() => setGlowId(null), 2000);
      }
    }, 100);
  }, [highlightId]);

  if (!supermarket) return <div className="p-8 text-center font-bold text-slate-400">Negozio non trovato</div>;

  const now = new Date();
  const { isOpen, color: statusColor, label: statusLabel } = getStoreStatus(supermarket);

  // Stats
  const kitchenProducts = storeProducts.filter(p => p.type === 'kitchen');
  const homeProducts    = storeProducts.filter(p => p.type !== 'kitchen');
  const toBuyCount      = storeProducts.filter(p => p.status === 'to-buy').length;
  const skippedCount    = storeProducts.filter(p => p.status === 'skipped').length;
  const expiringCount   = storeProducts.filter(p => {
    if (!p.expiryDate) return false;
    const diff = new Date(p.expiryDate) - now;
    return diff > 0 && diff < 2 * 86400000;
  }).length;
  const openedCount     = storeProducts.filter(p => p.status === 'opened').length;

  // Filtro prodotti
  const filterFn = (p) => {
    if (!activeFilter) return true;
    if (activeFilter === 'to-buy')   return p.status === 'to-buy';
    if (activeFilter === 'skipped')  return p.status === 'skipped';
    if (activeFilter === 'expiring') { const d = p.expiryDate && new Date(p.expiryDate) - now; return d > 0 && d < 2 * 86400000; }
    if (activeFilter === 'opened')   return p.status === 'opened';
    return true;
  };
  const filteredKitchen = kitchenProducts.filter(filterFn);
  const filteredHome    = homeProducts.filter(filterFn);

  const handleUpdateCard = () => {
    updateSupermarket(id, { fidelityCard: { ...supermarket.fidelityCard, cardNumber: newCardNumber } });
    setIsEditingCard(false);
  };

  const handleUpdateName = () => {
    if (!tempName) return;
    updateSupermarket(id, { name: tempName });
    setIsEditingName(false);
  };

  const openProductDetail = (product) => {
    setSearchParams({ productId: product.id });
  };

  const closeProductDetail = () => {
    setSearchParams(prev => { prev.delete('productId'); return prev; });
  };

  const todayKey = DAY_NAMES[now.getDay()];

  return (
    <div className="pb-24 -mx-4 min-h-screen">

      {/* Header */}
      <div className="flex items-center bg-white/90 backdrop-blur-md px-3 py-3 sticky top-0 z-30 border-b border-slate-100 shadow-sm">
        <button onClick={() => navigate('/stores')} className="size-10 shrink-0 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex flex-1 items-center gap-2.5 px-2 min-w-0">
          <SupermarketLogo name={supermarket.name} className="size-8 shrink-0" />
          <h2 className="text-slate-900 text-base font-black leading-tight truncate">{supermarket.name}</h2>
          {statusLabel && statusColor && (
            <span className={`shrink-0 flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border ${STATUS_BADGE[statusColor]}`}>
              <span className={`size-1.5 rounded-full shrink-0 ${STATUS_DOT[statusColor]}`}></span>
              {STATUS_LABEL[statusColor]}
            </span>
          )}
        </div>
        <div className="flex gap-0.5 shrink-0 items-center">
          <ReorderButton isReordering={isReordering} onToggle={() => setIsReordering(r => !r)} />
          <button onClick={() => setIsEditingName(true)} className="size-9 flex items-center justify-center rounded-full hover:bg-primary/10 text-slate-600 transition-colors">
            <span className="material-symbols-outlined !text-[20px]">edit</span>
          </button>
          <button onClick={() => setIsDeleting(true)} className="size-9 flex items-center justify-center rounded-full hover:bg-red-50 text-red-500 transition-colors">
            <span className="material-symbols-outlined !text-[20px]">delete</span>
          </button>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">

        {/* Fidelity Card */}
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-primary/10 via-white to-primary/5 p-6 border border-primary/15 shadow-sm">
          <div className="absolute -right-8 -top-8 size-48 rounded-full bg-primary/5 blur-3xl pointer-events-none"></div>
          <div className="absolute -left-12 -bottom-12 size-48 rounded-full bg-primary/8 blur-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <span className="material-symbols-outlined text-xl text-primary">loyalty</span>
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-900">{supermarket.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400">Fidelity Card</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-4xl text-primary/15">contactless</span>
            </div>

            <div className="mb-6">
              {isEditingCard ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCardNumber}
                    onChange={e => setNewCardNumber(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUpdateCard()}
                    placeholder="Inserisci numero carta..."
                    className="bg-white border border-primary/20 rounded-xl px-4 py-2 text-slate-900 placeholder:text-slate-300 text-base font-black outline-none flex-1 focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                  <button onClick={handleUpdateCard} className="size-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                    <span className="material-symbols-outlined">check</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setIsEditingCard(true)}>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 mb-1">Codice carta</p>
                    <p className="text-2xl font-black tracking-[0.12em] text-slate-900">
                      {supermarket.fidelityCard?.cardNumber || '—— —— ——'}
                    </p>
                  </div>
                  <span className="material-symbols-outlined opacity-0 group-hover:opacity-40 transition-opacity !text-lg text-slate-500">edit</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-green-400 shadow-[0_0_8px_rgb(74,222,128)]"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pronto all'uso</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate(`/scan/${id}`)} className="h-10 px-4 rounded-2xl bg-white border border-slate-100 flex items-center gap-1.5 text-[10px] font-bold text-slate-600 shadow-sm hover:bg-slate-50 active:scale-95 transition-all">
                  <span className="material-symbols-outlined !text-base text-primary">photo_camera</span>
                  Scansiona
                </button>
                <button onClick={() => setIsShowingBarcode(true)} className="h-10 px-4 rounded-2xl bg-primary text-white flex items-center gap-1.5 text-[10px] font-bold shadow-md shadow-primary/20 active:scale-95 transition-all">
                  <span className="material-symbols-outlined !text-base">qr_code_2</span>
                  Mostra
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Orari */}
        <div className="bg-white rounded-[24px] border border-slate-100 p-4 shadow-sm">
          <button
            onClick={() => setShowHours(v => !v)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className={`size-10 rounded-xl flex items-center justify-center ${
              statusColor === 'open' ? 'bg-green-50 text-green-600' :
              statusColor === 'closing' ? 'bg-orange-50 text-orange-500' :
              'bg-red-50 text-red-500'
            }`}>
                <span className="material-symbols-outlined !text-[20px]">schedule</span>
              </div>
              <div className="text-left">
                <p className={`text-sm font-black ${
                  statusColor === 'open' ? 'text-green-600' :
                  statusColor === 'closing' ? 'text-orange-500' :
                  'text-red-500'
                }`}>
                  {STATUS_LABEL[statusColor] || 'Orari non configurati'}
                </p>
                <p className="text-[10px] font-bold text-slate-400">{statusLabel || 'Tocca per configurare'}</p>
              </div>
            </div>
            <span className={`material-symbols-outlined text-slate-300 transition-transform duration-300 ${showHours ? 'rotate-180' : ''}`}>expand_more</span>
          </button>

          {showHours && (
            <HoursEditor
              hours={supermarket.hours}
              onChange={newHours => updateSupermarket(id, { hours: newHours })}
              storeName={supermarket.name}
            />
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Aperti',      value: openedCount,   icon: 'grocery',         color: 'text-blue-500 bg-blue-50 border-blue-100',     activeColor: 'ring-2 ring-blue-400',   filter: 'opened'   },
            { label: 'In scadenza', value: expiringCount, icon: 'schedule',          color: 'text-amber-600 bg-amber-50 border-amber-100',   activeColor: 'ring-2 ring-amber-400',  filter: 'expiring' },
            { label: 'Da comprare', value: skippedCount,  icon: 'add_shopping_cart', color: 'text-red-500 bg-red-50 border-red-100',         activeColor: 'ring-2 ring-red-400',    filter: 'skipped'  },
            { label: 'In lista',    value: toBuyCount,    icon: 'shopping_cart',     color: 'text-orange-500 bg-orange-50 border-orange-100', activeColor: 'ring-2 ring-orange-400', filter: 'to-buy'   },
          ].map(stat => (
            <button
              key={stat.label}
              onClick={() => setActiveFilter(activeFilter === stat.filter ? null : stat.filter)}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all active:scale-95 ${stat.color} ${activeFilter === stat.filter ? stat.activeColor + ' scale-[0.97]' : ''}`}
            >
              <span className="material-symbols-outlined !text-[18px]">{stat.icon}</span>
              <p className="text-2xl font-black text-slate-900 leading-none">{stat.value}</p>
              <p className="text-[9px] font-bold text-center leading-tight opacity-70">{stat.label}</p>
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="h-2" />

        {/* Prodotti Cucina */}
        {filteredKitchen.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-slate-900">Cucina</h3>
              <SectionBadges products={kitchenProducts} />
            </div>
            <SortableList
              items={filteredKitchen}
              isReordering={isReordering}
              className="space-y-2"
              onReorder={(newIds) => {
                const otherIds = products.filter(p => !filteredKitchen.find(k => k.id === p.id)).map(p => p.id);
                reorderProducts([...newIds, ...otherIds]);
              }}
            >
              {(p, { dragHandleProps }) => (
                <ProductRow product={p} onOpen={openProductDetail} onToggleBought={(pid, status) => updateProduct(pid, { status })} dragHandleProps={dragHandleProps} isReordering={isReordering} isGlowing={glowId === p.id} />
              )}
            </SortableList>
          </section>
        )}

        {/* Prodotti Casa */}
        {filteredHome.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-slate-900">Casa</h3>
              <SectionBadges products={homeProducts} />
            </div>
            <SortableList
              items={filteredHome}
              isReordering={isReordering}
              className="space-y-2"
              onReorder={(newIds) => {
                const otherIds = products.filter(p => !filteredHome.find(h => h.id === p.id)).map(p => p.id);
                reorderProducts([...newIds, ...otherIds]);
              }}
            >
              {(p, { dragHandleProps }) => (
                <ProductRow product={p} onOpen={openProductDetail} onToggleBought={(pid, status) => updateProduct(pid, { status })} dragHandleProps={dragHandleProps} isReordering={isReordering} isGlowing={glowId === p.id} />
              )}
            </SortableList>
          </section>
        )}

        {storeProducts.length === 0 && (
          <div className="py-12 text-center">
            <div className="size-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined !text-3xl text-slate-300">grocery</span>
            </div>
            <p className="font-bold text-slate-400 text-sm">Nessun prodotto per questo negozio</p>
          </div>
        )}
        {storeProducts.length > 0 && filteredKitchen.length === 0 && filteredHome.length === 0 && (
          <div className="py-12 text-center">
            <div className="size-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined !text-3xl text-slate-300">filter_list_off</span>
            </div>
            <p className="font-bold text-slate-400 text-sm">Nessun prodotto corrisponde al filtro</p>
            <button onClick={() => setActiveFilter(null)} className="mt-3 text-[11px] font-black text-primary">Rimuovi filtro</button>
          </div>
        )}
      </div>

      {/* Barcode Modal */}
      {isShowingBarcode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-xl">
          <div className="w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl relative text-center">
            <button onClick={() => setIsShowingBarcode(false)} className="absolute top-5 right-5 size-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center active:scale-90 transition-transform">
              <X size={20} />
            </button>
            <div className="mb-8 mt-2">
              <SupermarketLogo name={supermarket.name} className="size-20 mx-auto mb-4" />
              <h3 className="text-xl font-black text-slate-900">{supermarket.name}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Fidelity Card</p>
            </div>
            <div className="bg-slate-50 rounded-3xl p-8 mb-8 border border-slate-100">
              <div className="h-28 w-full flex items-end justify-center gap-px mb-5 overflow-hidden">
                {[...Array(36)].map((_, i) => (
                  <div key={i} className="bg-slate-900 rounded-sm" style={{ width: i % 3 === 0 ? '3px' : '2px', height: `${55 + ((i * 17) % 45)}%` }} />
                ))}
              </div>
              <p className="text-xl font-black tracking-[0.25em] text-slate-900">
                {supermarket.fidelityCard?.cardNumber || '—— —— ——'}
              </p>
            </div>
            <button onClick={() => setIsShowingBarcode(false)} className="w-full h-13 py-3.5 rounded-2xl bg-primary text-white font-bold text-sm shadow-xl shadow-primary/20 active:scale-95 transition-transform">
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* Edit Name Modal */}
      {isEditingName && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-[32px] p-7 shadow-2xl">
            <div className="flex flex-col items-center mb-6">
              <SupermarketLogo name={tempName} className="size-20 mb-4" />
              <h3 className="text-xl font-black text-slate-900">Cambia negozio</h3>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-6 max-h-56 overflow-y-auto">
              {STORE_LIST.map(name => (
                <button
                  key={name}
                  onClick={() => setTempName(name)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-2xl border-2 transition-all active:scale-95 ${
                    tempName === name ? 'border-primary bg-primary/5' : 'border-transparent bg-slate-50'
                  }`}
                >
                  <SupermarketLogo name={name} className="size-10" />
                  <span className="text-[9px] font-black text-slate-700 text-center leading-tight">{name}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsEditingName(false)} className="flex-1 h-13 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm active:scale-95 transition-transform">Annulla</button>
              <button onClick={handleUpdateName} className="flex-1 h-13 py-3.5 rounded-2xl bg-primary text-white font-black text-sm shadow-lg shadow-primary/25 active:scale-95 transition-transform">Salva</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {isDeleting && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setIsDeleting(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl text-center">
            <div className="size-20 rounded-3xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined !text-4xl">delete_forever</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Elimina {supermarket.name}?</h3>
            <p className="text-sm font-medium text-slate-500 mb-7 leading-relaxed">
              Verranno eliminati anche tutti i prodotti salvati per questo negozio.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { deleteSupermarket(id); navigate('/stores'); }} className="w-full h-13 py-3.5 rounded-2xl bg-red-500 text-white font-black text-sm shadow-lg shadow-red-500/25 active:scale-95 transition-all">
                Elimina negozio
              </button>
              <button onClick={() => setIsDeleting(false)} className="w-full h-13 py-3.5 rounded-2xl bg-slate-100 text-slate-500 font-bold text-sm active:scale-95 transition-all">
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      <ProductDetailModal
        isOpen={!!selectedProduct}
        onClose={closeProductDetail}
        product={selectedProduct}
      />
    </div>
  );
};

export default SupermarketDetail;
