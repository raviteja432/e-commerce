/**
 * vendor-dashboard.js — Vendor Dashboard Page
 *
 * Displays metrics counters, shop overview, and seeder buttons
 */

import { apiFetch } from '../core/api.js';
import { getState, setState } from '../core/state.js';
import { showToast, statCardsSkeleton, formatCurrency } from '../core/ui.js';
import { renderVendorLayout } from './vendor-layout.js';

export async function renderVendorDashboard() {
  const state = getState();

  // Always re-fetch vendor profile to get the latest status from server
  try {
    const vendorProfile = await apiFetch('/vendors/me');
    setState({ vendor: vendorProfile });
  } catch (err) {
    if (err.status === 404 || err.message?.includes('404') || err.message?.includes('not found')) {
      renderVendorOnboarding();
      return;
    }
    renderVendorOnboarding();
    return;
  }

  // Refresh state reference after update
  const freshState = getState();
  const vendorStatus = freshState.vendor?.status;

  // ── PENDING: Waiting for admin approval ──────────────────────────
  if (vendorStatus === 'PENDING') {
    const { setView } = window.__apexUI || {};
    if (setView) {
      setView(`
        <div class="page-wrapper">
          <div class="page-container" style="display:flex;align-items:center;justify-content:center;min-height:70vh;">
            <div style="max-width:520px;width:100%;text-align:center;">
              <!-- Animated pending icon -->
              <div style="width:90px;height:90px;border-radius:50%;background:linear-gradient(135deg,rgba(251,191,36,0.18),rgba(245,158,11,0.08));border:2px solid rgba(251,191,36,0.35);display:flex;align-items:center;justify-content:center;margin:0 auto 28px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.5" style="width:44px;height:44px">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h1 class="font-display font-bold" style="font-size:var(--text-2xl);margin:0 0 12px;">Application Under Review</h1>
              <p class="text-secondary" style="font-size:var(--text-sm);line-height:1.8;margin:0 0 24px;">
                Thank you for registering <strong>${freshState.vendor?.storeName || 'your store'}</strong> on ApexMarket.
                Your application has been received and is currently being reviewed by our team.
                This process typically takes <strong>24–48 business hours</strong>.
              </p>
              <div class="card p-5" style="text-align:left;margin-bottom:24px;">
                <div class="text-xs text-muted font-semibold mb-3" style="text-transform:uppercase;letter-spacing:0.5px;">What to expect next</div>
                <div class="d-flex flex-col gap-3">
                  <div class="d-flex items-start gap-3">
                    <div style="width:24px;height:24px;border-radius:50%;background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;font-weight:700;color:#f59e0b;">1</div>
                    <div class="text-sm text-secondary" style="line-height:1.6;">Our admin team will review your store details and verify the information provided.</div>
                  </div>
                  <div class="d-flex items-start gap-3">
                    <div style="width:24px;height:24px;border-radius:50%;background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;font-weight:700;color:#f59e0b;">2</div>
                    <div class="text-sm text-secondary" style="line-height:1.6;">You will receive an email notification at the address linked to your account once a decision has been made.</div>
                  </div>
                  <div class="d-flex items-start gap-3">
                    <div style="width:24px;height:24px;border-radius:50%;background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;font-weight:700;color:#f59e0b;">3</div>
                    <div class="text-sm text-secondary" style="line-height:1.6;">Upon approval, your dashboard will become fully active and you can start listing products immediately.</div>
                  </div>
                </div>
              </div>
              <div class="d-flex gap-3 justify-center flex-wrap">
                <a href="#/catalog" class="btn btn-secondary">Browse the Store</a>
                <button onclick="window.location.reload()" class="btn btn-primary">Refresh Status</button>
              </div>
              <div class="text-xs text-muted mt-6">Have questions? Contact our support team for assistance.</div>
            </div>
          </div>
        </div>
      `);
    }
    return;
  }

  // ── REJECTED: Application was declined ───────────────────────────
  if (vendorStatus === 'REJECTED') {
    const { setView } = window.__apexUI || {};
    if (setView) {
      setView(`
        <div class="page-wrapper">
          <div class="page-container" style="display:flex;align-items:center;justify-content:center;min-height:70vh;">
            <div style="max-width:520px;width:100%;text-align:center;">
              <!-- Rejection icon -->
              <div style="width:90px;height:90px;border-radius:50%;background:rgba(239,68,68,0.1);border:2px solid rgba(239,68,68,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 28px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="1.5" style="width:44px;height:44px">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <h1 class="font-display font-bold" style="font-size:var(--text-2xl);margin:0 0 12px;">Application Not Approved</h1>
              <p class="text-secondary" style="font-size:var(--text-sm);line-height:1.8;margin:0 0 20px;">
                Unfortunately your application for <strong>${freshState.vendor?.storeName || 'your store'}</strong> was not approved at this time.
              </p>
              ${freshState.vendor?.rejectionReason ? `
              <div class="card p-5" style="text-align:left;border-left:4px solid var(--danger);margin-bottom:24px;">
                <div class="text-xs text-muted font-semibold mb-2" style="text-transform:uppercase;letter-spacing:0.5px;">Reason provided by admin</div>
                <div class="text-sm text-secondary" style="line-height:1.7;">${freshState.vendor.rejectionReason}</div>
              </div>` : ''}
              <p class="text-secondary text-sm" style="line-height:1.8;margin-bottom:24px;">
                If you believe this decision was made in error or you have resolved the issue,
                please contact our support team or submit a new application.
              </p>
              <div class="d-flex gap-3 justify-center flex-wrap">
                <a href="#/catalog" class="btn btn-secondary">Browse the Store</a>
                <a href="#/" class="btn btn-primary">Go to Homepage</a>
              </div>
            </div>
          </div>
        </div>
      `);
    }
    return;
  }

  // ── APPROVED: Render full dashboard ──────────────────────────────
  const contentHTML = `
    <div class="d-flex justify-between items-center mb-6 flex-wrap gap-4">
      <div>
        <h1 class="section-title">Dashboard Overview</h1>
        <p class="text-muted">Analyze your shop's performance metrics and listings.</p>
      </div>
      <div>
        <button class="btn btn-secondary btn-sm" id="vendor-seed-demo-btn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          Seed Demo Catalog
        </button>
      </div>
    </div>

    <!-- Stats Skeleton Placeholder -->
    <div id="vendor-stats-container">
      ${statCardsSkeleton(4)}
    </div>

    <div class="d-grid gap-6 mt-8" style="grid-template-columns: 2fr 1fr; align-items: start;">
      <div class="card p-6">
        <h3 class="font-bold text-base mb-4">Weekly Sales Performance</h3>
        
        <!-- CSS-based clean visual chart (no JS charts package) -->
        <div class="bar-chart mt-6">
          <div class="bar-chart-col">
            <span class="bar-value">₹4.2k</span>
            <div class="bar-fill vendor" style="height: 35%"></div>
            <span class="bar-label">Mon</span>
          </div>
          <div class="bar-chart-col">
            <span class="bar-value">₹8.9k</span>
            <div class="bar-fill vendor" style="height: 70%"></div>
            <span class="bar-label">Tue</span>
          </div>
          <div class="bar-chart-col">
            <span class="bar-value">₹6.1k</span>
            <div class="bar-fill vendor" style="height: 50%"></div>
            <span class="bar-label">Wed</span>
          </div>
          <div class="bar-chart-col">
            <span class="bar-value">₹11.2k</span>
            <div class="bar-fill vendor" style="height: 90%"></div>
            <span class="bar-label">Thu</span>
          </div>
          <div class="bar-chart-col">
            <span class="bar-value">₹7.4k</span>
            <div class="bar-fill vendor" style="height: 60%"></div>
            <span class="bar-label">Fri</span>
          </div>
          <div class="bar-chart-col">
            <span class="bar-value">₹12.8k</span>
            <div class="bar-fill vendor" style="height: 100%"></div>
            <span class="bar-label">Sat</span>
          </div>
          <div class="bar-chart-col">
            <span class="bar-value">₹5.0k</span>
            <div class="bar-fill vendor" style="height: 40%"></div>
            <span class="bar-label">Sun</span>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <h3 class="font-bold text-base mb-4">Shop Information</h3>
        <div class="d-flex flex-col gap-3">
          <div>
            <div class="text-xs text-muted">Store Name</div>
            <div class="text-sm font-semibold mt-1">${freshState.vendor.storeName}</div>
          </div>
          <div>
            <div class="text-xs text-muted">Description</div>
            <div class="text-sm mt-1 text-secondary" style="line-height:1.6">${freshState.vendor.storeDescription || 'No store description.'}</div>
          </div>
          <div>
            <div class="text-xs text-muted">Seller Status</div>
            <div class="mt-1"><span class="badge badge-success">Approved</span></div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderVendorLayout(contentHTML, 'vendor-nav-dash');
  setupDashboardListeners();
  await loadDashboardStats();
}

function setupDashboardListeners() {
  document.getElementById('vendor-seed-demo-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('vendor-seed-demo-btn');
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner spinner-sm"></div> Seeding…`;

    try {
      await seedDemoCatalog();
      showToast('Catalog seeded successfully!', 'success');
      renderVendorDashboard();
    } catch (err) {
      showToast(err.message || 'Seeding failed.', 'error');
      btn.disabled = false;
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Seed Demo Catalog`;
    }
  });
}

async function loadDashboardStats() {
  const container = document.getElementById('vendor-stats-container');
  if (!container) return;

  try {
    const stats = await apiFetch('/vendors/me/stats');
    
    container.innerHTML = `
      <div class="stat-cards-grid">
        <div class="stat-card">
          <div class="stat-card-icon" style="background:var(--vendor-glow);color:var(--vendor-primary)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.89 2.24L2.24 12.89a2 2 0 0 0 0 2.82L6.48 20a2 2 0 0 0 2.82 0L20 9.27a2 2 0 0 0 0-2.82l-4.24-4.24a2 2 0 0 0-2.87 0z"/></svg>
          </div>
          <div class="stat-card-value">${stats.totalProducts}</div>
          <div class="stat-card-label">Total Listings</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:rgba(59,130,246,0.12);color:var(--info)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          </div>
          <div class="stat-card-value">${stats.totalOrders}</div>
          <div class="stat-card-label">Total Orders</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:var(--warning-bg);color:var(--warning)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="stat-card-value">${stats.pendingOrders}</div>
          <div class="stat-card-label">Pending Orders</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:var(--success-bg);color:var(--success)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="stat-card-value text-success">${formatCurrency(stats.totalRevenue || 0)}</div>
          <div class="stat-card-label">Total Revenue</div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="text-danger">Could not retrieve metrics.</div>`;
  }
}

function renderVendorOnboarding() {
  const { setView } = window.__apexUI || {};
  if (!setView) return;

  setView(`
    <div class="page-wrapper">
      <div class="page-container">
        <div class="card p-6" style="max-width: 500px; margin: 40px auto;">
          <h2 class="section-title mb-2">Vendor Profile Onboarding</h2>
          <p class="text-muted mb-6">Fill in details for your virtual storefront to activate seller capabilities.</p>
          
          <form class="d-flex flex-col gap-4" id="vendor-onboarding-form">
            <div class="form-group">
              <label class="form-label" for="onb-store-name">Store Name</label>
              <input type="text" id="onb-store-name" class="form-control" placeholder="e.g. Apex Tech Solutions" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="onb-store-desc">Store Description</label>
              <textarea id="onb-store-desc" class="form-control" placeholder="Explain what categories of items you list..." required></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-lg w-full" id="onb-submit-btn">Setup Shop</button>
          </form>
        </div>
      </div>
    </div>
  `);

  document.getElementById('vendor-onboarding-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('onb-submit-btn');
    const storeName = document.getElementById('onb-store-name').value.trim();
    const storeDescription = document.getElementById('onb-store-desc').value.trim();

    btn.disabled = true;
    btn.innerHTML = `<div class="spinner spinner-sm"></div> Saving details…`;

    try {
      const onboarded = await apiFetch('/vendors/me', {
        method: 'POST',
        body: JSON.stringify({ storeName, storeDescription })
      });
      setState({ vendor: onboarded });
      showToast('Store configured successfully!', 'success');
      renderVendorDashboard();
    } catch (err) {
      showToast(err.message || 'Onboarding failed.', 'error');
      btn.disabled = false;
      btn.textContent = 'Setup Shop';
    }
  });
}

async function seedDemoCatalog() {
  const demoCats = ["Electronics", "Fashion", "Home Decor"];
  for (const catName of demoCats) {
    try {
      await apiFetch('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name: catName, description: `${catName} products` })
      });
    } catch (e) {
      console.warn(`Category ${catName} might exist:`, e);
    }
  }

  // Load fresh categories
  const categories = await apiFetch('/categories');
  setState({ categories });

  // Seed sample products
  const products = [
    { name: "Premium Wireless Headphones", price: 7999, categoryName: "Electronics", description: "Noise-cancelling over-ear headphones with 40h playback.", stockQuantity: 25, imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500" },
    { name: "Minimalist Leather Backpack", price: 3499, categoryName: "Fashion", description: "Waterproof laptop backpack made of genuine full-grain leather.", stockQuantity: 15, imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500" },
    { name: "Nordic Wooden Desk Lamp", price: 1899, categoryName: "Home Decor", description: "Minimalist desk lamp with warm dimmable LED bulb.", stockQuantity: 40, imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500" }
  ];

  for (const prod of products) {
    try {
      await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify(prod)
      });
    } catch (e) {
      console.warn(`Product ${prod.name} might exist:`, e);
    }
  }
}
