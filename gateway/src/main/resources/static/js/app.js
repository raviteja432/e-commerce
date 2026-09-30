/**
 * app.js — Main Frontend Entry Point
 *
 * Bootstraps state, registers pages with router, manages global event bindings,
 * and executes initial user profile / cart retrievals.
 */

import { getState, setState, resetAuth } from './core/state.js';
import { apiFetch } from './core/api.js';
import { router, registerPages, navigate } from './core/router.js';
import { updateHeaderUI, updateCartBadge, showToast, setView } from './core/ui.js';

// Import Page Render Functions
import { renderHome } from './pages/home.js';
import { renderCatalog } from './pages/catalog.js';
import { renderProductDetail } from './pages/product-detail.js';
import { renderCart } from './pages/cart.js';
import { renderCheckout } from './pages/checkout.js';
import { renderOrders } from './pages/orders.js';
import { renderOrderDetail } from './pages/order-detail.js';
import { renderProfile } from './profile/profile.js';
import { renderWallet } from './pages/wallet.js';

// Import Auth renderers
import { renderLogin } from './auth/login.js';
import { renderRegister } from './auth/register.js';
import { renderForgotPassword, renderResetPassword } from './auth/forgot-password.js';

// Import Vendor renderers
import { renderVendorDashboard } from './vendor/vendor-dashboard.js';
import { renderVendorProducts } from './vendor/vendor-products.js';
import { renderVendorOrders } from './vendor/vendor-orders.js';
import { renderVendorEarnings } from './vendor/vendor-earnings.js';

// Import Admin renderers
import { renderAdminDashboard } from './admin/admin-dashboard.js';
import { renderAdminUsers } from './admin/admin-users.js';
import { renderAdminVendors } from './admin/admin-vendors.js';
import { renderAdminProducts } from './admin/admin-products.js';
import { renderAdminPayouts } from './admin/admin-payouts.js';

// --------------------------------------------------------------------------
// 1. PAGE REGISTRATION
// --------------------------------------------------------------------------
registerPages({
  renderHome,
  renderCatalog,
  renderProductDetail,
  renderCart,
  renderCheckout,
  renderOrders,
  renderOrderDetail,
  renderProfile,
  renderWallet,
  renderLogin,
  renderRegister,
  renderForgotPassword,
  renderResetPassword,
  renderVendorDashboard,
  renderVendorProducts,
  renderVendorOrders,
  renderVendorEarnings,
  renderAdminDashboard,
  renderAdminUsers,
  renderAdminVendors,
  renderAdminProducts,
  renderAdminPayouts
});

// Expose UI helpers to window context for global templates
window.__apexUI = { setView };

// --------------------------------------------------------------------------
// 2. AUTHENTICATION SERVICE HELPER FUNCTIONS
// --------------------------------------------------------------------------

/** Fetches personal profile of the logged-in user and saves in state */
export async function fetchUserProfile() {
  const state = getState();
  if (!state.token) return;

  try {
    const userProfile = await apiFetch('/auth/me');
    setState({ user: userProfile });
    updateHeaderUI();

    if (userProfile.role === 'VENDOR') {
      try {
        const vendorProfile = await apiFetch('/vendors/me');
        setState({ vendor: vendorProfile });
      } catch (err) {
        console.warn('Could not retrieve vendor store details:', err);
      }
    }
  } catch (err) {
    console.error('Session validation failed:', err);
    logOut();
  }
}

/** Fetches items in the customer's shopping cart and saves in state */
export async function fetchCart() {
  const state = getState();
  if (!state.token) return;

  try {
    const cartData = await apiFetch('/cart');
    setState({ cart: cartData });
    updateCartBadge();
  } catch (err) {
    console.error('Failed to load cart:', err);
  }
}

/** Performs signout cleanup and redirects to Login screen */
export function logOut() {
  resetAuth();
  updateHeaderUI();
  updateCartBadge();
  showToast('Logged out successfully.', 'info');
  navigate('/login');
}

