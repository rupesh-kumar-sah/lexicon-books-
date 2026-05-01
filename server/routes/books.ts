import { Router } from 'express';
import { query } from '../db';
import { newId, requireAdmin, requireAuth } from '../auth';
import { getCache, setCache, clearCache } from '../cache';

const router = Router();

// Optimized Select: Uses subqueries which are significantly faster for paginated/filtered results
const BOOK_BASE_SELECT = `
  SELECT b.id, b.title, b.author, b.price, b.cover_image, b.isbn, b.genre, b.stock, b.rating, b.year, b.featured, b.created_at,
         (SELECT COUNT(*)::int FROM reviews r WHERE r.book_id = b.id) AS review_count,
         (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.book_id = b.id) AS avg_rating
  FROM books b
`;

const BOOK_DETAIL_SELECT = `
  SELECT b.id, b.title, b.author, b.description, b.price, b.cover_image, b.isbn, b.genre, b.stock, b.rating, b.year, b.featured, b.created_at,
         (SELECT COUNT(*)::int FROM reviews r WHERE r.book_id = b.id) AS review_count,
         (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.book_id = b.id) AS avg_rating
  FROM books b
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
    
    // Cache Key based on all query parameters
    const cacheKey = `books:list:${JSON.stringify(req.query)}`;
    const cached = getCache<{ books: any[] }>(cacheKey);
    if (cached) return res.json(cached);

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
      case 'price-asc': sql += ' ORDER BY b.price ASC'; break;
      case 'price-desc': sql += ' ORDER BY b.price DESC'; break;
      case 'popular': sql += ' ORDER BY review_count DESC, avg_rating DESC'; break;
      case 'rating': sql += ' ORDER BY avg_rating DESC'; break;
      case 'title': sql += ' ORDER BY b.title ASC'; break;
      default: sql += ' ORDER BY b.created_at DESC'; break;
    }

    const lim = Math.min(500, Math.max(1, Number(limit) || 50));
    sql += ` LIMIT ${lim}`;

    const result = await query<any>(sql, params);
    const data = { books: result.rows.map(rowToBook) };
    
    // Cache the list for 2 minutes
    setCache(cacheKey, data, 600);
    res.json(data);
  } catch (e: any) {
    console.error('list books error', e);
    res.status(500).json({ error: 'Failed to load books' });
  }
});

router.get('/genres', async (_req, res) => {
  try {
    const cacheKey = 'genres';
    const cached = getCache<{ genres: any[] }>(cacheKey);
    if (cached) return res.json(cached);

    const result = await query<{ genre: string; count: string }>(
      `SELECT genre, COUNT(*)::text AS count FROM books GROUP BY genre ORDER BY genre ASC`
    );
    const data = {
      genres: result.rows.map((r) => ({ name: r.genre, count: Number(r.count) })),
    };
    setCache(cacheKey, data, 600); // Cache for 10 minutes
    res.json(data);
  } catch (e) {
    console.error('list genres', e);
    res.status(500).json({ error: 'Failed to load genres' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const cacheKey = `books:detail:${req.params.id}`;
    const cached = getCache<{ book: any }>(cacheKey);
    if (cached) return res.json(cached);

    const result = await query(`${BOOK_DETAIL_SELECT} WHERE b.id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Book not found' });
    
    const data = { book: rowToBook(result.rows[0]) };
    setCache(cacheKey, data, 300); // Cache details for 5 minutes
    res.json(data);
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
    clearCache('books:');
    clearCache('genres');
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
    clearCache('books:');
    clearCache('genres');
    res.json({ book: rowToBook(result.rows[0]) });
  } catch (e: any) {
    console.error('update book error', e);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM books WHERE id = $1', [req.params.id]);
    clearCache('books:');
    clearCache('genres');
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
    
    // Check if user already reviewed
    const existing = await query('SELECT id FROM reviews WHERE book_id = $1 AND user_id = $2', [req.params.id, req.user!.id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'You have already reviewed this book' });
    }

    const id = newId();
    await query(
      `INSERT INTO reviews (id, book_id, user_id, user_name, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, req.params.id, req.user!.id, req.user!.displayName, Number(rating), comment.trim()]
    );
    
    clearCache(`books:detail:${req.params.id}`);
    clearCache('books:list'); // List ratings changed

    res.json({ ok: true });
  } catch (e: any) {
    console.error('create review error', e);
    res.status(500).json({ error: 'Failed to post review' });
  }
});

export default router;
