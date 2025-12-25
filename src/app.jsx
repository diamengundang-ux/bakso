import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, ShoppingCart, Package, Users, Tag, Settings, LogOut, Plus, 
  Trash2, Printer, ChevronRight, CheckCircle2, X, Search, Store, Lock, 
  ShieldCheck, Ticket, Edit, Menu, ChevronLeft, CreditCard, Wallet
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, addDoc, updateDoc, deleteDoc
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

// --- KONFIGURASI FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDjSgP-fmwIfe3yEJ2Kz9MjmWmqPd1DIYE",
  authDomain: "bakso-cak-roso.firebaseapp.com",
  projectId: "bakso-cak-roso",
  storageBucket: "bakso-cak-roso.firebasestorage.app",
  messagingSenderId: "931666979826",
  appId: "1:931666979826:web:d92597bb012b1f505e196b",
  measurementId: "G-W73TPXCD8H"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

// --- DATABASE PATHS ---
const APP_ROOT = "pos_bakso_v1";
const getColl = (name) => collection(db, APP_ROOT, 'data', name);
const getSettingDoc = () => doc(db, APP_ROOT, 'settings', 'config', 'admin_pin');
const CATEGORIES = ['Semua', 'Bakso', 'Mie', 'Minuman', 'Tambahan'];

// --- UTILS ---
const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

