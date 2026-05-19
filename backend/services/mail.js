const nodemailer = require('nodemailer');
const ai = require('./ai');

let transporter = null;

function isMailConfigured() {
  const host = process.env.MAIL_HOST || process.env.SMTP_HOST;
  const user = process.env.MAIL_USER || process.env.SMTP_USER;
  const pass = process.env.MAIL_PASS || process.env.SMTP_PASS;
  return !!(host && user && pass);
}

function getTransporter() {
  if (!isMailConfigured()) return null;
  if (!transporter) {
    const host = process.env.MAIL_HOST || process.env.SMTP_HOST;
    const user = process.env.MAIL_USER || process.env.SMTP_USER;
    const pass = process.env.MAIL_PASS || process.env.SMTP_PASS;
    const port = Number(process.env.MAIL_PORT || process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.MAIL_SECURE === 'true' || port === 465,
      auth: {
        user,
        pass
      }
    });
  }
  return transporter;
}

function getFromAddress() {
  const from = process.env.MAIL_FROM || process.env.EMAIL_FROM;
  if (from) return from;
  const user = process.env.MAIL_USER || process.env.SMTP_USER || 'no-reply@nu-laguna.local';
  return `"NU Laguna e-Registrar" <${user}>`;
}

async function withAiCopy({ event, fullName, facts, fallback }) {
  const generated = await ai.generateNotification({
    event,
    recipientName: fullName,
    facts
  });

  if (!generated || !generated.subject || !generated.intro || !generated.body || !generated.outro) {
    return fallback;
  }

  const text = [
    `Hello ${fullName},`,
    '',
    generated.intro,
    generated.body,
    '',
    generated.outro,
    '',
    '— NU Laguna e-Registrar'
  ].join('\n');

  const html = `<p>Hello ${escapeHtml(fullName)},</p><p>${escapeHtml(
    generated.intro
  )}</p><p>${escapeHtml(generated.body)}</p><p>${escapeHtml(generated.outro)}</p>`;

  return {
    subject: generated.subject,
    text,
    html
  };
}

/**
 * Sends email; logs and swallows errors so API responses are not blocked.
 * @returns {Promise<{ skipped?: boolean; sent?: boolean; error?: Error }>}
 */
async function sendSafe(options) {
  const tx = getTransporter();
  if (!tx) {
    console.warn('[mail] SMTP not configured (set MAIL_HOST, MAIL_USER, MAIL_PASS). Skipping:', options.subject);
    return { skipped: true };
  }
  try {
    await tx.sendMail({
      from: getFromAddress(),
      ...options
    });
    console.log('[mail] sent:', options.subject, '→', Array.isArray(options.to) ? options.to.join(', ') : options.to);
    return { sent: true };
  } catch (err) {
    console.error('[mail] send failed:', err.message);
    return { error: err };
  }
}

function notifyAlumniRegistrationPending({ to, fullName, isReapplication }) {
  const subject = isReapplication
    ? 'Alumni registration resubmitted — pending verification'
    : 'Alumni registration received — pending verification';
  const lines = [
    `Hello ${fullName},`,
    '',
    isReapplication
      ? 'We received your updated alumni registration. Your account is pending verification again by the Registrar office.'
      : 'Thank you for registering with NU Laguna e-Registrar. Your alumni account is pending verification by the Registrar office.',
    '',
    'You cannot log in until your registration is approved. You will receive another email once a decision has been made.',
    '',
    '— NU Laguna e-Registrar'
  ];
  const text = lines.join('\n');
  const htmlBody = `<p>Hello ${escapeHtml(fullName)},</p><p>${escapeHtml(
    isReapplication
      ? 'We received your updated alumni registration. Your account is pending verification again by the Registrar office.'
      : 'Thank you for registering with NU Laguna e-Registrar. Your alumni account is pending verification by the Registrar office.'
  )}</p><p>You cannot log in until your registration is approved. You will receive another email once a decision has been made.</p>`;
  return sendSafe({ to, subject, text, html: htmlBody });
}

function notifyRegistrarAlumniPending(payload) {
  const raw = process.env.MAIL_REGISTRAR_TO || process.env.MAIL_ADMIN_NOTIFY;
  if (!raw || !raw.trim()) return Promise.resolve({ skipped: true });

  const toList = raw
    .split(/[,;]/g)
    .map((s) => s.trim())
    .filter(Boolean);
  if (toList.length === 0) return Promise.resolve({ skipped: true });

  const subject = `[e-Registrar] New alumni verification — ${payload.fullName}`;
  const text = [
    'A new alumni registration is pending verification.',
    '',
    `Name: ${payload.fullName}`,
    `Email: ${payload.email}`,
    `Student #: ${payload.studentNumber}`,
    `Program: ${payload.course}`,
    `Year graduated: ${payload.yearGraduated}`,
    payload.isReapplication ? '(Resubmitted after rejection)' : '',
    '',
    'Please review this application in the admin dashboard.'
  ]
    .filter(Boolean)
    .join('\n');

  return Promise.all(toList.map((to) => sendSafe({ to, subject, text })));
}

