import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import ProductDetailModal from '../components/ui/ProductDetailModal';
import { isBefore, addDays } from 'date-fns';
import ProductImage from '../components/ui/ProductImage';
import { SortableList, ReorderButton, DragHandle } from '../components/ui/SortableList';

const Pantry = () => {
  const { products, supermarkets, config, updateProduct, reorderProducts, showToast } = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState('Tutti');
  const [expandedCategories, setExpandedCategories] = React.useState({});
  const [isReordering, setIsReordering] = React.useState(false);

  const PREVIEW_COUNT = 4;

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };
  
  const selectedProductId = searchParams.get('productId');
  const selectedProduct = products.find(p => p.id === selectedProductId);

  const categories = ['Tutti', ...config.kitchenCategories];

  const kitchenProducts = products.filter(p => {
    const matchesType = p.type === 'kitchen';
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Tutti' || p.category === activeCategory;
    return matchesType && matchesSearch && matchesCategory;
  });

  // For Pantry, we might want to highlight expiring items first
  const expiringSoon = kitchenProducts.filter(p => 
    p.expiryDate && 
    isBefore(new Date(p.expiryDate), addDays(new Date(), 3))
  ).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

  const others = kitchenProducts.filter(p => 
    !p.expiryDate || 
    !isBefore(new Date(p.expiryDate), addDays(new Date(), 3))
  );

  const handleUpdateQuantity = (e, id, currentQty, delta) => {
    e.stopPropagation();
    const newQty = Math.max(0, currentQty + delta);
    updateProduct(id, { quantity: newQty });
  };

  const openProductDetail = (id) => {
    setSearchParams({ productId: id });
  };

  const closeProductDetail = () => {
    setSearchParams(prev => {
      prev.delete('productId');
      return prev;
    });
  };

  const handleFinishProduct = (e, product) => {
    e.stopPropagation();
    updateProduct(product.id, { status: 'to-buy' });
    showToast(`${product.name} aggiunto alla lista`, 'success');
  };

  const handleReorder = (categoryItems, newIds) => {
    const otherIds = products.filter(p => !categoryItems.find(c => c.id === p.id)).map(p => p.id);
    reorderProducts([...newIds, ...otherIds]);
  };

  // Stats calculation
  const allKitchenProducts = products.filter(p => p.type === 'kitchen');
  const totalItems = kitchenProducts.reduce((acc, p) => acc + p.quantity, 0);
  const expiringCount = allKitchenProducts.filter(p => p.expiryDate && isBefore(new Date(p.expiryDate), addDays(new Date(), 3))).length;

  // Grouping by category
  const groupedProducts = config.kitchenCategories.reduce((acc, cat) => {
    const items = kitchenProducts.filter(p => p.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  // For items without category or "Tutti" view
  const uncategorized = kitchenProducts.filter(p => !p.category || !config.kitchenCategories.includes(p.category));
  if (uncategorized.length > 0) groupedProducts['Altro'] = uncategorized;

  return (
    <div className="pb-40 -mx-4">
      {/* Clean Header */}
      <div className="px-5 mb-2 mt-2 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-0.5">La mia dispensa</h1>
          <p className="text-sm font-bold text-slate-400">{totalItems} articoli totali</p>
        </div>
        <ReorderButton isReordering={isReordering} onToggle={() => setIsReordering(r => !r)} />
      </div>

      {/* Da Consumare Alert Button */}
      {expiringCount > 0 && (
        <section className="px-4 mt-2 mb-4">
          <div 
            className="p-4 rounded-[24px] border border-orange-100 bg-orange-50 transition-all cursor-pointer relative overflow-hidden flex items-center gap-4 shadow-sm hover:border-orange-200 active:scale-[0.98]"
          >
            <div className="size-14 rounded-2xl flex items-center justify-center shrink-0 bg-orange-100/50 text-orange-500">
                <span className="material-symbols-rounded !text-3xl">warning</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-lg font-black tracking-tight truncate text-orange-800">Da consumare</p>
                <span className="size-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.8)]"></span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500">
                Scadenze a breve
              </p>
            </div>

            <div className="text-4xl font-black pr-2 text-orange-600">
              {expiringCount}
            </div>
          </div>
        </section>
      )}

      {/* Categories Toolbar */}
      <div className="flex gap-2 px-4 py-4 overflow-x-auto no-scrollbar sticky top-0 bg-slate-50/90 backdrop-blur-md z-20 border-b border-slate-100">
        <button 
          onClick={() => setActiveCategory('Tutti')}
          className={`h-9 px-6 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === 'Tutti' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white text-slate-400 border border-slate-100 shadow-sm'}`}
        >
          Tutti
        </button>
        {config.kitchenCategories.map((cat) => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`h-9 px-6 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white text-slate-400 border border-slate-100 shadow-sm'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grouped Sections */}
      <div className="px-4 py-4 space-y-8">
        {Object.entries(groupedProducts)
          .filter(([cat]) => activeCategory === 'Tutti' || activeCategory === cat)
          .map(([category, items]) => (
          <section key={category}>
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary"></span>
                <h2 className="text-lg font-black tracking-tight text-slate-900">{category}</h2>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{items.length} {items.length === 1 ? 'Prodotto' : 'Prodotti'}</p>
              </div>
            </div>

            <SortableList
              items={isReordering || activeCategory !== 'Tutti' || expandedCategories[category] ? items : items.slice(0, PREVIEW_COUNT)}
              isReordering={isReordering}
              onReorder={(newIds) => handleReorder(items, newIds)}
            >
              {(product, { dragHandleProps }) => {
                const isExpiring = product.expiryDate && isBefore(new Date(product.expiryDate), addDays(new Date(), 3));
                const qty = product.quantity ?? 0;
                const borderColor = qty === 0 ? 'border-l-red-500' : qty === 1 ? 'border-l-orange-500' : 'border-l-primary/30';
                const dotColor = qty === 0 ? 'bg-red-500' : 'bg-orange-500';
                const showDot = qty <= 1 || isExpiring;
                return (
                  <div
                    onClick={() => !isReordering && openProductDetail(product.id)}
                    className={`group relative bg-white border border-slate-100 border-l-[6px] rounded-[28px] p-4 shadow-sm transition-all ${isReordering ? '' : 'active:scale-[0.98] cursor-pointer'} ${borderColor}`}
                  >
                    <div className="flex items-center gap-4">
                      <DragHandle dragHandleProps={dragHandleProps} />
                      <ProductImage product={product} className="size-16 rounded-2xl shrink-0 border border-slate-50/50" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-black text-slate-900 text-sm tracking-tight truncate">{product.name}</p>
                          {showDot && <span className={`size-2 ${dotColor} rounded-full animate-ping shrink-0`}></span>}
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="w-full max-w-[120px] h-1 bg-slate-50 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${product.quantity > 5 ? 'bg-primary' : product.quantity > 0 ? 'bg-orange-400' : 'bg-red-400'}`} style={{ width: `${Math.min(100, (product.quantity / 10) * 100)}%` }} />
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-md">Cucina</span>
                            {product.category && <><span className="text-[10px] font-black text-slate-300">•</span><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">{product.category}</span></>}
                            {(() => {
                              const store = supermarkets.find(s => s.id === (product.supermarketIds?.[0] || product.supermarketId));
                              return store ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigate(`/stores/${store.id}?highlight=${product.id}`); }}
                                  className="flex items-center gap-1 text-primary/60 hover:text-primary active:scale-95 transition-all"
                                >
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
                      {!isReordering && (
                        <div className="flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-inner">
                            <button onClick={(e) => handleUpdateQuantity(e, product.id, product.quantity, -1)} className="size-8 rounded-lg bg-white border border-slate-100 text-slate-600 flex items-center justify-center active:scale-90 transition-transform shadow-sm"><span className="material-symbols-outlined !text-sm">remove</span></button>
                            <span className="w-5 text-center text-xs font-black text-slate-900">{product.quantity}</span>
                            <button onClick={(e) => handleUpdateQuantity(e, product.id, product.quantity, 1)} className="size-8 rounded-lg bg-primary text-white flex items-center justify-center active:scale-90 transition-transform shadow-md shadow-primary/20"><span className="material-symbols-outlined !text-sm">add</span></button>
                          </div>
                          {product.quantity === 0 && product.status !== 'to-buy' ? (
                            <button onClick={(e) => handleFinishProduct(e, product)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all active:scale-95 border border-red-100">
                              <span className="material-symbols-outlined !text-sm">shopping_cart</span>
                              <span className="text-[9px] font-black uppercase tracking-widest">Esaurito</span>
                            </button>
                          ) : (
                            <button onClick={(e) => handleFinishProduct(e, product)} disabled={product.status === 'to-buy'} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all active:scale-95 border ${product.status === 'to-buy' ? 'bg-orange-50 text-orange-400 border-orange-100 opacity-60 cursor-default' : 'bg-orange-50 text-orange-500 hover:bg-orange-100 border-orange-100'}`}>
                              <span className="material-symbols-outlined !text-sm">shopping_cart</span>
                              <span className="text-[9px] font-black uppercase tracking-widest">In lista</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            </SortableList>

            {activeCategory === 'Tutti' && items.length > PREVIEW_COUNT && (
              <button
                onClick={() => toggleCategory(category)}
                className="w-full mt-2 py-3 rounded-2xl border border-dashed border-primary/30 text-primary text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:bg-primary/5 transition-all"
              >
                {expandedCategories[category] ? (
                  <>
                    <span className="material-symbols-outlined !text-base">expand_less</span>
                    Mostra meno
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined !text-base">expand_more</span>
                    Vedi altri {items.length - PREVIEW_COUNT} prodotti
                  </>
                )}
              </button>
            )}
          </section>
        ))}
      </div>

      
      {/* Search Bar - Floating Glassmorphism */}
      <div className="fixed bottom-[105px] left-0 right-0 z-40 px-4 pointer-events-none">
        <div className="max-w-md mx-auto relative flex items-center pointer-events-auto">
          <span className="material-symbols-outlined absolute left-4 text-slate-500">search</span>
          <input 
            type="text" 
            placeholder="Cerca..." 
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

      <ProductDetailModal 
        isOpen={!!selectedProduct} 
        onClose={closeProductDetail}
        product={selectedProduct}
      />
    </div>
  );
};

export default Pantry;
