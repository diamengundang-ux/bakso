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
                            <p className="text-sm font-bold text-gray-900">{formatCurrency((item.price || 0) * item.quantity)}</p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-[10px] text-gray-400 font-bold">{formatCurrency(item.price)}</p>
                            <div className="flex items-center gap-3 bg-gray-50 rounded-xl border border-gray-200 px-2 py-1 shadow-sm">
                              <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))} className="w-5 h-5 flex items-center justify-center hover:bg-white rounded-lg text-gray-600 transition-colors shadow-sm"><Minus size={12}/></button>
                              <span className="text-xs font-bold w-4 text-center text-gray-800">{item.quantity}</span>
                              <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: Math.min(item.stock, i.quantity + 1)} : i))} className="w-5 h-5 flex items-center justify-center hover:bg-white rounded-lg text-gray-600 transition-colors shadow-sm"><Plus size={12}/></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-6 bg-white border-t border-gray-100 space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-20">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-500 font-medium"><span>Subtotal</span><span>{formatCurrency(cartSubtotal)}</span></div>
                    {discountAmount > 0 && <div className="flex justify-between text-sm text-green-600 font-bold bg-green-50 p-2 rounded-lg"><span>Diskon Hemat</span><span>-{formatCurrency(discountAmount)}</span></div>}
                    <div className="border-t border-dashed border-gray-200 my-2"></div>
                    <div className="flex justify-between text-lg font-black text-gray-900"><span>Total Tagihan</span><span className="text-orange-600">{formatCurrency(cartTotal)}</span></div>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => setShowPromoModal(true)} className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-all">{selectedPromo ? <><Ticket size={16} className="text-green-500"/> {selectedPromo.code}</> : <><Ticket size={16}/> Gunakan Promo / Kupon</>}</button>
                    <button disabled={cart.length === 0} onClick={() => setShowCheckoutModal(true)} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">Proses Pembayaran <ChevronRight size={18}/></button>
                  </div>
                </div>
              </div>

              {/* MOBILE CART BAR (Floating) */}
              {cart.length > 0 && (
                <div className="md:hidden fixed bottom-6 left-6 right-6 z-40 animate-in slide-in-from-bottom-10 duration-500">
                  <div className="bg-gray-900 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between cursor-pointer ring-4 ring-white" onClick={() => setShowMobileCart(true)}>
                    <div className="flex flex-col pl-2">
                       <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{cart.reduce((a,c)=>a+c.quantity,0)} Item</span>
                       <span className="text-lg font-black">{formatCurrency(cartTotal)}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl font-bold text-sm hover:bg-white/20 transition-colors">
                      Lihat <ChevronRight size={16}/>
                    </div>
                  </div>
                </div>
              )}

              {/* MOBILE CART MODAL */}
              {showMobileCart && (
                <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col md:hidden animate-in slide-in-from-bottom duration-300">
                  <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                    <button onClick={() => setShowMobileCart(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={28}/></button>
                    <h3 className="font-black text-xl text-gray-900">Keranjang</h3>
                    <button onClick={() => setCart([])} className="text-red-500 font-bold text-xs bg-red-50 px-4 py-2 rounded-xl">Hapus</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                    {cart.map(item => (
                      <div key={item.id} className="bg-white p-4 rounded-[20px] shadow-sm flex gap-4 border border-gray-100">
                        <img src={item.imageUrl} className="w-20 h-20 rounded-2xl object-cover" />
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div>
                            <h6 className="font-bold text-sm line-clamp-1 text-gray-800">{item.name}</h6>
                            <p className="text-orange-600 font-black text-sm mt-1">{formatCurrency(item.price)}</p>
                          </div>
                          <div className="flex items-center justify-end gap-3 mt-2">
                            <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))} className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-gray-600 hover:bg-gray-200 transition-colors">-</button>
                            <span className="font-bold w-6 text-center text-sm">{item.quantity}</span>
                            <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: Math.min(item.stock || 99, i.quantity + 1)} : i))} className="w-8 h-8 bg-gray-900 text-white rounded-xl flex items-center justify-center font-bold shadow-md hover:bg-black transition-colors">+</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-6 bg-white border-t rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] space-y-5">
                    <div className="flex justify-between items-end"><span className="text-gray-500 font-medium text-sm">Total Tagihan</span><span className="text-2xl font-black text-gray-900">{formatCurrency(cartTotal)}</span></div>
                    <button onClick={() => setShowPromoModal(true)} className="w-full py-3 border-2 border-dashed border-gray-200 text-gray-500 rounded-2xl font-bold text-xs flex justify-between px-6 items-center hover:border-orange-200 hover:text-orange-600 transition-colors"><span className="flex items-center gap-3"><Ticket size={18}/> {selectedPromo ? selectedPromo.code : 'Makin hemat pakai promo'}</span><ChevronRight size={16}/></button>
                    <button onClick={() => { setShowMobileCart(false); setShowCheckoutModal(true); }} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-black transition-all">Bayar Sekarang</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DASHBOARD VIEW (Modern Grid) */}
          {view === 'dashboard' && (
            <div className="p-6 md:p-10 space-y-10 animate-in fade-in max-w-[1600px] mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div><h2 className="text-4xl font-black text-gray-900 tracking-tight">Dashboard</h2><p className="text-gray-500 mt-2 font-medium">Analisis performa bisnis Bakso Cak Roso</p></div>
                <div className="flex bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm">
                  <button className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold shadow-md">Hari Ini</button>
                  <button className="px-6 py-2.5 text-gray-500 hover:bg-gray-50 rounded-xl text-xs font-bold transition-colors">Minggu Ini</button>
                  <button className="px-6 py-2.5 text-gray-500 hover:bg-gray-50 rounded-xl text-xs font-bold transition-colors">Bulan Ini</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Pendapatan" value={formatCurrency(sales.reduce((a,s)=>a+Number(s.total||0),0))} icon={<DollarSign size={24} className={COLORS.green.text}/>} trend="+12.5% vs kemarin" color="green" />
                <StatCard title="Total Transaksi" value={sales.length} icon={<ShoppingBag size={24} className={COLORS.blue.text}/>} trend="+5.2% vs kemarin" color="blue" />
                <StatCard title="Item Terjual" value={sales.reduce((a,s)=>a+(s.items?.length||0),0)} icon={<Package size={24} className={COLORS.orange.text}/>} trend="-2.1% vs kemarin" color="orange" />
                <StatCard title="Rata-rata Order" value={formatCurrency(sales.length > 0 ? sales.reduce((a,s)=>a+Number(s.total||0),0)/sales.length : 0)} icon={<CreditCard size={24} className={COLORS.purple.text}/>} trend="+0.8% vs kemarin" color="purple" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-10">
                    <div><h4 className="font-bold text-xl text-gray-900">Grafik Penjualan</h4><p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Real-time Data</p></div>
                    <button className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400 border border-transparent hover:border-gray-200 transition-all"><Settings size={20}/></button>
                  </div>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={Object.entries(sales.reduce((acc, s) => { const d = new Date(s.timestamp).toLocaleDateString(); acc[d] = (acc[d]||0) + Number(s.total||0); return acc; }, {})).map(([date, total]) => ({ date, total }))}>
                        <defs>
                          <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12, fontWeight: 500}} dy={10} />
                        <Tooltip 
                          contentStyle={{borderRadius: '20px', border:'none', boxShadow:'0 10px 40px -10px rgba(0,0,0,0.1)', padding: '12px 20px'}} 
                          formatter={(v)=>[formatCurrency(v), 'Pendapatan']}
                          labelStyle={{color: '#9ca3af', fontSize: '12px', marginBottom: '4px'}}
                          itemStyle={{color: '#111827', fontWeight: 'bold', fontSize: '14px'}}
                        />
                        <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={5} fill="url(#colorVal)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-full">
                  <h4 className="font-bold text-xl text-gray-900 mb-8">Transaksi Terakhir</h4>
                  <div className="flex-1 overflow-auto space-y-2 pr-2 custom-scrollbar">
                    {sales.sort((a,b) => b.timestamp - a.timestamp).slice(0, 6).map(s => (
                      <div key={s.id} className="flex items-center gap-5 p-4 hover:bg-gray-50 rounded-[20px] transition-all group cursor-default">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:shadow-md group-hover:text-blue-600 transition-all"><ShoppingBag size={20}/></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-900 truncate">Order #{s.id.slice(-4)}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{new Date(s.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          </div>
                        </div>
                        <span className="font-black text-sm text-gray-900">{formatCurrency(s.total)}</span>
                      </div>
                    ))}
                  </div>
                  <button className="w-full py-4 mt-6 text-sm font-bold text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-2xl transition-all">Lihat Semua Laporan</button>
                </div>
              </div>
            </div>
          )}

          {/* INVENTORY & OTHER VIEWS */}
          {view === 'inventory' && (
            <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
              <div className="flex justify-between items-center"><div><h2 className="text-3xl font-black text-gray-900">Stok Produk</h2><p className="text-gray-500 mt-1">Kelola ketersediaan menu</p></div><button onClick={() => { setEditingItem(null); setShowProductModal(true); }} className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-black hover:shadow-lg transition-all"><Plus size={20} /> Tambah Menu</button></div>
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase text-xs tracking-wider"><tr><th className="p-8 font-bold">Produk</th><th className="p-8 font-bold">Kategori</th><th className="p-8 font-bold">Harga</th><th className="p-8 font-bold">Stok</th><th className="p-8 text-right font-bold">Aksi</th></tr></thead>
                  <tbody className="divide-y divide-gray-50">{products.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="p-8 font-bold text-gray-800 flex items-center gap-5"><img src={p.imageUrl} className="w-12 h-12 rounded-2xl object-cover shadow-sm group-hover:scale-110 transition-transform duration-300" />{p.name}</td>
                      <td className="p-8"><span className="px-4 py-1.5 bg-gray-100 text-gray-500 rounded-xl text-[10px] font-bold uppercase tracking-widest">{p.category}</span></td>
                      <td className="p-8 font-bold text-gray-900">{formatCurrency(p.price)}</td>
                      <td className="p-8"><div className="flex items-center gap-3"><div className={`w-2.5 h-2.5 rounded-full ${p.stock < 10 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div><span className="font-mono font-bold text-gray-600">{p.stock}</span></div></td>
                      <td className="p-8 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setEditingItem(p); setShowProductModal(true); }} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"><Edit size={18}/></button><button onClick={async () => { if(confirm('Hapus?')) await deleteDoc(doc(db, APP_ROOT, 'data', 'products', p.id)) }} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"><Trash2 size={18}/></button></div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
          {view === 'promos' && (
            <div className="p-6 md:p-10 max-w-7xl mx-auto"><div className="flex justify-between mb-10 items-center"><div><h2 className="text-3xl font-black text-gray-900">Promo Aktif</h2><p className="text-gray-500 mt-1">Diskon & Penawaran Spesial</p></div><button onClick={() => setShowAddPromoModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 transition-all">Buat Promo Baru</button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{promos.map(p => (<div key={p.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all flex items-center justify-between group hover:-translate-y-1"><div className="flex items-center gap-6"><div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center font-bold text-2xl group-hover:rotate-12 transition-transform duration-500">%</div><div><h4 className="font-black text-xl text-gray-900">{p.code}</h4><p className="text-xs text-gray-500 font-bold bg-gray-100 px-3 py-1.5 rounded-lg mt-2 w-fit uppercase tracking-wide">{p.type === 'percentage' ? `Diskon ${p.value}%` : `Potongan ${formatCurrency(p.value)}`}</p></div></div><button onClick={() => deleteDoc(doc(db, APP_ROOT, 'data', 'promos', p.id))} className="text-gray-300 hover:text-red-500 p-3 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={24}/></button></div>))}</div></div>
          )}
          {view === 'staff' && (<div className="p-6 md:p-10 max-w-7xl mx-auto"><div className="flex justify-between mb-10 items-center"><div><h2 className="text-3xl font-black text-gray-900">Tim Karyawan</h2><p className="text-gray-500 mt-1">Manajemen akses pegawai</p></div><button onClick={() => setShowStaffModal(true)} className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-black shadow-lg transition-all">Tambah Anggota</button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{staff.map(s => (<div key={s.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all flex items-center gap-6 group hover:-translate-y-1"><div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center font-black text-gray-500 text-2xl group-hover:bg-gray-900 group-hover:text-white transition-all duration-500 shadow-inner">{s.name[0]}</div><div className="flex-1"><h4 className="font-bold text-xl text-gray-900">{s.name}</h4><p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{s.position}</p></div><button onClick={() => deleteDoc(doc(db, APP_ROOT, 'data', 'staff', s.id))} className="text-gray-300 hover:text-red-500 p-3 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={22}/></button></div>))}</div></div>)}
        </div>

        {/* --- MODALS --- */}
        {showProductModal && (
          <div className="fixed inset-0 bg-gray-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-md transition-all">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 animate-in zoom-in-95 shadow-2xl">
              <h3 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">{editingItem ? 'Edit Menu' : 'Menu Baru'}</h3>
              <form onSubmit={async (e) => {
                e.preventDefault(); const fd = new FormData(e.target);
                const data = { name: fd.get('name'), price: Number(fd.get('price')), stock: Number(fd.get('stock')), category: fd.get('category'), imageUrl: editingItem?.imageUrl || `https://ui-avatars.com/api/?name=${fd.get('name')}&background=random` };
                if (editingItem) await updateDoc(doc(db, APP_ROOT, 'data', 'products', editingItem.id), data);
                else await addDoc(getColl('products'), data);
                setShowProductModal(false);
              }} className="space-y-5">
                <div className="space-y-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Produk</label><input name="name" defaultValue={editingItem?.name} required className="w-full p-4 bg-gray-50 border rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" placeholder="Contoh: Bakso Urat" /></div>
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Harga</label><input name="price" defaultValue={editingItem?.price} type="number" required className="w-full p-4 bg-gray-50 border rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Stok</label><input name="stock" defaultValue={editingItem?.stock} type="number" required className="w-full p-4 bg-gray-50 border rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" /></div>
                </div>
                <div className="space-y-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Kategori</label><select name="category" defaultValue={editingItem?.category} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all">{CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowProductModal(false)} className="flex-1 py-4 text-gray-500 font-bold text-sm bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors">Batal</button>
                  <button type="submit" className="flex-[2] py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-black shadow-xl shadow-gray-900/20 transition-all transform active:scale-95">{editingItem ? 'Simpan Perubahan' : 'Tambah Menu'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCheckoutModal && <div className="fixed inset-0 bg-gray-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-md"><div className="bg-white rounded-[3rem] w-full max-w-xs p-10 text-center space-y-8 shadow-2xl animate-in zoom-in-95"><div className="space-y-3"><p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Total Pembayaran</p><h3 className="text-5xl font-black text-gray-900 tracking-tighter">{formatCurrency(cartTotal)}</h3></div><div className="grid grid-cols-1 gap-4"><button onClick={() => handleCheckout('Tunai')} className="p-6 rounded-[24px] bg-white border-2 border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 font-black text-gray-700 hover:text-emerald-700 transition-all flex items-center justify-center gap-4 group shadow-sm hover:shadow-md hover:-translate-y-1"><CreditCard size={24} className="text-gray-300 group-hover:text-emerald-500 transition-colors"/> TUNAI</button><button onClick={() => handleCheckout('QRIS')} className="p-6 rounded-[24px] bg-white border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 font-black text-gray-700 hover:text-blue-700 transition-all flex items-center justify-center gap-4 group shadow-sm hover:shadow-md hover:-translate-y-1"><Wallet size={24} className="text-gray-300 group-hover:text-blue-500 transition-colors"/> QRIS</button></div><button onClick={() => setShowCheckoutModal(false)} className="text-gray-400 font-bold text-xs hover:text-gray-800 transition-colors py-2 uppercase tracking-widest">Batalkan Transaksi</button></div></div>}
        
        {/* Reuse other modals with same style... (Receipt, Promo, Staff) */}
        {receiptData && (
          <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white rounded-[2rem] w-full max-w-xs overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95">
              <div className="flex-1 p-8 text-center space-y-4 font-mono text-xs overflow-y-auto max-h-[60vh] relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500"></div>
                <div className="flex justify-center mb-6 mt-2"><div className="p-4 bg-emerald-50 rounded-full text-emerald-500 shadow-inner"><CheckCircle2 size={40} /></div></div>
                <div><h4 className="text-xl font-black text-gray-900 tracking-tighter">BAKSO CAK ROSO</h4><p className="text-[10px] text-gray-400 uppercase mt-1 font-sans font-bold tracking-widest">Struk Pembayaran Resmi</p></div>
                <div className="border-y-2 border-dashed border-gray-100 py-6 space-y-2 text-left text-gray-500">
                  <div className="flex justify-between"><span>TANGGAL</span><span className="font-bold text-gray-800">{new Date(receiptData.timestamp).toLocaleDateString()}</span></div>
                  <div className="flex justify-between"><span>JAM</span><span className="font-bold text-gray-800">{new Date(receiptData.timestamp).toLocaleTimeString()}</span></div>
                  <div className="flex justify-between"><span>KASIR</span><span className="font-bold text-gray-800 uppercase">{receiptData.staffName}</span></div>
                  <div className="flex justify-between"><span>METODE</span><span className="font-bold text-gray-800 bg-gray-100 px-2 rounded">{receiptData.paymentMethod}</span></div>
                </div>
                <div className="space-y-3 text-left pt-2">
                  {receiptData.items.map(i => (<div key={i.id} className="flex justify-between items-start"><div><span className="block font-bold text-gray-800 text-sm">{i.name}</span><span className="text-[10px] text-gray-400 font-bold">{i.quantity} x {formatCurrency(i.price)}</span></div><span className="font-bold text-gray-800">{formatCurrency(i.price * i.quantity)}</span></div>))}
                </div>
                <div className="border-t-2 border-dashed border-gray-100 pt-6 space-y-2">
                  <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{formatCurrency(receiptData.subtotal)}</span></div>
                  {receiptData.discount > 0 && (<div className="flex justify-between text-emerald-600 font-bold"><span>Hemat</span><span>-{formatCurrency(receiptData.discount)}</span></div>)}
                  <div className="flex justify-between font-black text-2xl pt-2 text-gray-900"><span>TOTAL</span><span>{formatCurrency(receiptData.total)}</span></div>
                </div>
              </div>
              <div className="p-5 bg-gray-50 border-t flex gap-3"><button onClick={() => window.print()} className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold text-xs shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2"><Printer size={16}/> CETAK</button><button onClick={() => setReceiptData(null)} className="flex-1 py-4 border border-gray-200 text-gray-500 hover:bg-white hover:text-red-500 rounded-2xl font-bold text-xs transition-all">TUTUP</button></div>
            </div>
          </div>
        )}

        {showStaffModal && <div className="fixed inset-0 bg-gray-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-md"><div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 animate-in zoom-in-95 shadow-2xl"><h3 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Staff Baru</h3><form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.target); await addDoc(getColl('staff'), { name: fd.get('name'), position: fd.get('pos'), pin: fd.get('pin'), joinedAt: Date.now() }); setShowStaffModal(false); }} className="space-y-5"><input name="name" required placeholder="Nama Lengkap" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" /><input name="pos" required placeholder="Jabatan" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" /><input name="pin" maxLength="4" required placeholder="PIN Akses (4 Digit)" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none text-center tracking-[0.5em] focus:ring-2 focus:ring-blue-500 transition-all" /><div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowStaffModal(false)} className="flex-1 py-4 text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors">Batal</button><button type="submit" className="flex-[2] py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-black transition-all transform active:scale-95">Simpan Data</button></div></form></div></div>}
        
        {showAddPromoModal && <div className="fixed inset-0 bg-gray-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-md"><div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 animate-in zoom-in-95 shadow-2xl"><h3 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Buat Promo</h3><form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.target); await addDoc(getColl('promos'), { code: fd.get('code').toUpperCase(), value: Number(fd.get('value')), type: fd.get('type'), createdAt: Date.now() }); setShowAddPromoModal(false); }} className="space-y-5"><input name="code" required placeholder="KODE KUPON" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-black uppercase outline-none focus:ring-2 focus:ring-blue-500 transition-all" /><div className="grid grid-cols-2 gap-4"><select name="type" className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"><option value="percentage">Diskon %</option><option value="fixed">Potongan Rp</option></select><input name="value" type="number" required placeholder="Nilai" className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" /></div><div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowAddPromoModal(false)} className="flex-1 py-4 text-gray-400 font-bold text-sm hover:text-gray-600">Batal</button><button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all transform active:scale-95">Terbitkan</button></div></form></div></div>}
        
        {showPromoModal && <div className="fixed inset-0 bg-gray-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-md"><div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 animate-in zoom-in-95 shadow-2xl"><h3 className="text-xl font-black text-gray-900 mb-6">Pilih Promo</h3><div className="flex gap-3 mb-6"><input value={promoCodeInput} onChange={(e) => setPromoCodeInput(e.target.value)} placeholder="MASUKKAN KODE" className="flex-1 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-black uppercase outline-none focus:ring-2 focus:ring-blue-500" /><button onClick={() => { const f = promos.find(p => p.code === promoCodeInput.toUpperCase()); if(f) { setSelectedPromo(f); setShowPromoModal(false); } else alert("Kode tidak valid"); }} className="px-6 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all">Cek</button></div><div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">{promos.map(p => (<button key={p.id} onClick={() => { setSelectedPromo(p); setShowPromoModal(false); }} className="w-full p-4 border border-gray-100 hover:border-blue-500 bg-white hover:bg-blue-50 rounded-2xl flex justify-between items-center transition-all group"><div><span className="block font-black text-gray-800">{p.code}</span><span className="text-xs text-gray-400 font-bold group-hover:text-blue-600">Hemat {p.type==='percentage'?`${p.value}%`:formatCurrency(p.value)}</span></div><ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500"/></button>))}</div><button onClick={()=>setShowPromoModal(false)} className="w-full mt-6 py-3 text-gray-400 font-bold text-xs hover:text-gray-800 transition-colors uppercase tracking-widest">Tutup Jendela</button></div></div>}
        
        {showSettingsModal && <div className="fixed inset-0 bg-gray-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-md"><div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 animate-in zoom-in-95"><h3 className="text-xl font-bold text-slate-900 mb-6">Keamanan Admin</h3><form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.target); if(fd.get('old') !== adminConfig.pin) return alert('PIN Lama Salah'); await updateDoc(getSettingDoc(), { pin: fd.get('new') }); alert('Berhasil'); setShowSettingsModal(false); }} className="space-y-4"><input name="old" type="password" placeholder="PIN Lama" className="w-full p-4 bg-slate-50 border rounded-2xl text-sm text-center tracking-widest font-mono outline-none" /><input name="new" type="password" placeholder="PIN Baru (4 Angka)" className="w-full p-4 bg-slate-50 border rounded-2xl text-sm text-center tracking-widest font-mono outline-none" /><div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowSettingsModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-200">Batal</button><button type="submit" className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black shadow-lg">Simpan PIN</button></div></form></div></div>}
      </div>
    </Wrapper>
  );
};

// Wrapper Component for Error Boundary
const Wrapper = ({ children }) => (
  <ErrorBoundary>{children}</ErrorBoundary>
);

export default () => (
  <Wrapper>
    <App />
  </Wrapper>
);
