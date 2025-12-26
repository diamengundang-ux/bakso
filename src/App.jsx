import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, ShoppingCart, Package, Users, Tag, Settings, LogOut, Plus, 
  Trash2, Printer, ChevronRight, CheckCircle2, X, Search, Store, Lock, 
  ShieldCheck, Ticket, Edit, Menu, ChevronLeft, CreditCard, Wallet,
  ArrowUpRight, DollarSign, ShoppingBag
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
        <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-6 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Terjadi Kesalahan</h1>
          <p className="text-slate-600 mb-4">Aplikasi mengalami kendala teknis.</p>
          <pre className="bg-white p-4 rounded-lg shadow text-xs text-left overflow-auto max-w-lg mb-6 border border-red-100">
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all"
          >
            Muat Ulang Aplikasi
          </button>
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

// --- DATABASE PATHS ---
const APP_ROOT = "pos_bakso_v1";
const getColl = (name) => collection(db, APP_ROOT, 'data', name);
const getSettingDoc = () => doc(db, APP_ROOT, 'settings', 'config', 'admin_pin');
const CATEGORIES = ['Semua', 'Bakso', 'Mie', 'Minuman', 'Tambahan'];

// --- UTILS ---
const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const COLORS = {
  green: { bg: 'bg-green-50', text: 'text-green-600', trendBg: 'bg-green-100' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', trendBg: 'bg-blue-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', trendBg: 'bg-orange-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', trendBg: 'bg-purple-100' },
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
  // Auth & User State
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  
  // UI State
  const [view, setView] = useState('pos');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  
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

  // --- RENDER ---
  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!isAuthenticated) return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-[24px] p-8 shadow-2xl border border-slate-700/50">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-blue-600 rounded-2xl shadow-lg mb-4 text-white"><Store size={32} /></div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">BaksoKu</h1>
          <p className="text-slate-500 text-sm mt-2">Sistem Kasir Modern & Cepat</p>
        </div>
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
          <button onClick={() => { const p = prompt("PIN Admin:"); if(p) handleLogin('admin', null, p); }} className="w-full p-4 rounded-xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50 flex items-center gap-4 group transition-all text-left">
            <div className="bg-blue-100 p-2.5 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors"><Lock size={20}/></div>
            <div><p className="font-bold text-slate-800">Admin Owner</p><p className="text-xs text-slate-500">Akses Penuh</p></div>
          </button>
          <div className="flex items-center gap-2 my-4"><div className="h-px bg-slate-200 flex-1"></div><span className="text-xs text-slate-400 font-medium">STAFF LOGIN</span><div className="h-px bg-slate-200 flex-1"></div></div>
          {staff.map(s => (
            <button key={s.id} onClick={() => { const p = prompt(`PIN ${s.name}:`); if(p) handleLogin('staff', s, p); }} className="w-full p-3 rounded-xl hover:bg-slate-50 flex items-center gap-3 text-left border border-transparent hover:border-slate-200 transition-all">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 text-sm">{s.name[0]}</div>
              <div><p className="font-bold text-sm text-slate-800">{s.name}</p><p className="text-[10px] text-slate-500 uppercase font-medium">{s.position}</p></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      
      {/* MOBILE OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-sm transition-all" onClick={() => setMobileMenuOpen(false)}></div>
      )}

      {/* SIDEBAR */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out
        md:relative md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
        ${sidebarOpen ? 'md:w-64' : 'md:w-20'}
      `}>
        <div className="h-20 flex items-center justify-center border-b border-slate-100 px-6">
          <div className="flex items-center gap-3 w-full">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200"><Store size={20} /></div>
            {(sidebarOpen || mobileMenuOpen) && <h1 className="font-bold text-lg text-slate-800 tracking-tight">BaksoKu</h1>}
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavButton icon={<ShoppingCart size={20}/>} label="Kasir" active={view === 'pos'} onClick={()=>{setView('pos'); setMobileMenuOpen(false)}} expanded={sidebarOpen || mobileMenuOpen}/>
          {role === 'admin' && (
            <>
              <div className="my-2 border-t border-slate-100 mx-2"></div>
              <p className={`text-[10px] font-bold text-slate-400 px-4 mb-2 uppercase tracking-wider ${(sidebarOpen || mobileMenuOpen) ? 'block' : 'hidden'}`}>Admin Menu</p>
              <NavButton icon={<LayoutDashboard size={20}/>} label="Dashboard" active={view === 'dashboard'} onClick={()=>{setView('dashboard'); setMobileMenuOpen(false)}} expanded={sidebarOpen || mobileMenuOpen}/>
              <NavButton icon={<Package size={20}/>} label="Stok Produk" active={view === 'inventory'} onClick={()=>{setView('inventory'); setMobileMenuOpen(false)}} expanded={sidebarOpen || mobileMenuOpen}/>
              <NavButton icon={<Tag size={20}/>} label="Promo" active={view === 'promos'} onClick={()=>{setView('promos'); setMobileMenuOpen(false)}} expanded={sidebarOpen || mobileMenuOpen}/>
              <NavButton icon={<Users size={20}/>} label="Karyawan" active={view === 'staff'} onClick={()=>{setView('staff'); setMobileMenuOpen(false)}} expanded={sidebarOpen || mobileMenuOpen}/>
              <NavButton icon={<Settings size={20}/>} label="Pengaturan" active={false} onClick={()=>{setShowSettingsModal(true); setMobileMenuOpen(false)}} expanded={sidebarOpen || mobileMenuOpen}/>
            </>
          )}
        </nav>
        
        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-slate-500 hover:text-red-600 transition-all ${!sidebarOpen && !mobileMenuOpen && 'justify-center'}`}>
            <LogOut size={20}/> {(sidebarOpen || mobileMenuOpen) && <span className="font-medium text-sm">Keluar</span>}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col relative overflow-hidden h-full w-full bg-slate-50">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-500 md:hidden hover:bg-slate-100 rounded-lg"><Menu size={24} /></button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden md:block p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><ChevronRight size={20} className={`transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} /></button>
            <h2 className="font-bold text-xl text-slate-800 capitalize tracking-tight">{view === 'pos' ? 'Kasir' : view === 'inventory' ? 'Stok & Menu' : view}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right leading-tight hidden sm:block">
              <p className="text-sm font-bold text-slate-900">{currentUserData?.name}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-0.5">{role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm">{currentUserData?.name?.[0]}</div>
          </div>
        </header>

        <div className="flex-1 overflow-auto pb-20 md:pb-0 relative">
          {view === 'pos' && (
            <div className="flex h-full flex-col md:flex-row">
              <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 overflow-hidden">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide shrink-0">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
                
                <div className="flex-1 overflow-y-auto pr-1 pb-20 md:pb-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredProducts.map(p => (
                      <button key={p.id} disabled={p.stock <= 0} onClick={() => addToCart(p)} className="bg-white p-3 rounded-2xl border border-slate-100 hover:border-blue-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left flex flex-col group disabled:opacity-60 disabled:hover:translate-y-0 relative overflow-hidden">
                        <div className="relative mb-3 rounded-xl overflow-hidden h-32 w-full bg-slate-100">
                          <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                          {p.stock <= 5 && p.stock > 0 && <div className="absolute top-2 right-2 bg-orange-500 text-white text-[9px] px-2 py-1 rounded-md font-bold shadow-sm">Sisa {p.stock}</div>}
                          {p.stock <= 0 && <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white font-bold uppercase text-xs backdrop-blur-[1px]">Habis</div>}
                        </div>
                        <div className="flex-1 flex flex-col">
                          <h5 className="font-bold text-sm text-slate-800 line-clamp-1 mb-1">{p.name || 'Produk Tanpa Nama'}</h5>
                          <div className="mt-auto flex justify-between items-center">
                            <p className="text-blue-600 font-bold text-sm">{formatCurrency(p.price)}</p>
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors"><Plus size={16} /></div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* DESKTOP CART */}
              <div className="hidden md:flex w-[380px] bg-white border-l border-slate-200 shadow-xl flex-col z-10">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <div><h3 className="text-lg font-bold text-slate-800">Pesanan Aktif</h3><p className="text-xs text-slate-400 font-medium">Order ID: #{Math.floor(Math.random()*1000)}</p></div>
                  <button onClick={() => setCart([])} className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={18}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center"><ShoppingBag size={32}/></div>
                      <p className="text-sm font-medium">Belum ada item dipilih</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="flex gap-4 p-3 bg-slate-50/50 rounded-2xl border border-transparent hover:border-slate-200 transition-all group">
                        <img src={item.imageUrl} className="w-14 h-14 rounded-xl object-cover shadow-sm" />
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div className="flex justify-between items-start">
                            <h6 className="font-bold text-sm text-slate-800 truncate pr-2">{item.name}</h6>
                            <p className="text-sm font-bold text-slate-800">{formatCurrency(item.price * item.quantity)}</p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-[10px] text-slate-400 font-medium">{formatCurrency(item.price)} / pax</p>
                            <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                              <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))} className="w-5 h-5 flex items-center justify-center hover:bg-slate-100 rounded text-slate-600"><Minus size={12}/></button>
                              <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                              <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: Math.min(item.stock, i.quantity + 1)} : i))} className="w-5 h-5 flex items-center justify-center hover:bg-slate-100 rounded text-slate-600"><Plus size={12}/></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-6 bg-white border-t border-slate-100 space-y-4 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-500 font-medium"><span>Subtotal</span><span>{formatCurrency(cartSubtotal)}</span></div>
                    {discountAmount > 0 && <div className="flex justify-between text-sm text-green-600 font-bold"><span>Diskon</span><span>-{formatCurrency(discountAmount)}</span></div>}
                    <div className="border-t border-dashed border-slate-200 my-2"></div>
                    <div className="flex justify-between text-lg font-black text-slate-800"><span>Total</span><span className="text-blue-600">{formatCurrency(cartTotal)}</span></div>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => setShowPromoModal(true)} className="w-full py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">{selectedPromo ? <><Ticket size={16} className="text-green-500"/> {selectedPromo.code}</> : <><Ticket size={16}/> Gunakan Promo</>}</button>
                    <button disabled={cart.length === 0} onClick={() => setShowCheckoutModal(true)} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">Proses Pembayaran <ChevronRight size={18}/></button>
                  </div>
                </div>
              </div>

              {/* MOBILE CART BAR */}
              {cart.length > 0 && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-30">
                  <div className="flex gap-4 items-center">
                    <div className="flex-1 cursor-pointer" onClick={() => setShowMobileCart(true)}>
                      <p className="text-xs text-slate-500 font-bold">{cart.reduce((a,c)=>a+c.quantity,0)} Item dipilih</p>
                      <p className="text-xl font-black text-blue-600">{formatCurrency(cartTotal)}</p>
                    </div>
                    <button onClick={() => setShowMobileCart(true)} className="bg-slate-900 text-white px-6 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:scale-105 transition-all">
                      <ShoppingBag size={18}/> Detail
                    </button>
                  </div>
                </div>
              )}

              {/* MOBILE CART MODAL */}
              {showMobileCart && (
                <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col md:hidden animate-in slide-in-from-bottom duration-300">
                  <div className="p-4 bg-white border-b flex justify-between items-center sticky top-0 z-10">
                    <button onClick={() => setShowMobileCart(false)} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft size={24}/></button>
                    <h3 className="font-bold text-lg">Keranjang</h3>
                    <button onClick={() => setCart([])} className="text-red-500 font-bold text-xs bg-red-50 px-3 py-1.5 rounded-lg">Reset</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.map(item => (
                      <div key={item.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex gap-3">
                        <img src={item.imageUrl} className="w-20 h-20 rounded-xl object-cover" />
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h6 className="font-bold text-sm line-clamp-1">{item.name}</h6>
                            <p className="text-blue-600 font-bold text-sm">{formatCurrency(item.price)}</p>
                          </div>
                          <div className="flex items-center justify-end gap-3">
                            <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold">-</button>
                            <span className="font-bold w-6 text-center">{item.quantity}</span>
                            <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: Math.min(item.stock, i.quantity + 1)} : i))} className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold">+</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-5 bg-white border-t rounded-t-[2rem] shadow-2xl space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-slate-500 font-medium text-sm">Total Tagihan</span>
                      <span className="text-2xl font-black text-slate-900">{formatCurrency(cartTotal)}</span>
                    </div>
                    <button onClick={() => setShowPromoModal(true)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm flex justify-between px-4 items-center">
                      <span className="flex items-center gap-2"><Ticket size={16}/> {selectedPromo ? selectedPromo.code : 'Pakai Promo / Kupon'}</span>
                      <ChevronRight size={16}/>
                    </button>
                    <button onClick={() => { setShowMobileCart(false); setShowCheckoutModal(true); }} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-200">Bayar Sekarang</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DASHBOARD VIEW (Modern Grid) */}
          {view === 'dashboard' && (
            <div className="p-6 md:p-8 space-y-8 animate-in fade-in max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div><h2 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h2><p className="text-slate-500 mt-1">Ringkasan performa bisnis hari ini</p></div>
                <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                  <button className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold">Hari Ini</button>
                  <button className="px-4 py-1.5 text-slate-500 hover:bg-slate-50 rounded-lg text-xs font-medium">Minggu Ini</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Pendapatan" value={formatCurrency(sales.reduce((a,s)=>a+s.total,0))} icon={<DollarSign size={20} className={COLORS.green.text}/>} trend="+12.5%" color="green" />
                <StatCard title="Total Transaksi" value={sales.length} icon={<ShoppingBag size={20} className={COLORS.blue.text}/>} trend="+5.2%" color="blue" />
                <StatCard title="Menu Terjual" value={sales.reduce((a,s)=>a+s.items.length,0)} icon={<Package size={20} className={COLORS.orange.text}/>} trend="-2.1%" color="orange" />
                <StatCard title="Rata-rata Order" value={formatCurrency(sales.length > 0 ? sales.reduce((a,s)=>a+s.total,0)/sales.length : 0)} icon={<CreditCard size={20} className={COLORS.purple.text}/>} trend="+0.8%" color="purple" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <h4 className="font-bold text-lg text-slate-800">Analisis Penjualan</h4>
                    <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"><Settings size={18}/></button>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={Object.entries(sales.reduce((acc, s) => { const d = new Date(s.timestamp).toLocaleDateString(); acc[d] = (acc[d]||0) + s.total; return acc; }, {})).map(([date, total]) => ({ date, total }))}>
                        <defs><linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                        <Tooltip contentStyle={{borderRadius: '16px', border:'none', boxShadow:'0 10px 30px -10px rgba(0,0,0,0.1)'}} formatter={(v)=>formatCurrency(v)}/>
                        <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={4} fill="url(#colorVal)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col">
                  <h4 className="font-bold text-lg text-slate-800 mb-6">Transaksi Terakhir</h4>
                  <div className="flex-1 overflow-auto space-y-4 pr-2 custom-scrollbar">
                    {sales.sort((a,b) => b.timestamp - a.timestamp).slice(0, 6).map(s => (
                      <div key={s.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-colors group">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all"><ShoppingBag size={16}/></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-800 truncate">Order #{s.id.slice(-4)}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{new Date(s.timestamp).toLocaleTimeString()}</p>
                        </div>
                        <span className="font-bold text-sm text-slate-800">{formatCurrency(s.total)}</span>
                      </div>
                    ))}
                  </div>
                  <button className="w-full py-3 mt-4 text-sm font-bold text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-xl transition-all">Lihat Semua</button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW LAINNYA TETAP (Inventory, Staff, Promos) - Tapi disesuaikan container-nya */}
          {view === 'inventory' && (
            <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
              <div className="flex justify-between items-center"><div><h2 className="text-2xl font-bold text-slate-900">Stok Produk</h2></div><button onClick={() => { setEditingItem(null); setShowProductModal(true); }} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-black transition-colors"><Plus size={18} /> Tambah Menu</button></div>
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase text-xs"><tr><th className="p-6 font-bold">Produk</th><th className="p-6 font-bold">Kategori</th><th className="p-6 font-bold">Harga</th><th className="p-6 font-bold">Stok</th><th className="p-6 text-right font-bold">Aksi</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">{products.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-6 font-bold text-slate-700 flex items-center gap-4"><img src={p.imageUrl} className="w-10 h-10 rounded-xl object-cover shadow-sm" />{p.name}</td>
                      <td className="p-6"><span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold uppercase tracking-wide">{p.category}</span></td>
                      <td className="p-6 font-bold text-slate-900">{formatCurrency(p.price)}</td>
                      <td className="p-6"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${p.stock < 10 ? 'bg-red-500' : 'bg-green-500'}`}></div><span className="font-mono font-medium">{p.stock}</span></div></td>
                      <td className="p-6 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setEditingItem(p); setShowProductModal(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"><Edit size={16}/></button><button onClick={async () => { if(confirm('Hapus?')) await deleteDoc(doc(db, APP_ROOT, 'data', 'products', p.id)) }} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"><Trash2 size={16}/></button></div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
          {view === 'promos' && (
            <div className="p-6 md:p-8 max-w-7xl mx-auto"><div className="flex justify-between mb-8 items-center"><div><h2 className="text-2xl font-bold text-slate-900">Promo Aktif</h2></div><button onClick={() => setShowAddPromoModal(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">Buat Promo</button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{promos.map(p => (<div key={p.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"><div className="flex items-center gap-5"><div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">%</div><div><h4 className="font-bold text-lg text-slate-800">{p.code}</h4><p className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-lg mt-1 w-fit">{p.type === 'percentage' ? `Diskon ${p.value}%` : `Potongan ${formatCurrency(p.value)}`}</p></div></div><button onClick={() => deleteDoc(doc(db, APP_ROOT, 'data', 'promos', p.id))} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={20}/></button></div>))}</div></div>
          )}
          {view === 'staff' && (<div className="p-6 md:p-8 max-w-7xl mx-auto"><div className="flex justify-between mb-8 items-center"><div><h2 className="text-2xl font-bold text-slate-900">Karyawan</h2></div><button onClick={() => setShowStaffModal(true)} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-black transition-colors">Tambah Staff</button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{staff.map(s => (<div key={s.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-5 group"><div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center font-bold text-slate-500 text-xl group-hover:bg-slate-900 group-hover:text-white transition-colors">{s.name[0]}</div><div className="flex-1"><h4 className="font-bold text-lg text-slate-800">{s.name}</h4><p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{s.position}</p></div><button onClick={() => deleteDoc(doc(db, APP_ROOT, 'data', 'staff', s.id))} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={18}/></button></div>))}</div></div>)}
        </div>

        {/* --- MODALS --- */}
        {showProductModal && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] w-full max-w-md p-8 animate-in zoom-in-95 shadow-2xl">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">{editingItem ? 'Edit Menu' : 'Menu Baru'}</h3>
              <form onSubmit={async (e) => {
                e.preventDefault(); const fd = new FormData(e.target);
                const data = { name: fd.get('name'), price: Number(fd.get('price')), stock: Number(fd.get('stock')), category: fd.get('category'), imageUrl: editingItem?.imageUrl || `https://ui-avatars.com/api/?name=${fd.get('name')}&background=random` };
                if (editingItem) await updateDoc(doc(db, APP_ROOT, 'data', 'products', editingItem.id), data);
                else await addDoc(getColl('products'), data);
                setShowProductModal(false);
              }} className="space-y-4">
                <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase ml-1">Nama Produk</label><input name="name" defaultValue={editingItem?.name} required className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Contoh: Bakso Urat" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase ml-1">Harga</label><input name="price" defaultValue={editingItem?.price} type="number" required className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500" /></div>
                  <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase ml-1">Stok</label><input name="stock" defaultValue={editingItem?.stock} type="number" required className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500" /></div>
                </div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase ml-1">Kategori</label><select name="category" defaultValue={editingItem?.category} className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500">{CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setShowProductModal(false)} className="flex-1 py-4 text-slate-500 font-bold text-sm bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Batal</button>
                  <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">{editingItem ? 'Simpan Perubahan' : 'Tambah Menu'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCheckoutModal && <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-[2.5rem] w-full max-w-xs p-8 text-center space-y-8 shadow-2xl animate-in zoom-in-95"><div className="space-y-2"><p className="text-slate-400 font-medium uppercase text-xs tracking-widest">Total Pembayaran</p><h3 className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(cartTotal)}</h3></div><div className="grid grid-cols-1 gap-3"><button onClick={() => handleCheckout('Tunai')} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-green-50 hover:border-green-200 hover:text-green-700 font-bold text-slate-700 transition-all flex items-center justify-center gap-3 group"><CreditCard size={20} className="text-slate-400 group-hover:text-green-600"/> TUNAI</button><button onClick={() => handleCheckout('QRIS')} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 font-bold text-slate-700 transition-all flex items-center justify-center gap-3 group"><Wallet size={20} className="text-slate-400 group-hover:text-blue-600"/> QRIS</button></div><button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 font-bold text-xs hover:text-slate-600 transition-colors py-2">BATALKAN</button></div></div>}
        
        {/* Reuse other modals with same style... (Receipt, Promo, Staff) */}
        {receiptData && (
          <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] w-full max-w-xs overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95">
              <div className="flex-1 p-8 text-center space-y-4 font-mono text-xs overflow-y-auto max-h-[60vh] relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500"></div>
                <div className="flex justify-center mb-4"><div className="p-3 bg-green-100 rounded-full text-green-600"><CheckCircle2 size={32} /></div></div>
                <div><h4 className="text-lg font-black text-slate-900 tracking-tight">BAKSO CAK ROSO</h4><p className="text-[10px] text-slate-400 uppercase mt-1 font-sans font-bold">Struk Resmi</p></div>
                <div className="border-y border-dashed border-slate-200 py-4 space-y-1 text-left">
                  <div className="flex justify-between"><span>WAKTU</span><span>{new Date(receiptData.timestamp).toLocaleDateString()}</span></div>
                  <div className="flex justify-between"><span>JAM</span><span>{new Date(receiptData.timestamp).toLocaleTimeString()}</span></div>
                  <div className="flex justify-between"><span>KASIR</span><span>{receiptData.staffName}</span></div>
                </div>
                <div className="space-y-2 text-left">
                  {receiptData.items.map(i => (<div key={i.id} className="flex justify-between items-start"><div><span className="block font-bold text-slate-800">{i.name}</span><span className="text-[10px] text-slate-400">{i.quantity} x {formatCurrency(i.price)}</span></div><span className="font-bold text-slate-800">{formatCurrency(i.price * i.quantity)}</span></div>))}
                </div>
                <div className="border-t border-dashed border-slate-200 pt-4 space-y-1">
                  <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(receiptData.subtotal)}</span></div>
                  {receiptData.discount > 0 && (<div className="flex justify-between text-green-600 font-bold"><span>Hemat</span><span>-{formatCurrency(receiptData.discount)}</span></div>)}
                  <div className="flex justify-between font-black text-lg pt-2 text-slate-900"><span>TOTAL</span><span>{formatCurrency(receiptData.total)}</span></div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t flex gap-3"><button onClick={() => window.print()} className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-black transition-all">CETAK</button><button onClick={() => setReceiptData(null)} className="flex-1 py-3.5 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-all">TUTUP</button></div>
            </div>
          </div>
        )}

        {showStaffModal && <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-[2rem] w-full max-w-sm p-8 animate-in zoom-in-95"><h3 className="text-xl font-bold text-slate-900 mb-6">Staff Baru</h3><form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.target); await addDoc(getColl('staff'), { name: fd.get('name'), position: fd.get('pos'), pin: fd.get('pin'), joinedAt: Date.now() }); setShowStaffModal(false); }} className="space-y-4"><input name="name" required placeholder="Nama Lengkap" className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-medium outline-none" /><input name="pos" required placeholder="Jabatan" className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-medium outline-none" /><input name="pin" maxLength="4" required placeholder="PIN Akses (4 Digit)" className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-medium outline-none text-center tracking-widest" /><button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm mt-2 shadow-lg">Daftarkan Staff</button></form></div></div>}
        
        {showAddPromoModal && <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-[2rem] w-full max-w-sm p-8 animate-in zoom-in-95"><h3 className="text-xl font-bold text-slate-900 mb-6">Buat Promo</h3><form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.target); await addDoc(getColl('promos'), { code: fd.get('code').toUpperCase(), value: Number(fd.get('value')), type: fd.get('type'), createdAt: Date.now() }); setShowAddPromoModal(false); }} className="space-y-4"><input name="code" required placeholder="KODE KUPON" className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold uppercase outline-none" /><div className="grid grid-cols-2 gap-4"><select name="type" className="p-4 bg-slate-50 border rounded-2xl text-sm outline-none"><option value="percentage">Diskon %</option><option value="fixed">Potongan Rp</option></select><input name="value" type="number" required placeholder="Nilai" className="p-4 bg-slate-50 border rounded-2xl text-sm outline-none" /></div><button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm mt-2 shadow-lg hover:bg-blue-700">Simpan Promo</button></form></div></div>}
        
        {showPromoModal && <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-[2rem] w-full max-w-sm p-8 animate-in zoom-in-95"><h3 className="text-xl font-bold text-slate-900 mb-6">Pakai Promo</h3><div className="flex gap-3 mb-6"><input value={promoCodeInput} onChange={(e) => setPromoCodeInput(e.target.value)} placeholder="MASUKKAN KODE" className="flex-1 p-4 bg-slate-50 border rounded-2xl text-sm font-bold uppercase outline-none" /><button onClick={() => { const f = promos.find(p => p.code === promoCodeInput.toUpperCase()); if(f) { setSelectedPromo(f); setShowPromoModal(false); } else alert("Kode tidak valid"); }} className="px-6 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black">Gunakan</button></div><div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">{promos.map(p => (<button key={p.id} onClick={() => { setSelectedPromo(p); setShowPromoModal(false); }} className="w-full p-4 border border-slate-100 hover:border-blue-500 bg-white hover:bg-blue-50 rounded-2xl flex justify-between items-center transition-all group"><div><span className="block font-bold text-slate-800">{p.code}</span><span className="text-xs text-slate-400 group-hover:text-blue-600">Hemat {p.type==='percentage'?`${p.value}%`:formatCurrency(p.value)}</span></div><ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500"/></button>))}</div><button onClick={()=>setShowPromoModal(false)} className="w-full mt-6 py-3 text-slate-400 font-bold text-xs hover:text-slate-600 transition-colors">Tutup Jendela</button></div></div>}
        
        {showSettingsModal && <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-[2rem] w-full max-w-sm p-8 animate-in zoom-in-95"><h3 className="text-xl font-bold text-slate-900 mb-6">Keamanan Admin</h3><form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.target); if(fd.get('old') !== adminConfig.pin) return alert('PIN Lama Salah'); await updateDoc(getSettingDoc(), { pin: fd.get('new') }); alert('Berhasil'); setShowSettingsModal(false); }} className="space-y-4"><input name="old" type="password" placeholder="PIN Lama" className="w-full p-4 bg-slate-50 border rounded-2xl text-sm text-center tracking-widest font-mono outline-none" /><input name="new" type="password" placeholder="PIN Baru (4 Angka)" className="w-full p-4 bg-slate-50 border rounded-2xl text-sm text-center tracking-widest font-mono outline-none" /><div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowSettingsModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-200">Batal</button><button type="submit" className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black shadow-lg">Simpan PIN</button></div></form></div></div>}
      </div>
    </div>
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
