/**
 * state.js — Centralised Application State
 *
 * Single source of truth for all runtime data.
 * Exposes getState(), setState(), and resetAuth().
 */

const _state = {
  // Auth
  token: localStorage.getItem('token') || null,
  user:  null,   // { id, name, email, role, phone, active, createdAt }
  vendor: null,  // { id, shopName, description, status, ... }

  // Theme
  theme: localStorage.getItem('theme') || 'dark',

  // Cart
  cart: { items: [], total: 0 },

  // Navigation
  currentRoute: '#/',

  // Catalog cache
  categories: [],
};

export function getState() {
  return _state;
}

export function setState(partial) {
  Object.assign(_state, partial);
}

export function resetAuth() {
  _state.token  = null;
  _state.user   = null;
  _state.vendor = null;
  _state.cart   = { items: [], total: 0 };
  localStorage.removeItem('token');
}

// Apply saved theme immediately on module load
if (_state.theme === 'light') {
  document.body.classList.add('light-theme');
}
