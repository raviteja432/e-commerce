/**
 * api.js — HTTP Client
 *
 * Unified fetch wrapper with:
 *  - Automatic Authorization header injection
 *  - JSON serialization / deserialization
 *  - Global error handling (401 auto-logout)
 *  - Multipart/form-data support for file uploads
 */

import { getState, resetAuth } from './state.js';
import { showToast } from './ui.js';
import { navigate } from './router.js';

const API_BASE = '/api';

/**
 * Main fetch wrapper for JSON API calls.
 * @param {string} path - Path relative to /api (e.g. '/products')
 * @param {RequestInit} options - Standard fetch options
 * @returns {Promise<any>} Parsed JSON response body
 */
export async function apiFetch(path, options = {}) {
  const state = getState();
  const url   = `${API_BASE}${path}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle empty responses (204 No Content)
  if (response.status === 204) return null;

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    // Auto-logout on 401
    if (response.status === 401) {
      resetAuth();
      updateHeaderUI(false);
      showToast('Session expired. Please sign in.', 'warning');
      navigate('/login');
      throw new Error('Unauthorized');
    }
    const message = data?.message || data?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

/**
 * Fetch wrapper for multipart file uploads.
 * @param {string} path
 * @param {FormData} formData
 * @returns {Promise<any>}
 */
export async function apiUpload(path, formData) {
  const state = getState();
  const url   = `${API_BASE}${path}`;

  const headers = {};
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  // Note: DO NOT set Content-Type for multipart — browser sets it with boundary

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      resetAuth();
      showToast('Session expired. Please sign in.', 'warning');
      navigate('/login');
      throw new Error('Unauthorized');
    }
    const message = data?.message || `Upload failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

// Circular dependency helper — imported lazily from ui.js
function updateHeaderUI(loggedIn) {
  // Delegated to ui.js via event
  window.dispatchEvent(new CustomEvent('auth-change', { detail: { loggedIn } }));
}
