import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import Dashboard from './pages/Dashboard';
import SupermarketList from './pages/SupermarketList';
import SupermarketDetail from './pages/SupermarketDetail';
import HouseholdInventory from './pages/HouseholdInventory';
import BarcodeScanner from './pages/BarcodeScanner';
import Notifications from './pages/Notifications';
import ShoppingSummary from './pages/ShoppingSummary';
import Pantry from './pages/Pantry';
import Settings from './pages/Settings';
import DataManagement from './pages/DataManagement';
import Login from './pages/Login';
import AddProductModal from './components/ui/AddProductModal';
import useStore from './store/useStore';
import { syncModule } from './security/sync';
import { uploadImage } from './security/upload';

// Initial Seed Data (Optional - just to show something)
const SEED_DATA = {
  supermarkets: [
    { 
      id: '1', 
      name: 'Esselunga', 
      fidelityCard: { cardNumber: '043920193', lastSync: new Date().toISOString() },
      categories: ['Surgelati', 'Panetteria', 'Latticini', 'Bevande', 'Fresco'],
      hours: { mon: { open: '08:00', close: '21:00' }, tue: { open: '08:00', close: '21:00' }, wed: { open: '08:00', close: '21:00' }, thu: { open: '08:00', close: '21:00' }, fri: { open: '08:00', close: '21:00' }, sat: { open: '08:00', close: '21:00' }, sun: { open: '09:00', close: '20:00' } },
    },
    { 
      id: '2', 
      name: 'Lidl', 
      fidelityCard: { cardNumber: 'L-882930211', lastSync: new Date().toISOString() },
      categories: ['Ortofrutta', 'Carne', 'Pulizia', 'Snack'],
      hours: { mon: { open: '08:00', close: '20:30' }, tue: { open: '08:00', close: '20:30' }, wed: { open: '08:00', close: '20:30' }, thu: { open: '08:00', close: '20:30' }, fri: { open: '08:00', close: '20:30' }, sat: { open: '08:00', close: '20:30' }, sun: { open: '09:00', close: '20:00' } },
    },
    { 
      id: '3', 
      name: 'Coop', 
      fidelityCard: { cardNumber: 'C-048291039', lastSync: new Date().toISOString() },
      categories: ['Dispensa', 'Igiene', 'Colazione'],
      hours: { mon: { open: '08:30', close: '20:30' }, tue: { open: '08:30', close: '20:30' }, wed: { open: '08:30', close: '20:30' }, thu: { open: '08:30', close: '20:30' }, fri: { open: '08:30', close: '20:30' }, sat: { open: '08:30', close: '20:30' }, sun: { open: '09:00', close: '13:00' } },
    },
    { 
      id: '4', 
      name: 'Conad', 
      fidelityCard: { cardNumber: 'CN-991203', lastSync: new Date().toISOString() },
      categories: ['Fresco', 'Dispensa', 'Bevande'],
      hours: { mon: { open: '08:00', close: '20:00' }, tue: { open: '08:00', close: '20:00' }, wed: { open: '08:00', close: '20:00' }, thu: { open: '08:00', close: '20:00' }, fri: { open: '08:00', close: '20:00' }, sat: { open: '08:00', close: '20:00' }, sun: { open: '09:00', close: '19:00' } },
    }
  ],
  products: [
    // --- SCADENZE IMMINENTI (Dashboard Horizontal Scroll) ---
    { 
      id: 'p1', name: 'Latte Intero', type: 'kitchen', category: 'Fresco', supermarketId: '1', status: 'bought', 
      expiryDate: new Date().toISOString(), quantity: 1,
    },
    { 
      id: 'p2', name: 'Yogurt Greco', type: 'kitchen', category: 'Fresco', supermarketId: '1', status: 'bought', 
      expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), quantity: 2,
    },
    { 
      id: 'p3', name: 'Salmone Fresco', type: 'kitchen', category: 'Fresco', supermarketId: '2', status: 'bought', 
      expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), quantity: 1,
    },
    { 
      id: 'p11', name: 'Ricotta Bustina', type: 'kitchen', category: 'Fresco', supermarketId: '4', status: 'bought', 
      expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), quantity: 1,
    },

    // --- PRODOTTI APERTI (Dashboard Suggestion Card) ---
    { 
      id: 'p4', name: 'Passata di Pomodoro', type: 'kitchen', category: 'Dispensa', supermarketId: '1', status: 'opened', 
      openedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), suggestedConsumptionDays: 3, quantity: 1,
    },
    { 
      id: 'p5', name: 'Succo d\'Arancia', type: 'kitchen', category: 'Bevande', supermarketId: '1', status: 'opened', 
      openedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), suggestedConsumptionDays: 5, quantity: 1,
    },
    { 
      id: 'p6', name: 'Pancarrè Integrale', type: 'kitchen', category: 'Dispensa', supermarketId: '3', status: 'opened', 
      openedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), suggestedConsumptionDays: 7, quantity: 1,
    },
    { 
      id: 'p12', name: 'Pesto alla Genovese', type: 'kitchen', category: 'Fresco', supermarketId: '1', status: 'opened', 
      openedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), suggestedConsumptionDays: 4, quantity: 1,
    },

    // --- INVENTARIO CASA (Household Section) ---
    { id: 'p7', name: 'Detersivo Piatti', type: 'home', category: 'Detersivi', supermarketId: '2', status: 'bought', quantity: 1 },
    { id: 'p8', name: 'Spugne Cucina', type: 'home', category: 'Accessori', supermarketId: '2', status: 'to-buy', quantity: 0 },
    { id: 'p9', name: 'Carta Igienica', type: 'home', category: 'Igiene Persona', supermarketId: '3', status: 'bought', quantity: 4 },
    { id: 'p10', name: 'Sacchetti Pattumiera', type: 'home', category: 'Accessori', supermarketId: '1', status: 'bought', quantity: 2 },
    { id: 'p13', name: 'Sgrassatore Universale', type: 'home', category: 'Detersivi', supermarketId: '2', status: 'bought', quantity: 1 },
    { id: 'p14', name: 'Sapone Mani Ricarica', type: 'home', category: 'Igiene Persona', supermarketId: '3', status: 'to-buy', quantity: 0 },
    { id: 'p15', name: 'Tabs Lavastoviglie', type: 'home', category: 'Detersivi', supermarketId: '1', status: 'bought', quantity: 20 },
    { id: 'p16', name: 'Candeggina Gentile', type: 'home', category: 'Detersivi', supermarketId: '2', status: 'bought', quantity: 1 },
    
    // --- ALIMENTARI VARI ---
    // Esselunga
    { id: 'p17', name: 'Pasta Barilla Penne', type: 'kitchen', category: 'Dispensa', supermarketId: '1', status: 'bought', quantity: 3 },
    { id: 'p18', name: 'Biscotti Gocciole', type: 'kitchen', category: 'Dispensa', supermarketId: '1', status: 'bought', quantity: 1 },
    { id: 'p19', name: 'Filetti di Merluzzo Surg.', type: 'kitchen', category: 'Surgelati', supermarketId: '1', status: 'bought', quantity: 1 },
    { id: 'p20', name: 'Uova (6 pz)', type: 'kitchen', category: 'Fresco', supermarketId: '1', status: 'to-buy', quantity: 0 },
    { id: 'p21', name: 'Mozzarella (3 pz)', type: 'kitchen', category: 'Fresco', supermarketId: '1', status: 'bought', quantity: 1 },
    
    // Lidl
    { id: 'p22', name: 'Petto di Pollo', type: 'kitchen', category: 'Fresco', supermarketId: '2', status: 'bought', quantity: 1 },
    { id: 'p23', name: 'Mele (1kg)', type: 'kitchen', category: 'Fresco', supermarketId: '2', status: 'to-buy', quantity: 0 },
    { id: 'p24', name: 'Insalata mista busta', type: 'kitchen', category: 'Fresco', supermarketId: '2', status: 'bought', quantity: 1 },
    { id: 'p25', name: 'Birra Peroni (3 pz)', type: 'kitchen', category: 'Bevande', supermarketId: '2', status: 'bought', quantity: 1 },
    { id: 'p26', name: 'Patatine Rustiche', type: 'kitchen', category: 'Dispensa', supermarketId: '2', status: 'to-buy', quantity: 0 },
 
    // Coop
    { id: 'p27', name: 'Riso Carnaroli', type: 'kitchen', category: 'Dispensa', supermarketId: '3', status: 'bought', quantity: 2 },
    { id: 'p28', name: 'Caffè Lavazza Qualità Rossa', type: 'kitchen', category: 'Dispensa', supermarketId: '3', status: 'bought', quantity: 1 },
    { id: 'p29', name: 'Confettura Albicocche', type: 'kitchen', category: 'Dispensa', supermarketId: '3', status: 'opened', openedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), suggestedConsumptionDays: 14, quantity: 1 },
    { id: 'p30', name: 'Tonno all\'olio d\'oliva (4 pz)', type: 'kitchen', category: 'Dispensa', supermarketId: '3', status: 'bought', quantity: 1 },
    { id: 'p31', name: 'Fette Biscottate', type: 'kitchen', category: 'Dispensa', supermarketId: '3', status: 'to-buy', quantity: 0 }
  ]
};

