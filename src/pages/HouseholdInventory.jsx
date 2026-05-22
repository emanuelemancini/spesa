import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import ProductDetailModal from '../components/ui/ProductDetailModal';
import ProductImage from '../components/ui/ProductImage';
import { SortableList, ReorderButton, DragHandle } from '../components/ui/SortableList';

const PREVIEW_COUNT = 4;

const HouseholdInventory = () => {
  const { products, supermarkets, config, updateProduct, reorderProducts, showToast } = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState('Tutti');
  const [showOnlyLowStock, setShowOnlyLowStock] = React.useState(false);
  const [expandedCategories, setExpandedCategories] = React.useState({});
  const [isReordering, setIsReordering] = React.useState(false);

  const selectedProductId = searchParams.get('productId');
  const selectedProduct = products.find(p => p.id === selectedProductId);

  const lowStockCount = products.filter(p => p.type === 'home' && (p.quantity ?? 0) <= 1).length;

  const homeProducts = products.filter(p => {
    const matchesType = p.type === 'home';
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Tutti' || p.category === activeCategory;
    const matchesLowStock = !showOnlyLowStock || (p.quantity ?? 0) <= 1;
    return matchesType && matchesSearch && matchesCategory && matchesLowStock;
  });

  const totalItems = homeProducts.reduce((acc, p) => acc + (p.quantity || 0), 0);

  const groupedProducts = config.homeCategories.reduce((acc, cat) => {
    const items = homeProducts.filter(p => p.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});
  const uncategorized = homeProducts.filter(p => !p.category || !config.homeCategories.includes(p.category));
  if (uncategorized.length > 0) groupedProducts['Altro'] = uncategorized;

  const handleUpdateQuantity = (e, id, currentQty, delta) => {
    e.stopPropagation();
    updateProduct(id, { quantity: Math.max(0, currentQty + delta) });
  };

  const handleFinishProduct = (e, product) => {
    e.stopPropagation();
    updateProduct(product.id, { status: 'to-buy' });
    showToast(`${product.name} aggiunto alla lista`, 'success');
  };

  const openProductDetail = (id) => setSearchParams({ productId: id });
  const closeProductDetail = () => setSearchParams(prev => { prev.delete('productId'); return prev; });

  const handleReorder = (categoryItems, newIds) => {
    const otherIds = products.filter(p => !categoryItems.find(c => c.id === p.id)).map(p => p.id);
    reorderProducts([...newIds, ...otherIds]);
  };

  const renderCard = (product, dragHandleProps) => {
    const qty = product.quantity ?? 0;
    const borderColor = qty === 0 ? 'border-l-red-500' : qty === 1 ? 'border-l-orange-300' : 'border-l-primary/30';
    const dotColor = qty === 0 ? 'bg-red-500' : 'bg-orange-300';
    const barColor = qty === 0 ? 'bg-red-400' : qty === 1 ? 'bg-orange-400' : 'bg-primary';

    return (
      <div
        onClick={() => !isReordering && openProductDetail(product.id)}
        className={`group relative bg-white border border-slate-100 border-l-[6px] ${borderColor} rounded-[28px] p-4 shadow-sm transition-all ${isReordering ? '' : 'active:scale-[0.98] cursor-pointer'}`}
      >
        <div className="flex items-center gap-4">
          <DragHandle dragHandleProps={dragHandleProps} />
          <ProductImage product={product} className="size-16 rounded-2xl shrink-0 border border-slate-50/50" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-black text-slate-900 text-sm tracking-tight truncate">{product.name}</p>
              {qty <= 1 && <span className={`size-2 ${dotColor} rounded-full animate-ping shrink-0`}></span>}
            </div>
            <div className="flex flex-col gap-1">
              <div className="w-full max-w-[120px] h-1 bg-slate-50 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${Math.min(100, (qty / 10) * 100)}%` }} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-md">Casa</span>
                {product.category && <><span className="text-[10px] font-black text-slate-300">•</span><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">{product.category}</span></>}
                {(() => {
                  const store = supermarkets.find(s => s.id === (product.supermarketIds?.[0] || product.supermarketId));
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
          {!isReordering && (
            <div className="flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-inner">
                <button onClick={(e) => handleUpdateQuantity(e, product.id, qty, -1)} className="size-8 rounded-lg bg-white border border-slate-100 text-slate-600 flex items-center justify-center active:scale-90 transition-transform shadow-sm"><span className="material-symbols-outlined !text-sm">remove</span></button>
                <span className="w-5 text-center text-xs font-black text-slate-900">{qty}</span>
                <button onClick={(e) => handleUpdateQuantity(e, product.id, qty, 1)} className="size-8 rounded-lg bg-primary text-white flex items-center justify-center active:scale-90 transition-transform shadow-md shadow-primary/20"><span className="material-symbols-outlined !text-sm">add</span></button>
              </div>
              {qty === 0 && product.status !== 'to-buy' ? (
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
  };

  return (
    <div className="pb-40 -mx-4">
      {/* Header */}
      <div className="px-5 mb-2 mt-2 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-0.5">La mia casa</h1>
          <p className="text-sm font-bold text-slate-400">{totalItems} articoli totali</p>
        </div>
        <ReorderButton isReordering={isReordering} onToggle={() => setIsReordering(r => !r)} />
      </div>

      {/* In Esaurimento Banner */}
      {lowStockCount > 0 && (
        <section className="px-4 mt-2 mb-4">
          <div
            onClick={() => { setShowOnlyLowStock(v => !v); setActiveCategory('Tutti'); }}
            className={`p-4 rounded-[24px] border transition-all cursor-pointer relative overflow-hidden flex items-center gap-4 shadow-sm active:scale-[0.98] ${showOnlyLowStock ? 'bg-orange-500 border-orange-500' : 'bg-orange-50 border-orange-100 hover:border-orange-200'}`}
          >
            <div className={`size-14 rounded-2xl flex items-center justify-center shrink-0 ${showOnlyLowStock ? 'bg-orange-400 text-white' : 'bg-orange-100/50 text-orange-500'}`}>
              <span className="material-symbols-outlined !text-3xl">shopping_bag</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className={`text-lg font-black tracking-tight truncate ${showOnlyLowStock ? 'text-white' : 'text-orange-800'}`}>In esaurimento</p>
                {!showOnlyLowStock && <span className="size-2 bg-orange-300 rounded-full animate-pulse"></span>}
              </div>
              <p className={`text-[11px] font-bold uppercase tracking-widest ${showOnlyLowStock ? 'text-orange-100' : 'text-orange-500'}`}>
                {showOnlyLowStock ? 'Filtro attivo' : 'Prodotti quasi esauriti'}
              </p>
            </div>
            <div className={`text-4xl font-black pr-2 ${showOnlyLowStock ? 'text-white' : 'text-orange-600'}`}>
              {lowStockCount}
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
        {config.homeCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`h-9 px-6 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white text-slate-400 border border-slate-100 shadow-sm'}`}
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
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{items.length} {items.length === 1 ? 'Prodotto' : 'Prodotti'}</p>
              </div>

              <SortableList
                items={isReordering || activeCategory !== 'Tutti' || expandedCategories[category] ? items : items.slice(0, PREVIEW_COUNT)}
                isReordering={isReordering}
                onReorder={(newIds) => handleReorder(items, newIds)}
              >
                {(product, { dragHandleProps }) => renderCard(product, dragHandleProps)}
              </SortableList>

              {!isReordering && activeCategory === 'Tutti' && items.length > PREVIEW_COUNT && (
                <button
                  onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                  className="w-full mt-2 py-3 rounded-2xl border border-dashed border-primary/30 text-primary text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:bg-primary/5 transition-all"
                >
                  {expandedCategories[category]
                    ? 'Mostra meno'
                    : `Vedi altri ${items.length - PREVIEW_COUNT} prodotti`}
                </button>
              )}
            </section>
          ))}

        {Object.keys(groupedProducts).length === 0 && (
          <div className="py-20 text-center">
            <span className="material-symbols-outlined !text-5xl text-slate-200">home</span>
            <p className="text-sm font-bold text-slate-400 mt-3">Nessun prodotto trovato</p>
          </div>
        )}
      </div>

      {/* Floating Search */}
      <div className="fixed bottom-[105px] left-0 right-0 z-40 px-4 pointer-events-none">
        <div className="max-w-md mx-auto relative flex items-center pointer-events-auto">
          <span className="material-symbols-outlined absolute left-4 text-slate-500">search</span>
          <input
            type="text"
            placeholder="Cerca prodotti..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-10 bg-primary/20 backdrop-blur-2xl border border-primary/10 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),inset_0_0_20px_rgba(255,255,255,0.4)] focus:ring-2 focus:ring-primary/30 text-sm font-bold placeholder-slate-600 outline-none transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 text-slate-400">
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

export default HouseholdInventory;
