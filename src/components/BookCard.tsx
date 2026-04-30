import React from 'react';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Book } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { cn } from '../lib/utils';

interface BookCardProps {
  key?: React.Key | string | number;
  book: Book;
}

export default function BookCard({ book }: BookCardProps) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const inWishlist = isInWishlist(book.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col group hover:shadow-xl hover:border-blue-200 transition-all relative"
    >
      <div className="absolute top-6 right-6 z-30">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(book.id, book.title);
          }}
          className={cn(
            'p-2 rounded-full shadow-lg transition-all active:scale-95',
            inWishlist
              ? 'bg-rose-50 text-rose-500 hover:bg-rose-100'
              : 'bg-white/95 backdrop-blur-sm text-slate-400 hover:text-rose-500'
          )}
          aria-label="Toggle wishlist"
        >
          <Heart className={cn('w-4 h-4', inWishlist && 'fill-current')} />
        </button>
      </div>

      <Link to={`/book/${book.id}`} className="block relative mb-4">
        <div className="aspect-[3/4] bg-slate-200 rounded-xl overflow-hidden relative">
          <img
            src={book.coverImage}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 absolute inset-0"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          {book.featured && (
            <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase z-20 tracking-wider">
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
        <p className="text-xs text-slate-500 mb-2 line-clamp-1">{book.author}</p>

        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={cn(
                  'w-3 h-3',
                  s <= Math.round(book.rating)
                    ? 'text-amber-400 fill-current'
                    : 'text-slate-200'
                )}
              />
            ))}
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            {book.rating.toFixed(1)}
            {typeof book.reviewCount === 'number' && book.reviewCount > 0 && ` · ${book.reviewCount}`}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
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
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm group/btn"
          >
            <ShoppingCart className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
            <span>Add</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
