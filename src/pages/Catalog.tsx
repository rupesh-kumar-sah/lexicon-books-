import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  ChevronDown, 
  BookOpen, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  SortAsc, 
  Star as StarIcon,
  Tag,
  ArrowUpDown
} from 'lucide-react';
import { GENRES } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, limit, getDocs, orderBy, startAfter } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Book } from '../types';
import { cn } from '../lib/utils';
import BookCard from '../components/BookCard';

const ITEMS_PER_PAGE = 8;

type SortOption = 'newest' | 'price-low' | 'price-high' | 'title' | 'rating';

export default function Catalog() {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [yearRange, setYearRange] = useState<[number, number]>([1900, new Date().getFullYear()]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Derived data for filters
  const authors = useMemo(() => {
    return Array.from(new Set(books.map(b => b.author))).sort();
  }, [books]);

  useEffect(() => {
    async function fetchBooks() {
      setLoading(true);
      try {
        // Since Firebase doesn't support complex full-text search without a 3rd party,
        // and we have multiple filters/sorting, we'll fetch a larger set and filter/sort client-side for this demo,
        // OR we can implement multiple queries.
        // For a true "production" app we'd use Algolia or similar.
        // Here we'll do a basic query and apply filters.
        
        let q = query(collection(db, 'books'), limit(100)); // Fetch up to 100 for client-side sorting/filtering
        
        const snap = await getDocs(q);
        const booksData = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Book));
        setBooks(booksData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchBooks();
  }, []);

  const filteredAndSortedBooks = useMemo(() => {
    let result = [...books];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(book => 
        book.title.toLowerCase().includes(term) ||
        book.author.toLowerCase().includes(term) ||
        book.isbn.toLowerCase().includes(term)
      );
    }

    // Genre Filter
    if (selectedGenres.length > 0) {
      result = result.filter(book => selectedGenres.includes(book.genre));
    }

    // Author Filter
    if (selectedAuthors.length > 0) {
      result = result.filter(book => selectedAuthors.includes(book.author));
    }

    // Price Filter
    result = result.filter(book => book.price >= priceRange[0] && book.price <= priceRange[1]);

    // Year Filter
    result = result.filter(book => {
      const year = book.year || 2024; // Fallback for old data
      return year >= yearRange[0] && year <= yearRange[1];
    });

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        case 'title': return a.title.localeCompare(b.title);
        case 'rating': return b.rating - a.rating;
        case 'newest': return (b.year || 0) - (a.year || 0);
        default: return 0;
      }
    });

    return result;
  }, [books, searchTerm, selectedGenres, selectedAuthors, priceRange, yearRange, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedBooks.length / ITEMS_PER_PAGE);
  const paginatedBooks = filteredAndSortedBooks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 relative overflow-hidden">
      {/* Top Search & Filter Bar */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 group">
            <input 
              type="text" 
              placeholder="Search by title, author, or ISBN..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none min-w-[160px]">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full pl-10 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="newest">Latest Release</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="title">Alphabetical</option>
                <option value="rating">Top Rated</option>
              </select>
              <ArrowUpDown className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <ChevronDown className="absolute right-4 top-4 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <button 
              onClick={() => setIsFilterOpen(true)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all relative",
                (selectedGenres.length > 0 || selectedAuthors.length > 0 || priceRange[0] > 0 || priceRange[1] < 1000 || yearRange[0] > 1900)
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {(selectedGenres.length + selectedAuthors.length) > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white">
                  {selectedGenres.length + selectedAuthors.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex max-w-7xl mx-auto w-full flex-1">
        {/* Main Grid */}
        <main className="flex-1 p-8">
          <div className="flex justify-between items-center mb-10">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">The Library</h2>
              <p className="text-slate-400 text-sm font-medium">Discover {filteredAndSortedBooks.length} titles curated for your collection.</p>
            </div>
            
            {selectedGenres.length > 0 || selectedAuthors.length > 0 || priceRange[0] > 0 || priceRange[1] < 1000 || yearRange[0] > 1900 ? (
              <button 
                onClick={() => {
                  setSelectedGenres([]);
                  setSelectedAuthors([]);
                  setPriceRange([0, 1000]);
                  setYearRange([1900, new Date().getFullYear()]);
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors"
              >
                Clear all filters
              </button>
            ) : null}
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
              >
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-white border border-slate-200 aspect-[3/4] rounded-3xl" />
                ))}
              </motion.div>
            ) : paginatedBooks.length > 0 ? (
              <motion.div 
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-12"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {paginatedBooks.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-12 border-t border-slate-200">
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                      className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <div className="flex gap-2">
                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={cn(
                            "w-10 h-10 rounded-xl text-xs font-bold transition-all",
                            currentPage === i + 1 
                              ? "bg-slate-900 text-white shadow-lg" 
                              : "bg-white border border-slate-200 text-slate-400 hover:border-blue-500 hover:text-blue-500"
                          )}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>

                    <button 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                      className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-24 text-center"
              >
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No volumes found</h3>
                <p className="text-slate-400 text-sm max-w-xs mx-auto">We couldn't find any books matching your current search parameters.</p>
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedGenres([]);
                  }}
                  className="mt-8 text-blue-600 font-bold text-sm hover:underline"
                >
                  Reset all criteria
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Slide-out / Modal Filters */}
      <AnimatePresence>
        {isFilterOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Volume Filters</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Refine your exploration</p>
                </div>
                <button 
                  onClick={() => setIsFilterOpen(false)}
                  className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-rose-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10">
                <section>
                  <header className="flex justify-between items-center mb-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Genres</h4>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{selectedGenres.length} selected</span>
                  </header>
                  <div className="grid grid-cols-2 gap-3">
                    {GENRES.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => toggleGenre(genre)}
                        className={cn(
                          "px-4 py-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between",
                          selectedGenres.includes(genre)
                            ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        {genre}
                        {selectedGenres.includes(genre) && <Tag className="w-3 h-3 text-blue-400 fill-current" />}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <header className="flex justify-between items-center mb-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Authors</h4>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{selectedAuthors.length} selected</span>
                  </header>
                  <div className="flex flex-wrap gap-2">
                    {authors.slice(0, 12).map((author) => (
                      <button
                        key={author}
                        onClick={() => setSelectedAuthors(prev => prev.includes(author) ? prev.filter(a => a !== author) : [...prev, author])}
                        className={cn(
                          "px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all",
                          selectedAuthors.includes(author)
                            ? "bg-blue-600 text-white border-blue-600 shadow-md"
                            : "bg-white border-slate-200 text-slate-600 hover:border-blue-400"
                        )}
                      >
                        {author}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Price Range (${priceRange[0]} - ${priceRange[1]})</h4>
                  <div className="space-y-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="1000" 
                      step="10"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                      className="w-full accent-blue-600"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>$0</span>
                      <span>$1000+</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Publication Period ({yearRange[0]} - {yearRange[1]})</h4>
                  <div className="space-y-4">
                    <input 
                      type="range" 
                      min="1900" 
                      max={new Date().getFullYear()} 
                      step="1"
                      value={yearRange[0]}
                      onChange={(e) => setYearRange([Number(e.target.value), yearRange[1]])}
                      className="w-full accent-blue-600"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>1900</span>
                      <span>{new Date().getFullYear()}</span>
                    </div>
                  </div>
                </section>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                <button 
                  onClick={() => setIsFilterOpen(false)}
                  className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl hover:hover:bg-blue-600 transition-all shadow-xl active:scale-95"
                >
                  Show Results
                </button>
                <button 
                  onClick={() => {
                    setSelectedGenres([]);
                    setSelectedAuthors([]);
                    setPriceRange([0, 1000]);
                    setYearRange([1900, new Date().getFullYear()]);
                    setIsFilterOpen(false);
                  }}
                  className="px-6 py-4 bg-white border border-slate-200 text-slate-500 font-bold rounded-2xl hover:bg-slate-100 transition-all"
                >
                  Reset
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
