const REQUEST_STATUS_FLOWS = {
  pickup: ['Pending', 'Processing', 'Ready for Pickup', 'Released'],
  delivery: ['Pending', 'Processing', 'Out for Delivery', 'Released']
};

const REQUEST_STATUSES = Array.from(
  new Set(['Waiting for Payment', ...REQUEST_STATUS_FLOWS.pickup, ...REQUEST_STATUS_FLOWS.delivery])
);

const ACTIVE_REQUEST_STATUSES = REQUEST_STATUSES.filter((status) => status !== 'Released');

const STATUS_ALIASES = new Map([
  ['waiting for payment', 'Waiting for Payment'],
  ['waiting', 'Waiting for Payment'],
  ['unpaid', 'Waiting for Payment'],
  ['pending', 'Pending'],
  ['processing', 'Processing'],
  ['ready', 'Ready for Pickup'],
  ['ready for pickup', 'Ready for Pickup'],
  ['out for delivery', 'Out for Delivery'],
  ['released', 'Released']
]);

const DELIVERY_METHODS = new Set(['pickup', 'delivery']);

function cleanText(value) {
  return String(value ?? '').trim();
}

function normalizeDeliveryMethod(value = 'pickup') {
  const method = cleanText(value || 'pickup').toLowerCase();
  return DELIVERY_METHODS.has(method) ? method : null;
}

function normalizeRequestStatus(status) {
  return STATUS_ALIASES.get(cleanText(status).toLowerCase()) || null;
}

function allowedStatusesForRequest(request) {
  const method = normalizeDeliveryMethod(request?.deliveryMethod) || 'pickup';
  return REQUEST_STATUS_FLOWS[method];
}

function validateStatusTransition({ currentStatus, nextStatus, request }) {
  const normalizedNext = normalizeRequestStatus(nextStatus);
  if (!normalizedNext) {
    return { ok: false, message: 'Invalid status.', status: null };
  }

  const flow = allowedStatusesForRequest(request);
  if (!flow.includes(normalizedNext)) {
    return {
      ok: false,
      status: normalizedNext,
      allowedStatuses: flow,
      message:
        request?.deliveryMethod === 'delivery'
          ? 'Invalid status for delivery request. Allowed: Pending, Processing, Out for Delivery, Released.'
          : 'Invalid status for pickup request. Allowed: Pending, Processing, Ready for Pickup, Released.'
    };
  }

  const normalizedCurrent = normalizeRequestStatus(currentStatus);
  const currentIndex = flow.indexOf(normalizedCurrent);
  const nextIndex = flow.indexOf(normalizedNext);

  if (currentIndex === -1) {
    return {
      ok: false,
      status: normalizedNext,
      allowedStatuses: flow,
      message: 'Current request status is invalid and must be corrected manually.'
    };
  }

  if (nextIndex === currentIndex) {
    return { ok: true, status: normalizedNext, noChange: true };
  }

  if (nextIndex !== currentIndex + 1 && nextIndex !== currentIndex - 1) {
    return {
      ok: false,
      status: normalizedNext,
      allowedStatuses: flow,
      message: `Invalid status transition. Next allowed status is ${flow[currentIndex + 1] || 'none'}.`
    };
  }

  return { ok: true, status: normalizedNext, noChange: false };
}

function parseInteger(value, { fieldName, min, max, defaultValue }) {
  const raw = value ?? defaultValue;
  const n = Number(raw);
  if (!Number.isInteger(n)) {
    return { ok: false, message: `${fieldName} must be a whole number.` };
  }
  if (typeof min === 'number' && n < min) {
    return { ok: false, message: `${fieldName} must be at least ${min}.` };
  }
  if (typeof max === 'number' && n > max) {
    return { ok: false, message: `${fieldName} cannot exceed ${max}.` };
  }
  return { ok: true, value: n };
}

