/**
 * ui.js — UI Utilities
 *
 * showToast, setView, openModal, closeModal,
 * skeleton builders, header update, cart badge
 */

import { getState, setState } from './state.js';

// --------------------------------------------------------------------------
// VIEW RENDERING
// --------------------------------------------------------------------------

export function setView(html) {
  const content = document.getElementById('app-content');
  if (!content) return;
  content.style.opacity = '0';
  content.style.transform = 'translateY(8px)';
  content.innerHTML = html;
  
  requestAnimationFrame(() => {
    content.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    content.style.opacity = '1';
    content.style.transform = 'translateY(0)';
    // Re-initialise Lucide icons for newly injected HTML
    if (window.lucide) lucide.createIcons();
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// --------------------------------------------------------------------------
// TOAST NOTIFICATIONS
// --------------------------------------------------------------------------

const TOAST_DURATION = 4000;

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {string} [title]
 */
export function showToast(message, type = 'success', title) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };

  const defaultTitles = {
    success: 'Success',
    error:   'Error',
    warning: 'Warning',
    info:    'Info',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">
      <div class="toast-title">${title || defaultTitles[type]}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;

  container.appendChild(toast);

  // Auto-remove
  const remove = () => {
    toast.classList.add('toast-removing');
    setTimeout(() => toast.remove(), 300);
  };
  toast.addEventListener('click', remove);
  setTimeout(remove, TOAST_DURATION);
}

// --------------------------------------------------------------------------
// MODAL
// --------------------------------------------------------------------------

export function openModal(html, title = '') {
  const overlay = document.getElementById('app-modal');
  const body    = document.getElementById('modal-body');
  const titleEl = document.getElementById('modal-title');
  if (!overlay || !body) return;

  body.innerHTML = html;
  if (titleEl && title) titleEl.textContent = title;
  overlay.classList.add('is-open');
  if (window.lucide) lucide.createIcons();
}

export function closeModal() {
  const overlay = document.getElementById('app-modal');
  if (overlay) overlay.classList.remove('is-open');
}

// --------------------------------------------------------------------------
// SKELETON BUILDERS
// --------------------------------------------------------------------------

export function productGridSkeleton(count = 8) {
  return Array.from({ length: count }, () => `
    <div class="product-skeleton">
      <div class="skeleton product-skeleton-img"></div>
      <div class="product-skeleton-body">
        <div class="skeleton skeleton-text" style="width:40%"></div>
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text" style="width:60%"></div>
        <div class="skeleton skeleton-btn" style="margin-top:8px"></div>
      </div>
    </div>
  `).join('');
}

export function statCardsSkeleton(count = 4) {
  return `
    <div class="stat-cards-grid">
      ${Array.from({ length: count }, () => `
        <div class="stat-skeleton">
          <div class="skeleton skeleton-circle" style="width:44px;height:44px"></div>
          <div class="skeleton skeleton-title" style="width:50%"></div>
          <div class="skeleton skeleton-text" style="width:70%"></div>
        </div>
      `).join('')}
    </div>
  `;
}

export function tableRowsSkeleton(cols = 4, rows = 5) {
  const cells = Array.from({ length: cols }, (_, i) =>
    i === 0
      ? `<td><div style="display:flex;gap:12px;align-items:center">
           <div class="skeleton skeleton-circle" style="width:36px;height:36px;flex-shrink:0"></div>
           <div style="flex:1"><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text" style="width:60%;margin-top:4px"></div></div>
         </div></td>`
      : `<td><div class="skeleton skeleton-text" style="width:${60 + Math.random() * 30}%"></div></td>`
  ).join('');

  return Array.from({ length: rows }, () => `<tr class="table-skeleton-row">${cells}</tr>`).join('');
}

// --------------------------------------------------------------------------
// HEADER UI UPDATE
// --------------------------------------------------------------------------

export function updateHeaderUI() {
  const state     = getState();
  const authBtn   = document.getElementById('auth-action-btn');
  const authText  = document.getElementById('auth-btn-text');
  const authAvatar = document.getElementById('header-avatar');
  const navOrders = document.getElementById('nav-orders');
  const navVendor = document.getElementById('nav-vendor-dash');
  const navAdmin  = document.getElementById('nav-admin-dash');
  const cartBadge = document.getElementById('cart-count');

  const navHome    = document.getElementById('nav-home');
  const navCatalog = document.getElementById('nav-catalog');
  const cartBtn    = document.getElementById('cart-badge-btn');
  const logoLink   = document.getElementById('header-logo-link');

  // Dropdown items
  const dropdownName   = document.getElementById('dropdown-user-name');
  const dropdownEmail  = document.getElementById('dropdown-user-email');
  const dropdownAvatar = document.getElementById('dropdown-user-avatar');
  const dropAdmin      = document.getElementById('dropdown-link-admin');
  const dropVendor     = document.getElementById('dropdown-link-vendor');
  const dropOrders     = document.getElementById('dropdown-link-orders');
  const dropWallet     = document.getElementById('dropdown-link-wallet');

  if (!authBtn) return;

  if (state.user) {
    // Signed in
    authBtn.classList.add('signed-in');
    const displayName = state.user.name || state.user.email || 'User';
    if (authText) authText.textContent = displayName.split(' ')[0];
    if (authAvatar) {
      authAvatar.textContent = displayName.charAt(0).toUpperCase();
      authAvatar.style.display = 'flex';
    }

    // Populate dropdown header
    if (dropdownName)   dropdownName.textContent = displayName;
    if (dropdownEmail)  dropdownEmail.textContent = state.user.email || '';
    if (dropdownAvatar) dropdownAvatar.textContent = displayName.charAt(0).toUpperCase();

    // Role-specific nav & logo link & dropdown items
    if (state.user.role === 'VENDOR') {
      if (navVendor)  navVendor.classList.remove('d-none');
      if (navAdmin)   navAdmin.classList.add('d-none');
      if (navHome)    navHome.classList.add('d-none');
      if (navCatalog) navCatalog.classList.add('d-none');
      if (navOrders)  navOrders.classList.add('d-none');
      if (cartBtn)    cartBtn.classList.add('d-none');
      if (logoLink)   logoLink.setAttribute('href', '#/vendor-dashboard');

      if (dropVendor) dropVendor.classList.remove('d-none');
      if (dropAdmin)  dropAdmin.classList.add('d-none');
      if (dropOrders) dropOrders.classList.add('d-none');
      if (dropWallet) dropWallet.classList.add('d-none');
    } else if (state.user.role === 'ADMIN') {
      if (navAdmin)   navAdmin.classList.remove('d-none');
      if (navVendor)  navVendor.classList.add('d-none');
      if (navHome)    navHome.classList.add('d-none');
      if (navCatalog) navCatalog.classList.add('d-none');
      if (navOrders)  navOrders.classList.add('d-none');
      if (cartBtn)    cartBtn.classList.add('d-none');
      if (logoLink)   logoLink.setAttribute('href', '#/admin-dashboard');

      if (dropAdmin)  dropAdmin.classList.remove('d-none');
      if (dropVendor) dropVendor.classList.add('d-none');
      if (dropOrders) dropOrders.classList.add('d-none');
      if (dropWallet) dropWallet.classList.add('d-none');
    } else { // CUSTOMER
      if (navVendor)  navVendor.classList.add('d-none');
      if (navAdmin)   navAdmin.classList.add('d-none');
      if (navHome)    navHome.classList.remove('d-none');
      if (navCatalog) navCatalog.classList.remove('d-none');
      if (navOrders)  navOrders.classList.remove('d-none');
      if (cartBtn)    cartBtn.classList.remove('d-none');
      if (logoLink)   logoLink.setAttribute('href', '#/');

      if (dropAdmin)  dropAdmin.classList.add('d-none');
      if (dropVendor) dropVendor.classList.add('d-none');
      if (dropOrders) dropOrders.classList.remove('d-none');
      if (dropWallet) dropWallet.classList.remove('d-none');
    }
  } else {
    // Signed out
    authBtn.classList.remove('signed-in');
    if (authText)   authText.textContent = 'Sign In';
    if (authAvatar) authAvatar.style.display = 'none';
    if (navOrders)  navOrders.classList.add('d-none');
    if (navVendor)  navVendor.classList.add('d-none');
    if (navAdmin)   navAdmin.classList.add('d-none');
    if (navHome)    navHome.classList.remove('d-none');
    if (navCatalog) navCatalog.classList.remove('d-none');
    if (cartBtn)    cartBtn.classList.remove('d-none');
    if (cartBadge)  cartBadge.classList.add('d-none');
    if (logoLink)   logoLink.setAttribute('href', '#/');

    if (dropAdmin)  dropAdmin.classList.add('d-none');
    if (dropVendor) dropVendor.classList.add('d-none');
    if (dropOrders) dropOrders.classList.remove('d-none');
    if (dropWallet) dropWallet.classList.remove('d-none');
  }
}

// --------------------------------------------------------------------------
// CART BADGE
// --------------------------------------------------------------------------

export function updateCartBadge() {
  const { cart } = getState();
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  // API returns itemCount directly; fallback to summing item quantities
  const count = cart.itemCount ?? (cart.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.classList.remove('d-none');
  } else {
    badge.classList.add('d-none');
  }
}

// --------------------------------------------------------------------------
// ACTIVE NAV LINK
// --------------------------------------------------------------------------

export function setActiveNavLink(hash) {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === hash) {
      link.classList.add('active');
    }
  });
}

