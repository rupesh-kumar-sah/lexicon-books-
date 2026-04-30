import React from 'react';
import { ShoppingCart, Menu, X, Heart, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSiteSettings } from '../context/SiteSettingsContext';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const { user, signOut, openAuthModal, isAdmin } = useAuth();
  const { settings } = useSiteSettings();
  const brandPrimary = settings.siteName.split(' ')[0] || settings.siteName;
  const brandSuffix = settings.siteName.slice(brandPrimary.length).trim();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const v = searchValue.trim();
    navigate(v ? `/catalog?q=${encodeURIComponent(v)}` : '/catalog');
  };

  return (
    <nav className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-50 relative">
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-1 group">
            <div
              className="text-xl md:text-2xl font-bold tracking-tighter uppercase"
              style={{ color: 'var(--brand-primary)' }}
            >
              {brandPrimary}
              {brandSuffix && <span className="text-slate-400 font-light">{brandSuffix}</span>}
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link to="/catalog" className="hover:text-blue-700 transition-colors">Catalog</Link>
            <Link to="/wishlist" className="hover:text-blue-700 transition-colors">Wishlist</Link>
          </div>
        </div>

        <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search by title, author, or ISBN..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-transparent rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          </div>
        </form>

        <div className="flex items-center gap-2 md:gap-4">
          <Link to="/wishlist" className="p-2 hover:bg-slate-100 rounded-full relative" aria-label="Wishlist">
            <Heart className="w-5 h-5 md:w-6 md:h-6 text-slate-700 shrink-0" />
          </Link>
          <Link to="/cart" className="p-2 hover:bg-slate-100 rounded-full relative" aria-label="Cart">
            <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 text-slate-700 shrink-0" />
            {itemCount > 0 && (
              <span className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] px-1 rounded-full border-2 border-white min-w-[18px] text-center">
                {itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-200">
              <Link to="/profile" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-full bg-blue-100 overflow-hidden border border-blue-200">
                  <img
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=1d4ed8&color=fff`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-700">
                  {user.displayName.split(' ')[0]}
                </span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-3 py-1 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-md hover:bg-blue-600 transition-colors ml-2"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={signOut}
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-700 transition-colors ml-2"
              >
                Exit
              </button>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="hidden md:inline-flex px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-sm"
            >
              Start Reading
            </button>
          )}

          <div className="md:hidden flex items-center ml-2">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1 text-slate-600">
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg z-40"
          >
            <div className="px-4 py-4 space-y-1">
              <Link onClick={() => setIsMenuOpen(false)} to="/catalog" className="block px-3 py-3 text-sm font-medium text-slate-900 rounded-lg hover:bg-slate-50">Catalog</Link>
              <Link onClick={() => setIsMenuOpen(false)} to="/wishlist" className="block px-3 py-3 text-sm font-medium text-slate-900 rounded-lg hover:bg-slate-50">Wishlist</Link>
              <Link onClick={() => setIsMenuOpen(false)} to="/cart" className="block px-3 py-3 text-sm font-medium text-slate-900 rounded-lg hover:bg-slate-50">Cart</Link>
              {isAdmin && (
                <Link onClick={() => setIsMenuOpen(false)} to="/admin" className="block px-3 py-3 text-sm font-bold text-blue-700 rounded-lg hover:bg-slate-50">Admin Dashboard</Link>
              )}
              {user ? (
                <button
                  onClick={() => { setIsMenuOpen(false); signOut(); }}
                  className="block w-full text-left px-3 py-3 text-sm font-medium text-rose-600 rounded-lg hover:bg-slate-50"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => { setIsMenuOpen(false); openAuthModal(); }}
                  className="block w-full text-center px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold mt-2"
                >
                  Sign In / Sign Up
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
