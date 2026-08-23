import type { Book, Review, AuthUser, Order, AdminOrder, AdminStats, GenreInfo, OrderStatus, AdminUser, SiteSettings } from '../types';

const TOKEN_KEY = 'booksellnp_token';
const CLIENT_CACHE: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 300000; // 5 minutes in ms

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cacheKey = `${options.method || 'GET'}:${path}:${options.body || ''}`;
  
  // Return cached data if available for GET requests
  if ((!options.method || options.method === 'GET') && CLIENT_CACHE[cacheKey]) {
    const entry = CLIENT_CACHE[cacheKey];
    if (Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data as T;
    }
  }

  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  // Security Firewall: Add secret token for admin requests
  if (path.startsWith('/api/admin')) {
    headers['x-admin-security-token'] = import.meta.env.VITE_ADMIN_PATH || 'default-secret-2063';
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }

  // Cache successful GET requests
  if (!options.method || options.method === 'GET') {
    CLIENT_CACHE[cacheKey] = { data, timestamp: Date.now() };
  } else if (options.method !== 'GET') {
    // Clear cache on mutations to ensure data freshness
    Object.keys(CLIENT_CACHE).forEach(key => delete CLIENT_CACHE[key]);
  }

  return data as T;
}

// Auth
export const authApi = {
  signup: (input: { email: string; password: string; displayName: string }) =>
    request<{ token: string; user: AuthUser }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  login: (input: { email: string; password: string; latitude?: number; longitude?: number; device?: string }) =>
    request<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ user: AuthUser }>('/api/auth/me'),
  updateProfile: (input: { displayName?: string; photoURL?: string }) =>
    request<{ user: AuthUser }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  requestPasswordReset: (email: string) =>
    request<{ message: string }>('/api/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/api/auth/password-reset/complete', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
};

// Books
export type BookSort = 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'title' | 'rating' | 'popular';

export const bookApi = {
  list: (params: { featured?: boolean; search?: string; genre?: string; limit?: number; sort?: BookSort } = {}) => {
    const q = new URLSearchParams();
    if (params.featured) q.set('featured', 'true');
    if (params.search) q.set('search', params.search);
    if (params.genre) q.set('genre', params.genre);
    if (params.limit) q.set('limit', String(params.limit));
    if (params.sort) q.set('sort', params.sort);
    const qs = q.toString();
    return request<{ books: Book[] }>(`/api/books${qs ? '?' + qs : ''}`);
  },
  get: (id: string) => request<{ book: Book }>(`/api/books/${id}`),
  genres: () => request<{ genres: GenreInfo[] }>('/api/books/genres'),
  create: (book: Partial<Book>) =>
    request<{ book: Book }>('/api/books', { method: 'POST', body: JSON.stringify(book) }),
  update: (id: string, book: Partial<Book>) =>
    request<{ book: Book }>(`/api/books/${id}`, { method: 'PUT', body: JSON.stringify(book) }),
  remove: (id: string) => request<{ ok: true }>(`/api/books/${id}`, { method: 'DELETE' }),
  reviews: (id: string) => request<{ reviews: Review[] }>(`/api/books/${id}/reviews`),
  addReview: (id: string, input: { rating: number; comment: string }) =>
    request<{ ok: true; id: string }>(`/api/books/${id}/reviews`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  removeReview: (bookId: string, reviewId: string) =>
    request<{ ok: true }>(`/api/books/${bookId}/reviews/${reviewId}`, { method: 'DELETE' }),
};

// Wishlist
export const wishlistApi = {
  ids: () => request<{ bookIds: string[] }>('/api/wishlist'),
  books: () => request<{ books: Book[] }>('/api/wishlist/books'),
  add: (bookId: string) =>
    request<{ ok: true }>(`/api/wishlist/${bookId}`, { method: 'POST' }),
  remove: (bookId: string) =>
    request<{ ok: true }>(`/api/wishlist/${bookId}`, { method: 'DELETE' }),
};

// Orders
export const orderApi = {
  create: (input: {
    items: { id: string; title: string; author: string; coverImage: string; price: number; quantity: number }[];
    customer: {
      email: string;
      firstName: string;
      lastName: string;
      phone: string;
      address: string;
      city?: string;
      zip?: string;
      country?: string;
      locationCoords?: { lat: number; lng: number } | null;
    };
  }) =>
    request<{ orderId: string; subtotal: number; shipping: number; total: number }>(
      '/api/orders',
      { method: 'POST', body: JSON.stringify(input) }
    ),
  mine: () => request<{ orders: Order[] }>('/api/orders/mine'),
  get: (id: string) => request<{ order: Order }>(`/api/orders/${id}`),
  cancel: (id: string) => request<{ ok: true }>(`/api/orders/${id}/cancel`, { method: 'POST' }),
};

// Admin
export const adminApi = {
  stats: () => request<AdminStats>('/api/admin/stats'),
  orders: (params: { status?: OrderStatus; search?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.search) q.set('search', params.search);
    if (params.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return request<{ orders: AdminOrder[] }>(`/api/admin/orders${qs ? '?' + qs : ''}`);
  },
  updateOrderStatus: (id: string, status: OrderStatus) =>
    request<{ ok: true }>(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  deleteOrder: (id: string) =>
    request<{ ok: true }>(`/api/admin/orders/${id}`, { method: 'DELETE' }),

  // Users
  users: (search?: string) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<{ users: AdminUser[] }>(`/api/admin/users${qs}`);
  },
  updateUserRole: (id: string, role: 'admin' | 'user') =>
    request<{ ok: true }>(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  deleteUser: (id: string) =>
    request<{ ok: true }>(`/api/admin/users/${id}`, { method: 'DELETE' }),

  // Site settings / theme
  getSettings: () => request<{ settings: SiteSettings | null }>(`/api/admin/settings`),
  saveSettings: (settings: SiteSettings) =>
    request<{ ok: true }>(`/api/admin/settings`, { method: 'PUT', body: JSON.stringify(settings) }),
};
