import { ShoppingCart, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Book } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { cn } from '../lib/utils';

interface BookCardProps {
  book: Book;
}

export default function BookCard({ book }: BookCardProps) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col group hover:shadow-md transition-shadow relative"
    >
      <div className="absolute top-6 right-6 z-30">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(book.id);
          }}
          className={cn(
            'p-2 rounded-full shadow-lg transition-all active:scale-95',
            isInWishlist(book.id)
              ? 'bg-rose-50 text-rose-500 hover:bg-rose-100'
              : 'bg-white/90 backdrop-blur-sm text-slate-400 hover:text-rose-500'
          )}
          aria-label="Toggle wishlist"
        >
          <Heart className={cn('w-4 h-4', isInWishlist(book.id) && 'fill-current')} />
        </button>
      </div>

      <Link to={`/book/${book.id}`} className="block relative mb-4">
        <div className="aspect-[3/4] bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center text-slate-400 font-serif italic text-lg p-4 text-center relative">
          <img
            src={book.coverImage}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 absolute inset-0"
            referrerPolicy="no-referrer"
          />
          {book.featured && (
            <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase z-20">
              Featured
            </div>
          )}
          {book.stock === 0 && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center z-20">
              <span className="bg-slate-800 text-white text-[10px] uppercase tracking-tighter px-2 py-1 rounded">
                Out of stock
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-col flex-1">
        <Link to={`/book/${book.id}`}>
          <h4 className="font-bold text-sm mb-1 line-clamp-1 text-slate-900 hover:text-blue-700 transition-colors">
            {book.title}
          </h4>
        </Link>
        <p className="text-xs text-slate-500 mb-4">{book.author}</p>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-bold text-blue-700">${book.price.toFixed(2)}</span>
            {book.stock <= 5 && book.stock > 0 && (
              <span className="text-[10px] text-orange-500 font-bold uppercase tracking-tight">
                Only {book.stock} left
              </span>
            )}
          </div>
          <button
            disabled={book.stock === 0}
            onClick={(e) => {
              e.preventDefault();
              addToCart(book);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
