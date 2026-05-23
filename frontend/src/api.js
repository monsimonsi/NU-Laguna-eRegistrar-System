export const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

export function getStoredToken() {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}


export function authHeaders(includeJson = true) {
  const token = getStoredToken();
  /** @type {Record<string, string>} */
  const h = {};
  if (includeJson) h['Content-Type'] = 'application/json';
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export function clearSession() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch {
    /* ignore */
  }
}

export function parseJwtPayload(token) {
  if (!token) return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function formatPhp(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(n);
}

export function formatCentavos(centavos) {
  const n = Number(centavos);
  if (!Number.isFinite(n)) return '—';
  return formatPhp(n / 100);
}

export async function apiFetch(path, options = {}) {
  const { auth = true, json = true, ...init } = options;
  const headers = auth ? authHeaders(json) : json ? { 'Content-Type': 'application/json' } : {};
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}