const App = () => {
  // Auth & User State
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  
  // UI State
  const [view, setView] = useState('pos');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Desktop Toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Mobile Toggle
  const [showMobileCart, setShowMobileCart] = useState(false); // Mobile Cart Toggle
  
  // Data State
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [promos, setPromos] = useState([]);
  const [staff, setStaff] = useState([]);
  const [adminConfig, setAdminConfig] = useState({ pin: "1234" });

  // Transaction State
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [promoCodeInput, setPromoCodeInput] = useState("");

  // Modals State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false); 
  const [showAddPromoModal, setShowAddPromoModal] = useState(false); 
  const [showStaffModal, setShowStaffModal] = useState(false); 
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  // --- EFFECTS ---
  useEffect(() => {
    const initAuth = async () => { try { await signInAnonymously(auth); } catch (err) { console.error(err); } };
    initAuth();
    return onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        const session = JSON.parse(localStorage.getItem('bakso_session'));
        if (session) { setRole(session.role); setCurrentUserData(session.user); setIsAuthenticated(true); }
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubProducts = onSnapshot(getColl('products'), (snap) => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubSales = onSnapshot(getColl('sales'), (snap) => setSales(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubPromos = onSnapshot(getColl('promos'), (snap) => setPromos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubStaff = onSnapshot(getColl('staff'), (snap) => setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubConfig = onSnapshot(getSettingDoc(), (snap) => { if (snap.exists()) setAdminConfig(snap.data()); else setDoc(getSettingDoc(), { pin: "1234" }); });
    return () => { unsubProducts(); unsubSales(); unsubPromos(); unsubStaff(); unsubConfig(); };
  }, [user]);

  // --- LOGIC ---
  const handleLogin = (type, data = null, pin = "") => {
    const targetPin = type === 'admin' ? adminConfig.pin : data.pin;
    if (pin === targetPin) {
      const userData = type === 'admin' ? { name: 'Admin Bakso' } : data;
      const session = { role: type, user: userData };
      setRole(type); setCurrentUserData(userData); setIsAuthenticated(true);
      localStorage.setItem('bakso_session', JSON.stringify(session));
      setView(type === 'admin' ? 'dashboard' : 'pos');
    } else { alert("PIN Salah!"); }
  };

  const handleLogout = () => {
    setIsAuthenticated(false); setRole(null); setCurrentUserData(null);
    localStorage.removeItem('bakso_session');
  };

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const filteredProducts = useMemo(() => products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) && (selectedCategory === 'Semua' || p.category === selectedCategory)), [products, searchTerm, selectedCategory]);
  const cartSubtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const discountAmount = selectedPromo ? (selectedPromo.type === 'percentage' ? (cartSubtotal * selectedPromo.value / 100) : selectedPromo.value) : 0;
  const cartTotal = Math.max(0, cartSubtotal - discountAmount);

  const addToCart = (product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      return existing ? prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleCheckout = async (paymentMethod) => {
    if (!user) return;
    const saleData = { items: cart, subtotal: cartSubtotal, discount: discountAmount, total: cartTotal, paymentMethod, timestamp: Date.now(), staffName: currentUserData?.name || 'Kasir', promoCode: selectedPromo?.code || null };
    await addDoc(getColl('sales'), saleData);
    for (const item of cart) {
      const p = products.find(prod => prod.id === item.id);
      if (p) await updateDoc(doc(db, APP_ROOT, 'data', 'products', item.id), { stock: p.stock - item.quantity });
    }
    setReceiptData(saleData); setCart([]); setSelectedPromo(null); setShowCheckoutModal(false); setShowMobileCart(false);
  };

  // --- RENDER ---
  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900"><div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!isAuthenticated) return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-[32px] p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-red-600 rounded-2xl shadow-lg mb-4 text-white"><Store size={32} /></div>
          <h1 className="text-3xl font-black text-slate-800">BaksoKu POS</h1>
          <p className="text-slate-500 text-sm">Masuk untuk memulai</p>
        </div>
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
          <button onClick={() => { const p = prompt("PIN Admin:"); if(p) handleLogin('admin', null, p); }} className="w-full p-4 rounded-xl border-2 border-slate-100 hover:border-red-600 flex items-center gap-4 group transition-all text-left">
            <div className="bg-red-50 p-2 rounded-lg text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors"><Lock size={20}/></div>
            <div><p className="font-bold text-slate-800">Admin Owner</p><p className="text-xs text-slate-400">Akses Penuh</p></div>
          </button>
          <div className="border-t my-2"></div>
          {staff.map(s => (
            <button key={s.id} onClick={() => { const p = prompt(`PIN ${s.name}:`); if(p) handleLogin('staff', s, p); }} className="w-full p-3 rounded-xl hover:bg-slate-50 flex items-center gap-3 text-left">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600 text-xs">{s.name[0]}</div>
              <div><p className="font-bold text-sm text-slate-800">{s.name}</p><p className="text-[10px] text-slate-500 uppercase">{s.position}</p></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      
      {/* --- MOBILE SIDEBAR (HAMBURGER) --- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-300" onClick={() => setMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar Drawer */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        ${sidebarOpen ? 'md:w-64' : 'md:w-20'}
      `}>
        <div className="p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg"><Store size={20} /></div>
            {(sidebarOpen || mobileMenuOpen) && <h1 className="font-bold text-lg">BaksoKu</h1>}
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white"><X size={24}/></button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <button onClick={() => { setView('pos'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'pos' ? 'bg-red-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}><ShoppingCart size={20} /> {(sidebarOpen || mobileMenuOpen) && <span>Kasir</span>}</button>
          {role === 'admin' && (
            <>
              <button onClick={() => { setView('dashboard'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-red-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}><LayoutDashboard size={20} /> {(sidebarOpen || mobileMenuOpen) && <span>Dashboard</span>}</button>
              <button onClick={() => { setView('inventory'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'inventory' ? 'bg-red-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}><Package size={20} /> {(sidebarOpen || mobileMenuOpen) && <span>Stok Menu</span>}</button>
              <button onClick={() => { setView('promos'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'promos' ? 'bg-red-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}><Tag size={20} /> {(sidebarOpen || mobileMenuOpen) && <span>Promo</span>}</button>
              <button onClick={() => { setView('staff'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'staff' ? 'bg-red-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}><Users size={20} /> {(sidebarOpen || mobileMenuOpen) && <span>Karyawan</span>}</button>
              <button onClick={() => { setShowSettingsModal(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 text-slate-400 mt-4"><Settings size={20} /> {(sidebarOpen || mobileMenuOpen) && <span>PIN Admin</span>}</button>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-slate-800"><button onClick={handleLogout} className="w-full flex items-center gap-3 p-2 hover:text-red-400 transition-colors"><LogOut size={20}/> {(sidebarOpen || mobileMenuOpen) && <span>Keluar</span>}</button></div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col relative overflow-hidden h-full w-full">
        {/* HEADER */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-6 shrink-0 z-10 relative">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600 md:hidden hover:bg-slate-100 rounded-lg">
              <Menu size={24} />
            </button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden md:block p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
              <LayoutDashboard size={20} />
            </button>
            <h2 className="font-bold text-lg md:hidden">BaksoKu</h2>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight hidden sm:block"><p className="text-xs font-black uppercase">{currentUserData?.name}</p><p className="text-[9px] text-slate-400 font-bold uppercase">{role}</p></div>
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 font-black border border-red-100">{currentUserData?.name?.[0]}</div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-50/50 pb-20 md:pb-0 relative">
          {view === 'pos' && (
            <div className="flex h-full flex-col md:flex-row">
              {/* PRODUCT AREA */}
              <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 overflow-hidden">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide shrink-0">
                  {CATEGORIES.map(cat => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 md:px-5 md:py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-red-600 text-white shadow-md' : 'bg-white border text-slate-500 hover:border-red-200'}`}>{cat}</button>))}
                </div>
                
                <div className="flex-1 overflow-y-auto pr-1 pb-20 md:pb-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {filteredProducts.map(p => (
                      <button key={p.id} disabled={p.stock <= 0} onClick={() => addToCart(p)} className="bg-white p-2.5 md:p-3 rounded-2xl border border-slate-100 hover:border-red-500 hover:shadow-md transition-all text-left flex flex-col group disabled:opacity-50 relative overflow-hidden active:scale-95">
                        <div className="relative mb-2 rounded-xl overflow-hidden h-24 md:h-28 w-full bg-slate-100">
                          <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                          {p.stock <= 5 && p.stock > 0 && <div className="absolute top-1 right-1 bg-orange-500 text-white text-[8px] px-1.5 py-0.5 rounded-md font-bold shadow-sm">Sisa {p.stock}</div>}
                          {p.stock <= 0 && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold uppercase text-xs">Habis</div>}
                        </div>
                        <div className="flex-1 flex flex-col">
                          <h5 className="font-bold text-xs text-slate-800 line-clamp-2 leading-tight mb-1 group-hover:text-red-600">{p.name}</h5>
                          <div className="mt-auto flex justify-between items-end">
                            <p className="text-red-600 font-black text-xs">{formatCurrency(p.price)}</p>
                            <div className="bg-slate-50 p-1.5 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors"><Plus size={12} /></div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* DESKTOP CART */}
              <div className="hidden md:flex w-[340px] bg-white border-l shadow-xl flex-col z-10">
                <div className="p-5 border-b flex justify-between items-center"><h3 className="text-lg font-black">Pesanan</h3><button onClick={() => setCart([])} className="text-slate-300 hover:text-red-500"><Trash2 size={18}/></button></div>
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2"><ShoppingCart size={40} /><p className="text-[10px] uppercase font-bold tracking-widest">Kosong</p></div> : 
                    cart.map(item => (
                      <div key={item.id} className="flex gap-3 items-center group">
                        <img src={item.imageUrl} className="w-10 h-10 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <h6 className="font-bold text-xs truncate">{item.name}</h6>
                          <p className="text-[10px] text-red-600 font-bold">{formatCurrency(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))} className="w-6 h-6 border rounded flex items-center justify-center hover:bg-slate-50">-</button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: Math.min(item.stock, i.quantity + 1)} : i))} className="w-6 h-6 border rounded flex items-center justify-center hover:bg-slate-50">+</button>
                        </div>
                      </div>
                    ))
                  }
                </div>
                <div className="p-5 bg-slate-50 border-t space-y-3">
                  <div className="flex justify-between font-bold text-sm"><span>Total</span><span className="text-red-600 text-xl">{formatCurrency(cartTotal)}</span></div>
                  <button onClick={() => setShowPromoModal(true)} className="w-full py-2.5 border-2 border-dashed border-red-200 text-red-600 rounded-xl text-xs font-bold">{selectedPromo ? selectedPromo.code : 'Pakai Promo'}</button>
                  <button disabled={cart.length === 0} onClick={() => setShowCheckoutModal(true)} className="w-full py-3.5 bg-red-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 text-sm hover:bg-red-700 disabled:opacity-50">Bayar <ChevronRight size={16}/></button>
                </div>
              </div>

              {/* MOBILE CART BAR */}
              {cart.length > 0 && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-30 animate-in slide-in-from-bottom duration-300">
                  <div className="flex gap-3 items-center">
                    <div className="flex-1 cursor-pointer" onClick={() => setShowMobileCart(true)}>
                      <p className="text-xs text-slate-500 font-bold">{cart.reduce((a,c)=>a+c.quantity,0)} Item</p>
                      <p className="text-lg font-black text-red-600">{formatCurrency(cartTotal)}</p>
                    </div>
                    <button onClick={() => setShowMobileCart(true)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-black transition-colors"><ShoppingCart size={18}/> Detail</button>
                  </div>
                </div>
              )}

              {showMobileCart && (
                <div className="fixed inset-0 bg-white z-50 flex flex-col md:hidden animate-in slide-in-from-bottom duration-300">
                  <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <button onClick={() => setShowMobileCart(false)} className="p-2 bg-white rounded-full shadow-sm"><ChevronLeft size={24}/></button>
                    <h3 className="font-bold text-lg">Keranjang ({cart.reduce((a,c)=>a+c.quantity,0)})</h3>
                    <button onClick={() => setCart([])} className="text-red-500 font-bold text-xs">Hapus</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.map(item => (
                      <div key={item.id} className="flex gap-4 p-2 border rounded-xl">
                        <img src={item.imageUrl} className="w-20 h-20 rounded-lg object-cover" />
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h6 className="font-bold text-sm line-clamp-2">{item.name}</h6>
                            <p className="text-red-600 font-bold text-sm">{formatCurrency(item.price)}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold">-</button>
                            <span className="font-bold">{item.quantity}</span>
                            <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: Math.min(item.stock, i.quantity + 1)} : i))} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold">+</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t space-y-3 bg-white pb-8">
                    <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-red-600">{formatCurrency(cartTotal)}</span></div>
                    <button onClick={() => setShowPromoModal(true)} className="w-full py-3 border-2 border-dashed border-red-200 text-red-600 rounded-xl font-bold text-sm">{selectedPromo ? selectedPromo.code : 'Pakai Promo'}</button>
                    <button onClick={() => { setShowMobileCart(false); setShowCheckoutModal(true); }} className="w-full py-4 bg-red-600 text-white rounded-xl font-black text-lg shadow-lg">Bayar Sekarang</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'dashboard' && (
            <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in">
              <div><h2 className="text-2xl font-bold">Dashboard</h2><p className="text-slate-500 text-sm">Ringkasan performa</p></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white p-5 rounded-2xl border shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase">Pendapatan</p><h3 className="text-2xl font-black mt-1">{formatCurrency(sales.reduce((a,s)=>a+s.total,0))}</h3></div>
                <div className="bg-white p-5 rounded-2xl border shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase">Transaksi</p><h3 className="text-2xl font-black mt-1">{sales.length}</h3></div>
                <div className="bg-white p-5 rounded-2xl border shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase">Menu Aktif</p><h3 className="text-2xl font-black mt-1">{products.length}</h3></div>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-3xl border shadow-sm h-64 md:h-80">
                <h4 className="font-bold mb-4 text-sm md:text-base">Grafik Penjualan</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={Object.entries(sales.reduce((acc, s) => { const d = new Date(s.timestamp).toLocaleDateString(); acc[d] = (acc[d]||0) + s.total; return acc; }, {})).map(([date, total]) => ({ date, total }))}>
                    <defs><linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <Tooltip contentStyle={{borderRadius: '12px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} formatter={(v)=>formatCurrency(v)}/>
                    <Area type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {view === 'inventory' && (
            <div className="p-4 md:p-8 space-y-6">
              <div className="flex justify-between items-center"><div><h2 className="text-xl md:text-2xl font-bold">Stok & Menu</h2></div><button onClick={() => { setEditingItem(null); setShowProductModal(true); }} className="bg-red-600 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"><Plus size={18} /> Tambah</button></div>
              <div className="bg-white rounded-[24px] border shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead className="bg-slate-50 text-slate-400 font-black uppercase border-b"><tr><th className="p-4">Menu</th><th className="p-4">Kategori</th><th className="p-4">Harga</th><th className="p-4">Stok</th><th className="p-4 text-right">Aksi</th></tr></thead>
                  <tbody className="divide-y">{products.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-4 font-bold flex items-center gap-3"><img src={p.imageUrl} className="w-8 h-8 rounded-lg object-cover" />{p.name}</td>
                      <td className="p-4 uppercase text-[9px] font-bold text-slate-500">{p.category}</td>
                      <td className="p-4 font-bold text-red-600">{formatCurrency(p.price)}</td>
                      <td className="p-4 font-mono">{p.stock}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setEditingItem(p); setShowProductModal(true); }} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit size={16}/></button>
                          <button onClick={async () => { if(confirm('Hapus?')) await deleteDoc(doc(db, APP_ROOT, 'data', 'products', p.id)) }} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
          
          {view === 'staff' && (<div className="p-4 md:p-8"><div className="flex justify-between mb-6"><div><h2 className="text-2xl font-bold">Karyawan</h2></div><button onClick={() => setShowStaffModal(true)} className="bg-red-600 text-white px-5 py-2 rounded-xl font-bold text-sm">Tambah</button></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{staff.map(s => (<div key={s.id} className="bg-white p-5 rounded-2xl border flex items-center justify-between shadow-sm"><div><h4 className="font-bold text-sm">{s.name}</h4><p className="text-[10px] text-slate-400 uppercase">{s.position}</p></div><button onClick={() => deleteDoc(doc(db, APP_ROOT, 'data', 'staff', s.id))} className="text-red-400"><Trash2 size={16}/></button></div>))}</div></div>)}
          
          {view === 'promos' && (
            <div className="p-4 md:p-8"><div className="flex justify-between mb-6"><div><h2 className="text-2xl font-bold">Promo</h2></div><button onClick={() => setShowAddPromoModal(true)} className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-sm">Tambah</button></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{promos.map(p => (<div key={p.id} className="bg-white p-5 rounded-2xl border flex items-center justify-between shadow-sm"><div><h4 className="font-bold text-sm">{p.code}</h4><p className="text-[10px] text-slate-400">{p.type === 'percentage' ? `${p.value}% Off` : `-${formatCurrency(p.value)}`}</p></div><button onClick={() => deleteDoc(doc(db, APP_ROOT, 'data', 'promos', p.id))} className="text-red-400"><Trash2 size={16}/></button></div>))}</div></div>
          )}
        </div>

        {/* --- MODALS (INLINE) --- */}
        {showProductModal && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] w-full max-w-sm p-6 animate-in zoom-in-95">
              <h3 className="text-lg font-bold mb-4">{editingItem ? 'Edit Menu' : 'Menu Baru'}</h3>
              <form onSubmit={async (e) => {
                e.preventDefault(); const fd = new FormData(e.target);
                const data = { name: fd.get('name'), price: Number(fd.get('price')), stock: Number(fd.get('stock')), category: fd.get('category'), imageUrl: editingItem?.imageUrl || `https://ui-avatars.com/api/?name=${fd.get('name')}&background=random` };
                if (editingItem) await updateDoc(doc(db, APP_ROOT, 'data', 'products', editingItem.id), data);
                else await addDoc(getColl('products'), data);
                setShowProductModal(false);
              }} className="space-y-3">
                <input name="name" defaultValue={editingItem?.name} required placeholder="Nama Menu" className="w-full p-3 bg-slate-50 border rounded-xl text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input name="price" defaultValue={editingItem?.price} type="number" required placeholder="Harga" className="w-full p-3 bg-slate-50 border rounded-xl text-sm" />
                  <input name="stock" defaultValue={editingItem?.stock} type="number" required placeholder="Stok" className="w-full p-3 bg-slate-50 border rounded-xl text-sm" />
                </div>
                <select name="category" defaultValue={editingItem?.category} className="w-full p-3 bg-slate-50 border rounded-xl text-sm">{CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}</select>
                <button type="submit" className="w-full py-3 bg-red-600 text-white rounded-xl font-bold text-sm">{editingItem ? 'Simpan' : 'Tambah'}</button>
                <button type="button" onClick={() => setShowProductModal(false)} className="w-full py-3 text-slate-400 font-bold text-xs">Batal</button>
              </form>
            </div>
          </div>
        )}

        {showCheckoutModal && <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-[32px] w-full max-w-xs p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95"><h3 className="text-xl font-black">Total: {formatCurrency(cartTotal)}</h3><div className="grid grid-cols-1 gap-2"><button onClick={() => handleCheckout('Tunai')} className="p-4 rounded-xl border-2 hover:border-red-600 font-bold text-sm flex items-center justify-center gap-2"><CreditCard size={18}/> TUNAI</button><button onClick={() => handleCheckout('QRIS')} className="p-4 rounded-xl border-2 hover:border-blue-600 font-bold text-sm flex items-center justify-center gap-2"><Wallet size={18}/> QRIS</button></div><button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 font-bold text-xs">BATAL</button></div></div>}
        
        {receiptData && (
          <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] w-full max-w-xs overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95">
              <div className="flex-1 p-6 text-center space-y-3 font-mono text-xs overflow-y-auto max-h-[60vh]">
                <div className="flex justify-center"><CheckCircle2 size={24} className="text-green-600" /></div>
                <h4 className="text-base font-black">BAKSO CAK ROSO</h4>
                <hr className="border-dashed" />
                <div className="space-y-1 text-left">
                  <div className="flex justify-between"><span>TGL</span><span>{new Date(receiptData.timestamp).toLocaleDateString()}</span></div>
                  <div className="flex justify-between"><span>JAM</span><span>{new Date(receiptData.timestamp).toLocaleTimeString()}</span></div>
                </div>
                <hr className="border-dashed" />
                <div className="space-y-1 text-left">
                  {receiptData.items.map(i => (<div key={i.id} className="flex justify-between"><span>{i.name} x{i.quantity}</span><span>{formatCurrency(i.price * i.quantity)}</span></div>))}
                </div>
                <hr className="border-dashed" />
                <div className="flex justify-between font-bold text-sm"><span>TOTAL</span><span>{formatCurrency(receiptData.total)}</span></div>
              </div>
              <div className="p-4 bg-slate-50 border-t flex gap-2"><button onClick={() => window.print()} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs">CETAK</button><button onClick={() => setReceiptData(null)} className="flex-1 py-3 border border-red-200 text-red-600 rounded-xl font-bold text-xs">TUTUP</button></div>
            </div>
          </div>
        )}

        {showStaffModal && <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-[32px] w-full max-w-sm p-6"><h3 className="text-lg font-bold mb-4">Tambah Staff</h3><form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.target); await addDoc(getColl('staff'), { name: fd.get('name'), position: fd.get('pos'), pin: fd.get('pin'), joinedAt: Date.now() }); setShowStaffModal(false); }} className="space-y-3"><input name="name" required placeholder="Nama" className="w-full p-3 bg-slate-50 border rounded-xl text-sm" /><input name="pos" required placeholder="Jabatan" className="w-full p-3 bg-slate-50 border rounded-xl text-sm" /><input name="pin" maxLength="4" required placeholder="PIN" className="w-full p-3 bg-slate-50 border rounded-xl text-sm text-center" /><button type="submit" className="w-full py-3 bg-red-600 text-white rounded-xl font-bold text-sm">Simpan</button></form></div></div>}
        {showAddPromoModal && <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-[32px] w-full max-w-sm p-6"><h3 className="text-lg font-bold mb-4">Buat Promo</h3><form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.target); await addDoc(getColl('promos'), { code: fd.get('code').toUpperCase(), value: Number(fd.get('value')), type: fd.get('type'), createdAt: Date.now() }); setShowAddPromoModal(false); }} className="space-y-3"><input name="code" required placeholder="KODE" className="w-full p-3 bg-slate-50 border rounded-xl text-sm" /><div className="grid grid-cols-2 gap-3"><select name="type" className="p-3 bg-slate-50 border rounded-xl text-sm"><option value="percentage">%</option><option value="fixed">Rp</option></select><input name="value" type="number" required placeholder="Nilai" className="p-3 bg-slate-50 border rounded-xl text-sm" /></div><button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm">Simpan</button></form></div></div>}
        {showPromoModal && <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-[32px] w-full max-w-sm p-6"><h3 className="text-lg font-bold mb-4">Pilih Promo</h3><div className="flex gap-2 mb-4"><input value={promoCodeInput} onChange={(e) => setPromoCodeInput(e.target.value)} placeholder="KODE MANUAL" className="flex-1 p-2 border rounded-lg text-sm uppercase" /><button onClick={() => { const f = promos.find(p => p.code === promoCodeInput.toUpperCase()); if(f) { setSelectedPromo(f); setShowPromoModal(false); } else alert("Tidak ditemukan"); }} className="px-4 bg-red-600 text-white rounded-lg text-xs font-bold">CEK</button></div><div className="space-y-2 max-h-[200px] overflow-y-auto">{promos.map(p => (<button key={p.id} onClick={() => { setSelectedPromo(p); setShowPromoModal(false); }} className="w-full p-3 border rounded-xl flex justify-between text-xs"><span>{p.code}</span><span className="font-bold text-red-600">{p.type==='percentage'?`${p.value}%`:formatCurrency(p.value)}</span></button>))}</div><button onClick={()=>setShowPromoModal(false)} className="w-full mt-4 py-2 text-slate-400 text-xs">Tutup</button></div></div>}
        {showSettingsModal && <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-[32px] w-full max-w-sm p-6"><h3 className="text-lg font-bold mb-4">Ubah PIN Admin</h3><form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.target); if(fd.get('old') !== adminConfig.pin) return alert('PIN Lama Salah'); await updateDoc(getSettingDoc(), { pin: fd.get('new') }); alert('Berhasil'); setShowSettingsModal(false); }} className="space-y-3"><input name="old" type="password" placeholder="PIN Lama" className="w-full p-3 bg-slate-50 border rounded-xl text-sm" /><input name="new" type="password" placeholder="PIN Baru" className="w-full p-3 bg-slate-50 border rounded-xl text-sm" /><button type="submit" className="w-full py-3 bg-red-600 text-white rounded-xl font-bold text-sm">Update</button><button type="button" onClick={() => setShowSettingsModal(false)} className="w-full py-3 text-slate-400 font-bold text-xs">Batal</button></form></div></div>}
      </div>
    </div>
  );
};

export default App;
