import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useStore from '../store/useStore';
import ProductDetailModal from '../components/ui/ProductDetailModal';
import ProductImage from '../components/ui/ProductImage';
import { formatDistanceToNow, isAfter, isBefore, addDays, format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { syncModule } from '../security/sync';

const Dashboard = () => {
  const { products, supermarkets, mergeState, setIsUnsynced, isUnsynced, showToast } = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [expandExpiring, setExpandExpiring] = React.useState(false);
  const [expandOpened, setExpandOpened] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const scrollContainerRef = React.useRef(null);

  const handleSync = async () => {
    setSyncing(true);
    const currentConfig = useStore.getState().config;
    if (currentConfig.pin) syncModule.setSessionPIN(currentConfig.pin);
    const s = useStore.getState();
    // Push diretto: le modifiche locali sono la verità
    const success = await syncModule.pushToCloud({
      products: s.products,
      supermarkets: s.supermarkets,
      user: s.user,
      config: s.config,
      readNotificationIds: s.readNotificationIds,
    });
    setSyncing(false);
    if (success) {
      setIsUnsynced(false);
      showToast('Dati caricati sul cloud!', 'success');
    } else {
      showToast('Errore di sincronizzazione', 'error');
    }
  };
  
  const activeFilter = searchParams.get('filter');
  const selectedProductId = searchParams.get('productId');
  const shouldFocusSearch = searchParams.get('search') === 'true';
  const searchInputRef = React.useRef(null);

  React.useEffect(() => {
    if (shouldFocusSearch && searchInputRef.current) {
      searchInputRef.current.focus();
      // Remove the search param from URL to prevent refocussing on re-render
      setSearchParams(prev => {
        prev.delete('search');
        return prev;
      }, { replace: true });
    }
  }, [shouldFocusSearch, setSearchParams]);
  const selectedProduct = products.find(p => p.id === selectedProductId);

  const scrollToToday = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const todayCard = container.querySelector('#today-card');
      if (todayCard) {
        const containerRect = container.getBoundingClientRect();
        const cardRect = todayCard.getBoundingClientRect();
        // Calculate position relative to container
        const relativeLeft = cardRect.left - containerRect.left + container.scrollLeft;
        const scrollPos = relativeLeft - (container.offsetWidth / 2) + (todayCard.offsetWidth / 2);
        
        container.scrollTo({ left: scrollPos, behavior: 'smooth' });
      }
    }
    setSelectedDate(new Date());
  };

  // Centra "Oggi" all'avvio
  React.useEffect(() => {
    const timer = setTimeout(scrollToToday, 100);
    return () => clearTimeout(timer);
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === 'critico') {
      return matchesSearch && p.expiryDate && isBefore(new Date(p.expiryDate), new Date());
    }
    if (activeFilter === 'esaurimento') {
      return matchesSearch && p.type === 'home' && p.quantity <= 1;
    }
    if (activeFilter === 'aperti') {
      return matchesSearch && p.type === 'kitchen' && p.status === 'opened';
    }
    if (activeFilter === 'imminenti') {
      return matchesSearch && p.type === 'kitchen' && p.expiryDate && isBefore(new Date(p.expiryDate), addDays(new Date(), 7));
    }
    return matchesSearch;
  });

  const expiringSoon = products.filter(p => p.type === 'kitchen' && p.expiryDate && isBefore(new Date(p.expiryDate), addDays(new Date(), 7)));
  const openedProducts = products.filter(p => p.type === 'kitchen' && p.status === 'opened');
  const showResults = searchQuery.length > 0 || activeFilter !== null;

  return (
    <div className="pb-[70px] -mx-4">
      {/* Clean Header */}
      <div className="px-5 mb-2 mt-2 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-0.5">I miei alimenti</h1>
          <p className="text-sm font-bold text-slate-400">
            {products.filter(p => p.type === 'kitchen').reduce((acc, p) => acc + p.quantity, 0)} alimenti in cucina
          </p>
        </div>
      </div>

      {/* Search Bar - Floating Glassmorphism above footer */}
      <div className="fixed bottom-[105px] left-0 right-0 z-40 px-4 pointer-events-none">
        <div className="max-w-md mx-auto relative flex items-center pointer-events-auto">
          <span className="material-symbols-outlined absolute left-4 text-slate-500">search</span>
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Cerca alimenti..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-10 bg-primary/20 backdrop-blur-2xl border border-primary/10 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),inset_0_0_20px_rgba(255,255,255,0.4)] focus:ring-2 focus:ring-primary/30 text-sm font-bold placeholder-slate-600 outline-none transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined !text-xl">cancel</span>
            </button>
          )}
        </div>
      </div>

      {!showResults ? (
        <>
          {/* Stats Grid - Moved to Top */}
          <section className="px-4 mt-2 mb-4">
            <div 
              onClick={() => {
                const newVal = activeFilter === 'critico' ? {} : { filter: 'critico' };
                setSearchParams(newVal);
              }}
              className={`p-4 rounded-[24px] border transition-all cursor-pointer relative overflow-hidden flex items-center gap-4 shadow-sm ${
                activeFilter === 'critico' 
                ? 'bg-red-500 border-red-600 shadow-lg shadow-red-200 scale-[1.02] z-10' 
                : 'bg-red-50 border-red-100 hover:border-red-200 active:scale-[0.98]'
              }`}
            >
              <div className={`size-14 rounded-2xl flex items-center justify-center shrink-0 ${activeFilter === 'critico' ? 'bg-white text-red-500 shadow-sm' : 'bg-red-100 text-red-500'}`}>
                  <span className="material-symbols-rounded !text-3xl">warning</span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className={`text-lg font-black tracking-tight truncate ${activeFilter === 'critico' ? 'text-white' : 'text-red-800'}`}>Scadenze Critiche</p>
                  {products.filter(p => p.expiryDate && isBefore(new Date(p.expiryDate), new Date())).length > 0 && !activeFilter && (
                    <span className="size-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
                  )}
                </div>
                <p className={`text-[11px] font-bold uppercase tracking-widest ${activeFilter === 'critico' ? 'text-white/80' : 'text-red-500'}`}>
                  {products.filter(p => p.expiryDate && isBefore(new Date(p.expiryDate), new Date())).length > 0 ? 'Da buttare subito' : 'Tutto ok'}
                </p>
              </div>

              <div className={`text-4xl font-black pr-2 ${activeFilter === 'critico' ? 'text-white' : 'text-red-600'}`}>
                {products.filter(p => p.expiryDate && isBefore(new Date(p.expiryDate), new Date())).length}
              </div>
            </div>
          </section>

          {/* Scadenze Imminenti */}
          <section className="mt-6 px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black tracking-tight text-[#2d5a27]">Scadenze Imminenti</h2>
              <div className="bg-red-50 text-red-500 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">
                {expiringSoon.length} {expiringSoon.length === 1 ? 'Alimento' : 'Alimenti'}
              </div>
            </div>
            
            <div className="grid gap-4">
              {expiringSoon.slice(0, expandExpiring ? undefined : 3).map((product) => {
                const isToday = isBefore(new Date(product.expiryDate), addDays(new Date(), 1));
                return (
                  <div
                    key={product.id}
                    onClick={() => setSearchParams(prev => {
                      prev.set('productId', product.id);
                      return prev;
                    })}
                    className={`group relative bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm cursor-pointer active:scale-[0.98] transition-all border-l-[6px] ${isToday ? 'border-l-red-500' : 'border-l-orange-400'}`}
                  >
                    <div className="flex items-center gap-4">
                      <ProductImage
                        product={product}
                        className="size-16 rounded-2xl shrink-0 border border-slate-50/50"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="font-black text-slate-900 text-sm tracking-tight truncate">{product.name}</p>
                            <span className={`size-2 rounded-full animate-ping shrink-0 ${isToday ? 'bg-red-500' : 'bg-orange-400'}`}></span>
                          </div>
                          {isToday ? (
                            <span className="text-[9px] font-black bg-red-500 text-white px-2 py-0.5 rounded-md uppercase tracking-widest shrink-0">Critico</span>
                          ) : (
                            <span className="text-[9px] font-black bg-orange-400 text-white px-2 py-0.5 rounded-md uppercase tracking-widest shrink-0">A breve</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-slate-400 mt-1.5">
                            <span className="material-symbols-outlined !text-[12px]">schedule</span>
                            <p className="text-[10px] font-black tracking-tight">
                              {isToday ? 'Scade oggi' : (() => {
                                const d = new Date(product.expiryDate);
                                const day = d.getDate();
                                const article = (day === 1 || day === 8 || day === 11) ? "l'" : 'il ';
                                return `Scade ${article}${format(d, 'd MMMM', { locale: it })}`;
                              })()}
                            </p>
                          </div>
                          {(() => {
                            const store = supermarkets.find(s => s.id === product.supermarketId);
                            return store ? (
                              <button onClick={(e) => { e.stopPropagation(); navigate(`/stores/${store.id}?highlight=${product.id}`); }} className="flex items-center gap-1 text-primary/60 hover:text-primary active:scale-95 transition-all">
                                <span className="material-symbols-outlined !text-[12px]">storefront</span>
                                <p className="text-[10px] font-black uppercase tracking-tighter truncate max-w-[80px]">{store.name}</p>
                                <span className="material-symbols-outlined !text-[10px]">arrow_forward</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1 text-slate-400">
                                <span className="material-symbols-outlined !text-[12px]">storefront</span>
                                <p className="text-[10px] font-black uppercase tracking-tighter">N/D</p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {expiringSoon.length > 3 && (
                <button
                  onClick={() => setExpandExpiring(v => !v)}
                  className="w-full py-4 text-slate-400 text-xs font-black border border-dashed border-slate-200 rounded-2xl active:bg-slate-50 transition-colors uppercase tracking-widest"
                >
                  {expandExpiring ? 'Mostra meno' : (
                    expiringSoon.length - 3 === 1
                      ? `Vedi ${expiringSoon.length - 3} altro alimento`
                      : `Vedi altri ${expiringSoon.length - 3} alimenti`
                  )}
                </button>
              )}
            </div>
          </section>

          {/* Alimenti Aperti */}
          <section className="mt-8 px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black tracking-tight text-[#2d5a27]">Alimenti Aperti</h2>
              <div className="bg-primary/5 text-primary text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">
                {openedProducts.length} {openedProducts.length === 1 ? 'Alimento' : 'Alimenti'}
              </div>
            </div>
            
            <div className="grid gap-4">
              {openedProducts.slice(0, expandOpened ? undefined : 3).map((product) => (
                <div
                  key={product.id}
                  onClick={() => setSearchParams(prev => {
                    prev.set('productId', product.id);
                    return prev;
                  })}
                  className="group relative bg-white p-4 rounded-[28px] border border-slate-100 border-l-[6px] border-l-primary/30 shadow-sm cursor-pointer active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <ProductImage
                      product={product}
                      className="size-16 rounded-2xl shrink-0 border border-slate-50/50"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-black text-slate-900 text-sm tracking-tight truncate">{product.name}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] font-black text-slate-400 px-2 py-0.5 bg-slate-50 rounded-md tracking-tight">
                            {product.openedDate ? (() => {
                              const days = differenceInDays(new Date(), new Date(product.openedDate));
                              if (days === 0) return 'Oggi';
                              return `${days} giorn${days === 1 ? 'o' : 'i'} fa`;
                            })() : 'Aperto'}
                          </span>
                          <span className="text-[10px] font-black text-slate-300">•</span>
                          <p className="text-[10px] font-black text-slate-400">
                            <span className="text-primary">Tip:</span> entro {product.suggestedConsumptionDays} gg.
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <span className="material-symbols-outlined !text-[12px]">storefront</span>
                          <p className="text-[10px] font-black uppercase tracking-tighter truncate max-w-[80px]">
                            {supermarkets.find(s => s.id === product.supermarketId)?.name || 'N/D'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {openedProducts.length > 3 && (
                <button
                  onClick={() => setExpandOpened(v => !v)}
                  className="w-full py-4 text-slate-400 text-xs font-black border border-dashed border-slate-200 rounded-2xl active:bg-slate-50 transition-colors uppercase tracking-widest"
                >
                  {expandOpened ? 'Mostra meno' : (
                    openedProducts.length - 3 === 1
                      ? `Vedi ${openedProducts.length - 3} altro alimento`
                      : `Vedi altri ${openedProducts.length - 3} alimenti`
                  )}
                </button>
              )}
            </div>
          </section>

          {/* Calendario Scadenze - Visione d'Insieme */}
          <section className="mt-8">
            <div className="px-4 mb-4 flex items-baseline justify-between">
              <h2 className="text-xl font-black tracking-tight text-[#2d5a27]">Il tuo Calendario</h2>
              <button 
                onClick={scrollToToday}
                className="bg-primary/5 text-primary text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider active:scale-95 transition-all"
              >
                Oggi
              </button>
            </div>
            
            <div className="relative mt-2">
              <div 
                ref={scrollContainerRef}
                className="flex overflow-x-auto gap-3 px-4 py-6 snap-x snap-mandatory no-scrollbar"
              >
                {[...Array(15)].map((_, i) => {
                  const offset = i - 4;
                  const date = addDays(new Date(), offset);
                  const dayName = format(date, 'EEE', { locale: it });
                  const dayNum = format(date, 'd');
                  const isToday = offset === 0;
                  const isSelected = format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
                  
                  // Cerca prodotti che scadono in questo giorno specifico
                  const dayExpiries = products.filter(p => 
                    p.expiryDate && 
                    format(new Date(p.expiryDate), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                  );
  
                  return (
                    <button 
                      key={offset}
                      id={isToday ? 'today-card' : undefined}
                      onClick={() => {
                        setSelectedDate(date);
                      }}
                      onDoubleClick={scrollToToday}
                      className={`
                        flex-none w-[20%] py-5 rounded-[28px] flex flex-col items-center gap-2 transition-all duration-300 snap-center
                        ${isSelected 
                          ? 'bg-gradient-to-b from-primary to-emerald-600 text-white shadow-md shadow-primary/20 scale-[1.05] z-10' 
                          : 'bg-white border border-slate-100 text-slate-400 shadow-sm'}
                      `}
                    >
                      <span className={`text-[10px] font-black uppercase tracking-tighter ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                        {dayName}
                      </span>
                      <span className="text-xl font-black leading-none">
                        {dayNum}
                      </span>
                      
                      {/* Indicatori Scadenze */}
                      <div className="flex gap-0.5 mt-1">
                        {dayExpiries.length > 0 && (
                          <div className={`size-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-red-500'} shadow-sm`} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prodotti in scadenza nella data selezionata */}
            <div className="px-4 mt-4">
              {products.filter(p =>
                p.expiryDate &&
                format(new Date(p.expiryDate), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
              ).length > 0 ? (
                <div className="space-y-2">
                  {products.filter(p => 
                    p.expiryDate && 
                    format(new Date(p.expiryDate), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                  ).map(product => (
                    <div 
                      key={product.id}
                      onClick={() => setSearchParams(prev => {
                        prev.set('productId', product.id);
                        return prev;
                      })}
                      className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-50 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                    >
                     <ProductImage 
                    product={product} 
                    className="size-16 rounded-2xl shrink-0 border border-slate-50/50" 
                  />
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm truncate">{product.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase italic">Scade il {format(new Date(product.expiryDate), 'dd MMMM', { locale: it })}</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 px-6 bg-slate-50 rounded-2xl text-center border border-dashed border-slate-200">
                  <p className="text-[11px] font-bold text-slate-400">Nessuna scadenza prevista per questo giorno</p>
                </div>
              )}
            </div>
          </section>

          {/* Shopping List Card */}
          <section className="mt-8 px-4">
            <div className="bg-gradient-to-br from-[#4cae4f] to-[#388e3c] rounded-[32px] p-8 text-white shadow-lg relative overflow-hidden group">
              <div className="relative z-10 flex flex-col items-start">
                <h3 className="text-[28px] font-bold mb-1 leading-tight tracking-tight">Pronto per la spesa?</h3>
                <p className="text-white/90 text-[15px] font-medium mb-8 leading-snug">Hai {products.filter(p => p.status === 'to-buy').length} articoli suggeriti in base ai consumi.</p>
                
                <button
                  onClick={() => navigate('/shopping-list')}
                  className="w-full h-[60px] rounded-2xl bg-white text-[#388e3c] text-[18px] font-black flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                >
                  Genera lista della spesa
                  <span className="material-symbols-outlined !text-[24px]">auto_awesome</span>
                </button>
                <button
                  onClick={() => navigate('/shopping-list')}
                  className="w-full h-[60px] mt-3 rounded-2xl border-2 border-white/40 text-white text-[18px] font-black flex items-center justify-center gap-3 shadow-xl shadow-black/20 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined !text-[24px]">shopping_cart</span>
                  Vedi la lista
                </button>
              </div>
              <span className="material-symbols-outlined absolute -right-8 -bottom-8 text-white/10 text-[200px] rotate-12 -z-0">shopping_basket</span>
            </div>
          </section>

          {/* I miei Negozi */}
          <section className="mt-8 px-4 pb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black tracking-tight text-[#2d5a27]">I miei Negozi</h2>
              <button 
                onClick={() => navigate('/stores')}
                className="bg-primary/5 text-primary text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider active:scale-95 transition-transform"
              >
                Vedi tutti
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {supermarkets.map(store => (
                <div 
                  key={store.id} 
                  onClick={() => navigate(`/stores/${store.id}`)}
                  className="p-4 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-3 cursor-pointer active:scale-95 transition-all"
                >
                  <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined !text-2xl">storefront</span>
                  </div>
                  <p className="text-base font-black text-slate-900 truncate w-full text-center">{store.name}</p>
                  <span className="text-xs font-black text-slate-600 bg-slate-100 px-4 py-2 rounded-full whitespace-nowrap">
                    {products.filter(p => p.supermarketId === store.id && p.status === 'to-buy').length} articoli
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="mt-6 px-4 pb-12">
           <div className="flex items-start justify-between mb-6">
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setSearchParams({});
                    setSearchQuery('');
                  }}
                  className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 active:scale-90 transition-transform shrink-0"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                  <h2 className="text-xl font-black tracking-tight leading-tight">
                    {activeFilter === 'critico' ? 'Scadenze Critiche' : activeFilter === 'esaurimento' ? 'Prodotti in esaurimento' : activeFilter === 'aperti' ? 'Alimenti Aperti' : 'Risultati della ricerca'}
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Torna alla Dashboard</p>
                </div>
              </div>
              <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">{filteredProducts.length} Risultati</span>
           </div>
           
           <div className="grid gap-3">
              {filteredProducts.map(product => (
                 <div 
                   key={product.id} 
                   onClick={() => setSearchParams(prev => {
                     prev.set('productId', product.id);
                     return prev;
                   })}
                   className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer active:scale-95 transition-transform"
                 >
                    <div className="size-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 shrink-0 overflow-hidden shadow-sm border border-slate-50">
                       {product.image ? (
                          <img 
                            src={product.image} 
                            className="w-full h-full object-cover" 
                            alt=""
                            style={{ 
                              transform: `scale(${product.imageZoom ?? 1}) translate(${(product.imageOffsetX ?? 0) / (product.imageZoom ?? 1)}px, ${(product.imageOffsetY ?? 0) / (product.imageZoom ?? 1)}px)`
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = '<span class="material-symbols-outlined text-[20px]">shopping_basket</span>';
                            }}
                          />
                       ) : (
                         <span className="material-symbols-outlined text-[20px]">shopping_basket</span>
                       )}
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="font-bold text-sm text-slate-900 truncate">{product.name}</p>
                       <p className="text-[10px] text-slate-400 font-medium">
                          {product.type === 'kitchen' ? 'Cucina' : 'Casa'} • {supermarkets.find(s => s.id === product.supermarketId)?.name}
                       </p>
                    </div>
                    <span className={`material-symbols-outlined !text-xl ${product.status === 'to-buy' ? 'text-slate-200' : 'text-primary'}`}>
                       {product.status === 'to-buy' ? 'shopping_cart' : 'check_circle'}
                    </span>
                 </div>
              ))}
              {filteredProducts.length === 0 && (
                 <div className="p-12 text-center">
                    <span className="material-symbols-outlined !text-6xl text-slate-100 mb-4 block">search_off</span>
                    <p className="text-slate-400 italic text-sm">Nessun alimento trovato per "{searchQuery}"</p>
                 </div>
              )}
           </div>
        </section>
      )}

      <ProductDetailModal 
        product={selectedProduct} 
        isOpen={!!selectedProduct} 
        onClose={() => {
          if (searchParams.has('productId')) {
            navigate(-1);
          }
        }} 
      />
    </div>
  );
};

export default Dashboard;
