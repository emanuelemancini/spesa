import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isBefore, addDays } from 'date-fns';
import useStore from '../store/useStore';
import ProductDetailModal from '../components/ui/ProductDetailModal';
import AddProductModal from '../components/ui/AddProductModal';
import ProductImage from '../components/ui/ProductImage';
import { SortableList, ReorderButton, DragHandle } from '../components/ui/SortableList';

const ShoppingSummary = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, supermarkets, updateProduct, reorderProducts } = useStore();
  const [justBought, setJustBought] = React.useState(new Set());
  const [quantities, setQuantities] = React.useState({});
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isReordering, setIsReordering] = React.useState(false);

  React.useEffect(() => { window.scrollTo(0, 0); }, []);

  const selectedProductId = searchParams.get('productId');
  const selectedProduct = products.find(p => p.id === selectedProductId);
  const productsToBuy = products.filter(p => p.status === 'to-buy');

  const getQty = (id) => quantities[id] ?? 1;
  const setQty = (id, val) => setQuantities(prev => ({ ...prev, [id]: Math.max(1, val) }));

  const groupedProducts = productsToBuy.reduce((acc, product) => {
    const storeId = product.supermarketIds?.[0] || product.supermarketId || 'other';
    if (!acc[storeId]) acc[storeId] = [];
    acc[storeId].push(product);
    return acc;
  }, {});

  // Suggestions: expiring kitchen products + low stock home products not already in list
  const toBuyIds = new Set(productsToBuy.map(p => p.id));
  const suggestedProducts = products.filter(p => {
    if (toBuyIds.has(p.id)) return false;
    if (p.type === 'kitchen') return p.expiryDate && isBefore(new Date(p.expiryDate), addDays(new Date(), 5));
    if (p.type === 'home') return p.quantity <= 2;
    return false;
  });

  const groupedSuggestions = suggestedProducts.reduce((acc, product) => {
    const storeId = product.supermarketIds?.[0] || product.supermarketId || 'other';
    if (!acc[storeId]) acc[storeId] = [];
    acc[storeId].push(product);
    return acc;
  }, {});

  const handleBought = (e, product) => {
    e.stopPropagation();
    const qty = getQty(product.id);
    setJustBought(prev => new Set(prev).add(product.id));
    setTimeout(() => {
      updateProduct(product.id, {
        status: 'bought',
        quantity: (product.quantity || 0) + qty,
      });
      setJustBought(prev => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 500);
  };

  const handleSkip = (e, id) => {
    e.stopPropagation();
    updateProduct(id, { status: 'skipped' });
  };

  const openProductDetail = (id) => setSearchParams({ productId: id });
  const closeProductDetail = () => setSearchParams(prev => { prev.delete('productId'); return prev; });

  const handleAddSuggestion = (product) => {
    updateProduct(product.id, { status: 'to-buy' });
  };

  // Italian article helper: "al", "alla", "all'"
  const FEMININE_STORES = new Set(['lidl', 'coop', 'penny', 'pam', 'sigma']);
  const getStoreArticle = (name) => {
    if (!name) return 'al ';
    const lower = name.toLowerCase();
    const first = lower[0];
    if ('aeiou'.includes(first)) return "all'";
    if (FEMININE_STORES.has(lower) || lower.endsWith('a')) return 'alla ';
    return 'al ';
  };

  // First storeId for the prototype card
  const firstStoreId = Object.keys(groupedProducts)[0];

  return (
    <div className="pb-32 -mx-4 min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="size-10 rounded-full bg-primary/5 flex items-center justify-center text-primary active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-black text-[#2d5a27] tracking-tight">Lista della Spesa</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-lg font-black text-slate-900 leading-none">{productsToBuy.length}</span>
            <span className="text-[9px] font-black text-slate-400 tracking-tighter uppercase">Articoli</span>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6">
        {Object.keys(groupedProducts).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedProducts).map(([storeId, items], storeIndex) => {
              const store = supermarkets.find(s => s.id === storeId);
              const storeName = store ? store.name : 'Altro / Non assegnato';
              const isFirstStore = storeIndex === 0;

              return (
                <div key={storeId} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined !text-xl">storefront</span>
                      </div>
                      <h2 className="text-lg font-black text-[#2d5a27] tracking-tight">{storeName}</h2>
                    </div>
                    <div className="bg-primary/5 text-primary text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">
                      {items.length} {items.length === 1 ? 'Articolo' : 'Articoli'}
                    </div>
                  </div>

                  <SortableList
                    items={items}
                    isReordering={isReordering}
                    onReorder={(newIds) => {
                      const otherIds = products.filter(p => !items.find(i => i.id === p.id)).map(p => p.id);
                      reorderProducts([...newIds, ...otherIds]);
                    }}
                  >
                    {(product, { dragHandleProps }) => {
                      const isBought = justBought.has(product.id);
                      const qty = getQty(product.id);
                      return (
                        <div className={`relative bg-white border border-slate-100 border-l-[6px] border-l-primary/40 rounded-[28px] p-4 shadow-sm transition-all duration-300 overflow-hidden ${isBought ? 'opacity-50 scale-[0.98]' : ''}`}>
                          {isBought && (
                            <div className="absolute inset-0 bg-primary/5 flex items-center justify-center z-10 rounded-[28px]">
                              <span className="material-symbols-outlined !text-5xl text-primary">check_circle</span>
                            </div>
                          )}
                          <div className="flex items-center gap-3 mb-3">
                            <DragHandle dragHandleProps={dragHandleProps} />
                            <ProductImage product={product} className="size-16 rounded-2xl shrink-0 border border-slate-50" />
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-slate-900 text-base tracking-tight truncate">{product.name}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-md">{product.type === 'kitchen' ? 'Cucina' : 'Casa'}</span>
                                {product.category && <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">{product.category}</span>}
                              </div>
                              <div className="flex items-center gap-1 text-slate-400 mt-2.5">
                                <span className="material-symbols-outlined !text-[11px]">inventory_2</span>
                                <p className="text-[10px] font-black uppercase tracking-tighter">In dispensa: {product.quantity}</p>
                              </div>
                            </div>
                            {!isReordering && (
                              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-inner shrink-0 self-center">
                                <button onClick={(e) => { e.stopPropagation(); setQty(product.id, qty - 1); }} className="size-8 rounded-lg bg-white border border-slate-100 text-slate-600 flex items-center justify-center active:scale-90 transition-transform shadow-sm"><span className="material-symbols-outlined !text-sm">remove</span></button>
                                <span className="w-6 text-center text-sm font-black text-slate-900">{qty}</span>
                                <button onClick={(e) => { e.stopPropagation(); setQty(product.id, qty + 1); }} className="size-8 rounded-lg bg-primary text-white flex items-center justify-center active:scale-90 transition-transform shadow-md shadow-primary/20"><span className="material-symbols-outlined !text-sm">add</span></button>
                              </div>
                            )}
                          </div>
                          {!isReordering && (
                            <div className="flex items-center gap-3">
                              <button onClick={(e) => handleSkip(e, product.id)} className="flex-1 h-9 rounded-xl bg-red-50 border border-red-100 text-red-500 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
                                <span className="material-symbols-outlined !text-base">delete</span>Rimuovi
                              </button>
                              <button onClick={(e) => handleBought(e, product)} className="flex-1 h-9 rounded-xl bg-primary text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-primary/25 active:scale-95 transition-all">
                                <span className="material-symbols-outlined !text-base">check_circle</span>Comprato
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  </SortableList>

                  {store && (
                    <button
                      onClick={() => navigate(`/stores/${storeId}`)}
                      className="w-full py-4 rounded-2xl bg-white border border-dashed border-primary/30 text-primary text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:bg-primary/5 transition-all"
                    >
                      Vai {getStoreArticle(storeName)}{storeName}
                      <span className="material-symbols-outlined !text-lg">arrow_forward</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-24 text-center">
            <div className="size-24 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto mb-6 text-slate-200 border border-slate-50 relative overflow-hidden">
              <span className="material-symbols-outlined !text-[56px]">shopping_cart_off</span>
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent"></div>
            </div>
            <h2 className="text-xl font-black text-slate-400 mb-2">La tua lista è vuota</h2>
            <p className="text-sm text-slate-400 italic">Prendi qualcosa dal tuo inventario<br/>o aggiungi un nuovo prodotto!</p>
            <button
              onClick={() => navigate('/')}
              className="mt-8 px-8 py-3 bg-primary text-white text-sm font-black rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all uppercase tracking-widest"
            >
              Vai alla Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Suggestions Section */}
      {Object.keys(groupedSuggestions).length > 0 && (
        <div className="px-4 mt-10 mb-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="size-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-500">
              <span className="material-symbols-outlined !text-xl">lightbulb</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight mb-0.5">Suggerimenti</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">In scadenza o quasi esauriti</p>
            </div>
          </div>

          <div className="space-y-6">
            {Object.entries(groupedSuggestions).map(([storeId, items]) => {
              const store = supermarkets.find(s => s.id === storeId);
              const storeName = store ? store.name : 'Altro / Non assegnato';
              return (
                <div key={storeId} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined !text-base text-slate-400">storefront</span>
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">{storeName}</h3>
                  </div>
                  {items.map(product => {
                    const isExpiring = product.type === 'kitchen';
                    return (
                      <div key={product.id} className={`relative bg-white border border-slate-100 border-l-[6px] ${isExpiring ? 'border-l-orange-400' : 'border-l-blue-400'} rounded-[24px] p-3 shadow-sm flex items-center gap-3`}>
                        <ProductImage product={product} className="size-12 rounded-xl shrink-0 border border-slate-50" />
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 text-sm tracking-tight truncate">{product.name}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isExpiring ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}`}>
                              {isExpiring ? 'In scadenza' : 'Quasi esaurito'}
                            </span>
                            {product.category && (
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">{product.category}</span>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">Quantità: {product.quantity ?? 0}</p>
                        </div>
                        <button
                          onClick={() => handleAddSuggestion(product)}
                          className="size-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20 active:scale-90 transition-transform shrink-0"
                        >
                          <span className="material-symbols-outlined !text-base">add_shopping_cart</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ProductDetailModal
        isOpen={!!selectedProduct}
        onClose={closeProductDetail}
        product={selectedProduct}
      />

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};

export default ShoppingSummary;
