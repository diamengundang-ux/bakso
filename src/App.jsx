import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, ShoppingCart, Package, Users, Tag, Settings, LogOut, Plus, 
  Trash2, Printer, ChevronRight, CheckCircle2, X, Search, Store, Lock, 
  ShieldCheck, Ticket, Edit, Menu, ChevronLeft, CreditCard, Wallet,
  ArrowUpRight, DollarSign, ShoppingBag, Minus, UtensilsCrossed
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, addDoc, updateDoc, deleteDoc
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-orange-50 p-6 text-center font-sans">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-orange-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <X size={32} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Terjadi Kesalahan</h1>
            <p className="text-gray-500 mb-6 text-sm">Aplikasi mengalami kendala teknis.</p>
            <button onClick={() => window.location.reload()} className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg">Muat Ulang Aplikasi</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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

// Inisialisasi Firebase
let app, db, auth;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) {
  console.error("Firebase Init Error:", e);
}
const analytics = typeof window !== "undefined" && app ? getAnalytics(app) : null;

// --- DATABASE & UTILS ---
const APP_ROOT = "pos_bakso_v1";
const getColl = (name) => collection(db, APP_ROOT, 'data', name);
const getSettingDoc = () => doc(db, APP_ROOT, 'settings', 'config', 'admin_pin');
const CATEGORIES = ['Semua', 'Bakso', 'Mie', 'Minuman', 'Tambahan'];

const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const COLORS = {
  green: { bg: 'bg-emerald-50', text: 'text-emerald-600', trendBg: 'bg-emerald-100' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', trendBg: 'bg-blue-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', trendBg: 'bg-orange-100' },
  purple: { bg: 'bg-violet-50', text: 'text-violet-600', trendBg: 'bg-violet-100' },
};

// --- COMPONENTS ---
const StatCard = ({ title, value, icon, color, trend }) => {
  const theme = COLORS[color] || COLORS.blue;
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500 ${theme.bg}`}></div>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-2xl ${theme.bg} ${theme.text}`}>{icon}</div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${theme.trendBg}`}><ArrowUpRight size={12} className={theme.text}/><span className={`text-[10px] font-bold ${theme.text}`}>{trend}</span></div>
        </div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
      </div>
    </div>
  );
};

const NavButton = ({ icon, label, active, onClick, expanded }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 group ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-slate-50 text-slate-500 hover:text-blue-600'}`}>
    <div className={`${active ? 'text-white' : 'group-hover:scale-110 transition-transform'}`}>{icon}</div>
    {expanded && <span className="font-bold text-sm animate-in fade-in slide-in-from-left-2 duration-200">{label}</span>}
  </button>
);

