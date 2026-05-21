import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/library';
import useStore from '../store/useStore';

const BarcodeScanner = () => {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const { updateSupermarket } = useStore();
  const videoRef = useRef(null);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    
    codeReader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
      if (result) {
        updateSupermarket(storeId, {
          fidelityCard: {
            cardNumber: result.getText(),
            lastSync: new Date().toISOString()
          }
        });
        navigate(`/stores/${storeId}`);
      }
    });

    return () => {
      codeReader.reset();
    };
  }, [storeId, updateSupermarket, navigate]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background-light overflow-hidden -mx-4">
      {/* Top App Bar */}
      <div className="z-20 flex items-center bg-white p-4 justify-between border-b border-primary/10">
        <button 
          onClick={() => navigate(`/stores/${storeId}`)}
          className="text-slate-900 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-primary/10 transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-slate-900 text-lg font-black leading-tight tracking-tight flex-1 text-center">
          Scansiona Carta Fedeltà
        </h2>
        <div className="size-10"></div>
      </div>

      {/* Camera Viewport Area */}
      <div className="relative flex-1 bg-slate-900 overflow-hidden flex items-center justify-center shadow-inner">
        {/* Real Video Element */}
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover z-0"
        />

        {/* Scanning Frame Overlay */}
        <div className="absolute z-10 w-full max-w-sm px-8 flex flex-col items-center">
          <div className="relative w-full aspect-[1.6/1] rounded-2xl border-2 border-primary/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] overflow-visible">
            {/* Corner Accents */}
            <div className="absolute -top-[2px] -left-[2px] w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
            <div className="absolute -top-[2px] -right-[2px] w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
            <div className="absolute -bottom-[2px] -left-[2px] w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
            <div className="absolute -bottom-[2px] -right-[2px] w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl"></div>
            
            {/* Scanning Line Animation */}
            <div className="absolute top-0 left-0 w-full h-1 bg-primary/80 shadow-[0_0_15px_rgba(76,174,79,0.8)] animate-scan"></div>
          </div>
          
          <div className="mt-12 text-center text-white space-y-2">
            <p className="text-lg font-black tracking-tight uppercase">Inquadra il codice a barre</p>
            <p className="text-xs font-bold opacity-60 max-w-[280px] mx-auto uppercase tracking-widest leading-relaxed">
              Posiziona la carta fedeltà all'interno della cornice per scansionarla
            </p>
          </div>
        </div>

        {/* Camera Controls */}
        <div className="absolute bottom-8 left-0 right-0 z-20 flex items-center justify-center gap-8">
          <button className="flex shrink-0 items-center justify-center rounded-full size-12 bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 transition-all active:scale-90">
            <span className="material-symbols-outlined">image</span>
          </button>
          <button className="flex shrink-0 items-center justify-center rounded-full size-20 bg-primary text-white shadow-2xl shadow-primary/50 hover:scale-105 active:scale-95 transition-all">
            <span className="material-symbols-outlined !text-4xl">photo_camera</span>
          </button>
          <button className="flex shrink-0 items-center justify-center rounded-full size-12 bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 transition-all active:scale-90">
            <span className="material-symbols-outlined">flash_on</span>
          </button>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="z-20 bg-white p-6 pb-12 flex flex-col gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button className="flex w-full items-center justify-center rounded-2xl h-14 px-6 bg-primary text-white text-sm font-black tracking-widest shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all uppercase">
          <span className="material-symbols-outlined mr-2">edit</span>
          Inserisci manualmente
        </button>
        <button 
          onClick={() => navigate(`/stores/${storeId}`)}
          className="flex w-full items-center justify-center rounded-2xl h-14 px-6 bg-primary/5 text-primary text-sm font-black tracking-widest hover:bg-primary/10 active:scale-[0.98] transition-all uppercase"
        >
          Annulla
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
      `}} />
    </div>
  );
};

export default BarcodeScanner;