function notifyAlumniApproved({ to, fullName }) {
  const subject = 'Your NU Laguna alumni account has been approved';
  const text = [
    `Hello ${fullName},`,
    '',
    'Your alumni registration has been approved. You may now log in to the NU Laguna e-Registrar system to submit document requests.',
    '',
    '— NU Laguna e-Registrar'
  ].join('\n');
  return sendSafe({
    to,
    subject,
    text,
    html: `<p>Hello ${escapeHtml(fullName)},</p><p>Your alumni registration has been approved. You may now log in to submit document requests.</p>`
  });
}

function notifyAlumniRejected({ to, fullName, reason }) {
  const subject = 'Update on your NU Laguna alumni registration';
  const text = [
    `Hello ${fullName},`,
    '',
    'We were unable to approve your alumni registration with the details provided.',
    '',
    `Reason: ${reason}`,
    '',
    'You may submit a new registration through the Alumni Registration page with corrected information.',
    '',
    '— NU Laguna e-Registrar'
  ].join('\n');
  return sendSafe({
    to,
    subject,
    text,
    html: `<p>Hello ${fullName},</p><p>We were unable to approve your alumni registration.</p><p><strong>Reason:</strong> ${escapeHtml(reason)}</p><p>You may register again with corrected information.</p>`
  });
}

async function notifyDocumentRequestSubmitted({ to, fullName, trackingNumber, documentType }) {
  const fallback = {
    subject: `[e-Registrar] Request received — ${trackingNumber}`,
    text: [
    `Hello ${fullName},`,
    '',
    'Your document request was received.',
    '',
    `Tracking number: ${trackingNumber}`,
    `Document type: ${documentType}`,
    '',
    'We will notify you again when the status changes.',
    '',
    '— NU Laguna e-Registrar'
  ].join('\n'),
    html: `<p>Hello ${escapeHtml(fullName)},</p><p>Your document request was received.</p><p><strong>Tracking:</strong> ${escapeHtml(
      trackingNumber
    )}</p><p><strong>Document:</strong> ${escapeHtml(documentType)}</p>`
  };

  const message = await withAiCopy({
    event: 'document_request_submitted',
    fullName,
    facts: { trackingNumber, documentType },
    fallback
  });

  return sendSafe({
    to,
    subject: message.subject,
    text: message.text,
    html: message.html
  });
}

async function notifyDocumentRequestStatus({
  to,
  fullName,
  trackingNumber,
  documentType,
  status,
  deliveryMethod = 'pickup'
}) {
  const method = String(deliveryMethod).toLowerCase();
  const statusLine =
    status === 'Ready for Pickup'
      ? 'Your document is now ready for pickup at the Registrar office.'
      : status === 'Out for Delivery'
        ? 'Your document is now out for delivery to your address.'
        : status === 'Released'
          ? method === 'delivery'
            ? 'Your document has been delivered successfully.'
            : 'Your document has been released after pickup.'
          : 'The status of your document request has been updated.';

  const fallback = {
    subject: `[e-Registrar] Request update — ${trackingNumber}`,
    text: [
    `Hello ${fullName},`,
    '',
    statusLine,
    '',
    `Tracking number: ${trackingNumber}`,
    `Document type: ${documentType}`,
    `New status: ${status}`,
    '',
    'Thank you for using NU Laguna e-Registrar.',
    '',
    '— NU Laguna e-Registrar'
  ].join('\n'),
    html: `<p>Hello ${escapeHtml(fullName)},</p><p>Your request status has been updated to <strong>${escapeHtml(
      status
    )}</strong>.</p><p>Tracking: ${escapeHtml(trackingNumber)}<br/>Document: ${escapeHtml(documentType)}</p>`
  };

  const message = await withAiCopy({
    event: 'document_request_status_updated',
    fullName,
    facts: { trackingNumber, documentType, status, deliveryMethod: method },
    fallback
  });

  return sendSafe({
    to,
    subject: message.subject,
    text: message.text,
    html: message.html
  });
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  isMailConfigured,
  sendSafe,
  notifyAlumniRegistrationPending,
  notifyRegistrarAlumniPending,
  notifyAlumniApproved,
  notifyAlumniRejected,
  notifyDocumentRequestSubmitted,
  notifyDocumentRequestStatus
};
