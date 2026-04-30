import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Star,
  ShoppingCart,
  Heart,
  Truck,
  ShieldCheck,
  ArrowLeft,
  Plus,
  Minus,
  Send,
  User as UserIcon,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { Book, Review } from '../types';
import { bookApi } from '../lib/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useRecentlyViewed } from '../context/RecentlyViewedContext';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';

export default function BookDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addRecent } = useRecentlyViewed();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'reviews'>('desc');
  const [book, setBook] = useState<Book | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = () => {
    if (!id) return;
    bookApi.reviews(id).then(({ reviews }) => setReviews(reviews)).catch(() => {});
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    addRecent(id);
    bookApi
      .get(id)
      .then(({ book }) => setBook(book))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading)
    return (
      <div className="p-20 text-center text-slate-400 flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin" />
        Opening the pages...
      </div>
    );
  if (!book) return <div className="p-20 text-center text-slate-400">Book lost in the stacks.</div>;

  return (
    <div className="max-w-7xl mx-auto px-8 py-12 bg-slate-50 min-h-full">
      <Link
        to="/catalog"
        className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-blue-700 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Library
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="relative">
          <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-white p-4">
            <div className="w-full h-full bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
              <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </div>
          <button
            onClick={() => id && toggleWishlist(id, book.title)}
            className={cn(
              'absolute top-10 right-10 p-3 rounded-full shadow-lg transition-all active:scale-95',
              id && isInWishlist(id) ? 'bg-rose-50 text-rose-500 hover:bg-rose-100' : 'bg-white/90 backdrop-blur-sm text-slate-700 hover:text-rose-500'
            )}
          >
            <Heart className={cn('w-6 h-6', id && isInWishlist(id) && 'fill-current')} />
          </button>
        </motion.div>

        <div className="flex flex-col">
          <div className="mb-10">
            <div className="flex items-center space-x-2 mb-4">
              {book.featured && (
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">
                  Masterpiece
                </span>
              )}
              <div className="flex items-center text-yellow-500">
                <Star className="w-4 h-4 fill-current" />
                <span className="ml-2 text-sm font-bold text-slate-900">{book.rating}</span>
                <span className="ml-2 text-slate-400 text-xs font-medium">({reviews.length} reviews)</span>
              </div>
            </div>
            <h1 className="font-sans text-5xl font-bold mb-4 tracking-tight text-slate-900 leading-tight">
              {book.title}
            </h1>
            <p className="text-xl text-blue-700 font-medium">by {book.author}</p>
          </div>

          <div className="text-4xl font-bold mb-10 text-slate-900">${book.price.toFixed(2)}</div>

          <div className="space-y-8 mb-12">
            <div className="flex items-center space-x-6">
              <div className="flex items-center border border-slate-200 rounded-lg p-1 bg-white shadow-sm">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2 hover:bg-slate-50 rounded transition-all text-slate-400 hover:text-slate-900"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-bold text-slate-900">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(book.stock, q + 1))}
                  className="p-2 hover:bg-slate-50 rounded transition-all text-slate-400 hover:text-slate-900"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => addToCart(book, quantity)}
                disabled={book.stock === 0}
                className="flex-grow flex items-center justify-center space-x-3 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Add to Cart</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <Truck className="w-5 h-5 mr-3 text-blue-600" />
                <div>
                  <div className="text-xs font-bold text-slate-900">Free Delivery</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-none mt-1">
                    Expedited
                  </div>
                </div>
              </div>
              <div className="flex items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <ShieldCheck className="w-5 h-5 mr-3 text-blue-600" />
                <div>
                  <div className="text-xs font-bold text-slate-900">Secure Store</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-none mt-1">
                    Verified
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-10 border-b border-slate-200 mb-8">
            {[
              { id: 'desc', label: 'Summary' },
              { id: 'specs', label: 'Details' },
              { id: 'reviews', label: 'Reviews' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'pb-4 text-xs font-bold uppercase tracking-[0.2em] transition-all relative',
                  activeTab === tab.id ? 'text-blue-700' : 'text-slate-400 hover:text-slate-900'
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700" />
                )}
              </button>
            ))}
          </div>

          <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed min-h-[300px]">
            {activeTab === 'desc' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="whitespace-pre-line text-slate-500 font-medium">{book.description}</p>
              </motion.div>
            )}
            {activeTab === 'specs' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SpecRow label="ISBN-13" value={book.isbn} />
                <SpecRow label="Genre" value={book.genre} />
                <SpecRow label="Year" value={String(book.year)} />
                <SpecRow label="Stock" value={`${book.stock} units`} />
              </motion.div>
            )}
            {activeTab === 'reviews' && (
              <ReviewSection bookId={book.id} reviews={reviews} reload={loadReviews} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-3 border-b border-slate-100">
      <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function ReviewSection({ bookId, reviews, reload }: { bookId: string; reviews: Review[]; reload: () => void }) {
  const { user, openAuthModal } = useAuth();
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return openAuthModal();
    setIsSubmitting(true);
    try {
      await bookApi.addReview(bookId, { rating, comment });
      setComment('');
      setRating(5);
      toast.success('Thanks for sharing your thoughts!');
      reload();
    } catch (err: any) {
      toast.error(err.message || 'Could not publish review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
      {user ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Share your thoughts</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Posting as {user.displayName}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                Reader Score
              </label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setRating(star)} className="p-1 transition-all active:scale-90">
                    <Star className={cn('w-6 h-6 transition-colors', star <= rating ? 'text-yellow-400 fill-current' : 'text-slate-200')} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                Detailed Commentary
              </label>
              <textarea
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you think of the narrative structure, the prose, the themes...?"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                rows={4}
              />
            </div>

            <button
              disabled={isSubmitting}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl flex items-center justify-center space-x-3 hover:bg-blue-600 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Publishing...' : 'Publish Review'}</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-slate-100 p-8 rounded-2xl text-center border-2 border-dashed border-slate-200">
          <p className="text-slate-500 font-medium text-sm mb-4">
            Please sign in to share your critique.
          </p>
          <button
            onClick={openAuthModal}
            className="bg-white border border-slate-200 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-900 hover:border-blue-500 transition-colors"
          >
            Sign In to Review
          </button>
        </div>
      )}

      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h3 className="text-lg font-bold text-slate-900">Reader Critiques</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {reviews.length} entries
          </span>
        </div>

        <div className="space-y-8">
          {reviews.map((review) => (
            <motion.div layout key={review.id}>
              <div className="flex items-start gap-4 mb-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                  <UserIcon className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-sm text-slate-900 shrink-0">{review.userName}</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex space-x-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'w-3 h-3',
                          i < review.rating ? 'text-yellow-400 fill-current' : 'text-slate-200'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="pl-14">
                <p className="text-sm font-medium text-slate-600 leading-relaxed italic border-l-2 border-slate-100 pl-4 py-1">
                  "{review.comment}"
                </p>
              </div>
            </motion.div>
          ))}

          {reviews.length === 0 && (
            <div className="py-12 text-center">
              <div className="text-slate-300 font-medium italic text-sm">
                No critiques have been filed for this volume yet.
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
