function isAiConfigured() {
  return !!process.env.OPENAI_API_KEY;
}

function getModel() {
  return process.env.OPENAI_MODEL || 'gpt-4o-mini';
}

function getBaseUrl() {
  return (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
}

function trimToSentenceCount(text, maxSentences) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const parts = raw.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length <= maxSentences) return raw;
  return parts.slice(0, maxSentences).join(' ');
}

async function generateNotification({ event, recipientName, facts }) {
  if (!isAiConfigured()) return null;

  const systemPrompt = [
    'You write transactional school registrar emails.',
    'Tone: clear, professional, concise, friendly.',
    'Return valid JSON only with keys: subject, intro, body, outro.',
    'intro/body/outro must be plain text only, no markdown.'
  ].join(' ');

  const userPrompt = JSON.stringify({
    task: 'Create concise email copy for e-Registrar notification',
    constraints: {
      maxSentencesPerField: 2,
      noHallucinations: true
    },
    event,
    recipientName,
    facts
  });

  try {
    const res = await fetch(`${getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: getModel(),
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[ai] chat completion failed:', res.status, body.slice(0, 300));
      return null;
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
      subject: String(parsed.subject || '').trim(),
      intro: trimToSentenceCount(parsed.intro, 2),
      body: trimToSentenceCount(parsed.body, 2),
      outro: trimToSentenceCount(parsed.outro, 2)
    };
  } catch (err) {
    console.error('[ai] generate notification failed:', err.message);
    return null;
  }
}

module.exports = {
  isAiConfigured,
  generateNotification
};
