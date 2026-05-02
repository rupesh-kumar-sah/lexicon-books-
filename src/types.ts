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
  reviewCount?: number;
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

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: string;
  title: string;
  author: string;
  coverImage: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress: string;
  locationCoords?: { lat: number; lng: number } | null;
  createdAt: number;
}

export interface AdminOrder extends Order {
  userId?: string | null;
  customerEmail: string;
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

export interface AdminStats {
  totalBooks: number;
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  lowStockCount: number;
  topGenres: { genre: string; count: number }[];
  recentOrders: {
    id: string;
    customerName: string;
    customerEmail: string;
    total: number;
    status: OrderStatus;
    itemCount: number;
    createdAt: number;
  }[];
  dailyOrders: { day: string; count: number; revenue: number }[];
  statusCounts: Record<string, number>;
}

export interface GenreInfo {
  name: string;
  count: number;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  createdAt: number;
  orderCount: number;
  totalSpent: number;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  heroImage: string;
  updatedAt?: number;
  shippingKtm: number;
  shippingOutside: number;
  freeShippingThreshold: number;
  footerText1: string;
  footerText2: string;
  footerText3: string;
  footerLink1: string;
  footerLink2: string;
  footerCompany: string;
  privacyContent: string;
  termsContent: string;
}