function getLimit(name, fallback, overrides = {}) {
  if (typeof overrides[name] === 'number') return overrides[name];
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function fail(message, field) {
  return { ok: false, status: 400, message, field };
}

function validateDocumentRequestInput({ body = {}, auth = {}, price, limits = {} }) {
  const authSub = cleanText(auth.sub);
  const authEmail = cleanText(auth.email).toLowerCase();
  const authRole = cleanText(auth.role).toLowerCase();
  const authName = cleanText(auth.name);

  if (!authSub || !authEmail || !authRole) {
    return fail('User session is incomplete. Please log in again.');
  }

  const fullName = cleanText(authName || body.full_name);
  const email = authEmail || cleanText(body.email).toLowerCase();
  const role = authRole || cleanText(body.role).toLowerCase();
  const documentType = cleanText(body.documentType);
  const purpose = cleanText(body.purpose);
  const deliveryMethod = normalizeDeliveryMethod(body.deliveryMethod || 'pickup');
  const address = cleanText(body.address);
  const notes = cleanText(body.notes);

  if (!fullName || !email || !role || !documentType || !purpose) {
    return fail('Full name, email, role, document type, and purpose are required.');
  }

  if (role !== 'student' && role !== 'alumni') {
    return fail('Only students and alumni can submit document requests.', 'role');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail('A valid email address is required.', 'email');
  }

  if (!price) {
    return fail('No pricing found for this document type.', 'documentType');
  }

  if (!deliveryMethod) {
    return fail('Delivery method must be pickup or delivery.', 'deliveryMethod');
  }

  if (deliveryMethod === 'delivery' && !address) {
    return fail('Delivery address is required for home delivery.', 'address');
  }

  if (purpose.length > 200) {
    return fail('Purpose cannot exceed 200 characters.', 'purpose');
  }

  if (address.length > 500) {
    return fail('Delivery address cannot exceed 500 characters.', 'address');
  }

  if (notes.length > 1000) {
    return fail('Additional notes cannot exceed 1000 characters.', 'notes');
  }

  const copiesResult = parseInteger(body.copies, {
    fieldName: 'Number of copies',
    min: 1,
    max: getLimit('MAX_DOCUMENT_COPIES', 20, limits),
    defaultValue: 1
  });
  if (!copiesResult.ok) return fail(copiesResult.message, 'copies');

  const succeedingPagesResult =
    documentType === 'Course Description 1st Page'
      ? parseInteger(body.succeedingPages, {
          fieldName: 'Succeeding pages',
          min: 0,
          max: getLimit('MAX_SUCCEEDING_PAGES', 500, limits),
          defaultValue: 0
        })
      : { ok: true, value: 0 };
  if (!succeedingPagesResult.ok) {
    return fail(succeedingPagesResult.message, 'succeedingPages');
  }

  const basePrice = Number(price.basePrice) || 0;
  const perSucceedingPageFee = Number(price.perSucceedingPageFee) || 0;
  const deliveryFee = deliveryMethod === 'delivery' ? Number(price.deliveryFee) || 150 : 0;
  const succeedingPagesFee = succeedingPagesResult.value * perSucceedingPageFee;
  const totalFee = (basePrice + succeedingPagesFee) * copiesResult.value + deliveryFee;

  return {
    ok: true,
    value: {
      requesterId: authSub,
      full_name: fullName,
      email,
      role,
      documentType,
      purpose,
      copies: copiesResult.value,
      deliveryMethod,
      address: deliveryMethod === 'delivery' ? address : '',
      succeedingPages: succeedingPagesResult.value,
      notes,
      basePrice,
      perSucceedingPageFee,
      succeedingPagesFee,
      deliveryFee,
      totalFee
    }
  };
}

module.exports = {
  REQUEST_STATUS_FLOWS,
  REQUEST_STATUSES,
  ACTIVE_REQUEST_STATUSES,
  allowedStatusesForRequest,
  normalizeDeliveryMethod,
  normalizeRequestStatus,
  validateDocumentRequestInput,
  validateStatusTransition
};
