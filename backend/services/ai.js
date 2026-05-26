// Env: OPENAI_API_KEY (required), OPENAI_MODEL (optional), OPENAI_BASE_URL (optional)
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

function countSentences(text) {
  const raw = String(text || '').trim();
  if (!raw) return 0;
  return raw.split(/(?<=[.!?])\s+/).filter(Boolean).length;
}

function appendSentence(text, sentence) {
  const current = String(text || '').trim();
  const next = String(sentence || '').trim();
  if (!next) return current;
  if (!current) return next;
  return `${current} ${next}`;
}

function ensureMinSentences(text, minSentences, fallbackSentences) {
  let current = String(text || '').trim();
  let count = countSentences(current);
  let index = 0;
  const fallbacks = Array.isArray(fallbackSentences) ? fallbackSentences : [];
  while (count < minSentences && index < fallbacks.length) {
    current = appendSentence(current, fallbacks[index]);
    count = countSentences(current);
    index += 1;
  }
  return current;
}

function hasDateLikeText(text) {
  const raw = String(text || '');
  if (!raw) return false;
  const monthPattern = /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/i;
  const numericDatePattern = /\b\d{1,2}[\/-]\d{1,2}([\/-]\d{2,4})?\b/;
  const yearPattern = /\b20\d{2}\b/;
  return monthPattern.test(raw) || numericDatePattern.test(raw) || yearPattern.test(raw);
}

function requiresFactValue(facts, key) {
  return Boolean(String(facts?.[key] || '').trim());
}

function textContainsValue(text, value) {
  const raw = String(text || '').toLowerCase();
  const target = String(value || '').trim().toLowerCase();
  if (!target) return true;
  return raw.includes(target);
}

function stripTrailingSignature(text) {
  let raw = String(text || '').trim();
  if (!raw) return '';

  raw = raw.replace(/\s*kind regards,\s*nu laguna e-registrar\s*$/i, '').trim();
  raw = raw.replace(/\s*kind regards\.?\s*$/i, '').trim();

  return raw;
}

function logAiReject(reason, detail) {
  if (detail) {
    console.warn('[ai] rejected:', reason, '-', detail);
    return;
  }
  console.warn('[ai] rejected:', reason);
}

async function generateNotification({ event, recipientName, facts }) {
  if (!isAiConfigured()) return null;

  const normalizedEvent = String(event || '').trim().toLowerCase();
  const isDocumentRequestEvent = normalizedEvent === 'document_request_submitted'
    || normalizedEvent === 'document_request_status_updated';

  const trackingNumber = String(facts?.trackingNumber || '').trim();
  const documentType = String(facts?.documentType || '').trim();
  const status = String(facts?.status || '').trim();
  const deliveryMethod = String(facts?.deliveryMethod || '').trim();

  const factLines = isDocumentRequestEvent
    ? [
        trackingNumber ? `Tracking number: ${trackingNumber}` : null,
        documentType ? `Document type: ${documentType}` : null,
        status ? `Status: ${status}` : null,
        deliveryMethod ? `Delivery method: ${deliveryMethod}` : null
      ].filter(Boolean)
    : [];

  const systemPrompt = [
    'You write transactional school registrar emails.',
    'Tone: warm, friendly, clear, and professional.',
    'Be concise but helpful: include key facts and a brief next step if available.',
    'Do not invent dates, timelines, or other details that are not provided in facts.',
    'Return valid JSON only with keys: subject, intro, body, outro.',
    'intro/body/outro must be plain text only, no markdown.',
  ].join(' ');

  const userPrompt = JSON.stringify({
    task: 'Create concise email copy for e-Registrar notification',
    constraints: {
      maxSentencesPerField: 3,
      minSentencesIntro: 2,
      minSentencesBody: 2,
      noHallucinations: true
    },
    event,
    recipientName,
    facts,
    instructions: isDocumentRequestEvent
      ? {
          requiredFacts: ['tracking number', 'document type'],
          includeStatusIfProvided: true,
          includeDeliveryMethodIfProvided: true,
          avoidDatesUnlessProvided: true,
          introRule: 'Mention the document type in the intro, not the body.',
          outroRule: 'End the outro with a brief closing sentence. Do not include the mail signature; it is appended separately.'
        }
      : undefined,
    factSlots: factLines
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
    let intro = trimToSentenceCount(parsed.intro, 3);
    let body = trimToSentenceCount(parsed.body, 3);
    let outro = trimToSentenceCount(parsed.outro, 3);
    outro = stripTrailingSignature(outro);

    if (documentType && !textContainsValue(intro, documentType)) {
      intro = appendSentence(intro, `This message is about your ${documentType} request.`);
    }

    intro = ensureMinSentences(intro, 2, [
      `Hello${recipientName ? ` ${recipientName}` : ''}.`,
      'Thank you for reaching out to the NU Laguna e-Registrar team.'
    ]);

    body = ensureMinSentences(body, 2, [
      'We are reviewing your request and will keep you updated.',
      'If you have questions, reply to this email for assistance.'
    ]);

    outro = ensureMinSentences(outro, 1, [
      'Please let us know if you need any further assistance.'
    ]);

    if (countSentences(intro) < 2 || countSentences(body) < 2 || countSentences(outro) < 1) {
      logAiReject('too_short', 'intro/body/outro below minimum sentence count');
      return null;
    }

    let combined = `${intro} ${body} ${outro}`.trim();
    const needsTracking = requiresFactValue(facts, 'trackingNumber');
    const needsDocumentType = requiresFactValue(facts, 'documentType');
    if (needsTracking && !textContainsValue(combined, facts.trackingNumber)) {
      body = appendSentence(body, `Your tracking number is ${facts.trackingNumber}.`);
      combined = `${intro} ${body} ${outro}`.trim();
    }
    if (needsDocumentType && !textContainsValue(combined, facts.documentType)) {
      logAiReject('missing_document_type');
      return null;
    }
    if (needsDocumentType && !textContainsValue(intro, facts.documentType)) {
      logAiReject('document_not_in_intro');
      return null;
    }
    if (needsDocumentType && textContainsValue(body, facts.documentType)) {
      logAiReject('document_in_body');
      return null;
    }
    if (!requiresFactValue(facts, 'date') && !requiresFactValue(facts, 'requestDate') && hasDateLikeText(combined)) {
      logAiReject('unexpected_date');
      return null;
    }

    return {
      subject: String(parsed.subject || '').trim(),
      intro,
      body,
      outro
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
