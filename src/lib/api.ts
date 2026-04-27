import type { Book, Review, AuthUser, Order } from '../types';

const TOKEN_KEY = 'lexiconn_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
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
  return data as T;
}

// Auth
export const authApi = {
  signup: (input: { email: string; password: string; displayName: string }) =>
    request<{ token: string; user: AuthUser }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  login: (input: { email: string; password: string }) =>
    request<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ user: AuthUser }>('/api/auth/me'),
};

// Books
export const bookApi = {
  list: (params: { featured?: boolean; search?: string; genre?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.featured) q.set('featured', 'true');
    if (params.search) q.set('search', params.search);
    if (params.genre) q.set('genre', params.genre);
    if (params.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return request<{ books: Book[] }>(`/api/books${qs ? '?' + qs : ''}`);
  },
  get: (id: string) => request<{ book: Book }>(`/api/books/${id}`),
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
      address: string;
      city?: string;
      zip?: string;
      country?: string;
    };
  }) =>
    request<{ orderId: string; subtotal: number; shipping: number; total: number }>(
      '/api/orders',
      { method: 'POST', body: JSON.stringify(input) }
    ),
  mine: () => request<{ orders: Order[] }>('/api/orders/mine'),
};
