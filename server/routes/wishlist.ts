import { Router } from 'express';
import { query } from '../db';
import { requireAuth } from '../auth';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await query<{ book_id: string }>(
      'SELECT book_id FROM wishlist_items WHERE user_id = $1 ORDER BY added_at DESC',
      [req.user!.id]
    );
    res.json({ bookIds: result.rows.map((r) => r.book_id) });
  } catch (e) {
    console.error('list wishlist', e);
    res.status(500).json({ error: 'Failed to load wishlist' });
  }
});

router.get('/books', requireAuth, async (req, res) => {
  try {
    const result = await query<any>(
      `SELECT b.* FROM wishlist_items w
       JOIN books b ON b.id = w.book_id
       WHERE w.user_id = $1
       ORDER BY w.added_at DESC`,
      [req.user!.id]
    );
    res.json({
      books: result.rows.map((r) => ({
        id: r.id,
        title: r.title,
        author: r.author,
        description: r.description,
        price: Number(r.price),
        coverImage: r.cover_image,
        isbn: r.isbn,
        genre: r.genre,
        stock: r.stock,
        rating: Number(r.rating),
        year: r.year,
        featured: r.featured,
      })),
    });
  } catch (e) {
    console.error('list wishlist books', e);
    res.status(500).json({ error: 'Failed to load wishlist books' });
  }
});

router.post('/:bookId', requireAuth, async (req, res) => {
  try {
    await query(
      `INSERT INTO wishlist_items (user_id, book_id) VALUES ($1, $2)
       ON CONFLICT (user_id, book_id) DO NOTHING`,
      [req.user!.id, req.params.bookId]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('add wishlist', e);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

router.delete('/:bookId', requireAuth, async (req, res) => {
  try {
    await query('DELETE FROM wishlist_items WHERE user_id = $1 AND book_id = $2', [
      req.user!.id,
      req.params.bookId,
    ]);
    res.json({ ok: true });
  } catch (e) {
    console.error('remove wishlist', e);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

export default router;