const App = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  
  const [view, setView] = useState('pos');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [promos, setPromos] = useState([]);
  const [staff, setStaff] = useState([]);
  const [adminConfig, setAdminConfig] = useState({ pin: "1234" });

  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [promoCodeInput, setPromoCodeInput] = useState("");

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false); 
  const [showAddPromoModal, setShowAddPromoModal] = useState(false); 
  const [showStaffModal, setShowStaffModal] = useState(false); 
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    const initAuth = async () => { try { await signInAnonymously(auth); } catch (err) { console.error("Auth Error:", err); } };
    initAuth();
    return onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        try {
          const session = JSON.parse(localStorage.getItem('bakso_session'));
          if (session) { setRole(session.role); setCurrentUserData(session.user); setIsAuthenticated(true); }
        } catch (e) { localStorage.removeItem('bakso_session'); }
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

  const handleLogin = (type, data = null, pin = "") => {
    const targetPin = type === 'admin' ? adminConfig.pin : data.pin;
    if (pin === targetPin) {
      const userData = type === 'admin' ? { name: 'Admin Owner' } : data;
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

  const filteredProducts = useMemo(() => products.filter(p => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) && (selectedCategory === 'Semua' || p.category === selectedCategory)), [products, searchTerm, selectedCategory]);
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

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-orange-50"><div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!isAuthenticated) return (
    <div className="min-h-screen w-full bg-orange-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-[2rem] p-10 shadow-xl border border-orange-100">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-orange-100 rounded-2xl mb-4 text-orange-600"><UtensilsCrossed size={40} /></div>
          <h1 className="text-3xl font-black text-gray-800">BaksoKu Login</h1>
          <p className="text-gray-500 text-sm mt-2">Masuk untuk memulai penjualan</p>
        </div>
        <div className="space-y-4">
          <button onClick={() => { const p = prompt("PIN Admin:"); if(p) handleLogin('admin', null, p); }} className="w-full p-5 rounded-2xl border-2 border-gray-100 hover:border-orange-500 hover:bg-orange-50 flex items-center gap-4 transition-all group text-left">
            <div className="bg-orange-100 p-3 rounded-xl text-orange-600 group-hover:text-white group-hover:bg-orange-600 transition-colors"><Lock size={20}/></div>
            <div><p className="font-bold text-gray-800">Owner / Admin</p><p className="text-xs text-gray-500">Akses Penuh</p></div>
          </button>
          
          <div className="py-2 flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest"><div className="h-px bg-gray-200 flex-1"></div>Kasir<div className="h-px bg-gray-200 flex-1"></div></div>
          
          <div className="grid grid-cols-1 gap-3 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
            {staff.map(s => (
              <button key={s.id} onClick={() => { const p = prompt(`PIN ${s.name}:`); if(p) handleLogin('staff', s, p); }} className="w-full p-4 rounded-2xl bg-white border border-gray-100 hover:border-orange-300 hover:shadow-md flex items-center gap-4 text-left transition-all group">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500 text-sm group-hover:bg-orange-100 group-hover:text-orange-600">{s.name[0]}</div>
                <div><p className="font-bold text-sm text-gray-800">{s.name}</p><p className="text-[10px] text-gray-400 font-bold uppercase">{s.position}</p></div>
                <ChevronRight size={16} className="ml-auto text-gray-300 group-hover:text-orange-500"/>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-gray-50 font-sans text-gray-900 overflow-hidden relative">
      
      {/* MOBILE OVERLAY */}
      {mobileMenuOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setMobileMenuOpen(false)}></div>}

      {/* SIDEBAR NAVIGATION */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out shadow-2xl md:shadow-none
        md:relative md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'}
        ${sidebarOpen ? 'md:w-64' : 'md:w-20'}
      `}>
        <div className="h-24 flex items-center justify-center border-b border-dashed border-gray-200 px-6">
          <div className="flex items-center gap-3 w-full justify-center md:justify-start">
            <div className="bg-orange-600 p-2.5 rounded-xl text-white shadow-lg shadow-orange-200"><UtensilsCrossed size={24} /></div>
            {(sidebarOpen || mobileMenuOpen) && <div><h1 className="font-black text-xl text-gray-800 leading-none">BaksoKu</h1><p className="text-[10px] text-gray-400 font-bold tracking-wider">POS SYSTEM</p></div>}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <NavButton icon={<ShoppingCart size={20}/>} label="Kasir" active={view === 'pos'} onClick={()=>{setView('pos'); setMobileMenuOpen(false)}} expanded={sidebarOpen || mobileMenuOpen}/>
          {role === 'admin' && (
            <>
              <div className="my-4 border-t border-gray-100 mx-2"></div>
              <p className={`text-[10px] font-bold text-gray-400 px-4 mb-2 uppercase tracking-widest ${(sidebarOpen || mobileMenuOpen) ? 'block' : 'hidden'}`}>Admin</p>
              <NavButton icon={<LayoutDashboard size={20}/>} label="Laporan" active={view === 'dashboard'} onClick={()=>{setView('dashboard'); setMobileMenuOpen(false)}} expanded={sidebarOpen || mobileMenuOpen}/>
              <NavButton icon={<Package size={20}/>} label="Stok Menu" active={view === 'inventory'} onClick={()=>{setView('inventory'); setMobileMenuOpen(false)}} expanded={sidebarOpen || mobileMenuOpen}/>
              <NavButton icon={<Tag size={20}/>} label="Promo" active={view === 'promos'} onClick={()=>{setView('promos'); setMobileMenuOpen(false)}} expanded={sidebarOpen || mobileMenuOpen}/>
              <NavButton icon={<Users size={20}/>} label="Staff" active={view === 'staff'} onClick={()=>{setView('staff'); setMobileMenuOpen(false)}} expanded={sidebarOpen || mobileMenuOpen}/>
              <NavButton icon={<Settings size={20}/>} label="Settings" active={false} onClick={()=>{setShowSettingsModal(true); setMobileMenuOpen(false)}} expanded={sidebarOpen || mobileMenuOpen}/>
            </>
          )}
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <button onClick={handleLogout} className={`w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-red-50 text-gray-500 hover:text-red-600 transition-all ${!sidebarOpen && !mobileMenuOpen && 'justify-center'}`}>
            <LogOut size={20}/> {(sidebarOpen || mobileMenuOpen) && <span className="font-bold text-sm">Keluar</span>}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col relative overflow-hidden h-full w-full bg-gray-50">
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-6 md:px-8 shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2.5 -ml-3 text-gray-500 md:hidden hover:bg-gray-100 rounded-xl"><Menu size={24} /></button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden md:block p-2 text-gray-400 hover:bg-gray-100 rounded-xl hover:text-gray-800 transition-all"><ChevronRight size={20} className={`transform ${sidebarOpen ? 'rotate-180' : ''}`} /></button>
            <h2 className="font-bold text-xl text-gray-800 capitalize tracking-tight hidden sm:block">{view === 'pos' ? 'Menu Pemesanan' : view}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right leading-tight hidden sm:block">
              <p className="text-sm font-bold text-gray-900">{currentUserData?.name}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">{role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold border-2 border-white shadow-md">{currentUserData?.name?.[0]}</div>
          </div>
        </header>

        <div className="flex-1 overflow-auto pb-24 md:pb-0 relative custom-scrollbar">
          {view === 'pos' && (
            <div className="flex h-full flex-col md:flex-row">
              {/* Product Grid (Middle) */}
              <div className="flex-1 flex flex-col p-4 md:p-8 gap-6 overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                    <input type="text" placeholder="Cari menu..." className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 w-full sm:w-auto scrollbar-hide">
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-gray-900 text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{cat}</button>
                    ))}
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-1 pb-20 md:pb-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {filteredProducts.map(p => (
                      <button key={p.id} disabled={(p.stock || 0) <= 0} onClick={() => addToCart(p)} className="bg-white p-3 rounded-[20px] border border-gray-100 hover:border-orange-500 hover:shadow-lg transition-all text-left flex flex-col group disabled:opacity-60 relative overflow-hidden h-full">
                        <div className="relative mb-3 rounded-xl overflow-hidden h-32 w-full bg-gray-100">
                          {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={32}/></div>}
                          {(p.stock || 0) <= 5 && (p.stock || 0) > 0 && <div className="absolute top-2 right-2 bg-orange-500 text-white text-[9px] px-2 py-1 rounded-lg font-bold shadow-sm backdrop-blur-md bg-opacity-90">Sisa {p.stock}</div>}
                          {(p.stock || 0) <= 0 && <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center text-white font-bold uppercase text-xs tracking-widest">Habis</div>}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h5 className="font-bold text-sm text-gray-800 line-clamp-1 mb-1">{p.name || 'Produk Tanpa Nama'}</h5>
                            <div className="mt-auto flex justify-between items-center">
                              <p className="text-blue-600 font-bold text-sm">{formatCurrency(p.price)}</p>
                              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors"><Plus size={16} /></div>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cart Sidebar (Right) */}
              <div className="hidden md:flex w-[380px] bg-white border-l border-gray-200 shadow-xl flex-col z-20">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
                  <div><h3 className="text-lg font-black text-gray-900">Pesanan Baru</h3><p className="text-xs text-gray-400 font-medium mt-0.5">Order ID: #{Math.floor(Math.random()*10000)}</p></div>
                  <button onClick={() => setCart([])} className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-xl transition-colors"><Trash2 size={18}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gray-50/30">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center"><ShoppingBag size={32}/></div>
                      <p className="text-sm font-medium">Pilih menu di sebelah kiri</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="flex gap-4 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all group">
                        <img src={item.imageUrl} className="w-16 h-16 rounded-xl object-cover" />
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div className="flex justify-between items-start gap-2">
                            <h6 className="font-bold text-sm text-gray-800 truncate">{item.name}</h6>
                            <p className="text-sm font-bold text-gray-9
