import React, { useState, useRef } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import useStore from '../../store/useStore';

const AddProductModal = ({ isOpen, onClose }) => {
  const { supermarkets, config, addProduct } = useStore();
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    category: '',
    supermarketId: '',
    expiryDate: '',
    quantity: 1,
    suggestedConsumptionDays: 3,
    image: ''
  });
  const [imagePreview, setImagePreview] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const categories = formData.type === 'kitchen' ? config.kitchenCategories : config.homeCategories;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
        const finalImage = url || compressed;
        setImagePreview(finalImage);
        setFormData(prev => ({ ...prev, image: finalImage }));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addProduct({ ...formData, type: formData.type || 'kitchen' });
    onClose();
    setFormData({
      name: '',
      type: '',
      category: '',
      supermarketId: '',
      expiryDate: '',
      quantity: 1,
      suggestedConsumptionDays: 3,
      image: ''
    });
    setImagePreview('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Nuovo prodotto</h2>
            <p className="text-[10px] font-bold text-slate-400 mt-1">Dettagli inventario</p>
          </div>
          <button onClick={onClose} className="size-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Foto */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 mb-2 block">Foto prodotto</label>
            {imagePreview ? (
              <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-slate-100">
                <img src={imagePreview} alt="Anteprima" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setImagePreview(''); setFormData(prev => ({ ...prev, image: '' })); }}
                  className="absolute top-2 right-2 size-8 rounded-full bg-black/50 text-white flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-1 flex-col items-center justify-center gap-2 h-24 text-slate-400 active:bg-slate-100 transition-colors"
                >
                  <span className="material-symbols-outlined !text-2xl text-primary">upload_file</span>
                  <span className="text-[11px] font-black uppercase tracking-wider">Carica file</span>
                </button>
                <div className="w-px bg-slate-200 my-4" />
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-1 flex-col items-center justify-center gap-2 h-24 text-slate-400 active:bg-slate-100 transition-colors"
                >
                  <span className="material-symbols-outlined !text-2xl text-primary">photo_camera</span>
                  <span className="text-[11px] font-black uppercase tracking-wider">Fotocamera</span>
                </button>
                <div className="w-px bg-slate-200 my-4" />
                <button
                  type="button"
                  onClick={() => setShowUrlInput(v => !v)}
                  className="flex flex-1 flex-col items-center justify-center gap-2 h-24 text-slate-400 active:bg-slate-100 transition-colors"
                >
                  <span className="material-symbols-outlined !text-2xl text-primary">link</span>
                  <span className="text-[11px] font-black uppercase tracking-wider">URL</span>
                </button>
              </div>
            )}
            {showUrlInput && !imagePreview && (
              <div className="flex gap-2 mt-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (urlInput.trim()) {
                      setImagePreview(urlInput.trim());
                      setFormData(prev => ({ ...prev, image: urlInput.trim() }));
                      setShowUrlInput(false);
                      setUrlInput('');
                    }
                  }}
                  className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-black active:scale-95 transition-transform"
                >
                  OK
                </button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
          </div>

          {/* Nome */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 mb-2 block">Nome prodotto</label>
            <input
              required
              type="text"
              placeholder="Esempio: Latte Intero"
              className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100 text-lg font-black text-slate-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Tipo + Categoria */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 mb-2 block">Tipo</label>
              <select
                className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value, category: '' })}
              >
                <option value="">Seleziona...</option>
                <option value="kitchen">Cucina</option>
                <option value="home">Casa</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 mb-2 block">Categoria</label>
              <select
                className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">Seleziona...</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Supermercato */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 mb-2 block">Supermercato</label>
            <select
              className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
              value={formData.supermarketId}
              onChange={(e) => setFormData({ ...formData, supermarketId: e.target.value })}
            >
              <option value="">Seleziona...</option>
              {supermarkets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Scadenza */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 mb-2 block">Scadenza</label>
            <div
              className="relative flex items-center gap-3 h-14 px-4 rounded-2xl bg-slate-50 border border-slate-100 focus-within:ring-4 focus-within:ring-primary/10 overflow-hidden cursor-pointer"
              onClick={() => document.getElementById('expiry-date-input').showPicker?.()}
            >
              <span className="material-symbols-outlined !text-xl text-primary shrink-0">calendar_today</span>
              <input
                id="expiry-date-input"
                type="date"
                className="flex-1 min-w-0 bg-transparent text-sm font-black text-slate-900 outline-none border-none cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
              {!formData.expiryDate && (
                <span className="sm:hidden absolute left-14 text-sm font-bold text-slate-300 pointer-events-none select-none">
                  Imposta la data di scadenza
                </span>
              )}
            </div>
          </div>

          {/* Quantità + Salva */}
          <div className="flex items-center gap-4 pt-4">
            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, quantity: Math.max(1, formData.quantity - 1) })}
                className="size-10 rounded-xl bg-white text-slate-400 flex items-center justify-center hover:text-slate-600 shadow-sm active:scale-95 transition-all"
              >
                <Minus size={18} />
              </button>
              <span className="font-black text-xl w-8 text-center text-slate-900">{formData.quantity}</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
                className="size-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                <Plus size={18} />
              </button>
            </div>
            <button
              type="submit"
              className="flex-1 h-14 bg-primary text-white font-bold text-sm rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Salva prodotto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;
