import React, { useState, useEffect } from 'react';
import { ShoppingCart, Menu, X, Heart, Search, User as UserIcon, LayoutDashboard, Compass } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { cn } from '../lib/utils';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useCart();
  const { user, signOut, openAuthModal, isAdmin } = useAuth();
  const { settings } = useSiteSettings();
  
  const brandPrimary = settings.siteName.split(' ')[0] || settings.siteName;
  const brandSuffix = settings.siteName.slice(brandPrimary.length).trim();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setShowSearch(false);
  }, [location.pathname]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const v = searchValue.trim();
    if (v) {
      navigate(`/catalog?q=${encodeURIComponent(v)}`);
      setShowSearch(false);
    }
  };

  return (
    <>
      <nav className={cn(
        "h-20 fixed top-0 left-0 right-0 z-[100] transition-all duration-500 flex items-center px-6 md:px-12",
        isScrolled 
          ? "bg-white/80 backdrop-blur-xl shadow-lg shadow-slate-200/20 h-16 border-b border-slate-200/50" 
          : "bg-white border-b border-slate-100"
      )}>
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-600 blur-lg opacity-0 group-hover:opacity-20 transition-opacity" />
                <img src="/logo.png" alt="" className="w-9 h-9 object-contain relative group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div
                className="text-2xl font-black tracking-tighter uppercase hidden sm:block"
                style={{ color: settings.primaryColor }}
              >
                {brandPrimary}
                {brandSuffix && <span className="text-slate-400 font-light ml-1">{brandSuffix}</span>}
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-8">
              {[
                { to: '/catalog', label: 'Explore', icon: Compass },
                { to: '/wishlist', label: 'Wishlist', icon: Heart },
              ].map((item) => (
                <Link 
                  key={item.to}
                  to={item.to} 
                  className={cn(
                    "flex items-center gap-2 text-sm font-bold tracking-tight transition-all relative group",
                    location.pathname === item.to ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", location.pathname === item.to ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                  {item.label}
                  {location.pathname === item.to && (
                    <motion.div layoutId="nav-pill" className="absolute -bottom-6 left-0 right-0 h-1 bg-blue-600 rounded-full" />
                  )}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-5">
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-2xl transition-all"
            >
              <Search className="w-5 h-5" />
            </button>

            <Link to="/cart" className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-2xl relative transition-all group">
              <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-lg"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1" />

            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/profile" className="flex items-center gap-3 p-1 pr-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-blue-200 transition-all group">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 overflow-hidden border border-white shadow-sm">
                    <img
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=1d4ed8&color=fff`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Account</p>
                    <p className="text-xs font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                      {user.displayName.split(' ')[0]}
                    </p>
                  </div>
                </Link>
                {isAdmin && (
                  <Link 
                    to="/admin-dashboard-secret-2063" 
                    className="hidden xl:flex items-center gap-2 p-2.5 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10"
                    title="Admin Dashboard"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                  </Link>
                )}
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
              >
                Sign In
              </button>
            )}

            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="lg:hidden p-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-600 hover:bg-white transition-all"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Global Search Overlay */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-start justify-center pt-32 px-6"
            onClick={() => setShowSearch(false)}
          >
            <motion.div
              initial={{ y: -20, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: -20, scale: 0.95 }}
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <form onSubmit={submitSearch} className="relative">
                <input
                  autoFocus
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="What are you looking for today?"
                  className="w-full px-8 py-7 bg-white text-xl font-bold outline-none placeholder:text-slate-300"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-300 border border-slate-200 px-2 py-1 rounded-lg uppercase hidden sm:block">Press Enter</span>
                  <button type="submit" className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all">
                    <Search className="w-6 h-6" />
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[300px] bg-white z-[120] lg:hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Navigation</p>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white rounded-xl text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-2">
                {[
                  { to: '/', label: 'Home', icon: Compass },
                  { to: '/catalog', label: 'Catalog', icon: ShoppingBag },
                  { to: '/wishlist', label: 'Wishlist', icon: Heart },
                  { to: '/cart', label: 'Cart', icon: ShoppingCart },
                  ...(user ? [{ to: '/profile', label: 'My Account', icon: UserIcon }] : []),
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-black transition-all",
                      location.pathname === item.to ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="p-8 border-t border-slate-100">
                {user ? (
                  <button
                    onClick={() => { setIsMenuOpen(false); signOut(); }}
                    className="w-full py-4 border border-slate-200 text-rose-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-50 transition-all"
                  >
                    Log Out
                  </button>
                ) : (
                  <button
                    onClick={() => { setIsMenuOpen(false); openAuthModal(); }}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/10"
                  >
                    Get Started
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-20" />
    </>
  );
}

  );
}
