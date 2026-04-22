import { motion } from 'motion/react';
import { ArrowRight, Star, BookOpen, Truck, ShieldCheck, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Book } from '../types';
import BookCard from '../components/BookCard';
import { useAuth } from '../context/AuthContext';
import { seedBooks } from '../seed';

export default function Home() {
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, signIn } = useAuth();

  const handleSeed = async () => {
    if (confirm("Seed initial data?")) {
      await seedBooks();
      window.location.reload();
    }
  };

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const q = query(collection(db, 'books'), where('featured', '==', true), limit(8));
        const snap = await getDocs(q);
        const books = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Book));
        setFeaturedBooks(books);
      } catch (err) {
        console.error("Error fetching featured books:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchFeatured();
  }, []);

  return (
    <div className="bg-slate-50 min-h-full">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200 py-20 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-3xl"
          >
            <span className="bg-blue-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase mb-4 inline-block text-white">Summer Reading Series</span>
            <h1 className="font-sans text-6xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6 leading-[0.9]">
              Curated <br /><span className="text-blue-700">Selections</span> <br />for the Modern Mind.
            </h1>
            <p className="text-lg text-slate-500 mb-10 max-w-xl font-medium">
              Explore our collection of limited editions, technical masterpieces, and modern classics handpicked for your next holiday escape.
            </p>
            <div className="flex gap-4">
              <Link to="/catalog" className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">
                Browse Collection
              </Link>
              {isAdmin ? (
                <button 
                  onClick={handleSeed}
                  className="px-8 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  Seed Data
                </button>
              ) : (
                <button onClick={signIn} className="px-8 py-4 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all">
                  Join Lexicon
                </button>
              )}
            </div>
          </motion.div>
        </div>
        {/* Abstract background element */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-blue-600 rounded-full blur-3xl opacity-5 pointer-events-none"></div>
      </section>

      {/* Grid Highlights */}
      <section className="max-w-7xl mx-auto px-8 py-16">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Featured</h3>
            <h2 className="text-3xl font-bold text-slate-900">New Arrivals</h2>
          </div>
          <Link to="/catalog" className="text-sm font-bold text-blue-700 hover:underline">View All &rarr;</Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white border border-slate-200 aspect-[3/4] rounded-xl" />
            ))
          ) : featuredBooks.length > 0 ? (
            featuredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))
          ) : (
            <div className="col-span-full py-12 text-center bg-white border-2 border-dashed border-slate-100 rounded-3xl">
              <p className="text-slate-400 font-medium">No masterpieces currently highlighted. Explore the catalog to discover more.</p>
            </div>
          )}
        </div>
      </section>

      {/* Trust Signals bar */}
      <section className="border-y border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: BookOpen, title: "Curated", desc: "Expert picks only" },
            { icon: Truck, title: "Global", desc: "Express shipping" },
            { icon: ShieldCheck, title: "Secure", desc: "SSL protected" },
            { icon: RotateCcw, title: "Easy", desc: "30-day returns" }
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