// --------------------------------------------------------------------------
// FORMAT HELPERS
// --------------------------------------------------------------------------

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

export function statusBadge(status) {
  const map = {
    PENDING:            'badge-warning',
    PROCESSING:         'badge-info',
    SHIPPED:            'badge-primary',
    DELIVERED:          'badge-success',
    CANCELLED:          'badge-danger',
    REFUNDED:           'badge-danger',
    RETURN_REQUESTED:   'badge-warning',
    RETURNED:           'badge-danger',
    EXCHANGE_REQUESTED: 'badge-info',
    EXCHANGED:          'badge-success',
    APPROVED:           'badge-success',
    REJECTED:           'badge-danger',
    ACTIVE:             'badge-success',
    INACTIVE:           'badge-muted',
    CUSTOMER:           'badge-primary',
    VENDOR:             'badge-vendor',
    ADMIN:              'badge-admin',
  };
  const cls = map[status?.toUpperCase()] || 'badge-muted';
  return `<span class="badge ${cls}"><span class="badge-dot"></span>${status || '—'}</span>`;
}

export function starsHTML(rating) {
  const n = Math.round(rating || 0);
  const starSVG = (filled) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
      fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5"
      class="${filled ? 'star-filled' : 'star-empty'}">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  `;
  return `<div class="star-rating">
    ${Array.from({ length: 5 }, (_, i) => starSVG(i < n)).join('')}
    <span class="star-rating-text">${rating ? rating.toFixed(1) : '0.0'}</span>
  </div>`;
}

export function avatarInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// --------------------------------------------------------------------------
// MODAL CLOSE LISTENER (initialised once)
// --------------------------------------------------------------------------
document.addEventListener('click', (e) => {
  const modal = document.getElementById('app-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  if (!modal) return;
  if (e.target === modal || e.target === closeBtn || closeBtn?.contains(e.target)) {
    closeModal();
  }
});
