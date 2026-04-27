import { motion } from 'motion/react';
import { BookOpen, Truck, ShieldCheck, RotateCcw, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Book } from '../types';
import { bookApi } from '../lib/api';
import BookCard from '../components/BookCard';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, openAuthModal } = useAuth();

  useEffect(() => {
    bookApi
      .list({ featured: true, limit: 8 })
      .then(({ books }) => setFeaturedBooks(books))
      .catch((e) => console.error('Featured load failed', e))
      .finally(() => setLoading(false));
  }, []);

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
            <span className="inline-flex items-center gap-2 bg-blue-600 text-[10px] px-3 py-1 rounded-full font-bold uppercase mb-5 text-white tracking-widest">
              <Sparkles className="w-3 h-3" />
              Curated Reading
            </span>
            <h1 className="font-sans text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6 leading-[0.95]">
              Curated <br />
              <span className="text-blue-700">Selections</span> <br />
              for the Modern Mind.
            </h1>
            <p className="text-lg text-slate-500 mb-10 max-w-xl font-medium">
              Explore our collection of limited editions, technical masterpieces, and modern classics
              handpicked for your next holiday escape.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/catalog"
                className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
              >
                Browse Collection
              </Link>
              {!user && (
                <button
                  onClick={openAuthModal}
                  className="px-8 py-4 border border-slate-200 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Join Lexicon
                </button>
              )}
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
                <div
                  key={b.id}
                  className={`aspect-[3/4] rounded-2xl overflow-hidden shadow-xl border border-slate-200 ${
                    i % 2 === 0 ? 'translate-y-6' : ''
                  }`}
                >
                  <img src={b.coverImage} alt={b.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-blue-600 rounded-full blur-3xl opacity-5 pointer-events-none" />
      </section>

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-8 py-16">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Featured</h3>
            <h2 className="text-3xl font-bold text-slate-900">New Arrivals</h2>
          </div>
          <Link to="/catalog" className="text-sm font-bold text-blue-700 hover:underline">
            View All &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white border border-slate-200 aspect-[3/4] rounded-xl" />
            ))
          ) : featuredBooks.length > 0 ? (
            featuredBooks.map((book) => <BookCard key={book.id} book={book} />)
          ) : (
            <div className="col-span-full py-12 text-center bg-white border-2 border-dashed border-slate-100 rounded-3xl">
              <p className="text-slate-400 font-medium">
                No masterpieces currently highlighted. Explore the catalog to discover more.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Trust signals */}
      <section className="border-y border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: BookOpen, title: 'Curated', desc: 'Expert picks only' },
            { icon: Truck, title: 'Global', desc: 'Express shipping' },
            { icon: ShieldCheck, title: 'Secure', desc: 'SSL protected' },
            { icon: RotateCcw, title: 'Easy', desc: '30-day returns' },
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
