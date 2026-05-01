import { Router } from 'express';
import { query } from '../db';
import { newId, requireAdmin, requireAuth } from '../auth';

const router = Router();

const BOOK_BASE_SELECT = `
  WITH book_stats AS (
    SELECT book_id, COUNT(id)::int AS review_count, COALESCE(AVG(rating), 0) AS avg_rating
    FROM reviews
    GROUP BY book_id
  )
  SELECT b.*,
         COALESCE(s.review_count, 0) AS review_count,
         COALESCE(s.avg_rating, 0) AS avg_rating
  FROM books b
  LEFT JOIN book_stats s ON s.book_id = b.id
`;

function rowToBook(r: any) {
  const reviewCount = Number(r.review_count || 0);
  const avgRating = Number(r.avg_rating || 0);
  return {
    id: r.id,
    title: r.title,
    author: r.author,
    description: r.description,
    price: Number(r.price),
    coverImage: r.cover_image,
    isbn: r.isbn,
    genre: r.genre,
    stock: r.stock,
    rating: reviewCount > 0 ? Number(avgRating.toFixed(2)) : Number(r.rating),
    reviewCount,
    year: r.year,
    featured: r.featured,
  };
}

router.get('/', async (req, res) => {
  try {
    const { featured, search, genre, limit, sort } = req.query;
    const where: string[] = [];
    const params: any[] = [];

    if (featured === 'true') {
      where.push('b.featured = true');
    }
    if (typeof search === 'string' && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      where.push(
        `(LOWER(b.title) LIKE $${params.length} OR LOWER(b.author) LIKE $${params.length} OR LOWER(b.isbn) LIKE $${params.length})`
      );
    }
    if (typeof genre === 'string' && genre.trim()) {
      params.push(genre);
      where.push(`b.genre = $${params.length}`);
    }

    let sql = BOOK_BASE_SELECT;
    if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');

    switch (sort) {
      case 'price-asc':
        sql += ' ORDER BY b.price ASC';
        break;
      case 'price-desc':
        sql += ' ORDER BY b.price DESC';
        break;
      case 'title':
        sql += ' ORDER BY b.title ASC';
        break;
      case 'rating':
        sql += ' ORDER BY b.rating DESC';
        break;
      case 'popular':
        sql += ' ORDER BY review_count DESC, b.featured DESC';
        break;
      case 'oldest':
        sql += ' ORDER BY b.created_at ASC';
        break;
      default:
        sql += ' ORDER BY b.created_at DESC';
    }

    const lim = Number(limit);
    if (Number.isFinite(lim) && lim > 0 && lim <= 500) {
      sql += ` LIMIT ${Math.floor(lim)}`;
    } else {
      sql += ' LIMIT 200';
    }

    const result = await query(sql, params);
    res.json({ books: result.rows.map(rowToBook) });
  } catch (e: any) {
    console.error('list books error', e);
    res.status(500).json({ error: 'Failed to load books' });
  }
});

router.get('/genres', async (_req, res) => {
  try {
    const result = await query<{ genre: string; count: string }>(
      `SELECT genre, COUNT(*)::text AS count FROM books GROUP BY genre ORDER BY genre ASC`
    );
    res.json({
      genres: result.rows.map((r) => ({ name: r.genre, count: Number(r.count) })),
    });
  } catch (e) {
    console.error('list genres', e);
    res.status(500).json({ error: 'Failed to load genres' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await query(`${BOOK_BASE_SELECT} WHERE b.id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Book not found' });
    res.json({ book: rowToBook(result.rows[0]) });
  } catch (e: any) {
    console.error('get book error', e);
    res.status(500).json({ error: 'Failed to load book' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.title?.trim() || !b.author?.trim()) {
      return res.status(400).json({ error: 'Title and author are required' });
    }
    const id = newId();
    await query(
      `INSERT INTO books (id, title, author, description, price, cover_image, isbn, genre, stock, rating, year, featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        id,
        b.title.trim(),
        b.author.trim(),
        b.description || '',
        Number(b.price) || 0,
        b.coverImage || '',
        b.isbn || '',
        b.genre || 'Fiction',
        Number(b.stock) || 0,
        Math.max(0, Math.min(5, Number(b.rating) || 0)),
        Number(b.year) || new Date().getFullYear(),
        Boolean(b.featured),
      ]
    );
    const result = await query(`${BOOK_BASE_SELECT} WHERE b.id = $1`, [id]);
    res.json({ book: rowToBook(result.rows[0]) });
  } catch (e: any) {
    console.error('create book error', e);
    res.status(500).json({ error: 'Failed to create book' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    await query(
      `UPDATE books SET
         title = COALESCE($2, title),
         author = COALESCE($3, author),
         description = COALESCE($4, description),
         price = COALESCE($5, price),
         cover_image = COALESCE($6, cover_image),
         isbn = COALESCE($7, isbn),
         genre = COALESCE($8, genre),
         stock = COALESCE($9, stock),
         rating = COALESCE($10, rating),
         year = COALESCE($11, year),
         featured = COALESCE($12, featured)
       WHERE id = $1`,
      [
        req.params.id,
        b.title ?? null,
        b.author ?? null,
        b.description ?? null,
        b.price !== undefined ? Number(b.price) : null,
        b.coverImage ?? null,
        b.isbn ?? null,
        b.genre ?? null,
        b.stock !== undefined ? Number(b.stock) : null,
        b.rating !== undefined ? Number(b.rating) : null,
        b.year !== undefined ? Number(b.year) : null,
        b.featured !== undefined ? Boolean(b.featured) : null,
      ]
    );
    const result = await query(`${BOOK_BASE_SELECT} WHERE b.id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Book not found' });
    res.json({ book: rowToBook(result.rows[0]) });
  } catch (e: any) {
    console.error('update book error', e);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM books WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e: any) {
    console.error('delete book error', e);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// Reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const result = await query<any>(
      'SELECT id, book_id, user_id, user_name, rating, comment, created_at FROM reviews WHERE book_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({
      reviews: result.rows.map((r) => ({
        id: r.id,
        bookId: r.book_id,
        userId: r.user_id,
        userName: r.user_name,
        rating: r.rating,
        comment: r.comment,
        createdAt: new Date(r.created_at).getTime(),
      })),
    });
  } catch (e: any) {
    console.error('list reviews error', e);
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

router.post('/:id/reviews', requireAuth, async (req, res) => {
  try {
    const { rating, comment } = req.body || {};
    if (!rating || !comment?.trim()) {
      return res.status(400).json({ error: 'Rating and comment are required' });
    }
    // Check the book exists
    const bookCheck = await query('SELECT id FROM books WHERE id = $1', [req.params.id]);
    if (bookCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    const id = newId();
    await query(
      `INSERT INTO reviews (id, book_id, user_id, user_name, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        req.params.id,
        req.user!.id,
        req.user!.displayName,
        Math.max(1, Math.min(5, Number(rating))),
        String(comment).trim(),
      ]
    );
    res.json({ ok: true, id });
  } catch (e: any) {
    console.error('create review error', e);
    res.status(500).json({ error: 'Failed to post review' });
  }
});

router.delete('/:bookId/reviews/:reviewId', requireAuth, async (req, res) => {
  try {
    const r = await query<{ user_id: string }>(
      'SELECT user_id FROM reviews WHERE id = $1 AND book_id = $2',
      [req.params.reviewId, req.params.bookId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Review not found' });
    if (r.rows[0].user_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await query('DELETE FROM reviews WHERE id = $1', [req.params.reviewId]);
    res.json({ ok: true });
  } catch (e) {
    console.error('delete review error', e);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

export default router;
