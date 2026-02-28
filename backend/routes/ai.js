const express = require('express');
const router  = express.Router();
const OpenAI  = require('openai');

// Groq is OpenAI-compatible — same SDK, different baseURL. Free: 14,400 req/day.
let _groq;
function getGroq() {
  if (!_groq) _groq = new OpenAI({
    apiKey:  process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });
  return _groq;
}

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  const { message, code, language, roomName, history = [] } = req.body;

  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const systemPrompt = `You are NexusAI, an expert AI coding assistant embedded in SyncKode — a real-time collaborative code editor.

Current session context:
- Room: ${roomName || 'Unknown'}
- Language: ${language || 'Unknown'}
${code ? `\nCurrent code in editor:\n\`\`\`${language || ''}\n${code.slice(0, 4000)}\n\`\`\`` : ''}

Guidelines:
- Be concise, direct, and developer-focused.
- Use inline \`code\` for snippets and fenced blocks for multi-line code.
- Reference the editor code when relevant.
- Avoid excessive filler. Answer in 1-4 short paragraphs unless a full code block is needed.
- If asked to generate code, produce clean, production-ready code with brief comments.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history
        .filter(m => m.role && m.text)
        .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
      { role: 'user', content: message },
    ];

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Accel-Buffering', 'no');

    const stream = await getGroq().chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      messages,
      max_tokens:  1024,
      temperature: 0.7,
      stream:      true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) res.write(text);
    }

    res.end();
  } catch (err) {
    console.error('[NexusAI] Groq error:', err.message);
    const status = err.status || 500;
    const friendly =
      status === 429 ? 'Rate limit hit — please wait a moment and try again.' :
      status === 401 ? 'Invalid Groq API key.' :
      'AI request failed. Please try again.';
    if (!res.headersSent) {
      res.status(status).json({ error: friendly, details: err.message });
    } else {
      res.end();
    }
  }
});

module.exports = router;

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  const { message, code, language, roomName, history = [] } = req.body;

  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const systemPrompt = `You are NexusAI, an expert AI coding assistant embedded in SyncKode — a real-time collaborative code editor.

Current session context:
- Room: ${roomName || 'Unknown'}
- Language: ${language || 'Unknown'}
${code ? `\nCurrent code in editor:\n\`\`\`${language || ''}\n${code.slice(0, 4000)}\n\`\`\`` : ''}

Guidelines:
- Be concise, direct, and developer-focused.
- Use inline \`code\` for snippets and fenced blocks for multi-line code.
- Reference the editor code when relevant.
- Avoid excessive filler. Answer in 1-4 short paragraphs unless a full code block is needed.
- If asked to generate code, produce clean, production-ready code with brief comments.`;

    const chatHistory = [
      { role: 'user',  parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I am NexusAI, ready to assist with your code.' }] },
      ...history
        .filter(m => m.role && m.text)
        .map(m => ({ role: m.role === 'ai' ? 'model' : 'user', parts: [{ text: m.text }] })),
    ];

    const model = getGenAI().getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    });

    const chat   = model.startChat({ history: chatHistory });
    const result = await chat.sendMessageStream(message);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Accel-Buffering', 'no');

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) res.write(text);
    }

    res.end();
  } catch (err) {
    console.error('[NexusAI] Gemini error:', err.message);
    const status = err.status || 500;
    const friendly =
      status === 429 ? 'AI quota exceeded — the Gemini free tier limit was hit. Please wait a minute and try again.' :
      status === 401 || status === 400 ? 'Invalid Gemini API key. Please check your key.' :
      'AI request failed. Please try again.';
    if (!res.headersSent) {
      res.status(status).json({ error: friendly, details: err.message });
    } else {
      res.end();
    }
  }
});

module.exports = router;


// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  const { message, code, language, roomName, history = [] } = req.body;

  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Build context-rich system prompt
    const systemPrompt = `You are NexusAI, an expert AI coding assistant embedded in SyncKode — a real-time collaborative code editor.

Current session context:
- Room: ${roomName || 'Unknown'}
- Language: ${language || 'Unknown'}
${code ? `\nCurrent code in editor:\n\`\`\`${language || ''}\n${code.slice(0, 4000)}\n\`\`\`` : ''}

Guidelines:
- Be concise, direct, and developer-focused.
- Use inline \`code\` for snippets and fenced blocks for multi-line code.
- Reference the editor code when relevant.
- Avoid excessive filler. Answer in 1-4 short paragraphs unless a full code block is needed.
- If asked to generate code, produce clean, production-ready code with brief comments.`;

    // Convert saved history (last 10 msgs) for Gemini chat format
    const chatHistory = history
      .filter(m => m.role && m.text)
      .map(m => ({
        role: m.role === 'ai' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }));

    const chat = model.startChat({
      history: [
        { role: 'user',  parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood. I am NexusAI, ready to assist with your code.' }] },
        ...chatHistory,
      ],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
      },
    });

    // Stream the response
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Accel-Buffering', 'no'); // disable proxy buffering

    const result = await chat.sendMessageStream(message);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) res.write(text);
    }

    res.end();
  } catch (err) {
    console.error('[NexusAI] Gemini error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI request failed', details: err.message });
    } else {
      res.end();
    }
  }
});

module.exports = router;