// --------------------------------------------------------------------------
// 3. GLOBAL EVENT HANDLERS
// --------------------------------------------------------------------------

// Theme Switcher Click Handler
document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
  const state = getState();
  const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
  
  setState({ theme: nextTheme });
  localStorage.setItem('theme', nextTheme);

  const body = document.body;
  const icon = document.getElementById('theme-icon');

  if (nextTheme === 'light') {
    body.classList.add('light-theme');
    icon?.setAttribute('data-lucide', 'moon');
  } else {
    body.classList.remove('light-theme');
    icon?.setAttribute('data-lucide', 'sun');
  }

  if (window.lucide) lucide.createIcons();
  showToast(`Switched to ${nextTheme} mode!`, 'info');
});

// Cart Header Button Handler
document.getElementById('cart-badge-btn')?.addEventListener('click', () => {
  navigate('/cart');
});

// ── PROFILE DROPDOWN ─────────────────────────────────────────────────────────
// Shows/hides the profile dropdown menu.
// Uses direct inline-style forcing so no CSS cascade can override it.
export function toggleProfileDropdown(forceShow) {
  const menu = document.getElementById('profile-dropdown-menu');
  if (!menu) return;

  const isOpen = menu._isOpen === true;
  const shouldOpen = forceShow !== undefined ? Boolean(forceShow) : !isOpen;

  if (shouldOpen) {
    updateHeaderUI();
    menu._isOpen = true;
    // Force-show via inline style — beats ALL external CSS including !important classes
    menu.style.setProperty('display',        'flex',    'important');
    menu.style.setProperty('visibility',     'visible', 'important');
    menu.style.setProperty('opacity',        '1',       'important');
    menu.style.setProperty('pointer-events', 'auto',    'important');
    menu.style.setProperty('transform',      'translateY(0)', 'important');
    menu.classList.add('show');
  } else {
    menu._isOpen = false;
    menu.style.setProperty('display',        'none',   'important');
    menu.style.setProperty('visibility',     'hidden', 'important');
    menu.style.setProperty('opacity',        '0',      'important');
    menu.style.setProperty('pointer-events', 'none',   'important');
    menu.classList.remove('show');
  }
}

// Direct listener on the auth button — avoids document-delegation race conditions
document.getElementById('auth-action-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopImmediatePropagation(); // stop ALL other listeners on document from also firing
  const state = getState();
  if (state.user || state.token) {
    toggleProfileDropdown();
  } else {
    toggleProfileDropdown(false);
    navigate('/login');
  }
});

// Logout button — direct listener
document.getElementById('header-logout-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopImmediatePropagation();
  toggleProfileDropdown(false);
  logOut();
});

// Global click: close dropdown when clicking outside the container
document.addEventListener('click', (e) => {
  const isInsideContainer = e.target.closest('.profile-dropdown-container');
  const logoutBtn         = e.target.closest('#header-logout-btn');
  const dropdownItem      = e.target.closest('.profile-dropdown-item[href]');

  // Handle dropdown link navigation items (non-logout)
  if (dropdownItem && !logoutBtn) {
    toggleProfileDropdown(false);
    return; // let the href navigate normally
  }

  // Close if click is outside the dropdown container
  if (!isInsideContainer) {
    toggleProfileDropdown(false);
  }
});

// Inter-service logout messaging trigger
window.addEventListener('auth-change', (e) => {
  if (e.detail && !e.detail.loggedIn) {
    updateHeaderUI();
  }
});

// --------------------------------------------------------------------------
// 4. BOOTSTRAP INITIALIZATION
// --------------------------------------------------------------------------
(async () => {
  const state = getState();
  
  // Set initial theme icon
  const icon = document.getElementById('theme-icon');
  if (state.theme === 'light') {
    icon?.setAttribute('data-lucide', 'moon');
  } else {
    icon?.setAttribute('data-lucide', 'sun');
  }

  // Hydrate session if token exists
  if (state.token) {
    await fetchUserProfile();
    await fetchCart();
  }

  updateHeaderUI();
  
  // Execute routing on hash load
  router();
})();
