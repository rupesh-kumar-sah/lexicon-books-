import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import BookDetail from './pages/BookDetail';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import Profile from './pages/Profile';
import Checkout from './pages/Checkout';
import Admin from './pages/Admin';
import OrderSuccess from './pages/OrderSuccess';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/book/:id" element={<BookDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="/order-success" element={<OrderSuccess />} />
        </Routes>
      </Layout>
    </Router>
  );
}
