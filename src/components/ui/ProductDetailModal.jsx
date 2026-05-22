import React from 'react';
import { X, Clock, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { format, differenceInDays, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import ProductImage from './ProductImage';
import useStore from '../../store/useStore';

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Conferma', confirmColor = 'bg-red-500' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center px-4 pb-8" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-6 animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="size-14 rounded-full bg-red-50 flex items-center justify-center">
            <span className="material-symbols-outlined !text-3xl text-red-500">undo</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>
          {message && <p className="text-sm text-slate-400 font-medium leading-snug">{message}</p>}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-12 rounded-2xl bg-slate-100 text-slate-600 text-sm font-black uppercase tracking-widest active:scale-95 transition-all"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-12 rounded-2xl ${confirmColor} text-white text-sm font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProductDetailModal = ({ product, isOpen, onClose }) => {
  const { openProduct, updateProduct, deleteProduct, addProduct, supermarkets, products, config } = useStore();
  const [isEditing, setIsEditing] = React.useState(false);
  const [confirmDialog, setConfirmDialog] = React.useState(null); // { title, message, onConfirm }
  const [showQtySelector, setShowQtySelector] = React.useState(false);
  const [isDuplicating, setIsDuplicating] = React.useState(false);
  const [editedData, setEditedData] = React.useState({});
  const [isRepositioning, setIsRepositioning] = React.useState(false);
  const [isRepositioningThumb, setIsRepositioningThumb] = React.useState(false);
  const thumbContainerRef = React.useRef(null);
  const thumbIsDragging = React.useRef(false);
  const thumbLastPos = React.useRef({ x: 0, y: 0 });
  const [thumbNaturalSize, setThumbNaturalSize] = React.useState({ width: 0, height: 0 });
  const [showUrlInput, setShowUrlInput] = React.useState(false);
  const [urlInput, setUrlInput] = React.useState('');
  const [offsetX, setOffsetX] = React.useState(0);
  const [offsetY, setOffsetY] = React.useState(0);
  const [imageZoom, setImageZoom] = React.useState(1.3);
  const [thumbOffsetX, setThumbOffsetX] = React.useState(0);
  const [thumbOffsetY, setThumbOffsetY] = React.useState(0);
  const [thumbZoom, setThumbZoom] = React.useState(1);
  const isDragging = React.useRef(false);
  const lastPos = React.useRef({ x: 0, y: 0 });
  const containerRef = React.useRef(null);
  const [naturalSize, setNaturalSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    if (product) {
      setEditedData(product);
      setOffsetX(product.imageOffsetX ?? 0);
      setOffsetY(product.imageOffsetY ?? 0);
      setImageZoom(product.imageZoom ?? 1.3);
      setThumbOffsetX(product.thumbOffsetX ?? 0);
      setThumbOffsetY(product.thumbOffsetY ?? 0);
      setThumbZoom(product.thumbZoom ?? 1);
      // Pre-popola il campo URL se l'immagine è un URL (non base64)
      if (product.image && product.image.startsWith('http')) {
        setUrlInput(product.image);
      } else {
        setUrlInput('');
      }
    }
  }, [product?.id]);

  // Reset repositioning if zoom or image size changes
  React.useEffect(() => {
    if (containerRef.current && naturalSize.width > 0) {
      const rect = containerRef.current.getBoundingClientRect();
      const aspect = naturalSize.width / naturalSize.height;
      const containerAspect = rect.width / rect.height;
      
      let displayedW, displayedH;
      if (aspect > containerAspect) {
        displayedH = rect.height;
        displayedW = rect.height * aspect;
      } else {
        displayedW = rect.width;
        displayedH = rect.width / aspect;
      }
      
      const limitX = Math.max(0, (displayedW * imageZoom - rect.width) / 2);
      const limitY = Math.max(0, (displayedH * imageZoom - rect.height) / 2);
      
      setOffsetX(prev => Math.max(-limitX, Math.min(limitX, prev)));
      setOffsetY(prev => Math.max(-limitY, Math.min(limitY, prev)));
    }
  }, [imageZoom, naturalSize]);

  if (!isOpen || !product) return null;

  const handleOpen = () => openProduct(product.id, product.suggestedConsumptionDays || 3);
  const handleUndoOpen = () => {
    setConfirmDialog({
      title: 'Annulla apertura',
      message: 'Vuoi riportare il prodotto allo stato precedente all\'apertura?',
      onConfirm: () => {
        updateProduct(product.id, { status: 'bought', openedDate: null });
        setConfirmDialog(null);
      },
    });
  };
  const handleFinish = () => {
    updateProduct(product.id, { quantity: 0, openedDate: null, expiryDate: null });
    onClose();
  };
  const handleSave = () => {
    updateProduct(product.id, {
      ...editedData,
      image: editedData.image,
      imageOffsetX: offsetX || 0,
      imageOffsetY: offsetY || 0,
      imageZoom: imageZoom,
      thumbOffsetX: thumbOffsetX || 0,
      thumbOffsetY: thumbOffsetY || 0,
      thumbZoom: thumbZoom || 1,
    });
    setIsEditing(false);
    setIsRepositioning(false);
  };
  
  const handleDecrement = () => {
    if (product.quantity > 0) {
      updateProduct(product.id, { quantity: product.quantity - 1 });
    }
  };

  const handleDuplicate = () => {
    if (confirm(`Vuoi duplicare "${product.name}"?`)) {
      const { id, ...rest } = product;
      const newId = Date.now().toString();
      const newProduct = { ...rest, id: newId, name: `${rest.name} (Copia)` };
      addProduct(newProduct);
      
      // Trigger sliding transition effect
      setIsDuplicating(true);
      setTimeout(() => {
        // We find the new product in the store to "refresh" the view
        // Since we can't change the prop directly, we'll suggest the parent logic
        // For now, we update the local view if the store was updated
        onClose(); // In a real app, we'd navigate to the new ID
        alert("Prodotto duplicato! Lo troverai nella lista.");
      }, 300);
    }
  };

  const isExpired = product.expiryDate && new Date(product.expiryDate) < new Date();
  const isOpened = product.status === 'opened';

  // Freshness Progress calculation
  let freshnessPercent = 100;
  if (isOpened && product.openedDate) {
    const daysSinceOpen = differenceInDays(new Date(), new Date(product.openedDate));
    const suggestedDays = product.suggestedConsumptionDays || 3;
    freshnessPercent = Math.max(0, 100 - (daysSinceOpen / suggestedDays) * 100);
  }

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      <div className="fixed inset-0 z-[100] flex justify-center">
      <div className="w-full max-w-md bg-white flex flex-col animate-slide-in-right overflow-hidden shadow-2xl relative">
        {/* Header Image Area */}
        <div ref={containerRef} className="relative h-64 shrink-0 bg-slate-100 flex items-center justify-center text-slate-300 overflow-hidden">
             {editedData.image || product.image ? (
               <div 
                className={`relative w-full h-full group ${isRepositioning ? 'cursor-move touch-none' : ''}`}
                onMouseDown={(e) => {
                  if (!isRepositioning) return;
                  isDragging.current = true;
                  lastPos.current = { x: e.clientX, y: e.clientY };
                }}
                onTouchStart={(e) => {
                  if (!isRepositioning) return;
                  isDragging.current = true;
                  lastPos.current = { 
                    x: e.touches[0].clientX, 
                    y: e.touches[0].clientY 
                  };
                }}
                onMouseMove={(e) => {
                  if (isDragging.current && containerRef.current && naturalSize.width > 0) {
                    const rect = containerRef.current.getBoundingClientRect();
                    const aspect = naturalSize.width / naturalSize.height;
                    const containerAspect = rect.width / rect.height;
                    
                    let displayedW, displayedH;
                    if (aspect > containerAspect) {
                      displayedH = rect.height;
                      displayedW = rect.height * aspect;
                    } else {
                      displayedW = rect.width;
                      displayedH = rect.width / aspect;
                    }
                    
                    const limitX = Math.max(0, (displayedW * imageZoom - rect.width) / 2);
                    const limitY = Math.max(0, (displayedH * imageZoom - rect.height) / 2);
                    
                    const dx = e.clientX - lastPos.current.x;
                    const dy = e.clientY - lastPos.current.y;
                    
                    setOffsetX(prev => Math.max(-limitX, Math.min(limitX, prev + dx)));
                    setOffsetY(prev => Math.max(-limitY, Math.min(limitY, prev + dy)));
                    lastPos.current = { x: e.clientX, y: e.clientY };
                  }
                }}
                onTouchMove={(e) => {
                  if (isDragging.current && containerRef.current && naturalSize.width > 0) {
                    const touch = e.touches[0];
                    const rect = containerRef.current.getBoundingClientRect();
                    const aspect = naturalSize.width / naturalSize.height;
                    const containerAspect = rect.width / rect.height;

                    let displayedW, displayedH;
                    if (aspect > containerAspect) {
                      displayedH = rect.height;
                      displayedW = rect.height * aspect;
                    } else {
                      displayedW = rect.width;
                      displayedH = rect.width / aspect;
                    }

                    const limitX = Math.max(0, (displayedW * imageZoom - rect.width) / 2);
                    const limitY = Math.max(0, (displayedH * imageZoom - rect.height) / 2);

                    const dx = touch.clientX - lastPos.current.x;
                    const dy = touch.clientY - lastPos.current.y;
                    
                    setOffsetX(prev => Math.max(-limitX, Math.min(limitX, prev + dx)));
                    setOffsetY(prev => Math.max(-limitY, Math.min(limitY, prev + dy)));
                    lastPos.current = { x: touch.clientX, y: touch.clientY };
                  }
                }}
                onMouseUp={() => isDragging.current = false}
                onTouchEnd={() => isDragging.current = false}
                onMouseLeave={() => isDragging.current = false}
               >
                 <img 
                  src={editedData.image || product.image} 
                  alt={product.name} 
                  onLoad={(e) => {
                    setNaturalSize({
                      width: e.target.naturalWidth,
                      height: e.target.naturalHeight
                    });
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                  className={`absolute top-1/2 left-1/2 max-w-none ${isRepositioning ? '' : 'transition-transform duration-200'}`} 
                  style={{ 
                    width: naturalSize.width > 0 && containerRef.current 
                      ? (naturalSize.width * Math.max(containerRef.current.offsetWidth / naturalSize.width, containerRef.current.offsetHeight / naturalSize.height))
                      : '100%',
                    height: naturalSize.height > 0 && containerRef.current 
                      ? (naturalSize.height * Math.max(containerRef.current.offsetWidth / naturalSize.width, containerRef.current.offsetHeight / naturalSize.height))
                      : '100%',
                    transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${imageZoom})`
                  }} 
                  draggable="false"
                 />
                 <div className="absolute inset-0 hidden items-center justify-center bg-slate-50 text-slate-200">
                   <span className="material-symbols-outlined !text-6xl mb-2">
                     {product.type === 'home' ? 'package_2' : 'restaurant'}
                   </span>
                 </div>
                 
                 {isRepositioning && (
                   <div className="absolute inset-0 bg-black/5 pointer-events-none"></div>
                 )}
               </div>
             ) : (
               <div className="w-full h-full flex items-center justify-center bg-slate-50">
                 <span className="material-symbols-outlined !text-6xl opacity-20 text-slate-400">shopping_basket</span>
               </div>
             )}
             
             <button onClick={onClose} className="absolute top-4 left-4 z-10 size-10 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-transform">
               <span className="material-symbols-outlined !text-2xl">arrow_back</span>
             </button>
             <button
               onClick={() => { if (isEditing) { handleSave(); } else { setIsEditing(true); } }}
               className={`absolute top-4 right-4 z-10 size-10 rounded-full backdrop-blur-md flex items-center justify-center active:scale-90 transition-all ${isEditing ? 'bg-primary text-white' : 'bg-black/20 text-white'}`}
             >
               <span className="material-symbols-outlined !text-2xl">{isEditing ? 'check' : 'edit'}</span>
             </button>
        </div>

        <div className="px-6 py-6 overflow-y-auto flex-1 pb-12 no-scrollbar relative">
          {isEditing && (
            <div className="space-y-6 mb-8">
              <div className="flex gap-4">
                <label className="flex-1 h-12 bg-slate-100/80 rounded-2xl flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const img = new Image();
                        img.onload = async () => {
                          const MAX = 800;
                          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
                          const canvas = document.createElement('canvas');
                          canvas.width  = Math.round(img.width  * scale);
                          canvas.height = Math.round(img.height * scale);
                          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                          const compressed = canvas.toDataURL('image/jpeg', 0.85);
                          // Carica sul server e usa l'URL, altrimenti usa base64 (localhost)
                          const { uploadImage } = await import('../../security/upload.js');
                          const url = await uploadImage(compressed);
                          setEditedData({...editedData, image: url || compressed});
                          setOffsetX(0);
                          setOffsetY(0);
                          setImageZoom(1.3);
                        };
                        img.src = reader.result;
                      };
                      reader.readAsDataURL(file);
                    }
                  }} />
                  <span className="material-symbols-outlined !text-lg text-slate-600">add_a_photo</span>
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">Cambia immagine</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(v => !v)}
                  className="flex-1 h-12 bg-slate-100/80 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all text-slate-600"
                >
                  <span className="material-symbols-outlined !text-lg">link</span>
                  <span className="text-[10px] font-black uppercase tracking-tight">URL</span>
                </button>
                <button
                  onClick={() => { setIsRepositioning(!isRepositioning); setIsRepositioningThumb(false); }}
                  disabled={!editedData.image && !product.image}
                  className={`flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-30 ${isRepositioning ? 'bg-primary text-white shadow-lg' : 'bg-slate-100/80 text-slate-600'}`}
                >
                  <span className="material-symbols-outlined !text-lg">open_with</span>
                  <span className="text-[10px] font-black uppercase tracking-tight">Copertina</span>
                </button>
              </div>

              {showUrlInput && (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {urlInput.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(urlInput.trim());
                      }}
                      className="h-10 w-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center active:scale-95 transition-transform"
                      title="Copia URL"
                    >
                      <span className="material-symbols-outlined !text-lg">content_copy</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (urlInput.trim()) {
                        setEditedData({...editedData, image: urlInput.trim()});
                        setOffsetX(0); setOffsetY(0); setImageZoom(1.3);
                        setShowUrlInput(false); setUrlInput('');
                      }
                    }}
                    className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-black active:scale-95 transition-transform"
                  >
                    OK
                  </button>
                </div>
              )}

              {isRepositioning && (
                <div className="bg-slate-50/80 backdrop-blur-sm p-4 rounded-3xl border border-slate-100 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined !text-xl text-slate-400">zoom_out</span>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="0.05"
                      value={imageZoom}
                      onChange={(e) => setImageZoom(Number(e.target.value))}
                      className="flex-1 accent-primary h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer"
                    />
                    <span className="material-symbols-outlined !text-xl text-slate-400">zoom_in</span>
                  </div>
                  <p className="text-[9px] text-center font-black text-slate-400 uppercase tracking-widest mt-3">Zoom copertina — trascina per spostare</p>
                </div>
              )}

              {(editedData.image || product.image) && (
                <div className="bg-slate-50/80 backdrop-blur-sm p-4 rounded-3xl border border-slate-100 space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Miniatura — trascina per riposizionare</p>
                  <div className="flex items-center gap-4">
                    {/* Anteprima draggable */}
                    <div
                      ref={thumbContainerRef}
                      className="size-16 rounded-2xl overflow-hidden relative shrink-0 border border-slate-200 bg-slate-100 cursor-move touch-none"
                      onMouseDown={(e) => { thumbIsDragging.current = true; thumbLastPos.current = { x: e.clientX, y: e.clientY }; }}
                      onTouchStart={(e) => { thumbIsDragging.current = true; thumbLastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
                      onMouseMove={(e) => {
                        if (!thumbIsDragging.current) return;
                        const rect = thumbContainerRef.current.getBoundingClientRect();
                        const limitX = rect.width * (thumbZoom - 1) / 2;
                        const limitY = rect.height * (thumbZoom - 1) / 2;
                        const dx = e.clientX - thumbLastPos.current.x;
                        const dy = e.clientY - thumbLastPos.current.y;
                        setThumbOffsetX(prev => Math.max(-limitX, Math.min(limitX, prev + dx)));
                        setThumbOffsetY(prev => Math.max(-limitY, Math.min(limitY, prev + dy)));
                        thumbLastPos.current = { x: e.clientX, y: e.clientY };
                      }}
                      onTouchMove={(e) => {
                        if (!thumbIsDragging.current) return;
                        const touch = e.touches[0];
                        const rect = thumbContainerRef.current.getBoundingClientRect();
                        const limitX = rect.width * (thumbZoom - 1) / 2;
                        const limitY = rect.height * (thumbZoom - 1) / 2;
                        const dx = touch.clientX - thumbLastPos.current.x;
                        const dy = touch.clientY - thumbLastPos.current.y;
                        setThumbOffsetX(prev => Math.max(-limitX, Math.min(limitX, prev + dx)));
                        setThumbOffsetY(prev => Math.max(-limitY, Math.min(limitY, prev + dy)));
                        thumbLastPos.current = { x: touch.clientX, y: touch.clientY };
                      }}
                      onMouseUp={() => { thumbIsDragging.current = false; }}
                      onMouseLeave={() => { thumbIsDragging.current = false; }}
                      onTouchEnd={() => { thumbIsDragging.current = false; }}
                    >
                      <img
                        src={editedData.image || product.image}
                        alt="miniatura"
                        draggable="false"
                        onLoad={(e) => setThumbNaturalSize({ width: e.target.naturalWidth, height: e.target.naturalHeight })}
                        className="absolute inset-0 w-full h-full object-cover select-none"
                        style={thumbZoom !== 1 || thumbOffsetX !== 0 || thumbOffsetY !== 0 ? {
                          transform: `scale(${thumbZoom}) translate(${thumbOffsetX / thumbZoom}px, ${thumbOffsetY / thumbZoom}px)`,
                          transformOrigin: 'center center',
                        } : undefined}
                      />
                    </div>
                    {/* Slider zoom */}
                    <div className="flex-1 flex items-center gap-3">
                      <span className="material-symbols-outlined !text-lg text-slate-400">zoom_out</span>
                      <input type="range" min="1" max="3" step="0.05" value={thumbZoom}
                        onChange={(e) => {
                          const z = Number(e.target.value);
                          setThumbZoom(z);
                          // Ricalcola i limiti con il nuovo zoom
                          if (thumbContainerRef.current) {
                            const rect = thumbContainerRef.current.getBoundingClientRect();
                            const limitX = rect.width * (z - 1) / 2;
                            const limitY = rect.height * (z - 1) / 2;
                            setThumbOffsetX(prev => Math.max(-limitX, Math.min(limitX, prev)));
                            setThumbOffsetY(prev => Math.max(-limitY, Math.min(limitY, prev)));
                          }
                        }}
                        className="flex-1 accent-primary h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer"
                      />
                      <span className="material-symbols-outlined !text-lg text-slate-400">zoom_in</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quantity Selector Overlay (Glass Window Style) */}
          {showQtySelector && (
            <div className="absolute inset-0 z-[60] flex items-center justify-center p-8 animate-in fade-in duration-300">
               {/* Translucent Dark Overlay with Blur */}
               <div className="absolute inset-0 bg-black/10 backdrop-blur-md" onClick={() => setShowQtySelector(false)}></div>
               
               {/* Square Glass Window */}
               <div className="relative aspect-square w-full max-w-[280px] bg-white/70 backdrop-blur-2xl border border-white/40 rounded-[48px] shadow-2xl shadow-slate-200/50 flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-300">
                  <button onClick={() => setShowQtySelector(false)} className="absolute top-6 right-6 text-slate-400 active:scale-75 transition-transform p-2">
                    <span className="material-symbols-outlined !text-xl">close</span>
                  </button>

                  <h3 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-[0.2em]">Quantità</h3>
                  
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => updateProduct(product.id, { quantity: Math.max(0, product.quantity - 1) })} 
                      className="size-14 rounded-[20px] bg-slate-100/80 backdrop-blur-sm border border-white/50 flex items-center justify-center active:scale-90 transition-all shadow-sm"
                    >
                      <span className="material-symbols-outlined !text-2xl text-slate-600 font-bold">remove</span>
                    </button>
                    
                    <span className="text-6xl font-black text-slate-900 w-20 text-center drop-shadow-sm">{product.quantity}</span>
                    
                    <button 
                      onClick={() => updateProduct(product.id, { quantity: product.quantity + 1 })} 
                      className="size-14 rounded-[20px] bg-primary text-white flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-primary/30"
                    >
                      <span className="material-symbols-outlined !text-2xl font-bold">add</span>
                    </button>
                  </div>

                  <button 
                    onClick={() => setShowQtySelector(false)} 
                    className="mt-10 px-8 py-3 bg-slate-900 text-white font-black rounded-2xl uppercase tracking-widest text-[9px] active:scale-95 transition-all shadow-xl shadow-slate-900/20"
                  >
                    Conferma
                  </button>
               </div>
            </div>
          )}

          {isEditing ? (
            <div className="space-y-4 mb-8">
              <div className="flex flex-col gap-4">
                <div className="w-full">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Categoria</label>
                  <select value={editedData.type} onChange={(e) => setEditedData({...editedData, type: e.target.value})} className="w-full h-12 px-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-primary font-bold text-sm">
                    <option value="kitchen">Cucina</option>
                    <option value="home">Casa</option>
                  </select>
                </div>

                {editedData.type === 'home' && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tipo di Prodotto Casa</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {config.homeCategories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setEditedData({ ...editedData, category: cat })}
                          className={`h-11 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-2 ${
                            editedData.category === cat 
                              ? 'bg-primary/10 border-primary text-primary' 
                              : 'bg-white border-slate-100 text-slate-400'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {editedData.type === 'kitchen' && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tipo di Prodotto Cucina</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {config.kitchenCategories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setEditedData({ ...editedData, category: cat })}
                          className={`h-11 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-2 ${
                            editedData.category === cat 
                              ? 'bg-primary/10 border-primary text-primary' 
                              : 'bg-white border-slate-100 text-slate-400'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="w-full">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Scadenza</label>
                  <input 
                    type="date" 
                    value={editedData.expiryDate ? new Date(editedData.expiryDate).toISOString().split('T')[0] : ''} 
                    onChange={(e) => setEditedData({...editedData, expiryDate: e.target.value})} 
                    className="w-full h-12 px-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-primary font-bold text-sm outline-none appearance-none" 
                  />
                </div>
              </div>


              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Consumo Suggerito (gg)</label>
                <input type="number" value={editedData.suggestedConsumptionDays} onChange={(e) => setEditedData({...editedData, suggestedConsumptionDays: parseInt(e.target.value)})} className="w-full h-12 px-4 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-primary font-bold" />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Supermercati Preferiti</label>
                <div className="grid grid-cols-2 gap-2">
                  {supermarkets.map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        const currentIds = editedData.supermarketIds || (editedData.supermarketId ? [editedData.supermarketId] : []);
                        const newIds = currentIds.includes(s.id) 
                          ? currentIds.filter(id => id !== s.id) 
                          : [...currentIds, s.id];
                        setEditedData({
                          ...editedData, 
                          supermarketIds: newIds,
                          supermarketId: newIds[0] || null // Maintain compatibility
                        });
                      }}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                        (editedData.supermarketIds || (editedData.supermarketId ? [editedData.supermarketId] : [])).includes(s.id)
                          ? 'bg-primary/5 border-primary text-primary'
                          : 'bg-white border-slate-100 text-slate-400'
                      }`}
                    >
                      <span className="material-symbols-outlined !text-sm">
                        {(editedData.supermarketIds || (editedData.supermarketId ? [editedData.supermarketId] : [])).includes(s.id) ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                      <span className="text-xs font-bold truncate">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleSave} className="w-full h-14 bg-primary text-white font-black rounded-xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all text-sm uppercase tracking-widest">Salva Modifiche</button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-3xl font-black text-[#2d5a27] tracking-tight leading-tight">{product.name}</h2>
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black mt-2 shrink-0">
                   {product.type === 'kitchen' ? 'Cucina' : 'Casa'}
                </span>
              </div>
              
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <span className="material-symbols-outlined !text-sm">storefront</span>
                  <p className="text-xs">
                    Supermercato: {
                      (product.supermarketIds || (product.supermarketId ? [product.supermarketId] : []))
                        .map(id => supermarkets.find(s => s.id === id)?.name || 'N/D')
                        .join(', ') || 'N/D'
                    }
                  </p>
                </div>
                <button 
                  onClick={() => setShowQtySelector(true)}
                  className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-2 active:scale-95 transition-all shrink-0"
                >
                  <span className="material-symbols-outlined !text-xs text-primary font-bold">inventory_2</span>
                  <span className="text-[9px] font-black uppercase text-slate-600">Quantità: {product.quantity}</span>
                </button>
              </div>

              {product.type === 'kitchen' && (
                <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary !text-xl">temp_preferences_eco</span>
                      <span className="text-slate-900 font-black text-xs uppercase tracking-tight">Qualità Freschezza</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase ${freshnessPercent > 50 ? 'bg-emerald-500 text-white' : freshnessPercent > 20 ? 'bg-orange-400 text-white' : 'bg-red-500 text-white'}`}>
                      {freshnessPercent > 50 ? 'Ottimo' : freshnessPercent > 20 ? 'Consumare' : 'Critico'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden shadow-inner">
                    <div className={`h-full rounded-full transition-all duration-1000 ${freshnessPercent > 50 ? 'bg-emerald-500' : freshnessPercent > 20 ? 'bg-orange-400' : 'bg-red-500'}`} style={{ width: `${freshnessPercent}%` }}></div>
                  </div>
                  <p className="text-slate-500 text-[10px] font-bold mt-4 flex items-center justify-between">
                    <span>Da consumare in {product.suggestedConsumptionDays || 3} gg</span>
                    {isOpened && <span className="text-primary italic">Aperto {formatDistanceToNow(new Date(product.openedDate), { locale: it, addSuffix: true })}</span>}
                  </p>
                </div>
              )}

              {/* Action Rows */}
              <div className="space-y-3 mb-8">
                {/* Top Row: 3 Buttons */}
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={isOpened ? handleUndoOpen : handleOpen} className={`flex flex-col items-center justify-center p-3 rounded-3xl border-2 transition-all ${isOpened ? 'bg-emerald-50 border-emerald-100 text-emerald-600 active:bg-red-50 active:border-red-100 active:text-red-500 active:scale-95' : 'bg-white border-slate-100 text-slate-400 active:bg-slate-50 active:scale-95'}`}>
                    <div className={`size-9 rounded-2xl flex items-center justify-center mb-1.5 ${isOpened ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100'}`}>
                      <span className="material-symbols-outlined !text-lg">{isOpened ? 'restaurant' : 'shopping_bag'}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tight">{isOpened ? 'Aperto' : 'Apri Ora'}</span>
                  </button>

                  <button 
                    onClick={handleDecrement} 
                    disabled={product.quantity === 0}
                    className={`flex flex-col items-center justify-center p-3 rounded-3xl border-2 transition-all ${product.quantity === 0 ? 'bg-slate-50 border-slate-100 text-slate-200' : 'bg-orange-50 border-orange-100 text-orange-600 active:scale-95'}`}
                  >
                    <div className={`size-9 rounded-2xl flex items-center justify-center mb-1.5 ${product.quantity === 0 ? 'bg-slate-50' : 'bg-orange-100'}`}>
                      <span className="material-symbols-outlined !text-lg font-black">inventory_2</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tight">Finito</span>
                  </button>

                  <button 
                    onClick={handleFinish} 
                    className="flex flex-col items-center justify-center p-3 rounded-3xl bg-blue-50 border-2 border-blue-100 text-blue-600 active:scale-95 transition-all"
                  >
                    <div className="size-9 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-1.5">
                      <span className="material-symbols-outlined !text-lg">shopping_cart_checkout</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tight text-center">Ricompra</span>
                  </button>
                </div>

                {/* Bottom Row: 2 Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleDuplicate}
                    className="flex items-center justify-center gap-3 p-4 rounded-3xl bg-purple-50 border-2 border-purple-100 text-purple-600 active:scale-95 transition-all"
                  >
                    <div className="size-9 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined !text-lg">content_copy</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest truncate">Copia Prodotto</span>
                  </button>

                  <button
                    onClick={() => { if(confirm(`Eliminare definitivamente "${product.name}"?`)) { deleteProduct(product.id); onClose(); } }}
                    className="flex items-center justify-center gap-3 p-4 rounded-3xl bg-red-50 border-2 border-red-100 text-red-600 active:scale-95 transition-all"
                  >
                    <div className="size-9 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined !text-lg">delete</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest truncate">Elimina</span>
                  </button>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-100 font-black text-slate-500">
                   <div className="flex items-center gap-3">
                     <span className="material-symbols-outlined text-slate-300">event_note</span>
                     <span className="text-[10px] uppercase tracking-widest">Scade il</span>
                   </div>
                   <span className={`text-xs ${isExpired ? 'text-red-500' : 'text-slate-900'}`}>
                     {product.expiryDate ? format(new Date(product.expiryDate), 'dd MMM yyyy', { locale: it }) : 'N/D'}
                   </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100 font-black text-slate-500">
                   <div className="flex items-center gap-3">
                     <span className="material-symbols-outlined text-slate-300">category</span>
                     <span className="text-[10px] uppercase tracking-widest">Categoria</span>
                   </div>
                   <span className="text-xs text-slate-900">{product.type === 'kitchen' ? 'Cucina' : 'Casa'}</span>
                </div>
                {product.type === 'home' && product.category && (
                  <div className="flex items-center justify-between py-3 border-b border-slate-100 font-black text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-300">label</span>
                      <span className="text-[10px] uppercase tracking-widest">Sottocategoria</span>
                    </div>
                    <span className="text-xs text-primary font-black">{product.category}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      </div>
      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        onConfirm={confirmDialog?.onConfirm}
        onCancel={() => setConfirmDialog(null)}
        confirmLabel="Sì, annulla"
      />
    </>
  );
};

export default ProductDetailModal;
