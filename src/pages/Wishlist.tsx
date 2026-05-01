import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { wishlistApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { Book } from '../types';
import BookCard from '../components/BookCard';

export default function Wishlist() {
  const { user, openAuthModal } = useAuth();
  const { wishlist } = useWishlist();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBooks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    wishlistApi
      .books()
      .then(({ books }) => setBooks(books))
      .catch((e) => console.error('wishlist books load', e))
      .finally(() => setLoading(false));
  }, [user, wishlist.length]);

  return (
    <div className="max-w-7xl mx-auto px-8 py-16 bg-slate-50 min-h-full">
      <header className="mb-16">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shadow-sm border border-rose-100">
            <Heart className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Saved Collection</h1>
            <p className="text-slate-400 text-sm font-medium">Your personal BookSellNP curation.</p>
          </div>
        </div>
      </header>

      {!user ? (
        <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <Heart className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-3">Sign in to view your wishlist</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto mb-10 leading-relaxed">
            Create a free account to save books for later and access them on any device.
          </p>
          <button
            onClick={openAuthModal}
            className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl active:scale-95"
          >
            Sign In / Sign Up
          </button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
            >
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse bg-white border border-slate-200 aspect-[3/4] rounded-3xl" />
              ))}
            </motion.div>
          ) : books.length > 0 ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
            >
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200"
            >
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <Heart className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Your curation is empty</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto mb-10 leading-relaxed">
                Explore our catalog of masterpieces and save the ones that resonate with you for future reading.
              </p>
              <Link
                to="/catalog"
                className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-xl active:scale-95 group"
              >
                <span>Explore Catalog</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
