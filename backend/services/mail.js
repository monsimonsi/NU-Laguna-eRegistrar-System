const nodemailer = require('nodemailer');
const ai = require('./ai');

// Env: MAIL_HOST/SMTP_HOST, MAIL_USER/SMTP_USER, MAIL_PASS/SMTP_PASS, MAIL_PORT/SMTP_PORT,
// MAIL_SECURE, MAIL_FROM/EMAIL_FROM, MAIL_REGISTRAR_TO/MAIL_ADMIN_NOTIFY

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
    'Kind Regards,',
    'NU Laguna e-Registrar'
  ].join('\n');

  const html = `<p>Hello ${escapeHtml(fullName)},</p><p>${escapeHtml(
    generated.intro
  )}</p><p>${escapeHtml(generated.body)}</p><p>${escapeHtml(generated.outro)}</p><p>Kind Regards,<br/>NU Laguna e-Registrar</p>`;

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

async function notifyAlumniRegistrationPending({ to, fullName, isReapplication }) {
  const subject = isReapplication
    ? 'Alumni registration resubmitted — pending verification'
    : 'Alumni registration received — pending verification';
  const lines = [
    `Hello ${fullName},`,
    '',
    isReapplication
      ? 'We received your updated alumni registration. Your account is pending verification again by the Registrar office.'
      : 'Thank you for registering with NU Laguna e-Registrar. Your alumni account is pending verification by the Registrar office.',
    'We appreciate your patience while the registrar reviews your details.',
    '',
    'You cannot log in until your registration is approved. You will receive another email once a decision has been made.',
    'If you need to update any information, you can submit a new registration after a decision is issued.',
    '',
    'Kind Regards,',
    'NU Laguna e-Registrar'
  ];
  const text = lines.join('\n');
  const htmlBody = `<p>Hello ${escapeHtml(fullName)},</p><p>${escapeHtml(
    isReapplication
      ? 'We received your updated alumni registration. Your account is pending verification again by the Registrar office.'
      : 'Thank you for registering with NU Laguna e-Registrar. Your alumni account is pending verification by the Registrar office.'
  )}</p><p>We appreciate your patience while the registrar reviews your details.</p><p>You cannot log in until your registration is approved. You will receive another email once a decision has been made.</p><p>If you need to update any information, you can submit a new registration after a decision is issued.</p><p>Kind Regards,<br/>NU Laguna e-Registrar</p>`;
  const fallback = { subject, text, html: htmlBody };

  const message = await withAiCopy({
    event: 'alumni_registration_pending',
    fullName,
    facts: { isReapplication: !!isReapplication },
    fallback
  });

  return sendSafe({
    to,
    subject: message.subject,
    text: message.text,
    html: message.html
  });
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

async function notifyAlumniApproved({ to, fullName }) {
  const subject = 'Your NU Laguna alumni account has been approved';
  const text = [
    `Hello ${fullName},`,
    '',
    'Your alumni registration has been approved. You may now log in to the NU Laguna e-Registrar system to submit document requests.',
    'If you need help signing in, use the same email you registered with and reset your password if needed.',
    '',
    'Kind Regards,',
    'NU Laguna e-Registrar'
  ].join('\n');
  const fallback = {
    subject,
    text,
    html: `<p>Hello ${escapeHtml(fullName)},</p><p>Your alumni registration has been approved. You may now log in to submit document requests.</p><p>If you need help signing in, use the same email you registered with and reset your password if needed.</p><p>Kind Regards,<br/>NU Laguna e-Registrar</p>`
  };

  const message = await withAiCopy({
    event: 'alumni_approved',
    fullName,
    facts: {},
    fallback
  });

  return sendSafe({
    to,
    subject: message.subject,
    text: message.text,
    html: message.html
  });
}

async function notifyAlumniRejected({ to, fullName, reason }) {
  const subject = 'Update on your NU Laguna alumni registration';
  const text = [
    `Hello ${fullName},`,
    '',
    'We were unable to approve your alumni registration with the details provided.',
    '',
    `Reason: ${reason}`,
    '',
    'You may submit a new registration through the Alumni Registration page with corrected information.',
    'If you are unsure what to update, reply to this message or contact the registrar for guidance.',
    '',
    'Kind Regards,',
    'NU Laguna e-Registrar'
  ].join('\n');
  const fallback = {
    subject,
    text,
    html: `<p>Hello ${escapeHtml(fullName)},</p><p>We were unable to approve your alumni registration.</p><p><strong>Reason:</strong> ${escapeHtml(
      reason
    )}</p><p>You may register again with corrected information.</p><p>If you are unsure what to update, reply to this message or contact the registrar for guidance.</p><p>Kind Regards,<br/>NU Laguna e-Registrar</p>`
  };

  const message = await withAiCopy({
    event: 'alumni_rejected',
    fullName,
    facts: { reason: String(reason || '').trim() },
    fallback
  });

  return sendSafe({
    to,
    subject: message.subject,
    text: message.text,
    html: message.html
  });
}

async function notifyDocumentRequestSubmitted({ to, fullName, trackingNumber, documentType }) {
  const fallback = {
    subject: `[e-Registrar] Request received — ${trackingNumber}`,
    text: [
    `Hello ${fullName},`,
    '',
    'Your document request was received.',
    'We are preparing your request and will notify you when its status changes.',
    '',
    `Tracking number: ${trackingNumber}`,
    `Document type: ${documentType}`,
    '',
    'You can use the tracking number to monitor progress in your dashboard.',
    '',
    'Kind Regards,',
    'NU Laguna e-Registrar'
  ].join('\n'),
    html: `<p>Hello ${escapeHtml(fullName)},</p><p>Your document request was received. We are preparing your request and will notify you when its status changes.</p><p><strong>Tracking:</strong> ${escapeHtml(
      trackingNumber
    )}</p><p><strong>Document:</strong> ${escapeHtml(documentType)}</p><p>You can use the tracking number to monitor progress in your dashboard.</p><p>Kind Regards,<br/>NU Laguna e-Registrar</p>`
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
    'If you have questions about your request, reply to this email or contact the registrar office.',
    '',
    `Tracking number: ${trackingNumber}`,
    `Document type: ${documentType}`,
    `New status: ${status}`,
    '',
    'Thank you for using NU Laguna e-Registrar.',
    '',
    'Kind Regards,',
    'NU Laguna e-Registrar'
  ].join('\n'),
    html: `<p>Hello ${escapeHtml(fullName)},</p><p>Your request status has been updated to <strong>${escapeHtml(
      status
    )}</strong>.</p><p>${escapeHtml(statusLine)} If you have questions about your request, reply to this email or contact the registrar office.</p><p>Tracking: ${escapeHtml(
      trackingNumber
    )}<br/>Document: ${escapeHtml(documentType)}</p><p>Kind Regards,<br/>NU Laguna e-Registrar</p>`
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

async function notifyPaymentSuccessful({
  to,
  fullName,
  documentType,
  amount,
  currency = 'PHP',
  referenceNumber,
  paymentMethod,
  receiptUrl = ''
}) {
  const amountText = amount ? `${amount}${currency ? ` ${currency}` : ''}` : '';
  const fallback = {
    subject: `[e-Registrar] Payment successful — ${documentType || 'your request'}`,
    text: [
      `Hello ${fullName},`,
      '',
      `Your payment for ${documentType || 'your document request'} was successful.`,
      amountText ? `Amount paid: ${amountText}` : '',
      referenceNumber ? `Reference number: ${referenceNumber}` : '',
      paymentMethod ? `Payment method: ${paymentMethod}` : '',
      '',
      'Your request is now ready for the next step in the registrar workflow.',
      receiptUrl ? `Receipt: ${receiptUrl}` : '',
      '',
      'Kind Regards,',
      'NU Laguna e-Registrar'
    ].filter(Boolean).join('\n'),
    html: `<p>Hello ${escapeHtml(fullName)},</p><p>Your payment for ${escapeHtml(
      documentType || 'your document request'
    )} was successful.</p><p>${[amountText ? `Amount paid: ${escapeHtml(amountText)}` : '', referenceNumber ? `Reference number: ${escapeHtml(referenceNumber)}` : '', paymentMethod ? `Payment method: ${escapeHtml(paymentMethod)}` : '']
      .filter(Boolean)
      .join('<br/>')}</p><p>Your request is now ready for the next step in the registrar workflow.</p>${receiptUrl ? `<p>Receipt: ${escapeHtml(receiptUrl)}</p>` : ''}<p>Kind Regards,<br/>NU Laguna e-Registrar</p>`
  };

  const message = await withAiCopy({
    event: 'payment_successful',
    fullName,
    facts: {
      documentType,
      amount,
      currency,
      referenceNumber,
      paymentMethod,
      receiptUrl
    },
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
  notifyDocumentRequestStatus,
  notifyPaymentSuccessful
};
