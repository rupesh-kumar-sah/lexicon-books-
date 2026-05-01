import { motion } from 'motion/react';
import {
  BookOpen,
  Truck,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Book, GenreInfo } from '../types';
import { bookApi } from '../lib/api';
import BookCard from '../components/BookCard';
import { useAuth } from '../context/AuthContext';
import { useRecentlyViewed } from '../context/RecentlyViewedContext';
import { useSiteSettings } from '../context/SiteSettingsContext';

const GENRE_GRADIENTS: Record<string, string> = {
  Fiction: 'from-rose-400 to-rose-600',
  'Non-Fiction': 'from-amber-400 to-orange-600',
  'Science Fiction': 'from-indigo-500 to-violet-700',
  Fantasy: 'from-fuchsia-500 to-purple-700',
  Mystery: 'from-slate-700 to-slate-900',
  Biography: 'from-emerald-500 to-teal-700',
  History: 'from-stone-500 to-stone-800',
  'Self-Help': 'from-sky-400 to-blue-600',
  Philosophy: 'from-cyan-500 to-blue-700',
  Poetry: 'from-pink-400 to-rose-600',
};

export default function Home() {
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
  const [popularBooks, setPopularBooks] = useState<Book[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [genres, setGenres] = useState<GenreInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, openAuthModal } = useAuth();
  const { recentIds } = useRecentlyViewed();
  const { settings } = useSiteSettings();

  useEffect(() => {
    Promise.all([
      bookApi.list({ featured: true, limit: 8 }),
      bookApi.list({ sort: 'popular', limit: 8 }),
      bookApi.list({ limit: 200 }),
      bookApi.genres(),
    ])
      .then(([featured, popular, all, g]) => {
        if (featured && featured.books) setFeaturedBooks(featured.books);
        if (popular && popular.books) setPopularBooks(popular.books);
        if (all && all.books) setAllBooks(all.books);
        if (g && g.genres) setGenres(g.genres);
      })
      .catch((e) => console.error('home load failed', e))
      .finally(() => setLoading(false));
  }, []);

  const recentBooks = useMemo(() => {
    if (recentIds.length === 0) return [];
    const map = new Map(allBooks.map((b) => [b.id, b]));
    return recentIds.map((id) => map.get(id)).filter((b): b is Book => Boolean(b)).slice(0, 4);
  }, [recentIds, allBooks]);

  return (
    <div className="bg-slate-50 min-h-full">
      {/* Hero */}
      <section className="bg-gradient-to-br from-white via-white to-blue-50 border-b border-slate-200 py-20 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-8 grid lg:grid-cols-5 gap-12 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3"
          >
            <span
              className="inline-flex items-center gap-2 text-[10px] px-3 py-1 rounded-full font-bold uppercase mb-5 text-white tracking-widest"
              style={{ background: 'var(--brand-primary)' }}
            >
              <Sparkles className="w-3 h-3" />
              Curated Reading
            </span>
            <h1 className="font-sans text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6 leading-[0.95]">
              {settings.tagline}
            </h1>
            <p className="text-lg text-slate-500 mb-10 max-w-xl font-medium">
              Explore our collection of limited editions, technical masterpieces, and modern classics
              handpicked for your next chapter.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/catalog"
                className="px-8 py-4 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all active:scale-95"
                style={{ background: 'var(--brand-primary)' }}
              >
                Browse Collection
              </Link>
              {!user && (
                <button
                  onClick={openAuthModal}
                  className="px-8 py-4 border border-slate-200 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Join {(settings?.siteName || 'BookSellNP').split(' ')[0]}
                </button>
              )}
            </div>

            <div className="flex items-center gap-8 mt-10 pt-10 border-t border-slate-200">
              <Stat label="Curated Titles" value={`${allBooks.length || '—'}`} />
              <Stat label="Genres" value={`${genres.length || '—'}`} />
              <Stat label="Avg Rating" value={
                allBooks.length > 0
                  ? (allBooks.reduce((s, b) => s + b.rating, 0) / allBooks.length).toFixed(1)
                  : '—'
              } />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-2 hidden lg:block"
          >
            <div className="grid grid-cols-2 gap-4">
              {featuredBooks.slice(0, 4).map((b, i) => (
                <Link
                  to={`/book/${b.id}`}
                  key={b.id}
                  className={`aspect-[3/4] rounded-2xl overflow-hidden shadow-xl border border-slate-200 hover:scale-[1.03] transition-transform ${
                    i % 2 === 0 ? 'translate-y-6' : ''
                  }`}
                >
                  <img
                    src={b.coverImage}
                    alt={b.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-blue-600 rounded-full blur-3xl opacity-5 pointer-events-none" />
      </section>

      {/* Genre tiles */}
      {genres.length > 0 && (
        <section className="max-w-7xl mx-auto px-8 py-16">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Browse</h3>
              <h2 className="text-3xl font-bold text-slate-900">By Genre</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {genres.slice(0, 10).map((g) => (
              <Link
                key={g.name}
                to={`/catalog?genre=${encodeURIComponent(g.name)}`}
                className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 hover:border-blue-400 transition-all hover:shadow-xl"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${
                    GENRE_GRADIENTS[g.name] || 'from-slate-400 to-slate-700'
                  } opacity-90 group-hover:opacity-100 transition-opacity`}
                />
                <div className="absolute inset-0 p-4 flex flex-col justify-between text-white">
                  <BookOpen className="w-5 h-5 opacity-80" />
                  <div>
                    <p className="text-[10px] font-bold uppercase opacity-80 tracking-widest">
                      {g.count} {g.count === 1 ? 'title' : 'titles'}
                    </p>
                    <p className="font-bold text-lg leading-tight">{g.name}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-8 pb-16">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              Featured
            </h3>
            <h2 className="text-3xl font-bold text-slate-900">New Arrivals</h2>
          </div>
          <Link to="/catalog" className="text-sm font-bold text-blue-700 hover:underline inline-flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white border border-slate-200 aspect-[3/4] rounded-2xl" />
            ))
          ) : featuredBooks.length > 0 ? (
            featuredBooks.slice(0, 4).map((book) => <BookCard key={book.id} book={book} />)
          ) : (
            <div className="col-span-full py-12 text-center bg-white border-2 border-dashed border-slate-100 rounded-3xl">
              <p className="text-slate-400 font-medium">
                No masterpieces currently highlighted. Explore the catalog to discover more.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Popular */}
      {popularBooks.length > 0 && (
        <section className="max-w-7xl mx-auto px-8 pb-16">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" />
                Trending
              </h3>
              <h2 className="text-3xl font-bold text-slate-900">Reader Favorites</h2>
            </div>
            <Link to="/catalog?sort=popular" className="text-sm font-bold text-blue-700 hover:underline inline-flex items-center gap-1">
              See More <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {popularBooks.slice(0, 4).map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}

      {/* Recently viewed */}
      {recentBooks.length > 0 && (
        <section className="max-w-7xl mx-auto px-8 pb-16">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                For You
              </h3>
              <h2 className="text-3xl font-bold text-slate-900">Recently Viewed</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {recentBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}

      {/* Trust signals */}
      <section className="border-y border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: BookOpen, title: 'Curated', desc: 'Expert picks only' },
            { icon: Truck, title: 'Global', desc: 'Express shipping' },
            { icon: ShieldCheck, title: 'Secure', desc: 'SSL protected' },
          ].map((item, i) => (
            <div key={i} className="flex gap-4 items-center">
              <div className="p-3 bg-blue-50 text-blue-700 rounded-full">
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 leading-none mb-1">{item.title}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{label}</p>
    </div>
  );
}
