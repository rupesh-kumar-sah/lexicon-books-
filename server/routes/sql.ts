import { Router } from 'express';
import { pool } from '../db';
import { requireAdmin } from '../auth';

const router = Router();

const BLOCKED = /^\s*(drop\s+database|drop\s+schema|truncate|pg_read_file|pg_ls_dir|copy\s+.*\s+to\s+|copy\s+.*\s+from\s+program)/i;

router.post('/execute', requireAdmin, async (req, res) => {
  try {
    const { sql } = req.body || {};
    if (!sql || typeof sql !== 'string' || !sql.trim()) {
      return res.status(400).json({ error: 'SQL query is required' });
    }
    if (BLOCKED.test(sql)) {
      return res.status(403).json({ error: 'This operation is not permitted in the SQL editor.' });
    }

    const start = Date.now();
    const result = await pool.query(sql);
    const duration = Date.now() - start;

    res.json({
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields?.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })) ?? [],
      duration,
      command: result.command,
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Query failed' });
  }
});

router.get('/tables', requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    res.json({ tables: result.rows.map((r) => r.table_name) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/tables/:table/columns', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [req.params.table]
    );
    res.json({ columns: result.rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
