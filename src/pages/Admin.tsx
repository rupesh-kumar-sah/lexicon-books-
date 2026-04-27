import { useState, useEffect } from 'react';
import { LayoutDashboard, Book as BookIcon, Settings, Plus, Search, MoveVertical as MoreVertical, X, Image as ImageIcon, ArrowUp, ArrowDown, ArrowUpDown, ShieldAlert, Loader as Loader2, Star as StarIcon, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { bookApi } from '../lib/api';
import { cn } from '../lib/utils';
import { GENRES } from '../constants';
import { Book } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Admin() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'inventory' | 'dashboard'>('inventory');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Verifying Credentials...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white p-12 text-center">
        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-rose-500/10">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">Access Restricted</h1>
        <p className="text-slate-500 max-w-md mx-auto leading-relaxed mb-12">
          This area is reserved for administrators only.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-bold shadow-xl hover:bg-blue-600 transition-all active:scale-95"
        >
          Return Home
        </button>
      </div>
    );
  }

  const openAdd = () => {
    setSelectedBook(null);
    setModalMode('add');
  };
  const openEdit = (b: Book) => {
    setSelectedBook(b);
    setModalMode('edit');
  };
  const closeModal = () => setModalMode(null);
  const onSaved = () => {
    closeModal();
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex h-full bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">Management</p>
          <nav className="space-y-2">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Analytics' },
              { id: 'inventory', icon: BookIcon, label: 'Inventory' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={cn(
                  'w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold transition-all',
                  activeTab === item.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-blue-700'
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-slate-100 space-y-2">
          <Link
            to="/sql"
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-blue-700 transition-colors"
          >
            <Terminal className="w-4 h-4" />
            <span>SQL Editor</span>
          </Link>
          <button className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-bold text-slate-400 hover:text-blue-700 transition-colors">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto relative">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="font-sans text-4xl font-bold mb-2 capitalize text-slate-900 tracking-tight">
              {activeTab}
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              Manage your Lexiconn Books inventory.
            </p>
          </div>
          {activeTab === 'inventory' && (
            <button
              onClick={openAdd}
              className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-600 transition-all shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Book</span>
            </button>
          )}
        </header>

        {activeTab === 'inventory' && <InventoryView key={refreshKey} onEdit={openEdit} />}
        {activeTab === 'dashboard' && <DashboardView />}

        <AnimatePresence>
          {modalMode && (
            <BookEntryModal mode={modalMode} book={selectedBook} onClose={closeModal} onSaved={onSaved} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function DashboardView() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[
        { label: 'Total Books', value: '—', helper: 'Library inventory' },
        { label: 'New Today', value: '—', helper: 'Reader sign-ups' },
        { label: 'Open Orders', value: '—', helper: 'Awaiting shipment' },
      ].map((c, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{c.label}</p>
          <p className="text-4xl font-bold text-slate-900">{c.value}</p>
          <p className="text-xs text-slate-400 mt-2">{c.helper}</p>
        </div>
      ))}
    </div>
  );
}

function BookEntryModal({
  mode,
  book,
  onClose,
  onSaved,
}: {
  mode: 'add' | 'edit';
  book?: Book | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [formData, setFormData] = useState<Partial<Book>>({
    title: book?.title || '',
    author: book?.author || '',
    description: book?.description || '',
    price: book?.price || 0,
    coverImage: book?.coverImage || '',
    isbn: book?.isbn || '',
    genre: book?.genre || GENRES[0],
    stock: book?.stock || 0,
    rating: book?.rating || 5,
    year: book?.year || new Date().getFullYear(),
    featured: book?.featured || false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (mode === 'edit' && book?.id) {
        await bookApi.update(book.id, formData);
      } else {
        await bookApi.create(formData);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {mode === 'edit' ? 'Edit Book' : 'New Book'}
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              {mode === 'edit' ? 'Update inventory entry' : 'Register a new title'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-rose-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Title" required value={formData.title} onChange={(v) => setFormData({ ...formData, title: v })} />
            <Field label="Author" required value={formData.author} onChange={(v) => setFormData({ ...formData, author: v })} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Cover Image URL</label>
            <div className="flex gap-4">
              <input
                required
                type="url"
                value={formData.coverImage || ''}
                onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                placeholder="https://..."
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
              />
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                {formData.coverImage ? (
                  <img src={formData.coverImage} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-slate-300" />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Description</label>
            <textarea
              required
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium resize-none"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Field label="Price ($)" required type="number" step="0.01" min="0" value={String(formData.price ?? 0)} onChange={(v) => setFormData({ ...formData, price: Number(v) })} />
            <Field label="Stock" required type="number" min="0" value={String(formData.stock ?? 0)} onChange={(v) => setFormData({ ...formData, stock: Number(v) })} />
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Genre</label>
              <select
                required
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold uppercase tracking-widest appearance-none"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <Field label="ISBN" required value={formData.isbn || ''} onChange={(v) => setFormData({ ...formData, isbn: v })} />
            <Field label="Year" required type="number" min="1" max={String(new Date().getFullYear())} value={String(formData.year ?? new Date().getFullYear())} onChange={(v) => setFormData({ ...formData, year: Number(v) })} />
            <Field label="Rating" required type="number" min="0" max="5" step="0.1" value={String(formData.rating ?? 5)} onChange={(v) => setFormData({ ...formData, rating: Number(v) })} />
            <label className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={!!formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-xs font-bold text-slate-700">Featured</span>
            </label>
          </div>

          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex items-center space-x-4 pt-4 border-t border-slate-50">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update Book' : 'Create Book'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">{label}</label>
      <input
        required={required}
        type={type}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
      />
    </div>
  );
}

function InventoryView({ onEdit }: { onEdit: (book: Book) => void }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Book; direction: 'asc' | 'desc' }>({
    key: 'title',
    direction: 'asc',
  });

  const reload = () => {
    setLoading(true);
    bookApi
      .list({ limit: 500 })
      .then(({ books }) => setBooks(books))
      .catch((e) => console.error('inventory load', e))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this book? This cannot be undone.')) return;
    try {
      await bookApi.remove(id);
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to delete book.');
    }
  };

  const requestSort = (key: keyof Book) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const filtered = books.filter(
    (b) =>
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.isbn?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (aVal === undefined || bVal === undefined) return 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: keyof Book }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50">
              <Th onClick={() => requestSort('title')}>Title <SortIcon column="title" /></Th>
              <Th onClick={() => requestSort('stock')}>Stock <SortIcon column="stock" /></Th>
              <Th onClick={() => requestSort('price')}>Price <SortIcon column="price" /></Th>
              <Th onClick={() => requestSort('rating')}>Rating <SortIcon column="rating" /></Th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-8 py-6 h-20 bg-slate-50/20" />
                </tr>
              ))
            ) : sorted.length > 0 ? (
              sorted.map((book) => (
                <tr key={book.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-14 bg-slate-100 rounded border border-slate-100 overflow-hidden shrink-0 shadow-sm">
                        <img src={book.coverImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{book.title}</h4>
                        <p className="text-xs text-blue-700 font-medium">
                          {book.author} • {book.genre}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-20 bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all',
                            book.stock > 10
                              ? 'bg-emerald-500'
                              : book.stock > 0
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          )}
                          style={{ width: `${Math.min(100, (book.stock / 50) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-900 uppercase">{book.stock} units</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 font-bold text-sm text-slate-900">${book.price.toFixed(2)}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center text-blue-600">
                      <StarIcon className="w-3 h-3 fill-current mr-1" />
                      <span className="text-xs font-bold text-slate-900">{book.rating}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="relative group inline-block">
                      <button className="p-2 text-slate-300 hover:text-blue-700 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl border border-slate-200 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-30 overflow-hidden text-[10px] font-bold uppercase tracking-widest">
                        <button
                          onClick={() => onEdit(book)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 hover:text-blue-600 transition-colors border-b border-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(book.id)}
                          className="w-full text-left px-4 py-3 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium italic">
                  No matches found in the inventory.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <th
      onClick={onClick}
      className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-blue-600 transition-colors"
    >
      <div className="flex items-center">{children}</div>
    </th>
  );
}
