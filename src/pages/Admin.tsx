import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Book as BookIcon, 
  ShoppingBag, 
  Users, 
  Settings, 
  Plus, 
  Search,
  MoreVertical,
  TrendingUp,
  Package,
  Clock,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  X,
  Upload,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  updateDoc, 
  doc, 
  onSnapshot, 
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { GENRES } from '../constants';
import { Order, Book } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('inventory');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      // Small delay and check to allow profile bootstrapping
    }
  }, [isAdmin, authLoading, navigate]);

  const openAddModal = () => {
    setSelectedBook(null);
    setModalMode('add');
  };

  const openEditModal = (book: Book) => {
    setSelectedBook(book);
    setModalMode('edit');
  };

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
          You are attempting to access the Lexiconn Books Command Center. This sector is reserved for authorized administrators only.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-bold shadow-xl hover:bg-blue-600 transition-all active:scale-95"
        >
          Return to Public Access
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-50">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">Management</p>
          <nav className="space-y-2">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Analytics' },
              { id: 'inventory', icon: BookIcon, label: 'Inventory' },
              { id: 'orders', icon: ShoppingBag, label: 'Transactions' },
              { id: 'customers', icon: Users, label: 'Clients' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                  activeTab === item.id 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                    : "text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        
        <div className="mt-auto p-8 border-t border-slate-100">
          <button className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-bold text-slate-400 hover:text-blue-700 transition-colors">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* Admin Content */}
      <main className="flex-1 p-12 overflow-y-auto relative">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="font-sans text-4xl font-bold mb-2 capitalize text-slate-900 tracking-tight">{activeTab}</h1>
            <p className="text-slate-400 text-sm font-medium">Monitoring Lexicon Books operational efficiency.</p>
          </div>
          <button 
            onClick={openAddModal}
            className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:hover:bg-blue-600 transition-all shadow-lg active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>System Entry</span>
          </button>
        </header>

        {activeTab === 'inventory' && <InventoryView onEdit={openEditModal} />}
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'orders' && <OrdersView />}

        <AnimatePresence>
          {modalMode && (
            <BookEntryModal 
              mode={modalMode} 
              book={selectedBook} 
              onClose={() => setModalMode(null)} 
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function BookEntryModal({ mode, book, onClose }: { mode: 'add' | 'edit', book?: Book | null, onClose: () => void }) {
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
    featured: book?.featured || false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock),
        rating: Number(formData.rating)
      };

      if (mode === 'edit' && book?.id) {
        await updateDoc(doc(db, 'books', book.id), data);
      } else {
        await addDoc(collection(db, 'books'), data);
      }
      onClose();
    } catch (err) {
      console.error(`Error ${mode === 'edit' ? 'updating' : 'adding'} book:`, err);
      alert(`Failed to ${mode === 'edit' ? 'update' : 'add'} book system entry.`);
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
              {mode === 'edit' ? 'Edit Entry' : 'System Entry'}
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              {mode === 'edit' ? 'Resource Modification' : 'New Resource Registration'}
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
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Title</label>
              <input 
                required
                type="text" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="The modern era..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Author</label>
              <input 
                required
                type="text" 
                value={formData.author}
                onChange={(e) => setFormData({...formData, author: e.target.value})}
                placeholder="John Doe"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Cover Image URL</label>
            <div className="flex gap-4">
              <input 
                required
                type="url" 
                value={formData.coverImage}
                onChange={(e) => setFormData({...formData, coverImage: e.target.value})}
                placeholder="https://images.unsplash.com/..."
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

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Description</label>
            <textarea 
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="A brief overview of the resource..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium resize-none"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Price ($)</label>
              <input 
                required
                type="number" 
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Stock</label>
              <input 
                required
                type="number" 
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Genre</label>
              <select 
                required
                value={formData.genre}
                onChange={(e) => setFormData({...formData, genre: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold uppercase tracking-widest appearance-none"
              >
                {GENRES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">ISBN</label>
              <input 
                required
                type="text" 
                value={formData.isbn}
                onChange={(e) => setFormData({...formData, isbn: e.target.value})}
                placeholder="000-00000"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Pub. Year</label>
              <input 
                required
                type="number" 
                min="1800"
                max={new Date().getFullYear()}
                value={formData.year}
                onChange={(e) => setFormData({...formData, year: Number(e.target.value)})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4 pt-4 border-t border-slate-50">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? 'Processing...' : mode === 'edit' ? 'Update Entry' : 'Complete Registration'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Orders error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus
      });
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'delivered': return 'bg-emerald-50 text-emerald-600';
      case 'cancelled': return 'bg-rose-50 text-rose-600';
      case 'shipped': return 'bg-blue-50 text-blue-600';
      case 'processing': return 'bg-amber-50 text-amber-600';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Order Reference</th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Items</th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-6">
                  <div className="font-bold text-slate-900 uppercase tracking-tight">#{order.id.slice(-6)}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">{order.stripeSessionId ? 'Stripe ID: ' + order.stripeSessionId.slice(0, 8) + '...' : 'Direct Entry'}</div>
                </td>
                <td className="px-8 py-6">
                  <div className="font-medium text-slate-700">{new Date(order.createdAt).toLocaleDateString()}</div>
                  <div className="text-[10px] text-slate-400">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex -space-x-2">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="w-8 h-10 rounded border border-white shadow-sm overflow-hidden bg-slate-100">
                        <img src={item.coverImage} className="w-full h-full object-cover" alt="" />
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="w-8 h-10 rounded border border-white shadow-sm bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                        +{order.items.length - 3}
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 mt-2">{order.items.length} Titles total</div>
                </td>
                <td className="px-8 py-6 font-bold text-slate-900">${order.total.toFixed(2)}</td>
                <td className="px-8 py-6">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight",
                    getStatusColor(order.status)
                  )}>
                    {order.status}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="relative group inline-block">
                    <button className="p-2 text-slate-400 hover:text-blue-700 transition-colors bg-slate-50 rounded-lg flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest">
                      Manage
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-slate-200 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-30 overflow-hidden">
                      {(['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as Order['status'][]).map((status) => (
                        <button
                          key={status}
                          onClick={() => updateStatus(order.id, status)}
                          className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-700 transition-colors border-b last:border-0 border-slate-100 flex items-center justify-between"
                        >
                          {status.toUpperCase()}
                          {order.status === status && <CheckCircle2 className="w-3 h-3 text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-medium italic">
                  No purchase transactions found in the ledger.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DashboardView() {
  const stats = [
    { label: 'Gross Revenue', value: '$45,231.89', change: '+12.5%', icon: TrendingUp },
    { label: 'Pending Sales', value: '156', change: '+5.2%', icon: Clock },
    { label: 'Active Lib', value: '1,204', change: '+12', icon: Package },
    { label: 'Cust. Sat.', value: '98%', change: '+0.2%', icon: CheckCircle2 }
  ];

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <stat.icon className="w-5 h-5" />
              </div>
              <span className={cn(
                "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tight",
                stat.change.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              )}>
                {stat.change}
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{stat.label}</p>
            <h3 className="text-3xl font-bold text-slate-900">{stat.value}</h3>
          </motion.div>
        ))}
      </div>
      
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 text-slate-100 mx-auto mb-4" />
          <p className="text-slate-400 text-sm font-medium">Real-time analytical metrics loading...</p>
        </div>
      </div>
    </div>
  );
}

function InventoryView({ onEdit }: { onEdit: (book: Book) => void }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Book; direction: 'asc' | 'desc' }>({
    key: 'title',
    direction: 'asc'
  });

  useEffect(() => {
    const q = query(collection(db, 'books'), orderBy('title'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const booksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Book[];
      setBooks(booksData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Inventory error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const requestSort = (key: keyof Book) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this resource from the library? This action is irreversible.")) {
      try {
        await deleteDoc(doc(db, 'books', id));
      } catch (err) {
        console.error('Error deleting book:', err);
        alert('Failed to delete resource.');
      }
    }
  };

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.isbn?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedBooks = [...filteredBooks].sort((a, b) => {
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];

    if (aVal === undefined || bVal === undefined) return 0;
    
    // String comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortConfig.direction === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    }
    
    // Number comparison
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: keyof Book }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600" /> 
      : <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <input 
            type="text" 
            placeholder="Search catalog index..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        </div>
        <div className="flex space-x-2">
          {GENRES.slice(0, 3).map(g => (
            <span key={g} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold uppercase tracking-widest leading-none flex items-center">{g}</span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50">
              <th 
                className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => requestSort('title')}
              >
                <div className="flex items-center">
                  Resource <SortIcon column="title" />
                </div>
              </th>
              <th 
                className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => requestSort('stock')}
              >
                <div className="flex items-center">
                  Status <SortIcon column="stock" />
                </div>
              </th>
              <th 
                className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => requestSort('price')}
              >
                <div className="flex items-center">
                  Valuation <SortIcon column="price" />
                </div>
              </th>
              <th 
                className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => requestSort('rating')}
              >
                <div className="flex items-center">
                  Score <SortIcon column="rating" />
                </div>
              </th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Tools</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-8 py-6 h-20 bg-slate-50/20" />
                </tr>
              ))
            ) : sortedBooks.map((book) => (
              <tr key={book.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-14 bg-slate-100 rounded border border-slate-100 overflow-hidden shrink-0 shadow-sm">
                       <img src={book.coverImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{book.title}</h4>
                      <p className="text-xs text-blue-700 font-medium">{book.author} • {book.genre}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-20 bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div className={cn(
                        "h-full transition-all",
                        book.stock > 10 ? "bg-emerald-500" : book.stock > 0 ? "bg-amber-500" : "bg-rose-500"
                      )} style={{ width: `${Math.min(100, (book.stock / 50) * 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-900 uppercase">{book.stock} Units</span>
                  </div>
                </td>
                <td className="px-8 py-6 font-bold text-sm text-slate-900">${book.price.toFixed(2)}</td>
                <td className="px-8 py-6">
                  <div className="flex items-center text-blue-600">
                    <Star className="w-3 h-3 fill-current mr-1" />
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
                        onClick={() => book.id && handleDelete(book.id)}
                        className="w-full text-left px-4 py-3 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
            {filteredBooks.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium italic">
                  No matches found in the inventory library.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Star({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
