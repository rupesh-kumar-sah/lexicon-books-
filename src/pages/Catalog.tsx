import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  ChevronDown,
  X,
  ChevronLeft,
  ChevronRight,
  Tag,
  ArrowUpDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, GenreInfo } from '../types';
import { bookApi, BookSort } from '../lib/api';
import { cn } from '../lib/utils';
import BookCard from '../components/BookCard';

const ITEMS_PER_PAGE = 8;

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('q') || '';
  const initialGenre = searchParams.get('genre') || '';
  const initialSort = (searchParams.get('sort') as BookSort) || 'newest';

  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialGenre ? [initialGenre] : []);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<BookSort>(initialSort);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [allGenres, setAllGenres] = useState<GenreInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reflect search/sort in the URL
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (searchTerm) next.set('q', searchTerm);
    else next.delete('q');
    if (sortBy !== 'newest') next.set('sort', sortBy);
    else next.delete('sort');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, sortBy]);

  // Server-side fetch when search/sort/genre filter changes
  useEffect(() => {
    setLoading(true);
    setCurrentPage(1);
    bookApi
      .list({
        search: searchTerm || undefined,
        sort: sortBy,
        genre: selectedGenres.length === 1 ? selectedGenres[0] : undefined,
        limit: 200,
      })
      .then((res) => {
        if (res && Array.isArray(res.books)) {
          setBooks(res.books);
        }
      })
      .catch((e) => console.error('catalog load', e))
      .finally(() => setLoading(false));
  }, [searchTerm, sortBy, selectedGenres]);

  useEffect(() => {
    bookApi.genres().then(({ genres }) => setAllGenres(genres)).catch(() => {});
  }, []);

  // Client-side filtering for additional facets (price, multi-genre)
  const filteredBooks = useMemo(() => {
    let result = books;
    if (selectedGenres.length > 1) {
      result = result.filter((b) => selectedGenres.includes(b.genre));
    }
    if (priceRange[0] > 0 || priceRange[1] < 1000) {
      result = result.filter((b) => b.price >= priceRange[0] && b.price <= priceRange[1]);
    }
    return result;
  }, [books, selectedGenres, priceRange]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / ITEMS_PER_PAGE));
  const paginatedBooks = filteredBooks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
    setCurrentPage(1);
  };

  const filtersActive =
    selectedGenres.length > 0 || priceRange[0] > 0 || priceRange[1] < 1000;

  const resetAll = () => {
    setSelectedGenres([]);
    setPriceRange([0, 1000]);
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 relative overflow-hidden">
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 group w-full">
            <input
              type="text"
              placeholder="Search by title, author, or ISBN..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-2.5 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none min-w-[180px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as BookSort)}
                className="w-full pl-10 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="newest">Latest Release</option>
                <option value="popular">Reader Favorites</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="title">Alphabetical</option>
                <option value="rating">Top Rated</option>
              </select>
              <ArrowUpDown className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <ChevronDown className="absolute right-4 top-4 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <button
              onClick={() => setIsFilterOpen(true)}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all relative',
                filtersActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              )}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {selectedGenres.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white">
                  {selectedGenres.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex max-w-7xl mx-auto w-full flex-1">
        <main className="flex-1 p-8">
          <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">The Library</h2>
              <p className="text-slate-400 text-sm font-medium">
                Discover {filteredBooks.length} {filteredBooks.length === 1 ? 'title' : 'titles'} curated for your collection.
              </p>
            </div>
            {filtersActive && (
              <button
                onClick={resetAll}
                className="text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>

          {selectedGenres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {selectedGenres.map((g) => (
                <button
                  key={g}
                  onClick={() => toggleGenre(g)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-full hover:bg-rose-600 transition-colors"
                >
                  {g}
                  <X className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}

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
              <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {paginatedBooks.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-12 border-t border-slate-200">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
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
                            'w-10 h-10 rounded-xl text-xs font-bold transition-all',
                            currentPage === i + 1
                              ? 'bg-slate-900 text-white shadow-lg'
                              : 'bg-white border border-slate-200 text-slate-400 hover:border-blue-500 hover:text-blue-500'
                          )}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-24 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No volumes found</h3>
                <p className="text-slate-400 text-sm max-w-xs mx-auto">
                  We couldn't find any books matching your current search parameters.
                </p>
                <button
                  onClick={() => {
                    setSearchInput('');
                    resetAll();
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
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Refine your exploration
                  </p>
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
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Genres</h4>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {selectedGenres.length} selected
                    </span>
                  </header>
                  <div className="grid grid-cols-2 gap-3">
                    {allGenres.map((g) => (
                      <button
                        key={g.name}
                        onClick={() => toggleGenre(g.name)}
                        className={cn(
                          'px-4 py-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between',
                          selectedGenres.includes(g.name)
                            ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        <span>{g.name}</span>
                        {selectedGenres.includes(g.name) ? (
                          <Tag className="w-3 h-3 text-blue-400 fill-current" />
                        ) : (
                          <span className="text-[10px] text-slate-400">{g.count}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                    Price Range (${priceRange[0]} - ${priceRange[1]})
                  </h4>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="10"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="w-full accent-blue-600"
                  />
                </section>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-blue-600 transition-all shadow-xl active:scale-95"
                >
                  Show Results
                </button>
                <button
                  onClick={() => {
                    resetAll();
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
