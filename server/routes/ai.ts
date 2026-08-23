import { Router } from 'express';

const router = Router();
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;

const SYSTEM_PROMPT = `You are the official AI Assistant and Book Curator for BookSellNP, a premium online bookstore based in Nepal. You are helpful, concise, and knowledgeable about literature. Help users discover books, explain themes, and answer questions about the BookSellNP platform. Prices use Nepalese Rupees (Rs.). Cash on Delivery is the primary payment method. Users can browse books, add books to a cart or wishlist, and write reviews. Do not claim to have access to private user data, payment details, passwords, or internal administration tools.`;

router.post('/chat', async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI assistant is not configured' });
  }

  const incoming = req.body?.messages;
  const catalogContext = typeof req.body?.catalogContext === 'string' ? req.body.catalogContext.slice(0, 8000) : '';
  if (!Array.isArray(incoming) || incoming.length === 0 || incoming.length > MAX_MESSAGES) {
    return res.status(400).json({ error: `messages must contain between 1 and ${MAX_MESSAGES} items` });
  }

  const messages = incoming
    .filter((message: any) => message && (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string')
    .map((message: any) => ({ role: message.role, content: message.content.trim().slice(0, MAX_MESSAGE_LENGTH) }))
    .filter((message: any) => message.content.length > 0);

  if (messages.length === 0 || messages.length !== incoming.length) {
    return res.status(400).json({ error: 'messages contain an invalid role or content' });
  }

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT + catalogContext }, ...messages],
        temperature: 0.7,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const providerBody = await response.text();
      console.error(`[AI] Groq provider returned ${response.status}: ${providerBody.slice(0, 500)}`);
      return res.status(response.status === 429 ? 429 : 502).json({ error: 'AI provider request failed' });
    }

    const data: any = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length === 0) {
      return res.status(502).json({ error: 'AI provider returned an empty response' });
    }

    res.json({ message: content, model: data.model || DEFAULT_MODEL });
  } catch (error) {
    console.error('[AI] Groq request failed:', error instanceof Error ? error.message : error);
    res.status(502).json({ error: 'Unable to reach AI provider' });
  }
});

export default router;
