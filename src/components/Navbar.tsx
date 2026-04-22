import { ShoppingCart, LogIn, User, Search, BookOpen, Menu, X, Heart } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { APP_NAME } from '../constants';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { itemCount } = useCart();
  const { user, signIn, signOut, profile, isAdmin } = useAuth();

  return (
    <nav className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0 z-50">
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1 group">
            <div className="text-2xl font-bold tracking-tighter text-blue-700">
              LEXICONN<span className="text-slate-400 font-light">BOOKS</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link to="/catalog" className="hover:text-blue-700 transition-colors">Catalog</Link>
            <Link to="/genres" className="hover:text-blue-700 transition-colors">Genres</Link>
          </div>
        </div>

        {/* Search */}
        <div className="hidden md:flex flex-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <input 
              type="text" 
              placeholder="Search by title, author, or ISBN..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            />
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          </div>
        </div>

        {/* Icons */}
        <div className="flex items-center gap-4">
          <Link to="/wishlist" className="p-2 hover:bg-slate-100 rounded-full relative">
            <Heart className="w-6 h-6 text-slate-700 shrink-0" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full"></span>
          </Link>
          <Link to="/cart" className="p-2 hover:bg-slate-100 rounded-full relative">
            <ShoppingCart className="w-6 h-6 text-slate-700 shrink-0" />
            {itemCount > 0 && (
              <span className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] px-1 rounded-full border-2 border-white">
                {itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
              <Link to="/profile" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                  <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-700">{user.displayName?.split(' ')[0]}</span>
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
              onClick={signIn}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-sm"
            >
              Start Reading
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center ml-2">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1 text-slate-600">
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-top border-gray-100"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              <Link to="/catalog" className="block px-3 py-4 text-base font-medium text-gray-900 border-bottom border-gray-50">Catalog</Link>
              <Link to="/genres" className="block px-3 py-4 text-base font-medium text-gray-900 border-bottom border-gray-50">Genres</Link>
              <Link to="/wishlist" className="block px-3 py-4 text-base font-medium text-gray-900 border-bottom border-gray-50">Wishlist</Link>
              <Link to="/cart" className="block px-3 py-4 text-base font-medium text-gray-900 border-bottom border-gray-50">Shopping Cart</Link>
              {isAdmin && (
                <Link to="/admin" className="block px-3 py-4 text-base font-bold text-blue-700 border-bottom border-gray-50">Admin Dashboard</Link>
              )}
              <Link to="/login" className="block w-full text-center mt-4 px-4 py-4 bg-black text-white rounded-xl text-base font-medium">Login</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 w-full bg-white border-bottom border-gray-200 p-4 shadow-xl"
          >
            <div className="max-w-3xl mx-auto relative">
              <input 
                type="text" 
                placeholder="Search by title, author, or ISBN..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                autoFocus
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