function Toast() {
  const { toast } = useStore()
  if (!toast) return null
  return (
    <div className="fixed bottom-28 left-0 right-0 z-[300] flex justify-center px-4 pointer-events-none">
      <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-sm font-black text-white animate-fade-in-up pointer-events-auto ${toast.type === 'error' ? 'bg-red-500' : 'bg-[#2d5a27]'}`}>
        <span className="material-symbols-outlined !text-base">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
        <span>{toast.message}</span>
      </div>
    </div>
  )
}

function App() {
  const { supermarkets, products, seedStore, isAuthenticated, config, replaceState, setIsUnsynced, setLastPushedAt, updateProduct } = useStore();

  // Initialize seed data + auto-pull on startup
  React.useEffect(() => {
    if (config.pin) syncModule.setSessionPIN(config.pin);

    // Carica subito i dati demo se locale è vuoto (nessuna attesa)
    if (products.length === 0 && supermarkets.length === 0) {
      seedStore(SEED_DATA);
    }

    // Pull dal cloud in background — sempre, per vedere modifiche da altri dispositivi
    syncModule.pullFromCloud().then(async (cloud) => {
      if (!cloud?.state) return;
      if (!(cloud.state.products?.length > 0 || cloud.state.supermarkets?.length > 0)) return;

      const current = useStore.getState();
      if (current.isUnsynced) return;

      const cloudTime = cloud.lastUpdated || 0;
      if (cloudTime > current.lastPushedAt) {
        replaceState(cloud.state);
        setIsUnsynced(false);
      }

      // Migrazione: carica sul server le immagini base64 ancora presenti
      // (vecchi prodotti salvati prima del sistema upload)
      const toMigrate = useStore.getState().products.filter(
        p => p.image && p.image.startsWith('data:')
      );
      for (const p of toMigrate) {
        const url = await uploadImage(p.image);
        if (url) {
          useStore.getState().updateProduct(p.id, { image: url });
        }
      }
      if (toMigrate.length > 0) {
        // Push stato aggiornato con URL al posto di base64
        const s = useStore.getState();
        await syncModule.pushToCloud({ products: s.products, supermarkets: s.supermarkets, user: s.user, config: s.config, readNotificationIds: s.readNotificationIds });
        setLastPushedAt(Date.now());
        setIsUnsynced(false);
      }
    });
  }, []); // Only run once on mount

  // Pull periodico ogni 30 secondi — aggiorna se cloud è più recente e non ci sono modifiche locali
  React.useEffect(() => {
    const interval = setInterval(async () => {
      const current = useStore.getState();
      if (current.isUnsynced) return; // non sovrascrivere modifiche locali non salvate
      const cloud = await syncModule.pullFromCloud();
      if (!cloud?.state) return;
      if (!(cloud.state.products?.length > 0 || cloud.state.supermarkets?.length > 0)) return;
      const cloudTime = cloud.lastUpdated || 0;
      if (cloudTime > current.lastPushedAt) {
        replaceState(cloud.state);
        setIsUnsynced(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Backup automatico ogni 4 ore
  React.useEffect(() => {
    const AUTO_BACKUP_INTERVAL = 4 * 60 * 60 * 1000; // 4 ore in ms
    const AUTO_BACKUP_KEY = 'spesa-last-auto-backup';

    const runAutoBackup = async () => {
      const s = useStore.getState();
      await syncModule.createManualBackup({
        products: s.products,
        supermarkets: s.supermarkets,
        user: s.user,
        config: s.config,
        readNotificationIds: s.readNotificationIds,
      });
      localStorage.setItem(AUTO_BACKUP_KEY, Date.now().toString());
    };

    // Controlla se è già passato abbastanza tempo dall'ultimo backup automatico
    const lastBackup = parseInt(localStorage.getItem(AUTO_BACKUP_KEY) || '0', 10);
    const now = Date.now();
    const timeUntilNext = Math.max(0, AUTO_BACKUP_INTERVAL - (now - lastBackup));

    // Esegui al momento giusto, poi ogni 4 ore
    const timeout = setTimeout(() => {
      runAutoBackup();
      const interval = setInterval(runAutoBackup, AUTO_BACKUP_INTERVAL);
      return () => clearInterval(interval);
    }, timeUntilNext);

    return () => clearTimeout(timeout);
  }, []);

  const [isAddModalOpen, React_useState] = React.useState(false);

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Router basename="/">
      <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24">
        <Header />
        <main className="max-w-md mx-auto px-4 pt-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/stores" element={<SupermarketList />} />
            <Route path="/stores/:id" element={<SupermarketDetail />} />
            <Route path="/household" element={<HouseholdInventory />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/shopping-list" element={<ShoppingSummary />} />
            <Route path="/pantry" element={<Pantry />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/data-management" element={<DataManagement />} />
            <Route path="/scan/:storeId" element={<BarcodeScanner />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <BottomNav onAddClick={() => React_useState(true)} />
        <AddProductModal isOpen={isAddModalOpen} onClose={() => React_useState(false)} />
        <Toast />
      </div>
    </Router>
  );
}

export default App;
