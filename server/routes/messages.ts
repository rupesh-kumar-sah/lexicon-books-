import { Router } from 'express';
import { query } from '../db';
import { newId } from '../auth';
import { queueFullAppSnapshot } from '../integrations/google';

const router = Router();

router.post('/', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const subject = String(req.body?.subject || '').trim();
  const message = String(req.body?.message || '').trim();
  if (!name || name.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || subject.length > 180 || !message || message.length > 5000) {
    return res.status(400).json({ error: 'Please provide a valid name, email, subject, and message.' });
  }
  try {
    const id = newId();
    await query(
      `INSERT INTO contact_messages (id, name, email, subject, message) VALUES ($1, $2, $3, $4, $5)`,
      [id, name, email, subject, message],
    );
    queueFullAppSnapshot();
    return res.status(201).json({ ok: true, id });
  } catch (error) {
    console.error('contact message create error', error);
    return res.status(500).json({ error: 'Unable to send message right now.' });
  }
});

export default router;
