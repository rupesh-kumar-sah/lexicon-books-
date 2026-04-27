export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  price: number;
  coverImage: string;
  isbn: string;
  genre: string;
  stock: number;
  rating: number;
  year: number;
  featured?: boolean;
}

export interface CartItem extends Book {
  quantity: number;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: number;
}

export interface Review {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: number;
}
