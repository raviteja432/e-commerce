/**
 * router.js — Hash-based SPA Router
 *
 * Routes hash URLs to page render functions.
 * Enforces role-based access guards.
 */

import { getState } from './state.js';
import { showToast, setActiveNavLink } from './ui.js';

// Lazy-imported page modules (avoid circular deps at load time)
let pages = {};

export function registerPages(pageMap) {
  pages = { ...pages, ...pageMap };
}

/** Programmatic navigation */
export function navigate(path) {
  window.location.hash = path.startsWith('#') ? path : `#${path}`;
}

/** Core router — called on hashchange */
export async function router() {
  const hash = window.location.hash || '#/';
  const [pathRaw, queryStr] = hash.split('?');
  const path = pathRaw || '#/';
  const params = new URLSearchParams(queryStr || '');
  const pathParts = path.replace('#/', '').split('/').filter(Boolean);

  const state = getState();
  setActiveNavLink(path);

  // ── Protected route guard ──────────────────────────────────────────────
  const protectedPrefixes = [
    '#/cart', '#/checkout', '#/orders', '#/order/',
    '#/profile', '#/vendor', '#/admin', '#/wallet',
  ];
  const isProtected = protectedPrefixes.some(p => path.startsWith(p));

  if (isProtected && !state.token) {
    showToast('Please sign in to access this page.', 'info');
    navigate('/login');
    return;
  }

  // ── Role guards ────────────────────────────────────────────────────────
  if (path.startsWith('#/vendor') && state.user && state.user.role !== 'VENDOR') {
    showToast('Vendor account required.', 'error');
    navigate('/');
    return;
  }
  if (path.startsWith('#/admin') && state.user && state.user.role !== 'ADMIN') {
    showToast('Administrator access required.', 'error');
    navigate('/');
    return;
  }

  // Auto-navigate Admin and Vendor away from Customer Shop home
  if ((path === '#/' || path === '#') && state.user) {
    if (state.user.role === 'ADMIN') {
      navigate('/admin-dashboard');
      return;
    }
    if (state.user.role === 'VENDOR') {
      navigate('/vendor-dashboard');
      return;
    }
  }

  // ── Route table ────────────────────────────────────────────────────────
  try {
    if (path === '#/' || path === '#') {
      await pages.renderHome?.();

    } else if (path === '#/catalog' || path === '#/products') {
      await pages.renderCatalog?.(params);

    } else if (pathParts[0] === 'product' && pathParts[1]) {
      await pages.renderProductDetail?.(pathParts[1]);

    } else if (path === '#/cart') {
      await pages.renderCart?.();

    } else if (path === '#/checkout') {
      await pages.renderCheckout?.();

    } else if (path === '#/orders') {
      await pages.renderOrders?.();

    } else if (pathParts[0] === 'order' && pathParts[1]) {
      await pages.renderOrderDetail?.(pathParts[1]);

    } else if (path === '#/profile') {
      await pages.renderProfile?.();

    } else if (path === '#/wallet') {
      await pages.renderWallet?.();

    } else if (path === '#/login') {
      await pages.renderLogin?.();

    } else if (path === '#/register') {
      await pages.renderRegister?.();

    } else if (path === '#/forgot-password') {
      await pages.renderForgotPassword?.();

    } else if (path === '#/reset-password') {
      const token = params.get('token');
      await pages.renderResetPassword?.(token);

    } else if (path === '#/vendor-dashboard') {
      await pages.renderVendorDashboard?.();

    } else if (path === '#/vendor-products') {
      await pages.renderVendorProducts?.();

    } else if (path === '#/vendor-orders') {
      await pages.renderVendorOrders?.();

    } else if (path === '#/vendor-earnings') {
      await pages.renderVendorEarnings?.();

    } else if (path === '#/admin-dashboard') {
      await pages.renderAdminDashboard?.();

    } else if (path === '#/admin-users') {
      await pages.renderAdminUsers?.();

    } else if (path === '#/admin-vendors') {
      await pages.renderAdminVendors?.();

    } else if (path === '#/admin-products') {
      await pages.renderAdminProducts?.();

    } else if (path === '#/admin-payouts') {
      await pages.renderAdminPayouts?.();

    } else {
      render404();
    }
  } catch (err) {
    console.error('Router error:', err);
    renderError(err.message);
  }
}

function render404() {
  const { setView } = window.__apexUI || {};
  if (!setView) return;
  setView(`
    <div class="page-container">
      <div class="empty-state" style="margin-top:80px">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <div class="empty-state-title">404 — Page Not Found</div>
        <div class="empty-state-desc">The route you followed doesn't exist.</div>
        <a href="#/" class="btn btn-primary mt-6">Back to Home</a>
      </div>
    </div>
  `);
}

function renderError(msg) {
  const { setView } = window.__apexUI || {};
  if (!setView) return;
  setView(`
    <div class="page-container">
      <div class="empty-state" style="margin-top:80px">
        <div class="empty-state-icon" style="background:var(--danger-bg);border-color:rgba(239,68,68,0.3)">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div class="empty-state-title">Something went wrong</div>
        <div class="empty-state-desc">${msg || 'An unexpected error occurred.'}</div>
        <a href="#/" class="btn btn-primary mt-6">Back to Home</a>
      </div>
    </div>
  `);
}

// Bind hashchange
window.addEventListener('hashchange', router);
